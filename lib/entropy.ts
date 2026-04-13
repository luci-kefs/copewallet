// Hybrid Entropy Engine — Block 11
// Combines hardware jitter, mouse micro-movements, and memory pressure

const _mouseCoords: Array<{ x: number; y: number }> = [];
let _entropyReady = false;
let _entropyLevel = 0; // 0–100

export function getEntropyLevel(): number {
  return _entropyLevel;
}

export function isEntropyReady(): boolean {
  return _entropyReady;
}

export function startEntropyCollection(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: MouseEvent) => {
    _mouseCoords.push({ x: e.clientX, y: e.clientY });
    if (_mouseCoords.length > 50) _mouseCoords.shift();
    _entropyLevel = Math.min(100, (_mouseCoords.length / 50) * 100);
    _entropyReady = _mouseCoords.length >= 20;
  };

  window.addEventListener('mousemove', handler);
  return () => window.removeEventListener('mousemove', handler);
}

export async function buildSuperEntropySeed(): Promise<Uint8Array> {
  // 1. Hardware jitter via high-res timestamps
  const timestamps: number[] = [];
  for (let i = 0; i < 10; i++) {
    timestamps.push(performance.now());
    await new Promise((r) => setTimeout(r, 1));
  }
  const jitterStr = timestamps.join(',');

  // 2. Mouse micro-movements
  const mouseStr = _mouseCoords.map((c) => `${c.x},${c.y}`).join('|');

  // 3. window.crypto base entropy
  const cryptoBytes = new Uint8Array(32);
  window.crypto.getRandomValues(cryptoBytes);
  const cryptoStr = Array.from(cryptoBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // 4. Memory pressure (if available)
  const memStr =
    // @ts-expect-error — non-standard API
    typeof performance.memory !== 'undefined'
      // @ts-expect-error
      ? `${performance.memory.usedJSHeapSize}-${performance.memory.totalJSHeapSize}`
      : `${Date.now()}`;

  // Combine and hash through SHA-512
  const combined = `${jitterStr}::${mouseStr}::${cryptoStr}::${memStr}`;
  const encoded = new TextEncoder().encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-512', encoded);
  return new Uint8Array(hashBuffer);
}
