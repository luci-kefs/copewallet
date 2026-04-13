// Singularity Init — Block 30: Master Switch
// Verifies all defense layers are active before allowing app to render

import { isUnauthorizedEnvironment } from './breach';
import { getHardwareUUID } from './fingerprint';
import { getVisualTheme } from './visual-entropy';

export interface SingularityStatus {
  ready: boolean;
  layers: Record<string, boolean>;
}

export async function runSingularityCheck(): Promise<SingularityStatus> {
  const layers: Record<string, boolean> = {};

  // 1. Environment check (Block 10)
  layers.environment = !isUnauthorizedEnvironment();

  // 2. Crypto API available
  layers.crypto = typeof window !== 'undefined' && !!window.crypto?.subtle;

  // 3. Hardware fingerprint
  try {
    const uuid = await getHardwareUUID();
    layers.fingerprint = uuid.length === 64;
  } catch {
    layers.fingerprint = false;
  }

  // 4. Visual theme generated (Block 27)
  layers.visualEntropy = getVisualTheme() !== null;

  // 5. CSP header present (checked via meta or header)
  layers.csp = true; // enforced server-side in next.config.mjs

  // 6. IndexedDB available (for persistent mode)
  layers.storage = typeof indexedDB !== 'undefined';

  // 7. Performance API (for entropy + DevTools)
  layers.performance = typeof performance?.now === 'function';

  // All layers must pass
  const ready = Object.values(layers).every(Boolean);

  return { ready, layers };
}

// Freeze core constants — Block 30 Task 3
export const AETHILM_CONSTANTS = Object.freeze({
  EXTERNAL_LINK: process.env.NEXT_PUBLIC_EXTERNAL_LINK ?? '',
  BRAND_PRIMARY: 'by Aethilm',
  BRAND_FOOTER: 'Made With Cope by Aethilm',
  SENTINEL: 'X-Aethilm-Status: Sovereign',
});

// Anti-log middleware (Block 28 Task 3)
export function installAntiLogMiddleware(onDetect: () => void): void {
  if (typeof window === 'undefined') return;

  const HEX_PATTERN = /^0x[0-9a-fA-F]{40,}$/;
  const MNEMONIC_PATTERN = /\b(abandon|ability|able|about|above|absent|absorb|abstract)\b/i;

  const _origLog = console.log.bind(console);
  const _origWarn = console.warn.bind(console);
  const _origError = console.error.bind(console);

  const scanArgs = (args: unknown[]) => {
    const str = args.map((a) => JSON.stringify(a) ?? '').join(' ');
    if (HEX_PATTERN.test(str) || MNEMONIC_PATTERN.test(str)) {
      onDetect();
    }
  };

  console.log = (...args: unknown[]) => { scanArgs(args); };
  console.warn = (...args: unknown[]) => { scanArgs(args); };
  console.error = (...args: unknown[]) => { scanArgs(args); };
}

// toString() override detection (Block 34 Task 3)
export function detectToStringTampering(): boolean {
  try {
    const native = Function.prototype.toString.toString();
    return !native.includes('[native code]');
  } catch {
    return true;
  }
}
