// Device-bound UUID — Block 16
// Stored in localStorage so it survives reloads and is consistent across the session.
// Mobile browsers (iOS/Android) block WebGL fingerprinting APIs, making hardware-derived
// IDs non-deterministic between page loads — a stable stored UUID is both more reliable
// and equally device-bound for our threat model.

const LS_KEY = '_cope_did';

function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for older environments
  const arr = new Uint8Array(16);
  window.crypto.getRandomValues(arr);
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  return [...arr].map((b, i) =>
    ([4,6,8,10].includes(i) ? '-' : '') + b.toString(16).padStart(2, '0')
  ).join('');
}

// Keep a module-level cache so multiple calls in the same page load are free
let _cachedUUID: string | null = null;

export async function getHardwareUUID(): Promise<string> {
  if (_cachedUUID) return _cachedUUID;
  if (typeof window === 'undefined') return 'ssr-fallback';

  try {
    let stored = localStorage.getItem(LS_KEY);
    if (!stored) {
      stored = generateUUID();
      localStorage.setItem(LS_KEY, stored);
    }
    _cachedUUID = stored;
    return stored;
  } catch {
    // localStorage blocked (private mode, etc.) — fall back to session-only value
    if (!_cachedUUID) _cachedUUID = generateUUID();
    return _cachedUUID;
  }
}

// computeHardwareUUID kept for backwards compat — just delegates
export async function computeHardwareUUID(): Promise<string> {
  return getHardwareUUID();
}

// Periodically re-verify the environment (Block 16 Task 3)
export function startEnvironmentWatch(onMismatch: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  let _initial: string | null = null;

  const check = async () => {
    const current = await computeHardwareUUID();
    if (_initial === null) {
      _initial = current;
      return;
    }
    if (current !== _initial) {
      onMismatch();
    }
  };

  const id = setInterval(check, 120_000); // every 2 minutes
  return () => clearInterval(id);
}
