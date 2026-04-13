// Hardware Fingerprint Binding — Block 16
import { sha256 } from './crypto';

export async function computeHardwareUUID(): Promise<string> {
  if (typeof window === 'undefined') return 'ssr-fallback';

  const parts: string[] = [];

  // Screen & display
  parts.push(`${screen.colorDepth}-${screen.pixelDepth}`);
  parts.push(`${screen.width}x${screen.height}`);

  // CPU cores
  parts.push(`cpu:${navigator.hardwareConcurrency}`);

  // Timezone & language
  parts.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  parts.push(`lang:${navigator.language}`);

  // WebGL GPU signature
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        parts.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string);
        parts.push(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string);
      }
    }
  } catch {}

  // Font list checksum via canvas text measure
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const testFonts = ['Arial', 'Georgia', 'Courier New', 'Trebuchet MS', 'Impact'];
    const measures = testFonts.map((f) => {
      ctx.font = `16px ${f}`;
      return ctx.measureText('AaGgTtWw').width.toFixed(2);
    });
    parts.push(`fonts:${measures.join(',')}`);
  } catch {}

  const combined = parts.join('|');
  return sha256(combined);
}

let _cachedUUID: string | null = null;

export async function getHardwareUUID(): Promise<string> {
  if (!_cachedUUID) {
    _cachedUUID = await computeHardwareUUID();
  }
  return _cachedUUID;
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
