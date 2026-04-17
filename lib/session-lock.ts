// Session Lock — tab-scoped persistence (sessionStorage)
// Encrypts mnemonic with a random per-tab key stored alongside the payload.
// Data dies automatically when the tab closes — no device binding, no passphrase.

const _KEY = '__cwvs__';
const _TAB_KEY = '__cwvs_tk__';

function getOrCreateTabKey(): string {
  try {
    let k = sessionStorage.getItem(_TAB_KEY);
    if (!k) {
      k = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem(_TAB_KEY, k);
    }
    return k;
  } catch { return ''; }
}

export function getTabKey(): string {
  return getOrCreateTabKey();
}

export function saveSession(encrypted: string): void {
  try { sessionStorage.setItem(_KEY, encrypted); } catch {}
}

export function loadSession(): string | null {
  try { return sessionStorage.getItem(_KEY) || null; } catch { return null; }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(_KEY);
    sessionStorage.removeItem(_TAB_KEY);
  } catch {}
}

export function hasSession(): boolean {
  try { return !!sessionStorage.getItem(_KEY); } catch { return false; }
}
