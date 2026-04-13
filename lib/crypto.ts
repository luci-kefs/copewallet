import CryptoJS from 'crypto-js';

// SESSION_SALT: volatile, non-persistent — lives only in module scope (RAM)
let _currentKey: string = generateSessionKey();
let _nextKey: string = generateSessionKey();
let _keyRotationTimer: ReturnType<typeof setInterval> | null = null;

function generateSessionKey(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Build/SSR fallback
    for (let i = 0; i < 32; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getCurrentKey(): string {
  return _currentKey;
}

export function getNextKey(): string {
  return _nextKey;
}

// AES-256 encrypt using current session key
export function encryptData(plaintext: string, key?: string): string {
  const k = key ?? _currentKey;
  return CryptoJS.AES.encrypt(plaintext, k).toString();
}

// AES-256 decrypt
export function decryptData(ciphertext: string, key?: string): string {
  const k = key ?? _currentKey;
  const bytes = CryptoJS.AES.decrypt(ciphertext, k);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Rotate session keys — called from WalletContext
export function rotateKeys(onRotate: (oldKey: string, newKey: string) => void): void {
  const oldKey = _currentKey;
  _currentKey = _nextKey;
  _nextKey = generateSessionKey();
  onRotate(oldKey, _currentKey);
}

// Start automatic key rotation every 60 seconds
export function startKeyRotation(onRotate: (oldKey: string, newKey: string) => void): void {
  if (_keyRotationTimer) return;
  _keyRotationTimer = setInterval(() => {
    rotateKeys(onRotate);
  }, 60_000);
}

export function stopKeyRotation(): void {
  if (_keyRotationTimer) {
    clearInterval(_keyRotationTimer);
    _keyRotationTimer = null;
  }
}

// Scrub a string variable by overwriting with random data
export function scrubString(target: { value: string }): void {
  const noise = generateSessionKey();
  target.value = noise;
  target.value = '';
}

// Zero-fill a Uint8Array
export function zeroFill(buf: Uint8Array): void {
  buf.fill(0);
}

// SHA-256 hash (hex)
export async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
