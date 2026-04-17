// Session Lock — tab-scoped persistence (sessionStorage, not localStorage)
// Uses a random per-tab key so data dies when the tab closes.
// No hwId, no passphrase — this is pure convenience, not security storage.

const _KEY = '__cwvs__';
const _TAB_KEY = '__cwvs_tk__';

function getTabKey(): string {
  let k = sessionStorage.getItem(_TAB_KEY);
  if (!k) {
    k = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(_TAB_KEY, k);
  }
  return k;
}

export function saveSession(encrypted: string): void {
  try { sessionStorage.setItem(_KEY, encrypted); } catch {}
}

export function loadSession(): string | null {
  try { return sessionStorage.getItem(_KEY) || null; } catch { return null; }
}

export function clearSession(): void {
  try { sessionStorage.removeItem(_KEY); } catch {}
}

export function hasSession(): boolean {
  try { return !!sessionStorage.getItem(_KEY); } catch { return false; }
}
