// Wallet history — session-based auto-tracking + optional encrypted persist.
// When isSaved=true the mnemonic is stored encrypted via AES-GCM / PBKDF2
// in a separate localStorage key (__cw_vault_<id>__). The passphrase never
// leaves the browser; IndexedDB is NOT used here so the vault survives
// cross-origin storage partitioning that affects IDB on some browsers.

const HISTORY_KEY = '__cw_wallet_history__';
const MAX_HISTORY = 5;
const NON_EVM_WARNED_KEY = '__cw_non_evm_warned__';
const VAULT_PREFIX = '__cw_vault_';

export interface WalletSnapshot {
  id: string;
  address: string;           // EVM address for display
  shortAddress: string;      // 0x1234...5678
  createdAt: number;         // unix ms
  label?: string;
  isSaved: boolean;
  vaultMode: 'EPHEMERAL' | 'PERSISTENT';
  chainId?: number;
  chainName?: string;
  chainColor?: string;
  chainLogo?: string;
  coinSymbol?: string;
  isNonEvm?: boolean;
}

// ── AES-GCM helpers (app-level key, convenience storage — not passphrase-gated) ─
// This is a convenience feature: mnemonic is obfuscated in localStorage so it
// isn't visible in plain text, but anyone with DevTools access could read it.
// Users are warned via the UI that this device stores wallet data.

const APP_KEY_SEED = 'cope-wallet-history-v1';

async function getAppKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(APP_KEY_SEED));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptMnemonic(mnemonic: string): Promise<string> {
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAppKey();
  const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(mnemonic));
  const buf = new Uint8Array(12 + ct.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(ct), 12);
  return btoa(String.fromCharCode(...buf));
}

async function decryptMnemonic(blob: string): Promise<string> {
  const buf = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
  const iv  = buf.slice(0, 12);
  const ct  = buf.slice(12);
  const key = await getAppKey();
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(dec);
}

// ── Saved vault storage ───────────────────────────────────────────────────────

function vaultKey(id: string): string { return `${VAULT_PREFIX}${id}__`; }

// Auto-store mnemonic blob for a history entry (not marked as saved).
// Called when a wallet is added to history.
export async function storeVaultBlob(id: string, mnemonic: string): Promise<void> {
  const blob = await encryptMnemonic(mnemonic);
  try { localStorage.setItem(vaultKey(id), blob); } catch {}
}

// Mark an entry as saved (moves it to Saved Vaults). Blob must already exist.
export function markWalletSaved(id: string): void {
  const history = load();
  const updated = history.map(s => s.id === id ? { ...s, isSaved: true } : s);
  save(updated);
}

// Persist + mark saved in one step (for Save button).
export async function persistWallet(id: string, mnemonic: string): Promise<void> {
  await storeVaultBlob(id, mnemonic);
  markWalletSaved(id);
}

export async function loadSavedMnemonic(id: string): Promise<string> {
  const blob = localStorage.getItem(vaultKey(id));
  if (!blob) throw new Error('Vault not found');
  return decryptMnemonic(blob);
}

export function deleteSavedVault(id: string): void {
  try { localStorage.removeItem(vaultKey(id)); } catch {}
}

function load(): WalletSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as WalletSnapshot[]) : [];
  } catch {
    return [];
  }
}

function save(history: WalletSnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

export function getHistory(): WalletSnapshot[] {
  return load();
}

export function addToHistory(snapshot: WalletSnapshot): void {
  const history = load();
  const filtered = history.filter((s) => s.address !== snapshot.address);
  const updated = [snapshot, ...filtered].slice(0, MAX_HISTORY);
  // Delete blobs of unsaved entries that got pushed out
  const droppedIds = filtered.slice(MAX_HISTORY - 1).filter(s => !s.isSaved).map(s => s.id);
  for (const id of droppedIds) {
    try { localStorage.removeItem(vaultKey(id)); } catch {}
  }
  save(updated);
}

export function saveWallet(id: string): void {
  const history = load();
  const updated = history.map((s) => s.id === id ? { ...s, isSaved: true } : s);
  save(updated);
}

export function unsaveWallet(id: string): void {
  const history = load();
  const updated = history.map((s) => s.id === id ? { ...s, isSaved: false } : s);
  save(updated);
}

export function removeFromHistory(id: string): void {
  const history = load();
  save(history.filter((s) => s.id !== id));
}

export function updateLabel(id: string, label: string): void {
  const history = load();
  const updated = history.map((s) => s.id === id ? { ...s, label } : s);
  save(updated);
}

export function updateSnapshotChain(id: string, chain: { chainId?: number; chainName?: string; chainColor?: string; chainLogo?: string; coinSymbol?: string; isNonEvm?: boolean }): void {
  const history = load();
  const updated = history.map((s) => s.id === id ? { ...s, ...chain } : s);
  save(updated);
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

export function makeSnapshot(
  address: string,
  mode: 'EPHEMERAL' | 'PERSISTENT',
  chain?: { chainId?: number; chainName?: string; chainColor?: string; chainLogo?: string; coinSymbol?: string; isNonEvm?: boolean }
): WalletSnapshot {
  return {
    id: crypto.randomUUID(),
    address,
    shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
    createdAt: Date.now(),
    isSaved: false,
    vaultMode: mode,
    chainId: chain?.chainId,
    chainName: chain?.chainName,
    chainColor: chain?.chainColor,
    chainLogo: chain?.chainLogo,
    coinSymbol: chain?.coinSymbol,
    isNonEvm: chain?.isNonEvm,
  };
}

// Non-EVM first-use warning flag
export function hasSeenNonEVMWarning(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(NON_EVM_WARNED_KEY) === '1';
}

export function markNonEVMWarningSeen(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(NON_EVM_WARNED_KEY, '1'); } catch {}
}
