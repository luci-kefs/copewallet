// Visual Entropy & Style-Key Fusion — Block 27
import { sha256 } from './crypto';

export interface VisualTheme {
  logoColor: string;       // #FEFEFE range
  footerSpacing: string;   // 0.195em–0.205em
  accentOpacity: number;   // 0.04–0.06
  sessionHash: string;     // incorporated into SESSION_SALT
}

let _theme: VisualTheme | null = null;

function randomHex(base: number, range: number): string {
  const val = base + Math.floor(Math.random() * range);
  return val.toString(16).padStart(2, '0');
}

export async function generateVisualTheme(): Promise<VisualTheme> {
  // 5 random hex colors (subtle white variations)
  const r = randomHex(250, 5); // 250–255
  const g = randomHex(250, 5);
  const b = randomHex(250, 5);
  const logoColor = `#${r}${g}${b}`;

  // 3 random spacing values between 0.195 and 0.205
  const spacing = (0.195 + Math.random() * 0.01).toFixed(4);
  const footerSpacing = `${spacing}em`;

  const accentOpacity = 0.04 + Math.random() * 0.02;

  // Hash these into a session contribution
  const raw = `${logoColor}-${footerSpacing}-${accentOpacity}`;
  const sessionHash = await sha256(raw);

  _theme = { logoColor, footerSpacing, accentOpacity, sessionHash };
  return _theme;
}

export function getVisualTheme(): VisualTheme | null {
  return _theme;
}

// Inject CSS variables into :root (Block 27 Task 3)
export function injectThemeVariables(theme: VisualTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--aethilm-logo-color', theme.logoColor);
  root.style.setProperty('--aethilm-footer-spacing', theme.footerSpacing);
  root.style.setProperty('--aethilm-accent-opacity', String(theme.accentOpacity));
  root.style.setProperty('--aethilm-check', '0.999'); // CSS integrity marker (Block 12)
}

// Monitor CSS integrity variable (Block 12 Task 3)
export function startCSSIntegrityWatch(onTamper: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const id = setInterval(() => {
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue('--aethilm-check')
      .trim();
    if (val && val !== '0.999') {
      onTamper();
    }
  }, 5000);
  return () => clearInterval(id);
}
