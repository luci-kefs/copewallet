// Logic Bomb & Breach Protocol — Block 10
import { sha256 } from './crypto';

type WipeCallback = () => void;

let _breachDetected = false;
let _wipeCallback: WipeCallback | null = null;
let _integrityTimer: ReturnType<typeof setInterval> | null = null;

// Functions to checksum (Block 10 Task 1)
const _SENTINEL_FUNCTIONS = [
  'createCopeWallet',
  'importCopeWallet',
  'wipeCopeWallet',
  'encryptData',
  'decryptData',
];

let _baselineChecksums: Record<string, string> = {};

export async function buildIntegrityBaseline(fns: Record<string, Function>): Promise<void> {
  for (const name of _SENTINEL_FUNCTIONS) {
    if (fns[name]) {
      _baselineChecksums[name] = await sha256(fns[name].toString());
    }
  }
}

async function verifyIntegrity(fns: Record<string, Function>): Promise<boolean> {
  for (const name of _SENTINEL_FUNCTIONS) {
    if (!fns[name]) continue;
    const current = await sha256(fns[name].toString());
    if (_baselineChecksums[name] && current !== _baselineChecksums[name]) {
      return false;
    }
  }
  return true;
}

// Data Poisoning — overwrite vault with 1024 bytes of random noise (Block 10 Task 2)
export function poisonVault(): string {
  const noise = new Uint8Array(1024);
  window.crypto.getRandomValues(noise);
  return Array.from(noise).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Environment check — detect sandbox/iframe/unauthorized domain (Block 10 Task 4)
export function isUnauthorizedEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  // Iframe check
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true; // cross-origin iframe throws
  }

  // Local file system check
  if (window.location.protocol === 'file:') return true;

  // Allowed origins
  const allowed = ['copewallet.com', 'copewallet.vercel.app', 'localhost', '127.0.0.1'];
  const host = window.location.hostname;
  if (!allowed.some((h) => host === h || host.endsWith('.' + h))) {
    return true;
  }

  return false;
}

export function registerBreachWipe(cb: WipeCallback): void {
  _wipeCallback = cb;
}

function triggerBreach(): void {
  if (_breachDetected) return;
  _breachDetected = true;
  if (_wipeCallback) _wipeCallback();
}

// Silent Breach Lockout state (Block 10 Task 3)
let _isLockedOut = false;
export function isBreachLockedOut(): boolean {
  return _isLockedOut;
}
export function activateSilentLockout(): void {
  _isLockedOut = true;
  triggerBreach();
}

// Start integrity checks every 30s (Block 10 Task 1)
export function startIntegrityWatch(fns: Record<string, Function>): void {
  if (_integrityTimer) return;

  // Check unauthorized environment immediately
  if (isUnauthorizedEnvironment()) {
    activateSilentLockout();
    return;
  }

  _integrityTimer = setInterval(async () => {
    if (Object.keys(_baselineChecksums).length === 0) return;
    const ok = await verifyIntegrity(fns);
    if (!ok) activateSilentLockout();
  }, 30_000);
}

export function stopIntegrityWatch(): void {
  if (_integrityTimer) {
    clearInterval(_integrityTimer);
    _integrityTimer = null;
  }
}
