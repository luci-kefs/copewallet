// Block 36 — entropy.ts unit tests
import { describe, it, expect } from 'vitest';
import { buildSuperEntropySeed } from '../lib/entropy';

describe('lib/entropy', () => {
  it('produces non-deterministic output across 2 calls', async () => {
    const seed1 = await buildSuperEntropySeed();
    const seed2 = await buildSuperEntropySeed();
    // Convert to hex and compare
    const hex1 = Array.from(seed1).map((b) => b.toString(16).padStart(2, '0')).join('');
    const hex2 = Array.from(seed2).map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(hex1).not.toBe(hex2);
  });

  it('output is 64 bytes (SHA-512)', async () => {
    const seed = await buildSuperEntropySeed();
    expect(seed.byteLength).toBe(64);
  });
});
