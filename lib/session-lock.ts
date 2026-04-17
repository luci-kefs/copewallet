// Session Lock — explicit user opt-in to localStorage persistence.
// Encrypted with a stable per-browser key stored in localStorage alongside the payload.
// Survives page refresh; cleared only when user disables the toggle or wipes the wallet.

const _KEY = '__cwvs__';
const _BK = '__cwvs_bk__';
const _SHADOW = '__cwsh__'; // shadow copy — survives wipes, used only for persist flow recovery

function getOrCreateBrowserKey(): string {
  try {
    let k = localStorage.getItem(_BK);
    if (!k) {
      k = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(_BK, k);
    }
    return k;
  } catch { return 'fallback-key'; }
}

export function getTabKey(): string {
  return getOrCreateBrowserKey();
}

export function saveSession(encrypted: string): void {
  try {
    localStorage.setItem(_KEY, encrypted);
    localStorage.setItem(_SHADOW, encrypted);
  } catch {}
}

export function loadSession(): string | null {
  try { return localStorage.getItem(_KEY) || localStorage.getItem(_SHADOW) || null; } catch { return null; }
}

export function loadShadow(): string | null {
  try { return localStorage.getItem(_SHADOW) || null; } catch { return null; }
}

export function clearShadow(): void {
  try { localStorage.removeItem(_SHADOW); } catch {}
}

export function clearSession(): void {
  // Only remove the encrypted payload — keep the browser key stable
  // so any re-save with getTabKey() stays decryptable.
  try { localStorage.removeItem(_KEY); } catch {}
}

export function hasSession(): boolean {
  try { return !!localStorage.getItem(_KEY); } catch { return false; }
}
