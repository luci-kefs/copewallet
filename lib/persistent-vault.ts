// Persistent Vault — passphrase-only AES-GCM encryption (no device binding)
// Mnemonic is encrypted with PBKDF2(passphrase) and stored as 4 shards in IndexedDB.
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'sys_cache';
const DB_VERSION = 1;
const STORES = ['theme_config', 'ui_state', 'app_meta', 'render_cache'];
const SHARD_KEYS = ['theme_config_part_1', 'ui_state_delta', 'app_meta_fragment', 'render_cache_v2'];

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    },
  });
}

// PBKDF2 with 600k iterations — passphrase only, no hwId in salt
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('cope-vault-v2'), iterations: 600_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptShard(data: string, key: CryptoKey): Promise<{ iv: string; data: string }> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data));
  return {
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };
}

async function decryptShard(shard: { iv: string; data: string }, key: CryptoKey): Promise<string> {
  const iv = new Uint8Array(shard.iv.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const data = Uint8Array.from(atob(shard.data), c => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(dec);
}

export async function persistVault(mnemonic: string, passphrase: string): Promise<void> {
  const key = await deriveKey(passphrase);
  const words = mnemonic.split(' ');
  const chunkSize = Math.ceil(words.length / SHARD_KEYS.length);
  const db = await getDB();
  for (let i = 0; i < SHARD_KEYS.length; i++) {
    const shard = words.slice(i * chunkSize, (i + 1) * chunkSize).join(' ');
    const encrypted = await encryptShard(shard, key);
    await db.put(STORES[i], encrypted, SHARD_KEYS[i]);
  }
}

export async function hasPersistedVault(): Promise<boolean> {
  try {
    const db = await getDB();
    return !!(await db.get(STORES[0], SHARD_KEYS[0]));
  } catch { return false; }
}

let _failedAttempts = 0;

export async function loadPersistedVault(passphrase: string): Promise<string> {
  if (_failedAttempts >= 5) { await nukePersistedVault(); throw new Error('Too many attempts'); }
  try {
    const key = await deriveKey(passphrase);
    const db = await getDB();
    const parts: string[] = [];
    for (let i = 0; i < SHARD_KEYS.length; i++) {
      const shard = await db.get(STORES[i], SHARD_KEYS[i]);
      if (!shard) throw new Error('Vault not found');
      parts.push(await decryptShard(shard, key));
    }
    _failedAttempts = 0;
    return parts.join(' ').trim();
  } catch {
    _failedAttempts++;
    if (_failedAttempts >= 5) await nukePersistedVault();
    throw new Error('Wrong passphrase');
  }
}

export async function nukePersistedVault(): Promise<void> {
  try {
    const db = await getDB();
    for (let i = 0; i < SHARD_KEYS.length; i++) await db.delete(STORES[i], SHARD_KEYS[i]);
  } catch {}
  _failedAttempts = 0;
}
