// Real-time USD prices — routed through /api/prices to avoid CORS
const CACHE: Map<string, { price: number; ts: number }> = new Map();
const CACHE_TTL = 60_000; // 1 minute

export async function getPrices(ids: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};

  const uncached = unique.filter((id) => {
    const c = CACHE.get(id);
    return !c || Date.now() - c.ts >= CACHE_TTL;
  });

  if (uncached.length > 0) {
    try {
      const res = await fetch(`/api/prices?ids=${uncached.join(',')}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      for (const id of uncached) {
        const price = typeof data[id] === 'number' ? data[id] : 0;
        CACHE.set(id, { price, ts: Date.now() });
      }
    } catch {}
  }

  return Object.fromEntries(unique.map((id) => [id, CACHE.get(id)?.price ?? 0]));
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
