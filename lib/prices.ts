// Real-time USD prices — routed through /api/prices to avoid CORS
const CACHE: Map<string, { price: number; change24h: number | null; ts: number }> = new Map();
const CACHE_TTL = 60_000; // 1 minute

export interface PriceData {
  price: number;
  change24h: number | null;
}

async function fetchAndCache(ids: string[]): Promise<void> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return;
  const uncached = unique.filter((id) => {
    const c = CACHE.get(id);
    return !c || Date.now() - c.ts >= CACHE_TTL;
  });
  if (uncached.length === 0) return;
  try {
    const res = await fetch(`/api/prices?ids=${uncached.join(',')}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    for (const id of uncached) {
      const entry = data[id];
      const price = typeof entry === 'number' ? entry : (entry?.price ?? 0);
      const change24h = entry?.change24h ?? null;
      CACHE.set(id, { price, change24h, ts: Date.now() });
    }
  } catch {}
}

export async function getPrices(ids: string[]): Promise<Record<string, number>> {
  await fetchAndCache(ids);
  return Object.fromEntries(ids.filter(Boolean).map((id) => [id, CACHE.get(id)?.price ?? 0]));
}

export async function getPriceData(ids: string[]): Promise<Record<string, PriceData>> {
  await fetchAndCache(ids);
  return Object.fromEntries(ids.filter(Boolean).map((id) => [
    id,
    { price: CACHE.get(id)?.price ?? 0, change24h: CACHE.get(id)?.change24h ?? null },
  ]));
}

export async function getPrice(coingeckoId: string): Promise<number> {
  const map = await getPrices([coingeckoId]);
  return map[coingeckoId] ?? 0;
}

export function formatUSD(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return '<$0.01';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
