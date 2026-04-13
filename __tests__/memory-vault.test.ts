// Block 36 — memory-vault.ts unit tests
import { describe, it, expect } from 'vitest';
import {
  scatterStore,
  getReassembledData,
  wipeScatteredStore,
} from '../lib/memory-vault';

describe('lib/memory-vault', () => {
  it('scatter and reassemble preserves data', () => {
    const original = 'abandon ability able about above absent absorb abstract access';
    const store = scatterStore(original);
    const recovered = getReassembledData(store);
    expect(recovered).toBe(original);
  });

  it('wipeScatteredStore clears the map', () => {
    const store = scatterStore('test data here');
    wipeScatteredStore(store);
    expect(store.size).toBe(0);
  });

  it('store contains decoy keys alongside real keys', () => {
    const store = scatterStore('hello world test');
    const allKeys = Array.from(store.keys());
    // Should have index key + real shards + decoy shards
    expect(allKeys.length).toBeGreaterThan(5);
    expect(allKeys.some((k) => k === '__idx__')).toBe(true);
  });
});
