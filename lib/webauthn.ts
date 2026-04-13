// WebAuthn Biometric Key Fusion — Block 23
import { sha256 } from './crypto';

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof navigator.credentials?.create === 'function'
  );
}

// Generate biometric salt via WebAuthn credential creation (Block 23 Task 1)
export async function generateBiometricKey(userLabel = 'cope-vault'): Promise<string> {
  if (!isWebAuthnSupported()) {
    return deriveFallbackKey();
  }

  try {
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userId = window.crypto.getRandomValues(new Uint8Array(16));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Cope Wallet', id: window.location.hostname },
        user: {
          id: userId,
          name: userLabel,
          displayName: 'Cope Vault',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60_000,
      },
    }) as PublicKeyCredential | null;

    if (!credential) return deriveFallbackKey();

    // Hash the rawId — never stored, re-derived on each get() (Block 36 Task 2)
    const rawId = new Uint8Array(credential.rawId);
    const hex = Array.from(rawId).map((b) => b.toString(16).padStart(2, '0')).join('');
    return sha256(hex);
  } catch {
    return deriveFallbackKey();
  }
}

// Re-derive biometric key from existing credential (Block 23 Task 1)
export async function getBiometricKey(): Promise<string> {
  if (!isWebAuthnSupported()) return deriveFallbackKey();

  try {
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        userVerification: 'required',
        timeout: 60_000,
      },
    }) as PublicKeyCredential | null;

    if (!assertion) return deriveFallbackKey();

    const rawId = new Uint8Array(assertion.rawId);
    const hex = Array.from(rawId).map((b) => b.toString(16).padStart(2, '0')).join('');
    return sha256(hex);
  } catch {
    return deriveFallbackKey();
  }
}

// Fallback: double PBKDF2 iterations when no biometric (Block 23 Task 3)
async function deriveFallbackKey(): Promise<string> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(navigator.userAgent + screen.width + navigator.hardwareConcurrency),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('aethilm-fallback'),
      iterations: 1_200_000, // double iterations as fallback
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(exported)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
