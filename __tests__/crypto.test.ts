// Block 36 — crypto.ts unit tests
import { describe, it, expect, beforeEach } from 'vitest';
import { encryptData, decryptData, zeroFill, sha256 } from '../lib/crypto';

describe('lib/crypto', () => {
  it('encrypt/decrypt round-trip', () => {
    const plaintext = 'abandon ability able about above absent absorb abstract';
    const key = 'test-session-key-32-chars-padding';
    const cipher = encryptData(plaintext, key);
    expect(cipher).not.toBe(plaintext);
    const recovered = decryptData(cipher, key);
    expect(recovered).toBe(plaintext);
  });

  it('different keys produce different ciphertexts', () => {
    const plaintext = 'test mnemonic phrase';
    const c1 = encryptData(plaintext, 'key-one');
    const c2 = encryptData(plaintext, 'key-two');
    expect(c1).not.toBe(c2);
  });

  it('zeroFill wipes the buffer', () => {
    const buf = new Uint8Array([1, 2, 3, 4, 5]);
    zeroFill(buf);
    expect(buf.every((b) => b === 0)).toBe(true);
  });

  it('sha256 produces 64-char hex string', async () => {
    const hash = await sha256('aethilm');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });
});
