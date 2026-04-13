// Block 36 — signer.ts: verify Uint8Array zero-fill after signing
import { describe, it, expect, vi } from 'vitest';
import { zeroFill } from '../lib/crypto';

describe('lib/signer — zero-fill guarantee', () => {
  it('zeroFill zeroes out the key buffer', () => {
    // Simulate a private key buffer
    const keyBuffer = new Uint8Array(32);
    // Fill with fake key data
    for (let i = 0; i < 32; i++) keyBuffer[i] = i + 1;
    expect(keyBuffer.every((b) => b === 0)).toBe(false);

    // Zero-fill (as done in signer.ts finally block)
    zeroFill(keyBuffer);

    // Verify all zeros
    expect(keyBuffer.every((b) => b === 0)).toBe(true);
  });

  it('keyBuffer reference after fill is still zeroed', () => {
    let buf: Uint8Array | null = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
    zeroFill(buf);
    const snapshot = Array.from(buf);
    buf = null;
    expect(snapshot.every((b) => b === 0)).toBe(true);
  });
});
