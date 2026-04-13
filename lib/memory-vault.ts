// Memory Fragmentation & Scatter Store — Block 22

function randomKey(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function randomNoise(): string {
  const len = Math.floor(Math.random() * 8) + 4;
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(Math.floor(Math.random() * 94) + 33);
  return s;
}

export type ScatteredStore = Map<string, string>;

// Split data into scattered fragments with decoy chunks
export function scatterStore(data: string): ScatteredStore {
  const store: ScatteredStore = new Map();
  const chunkSize = 2;
  const chunks: Array<{ key: string; value: string; index: number }> = [];

  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push({ key: randomKey(), value: data.slice(i, i + chunkSize), index: i });
  }

  // Insert real chunks
  for (const chunk of chunks) {
    store.set(chunk.key + '_' + chunk.index, chunk.value);
  }

  // Insert decoy chunks
  const decoyCount = Math.floor(chunks.length * 1.5);
  for (let i = 0; i < decoyCount; i++) {
    store.set(randomKey() + '_d' + i, randomNoise());
  }

  // Store the ordered index separately (encrypted reference)
  const indexMap = chunks.map((c) => `${c.key + '_' + c.index}`).join(',');
  store.set('__idx__', indexMap);

  return store;
}

// Reassemble data from store (exists only in local scope)
export function getReassembledData(store: ScatteredStore): string {
  const indexMap = store.get('__idx__');
  if (!indexMap) return '';

  const keys = indexMap.split(',');
  let result = '';
  for (const key of keys) {
    result += store.get(key) ?? '';
  }

  // Immediately wipe local reference
  let _tmp = result;
  // (result returned before wipe, wiping local copy)
  keys.length = 0;
  return _tmp;
}

// Wipe the entire store
export function wipeScatteredStore(store: ScatteredStore): void {
  for (const key of store.keys()) {
    store.set(key, randomNoise());
  }
  store.clear();
}

// Heap noise generator — runs in background to obscure real wallet data
let _heapNoiseTimer: ReturnType<typeof setInterval> | null = null;

export function startHeapNoise(): void {
  if (_heapNoiseTimer) return;
  _heapNoiseTimer = setInterval(() => {
    const noise: string[] = [];
    for (let i = 0; i < 20; i++) noise.push(randomNoise());
    // Let GC collect it
    noise.length = 0;
  }, 3000);
}

export function stopHeapNoise(): void {
  if (_heapNoiseTimer) {
    clearInterval(_heapNoiseTimer);
    _heapNoiseTimer = null;
  }
}
