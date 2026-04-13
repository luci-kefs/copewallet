// Session Lock — Block 36 (Explicit user opt-in to localStorage persistence)
// Encrypted with hwId so data is device-bound; no passphrase required.

const _KEY = '__cwvs__'; // obfuscated storage key

export function saveSession(encrypted: string): void {
  try { localStorage.setItem(_KEY, encrypted); } catch {}
}

export function loadSession(): string | null {
  try { return localStorage.getItem(_KEY) || null; } catch { return null; }
}

export function clearSession(): void {
  try { localStorage.removeItem(_KEY); } catch {}
}

export function hasSession(): boolean {
  try { return !!localStorage.getItem(_KEY); } catch { return false; }
}
