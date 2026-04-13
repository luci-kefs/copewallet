// Real-time USD prices via CoinGecko (free tier, no key needed)
const CACHE: Map<string, { price: number; ts: number }> = new Map();
const CACHE_TTL = 60_000; // 1 minute

export async function getPrice(coingeckoId: string): Promise<number> {
  const cached = CACHE.get(coingeckoId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.price;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json();
    const price = data[coingeckoId]?.usd ?? 0;
    CACHE.set(coingeckoId, { price, ts: Date.now() });
    return price;
  } catch {
    return CACHE.get(coingeckoId)?.price ?? 0;
  }
}

export async function getPrices(ids: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(ids)];
  const uncached = unique.filter((id) => {
    const c = CACHE.get(id);
    return !c || Date.now() - c.ts >= CACHE_TTL;
  });

  if (uncached.length > 0) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${uncached.join(',')}&vs_currencies=usd`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      for (const id of uncached) {
        const price = data[id]?.usd ?? 0;
        CACHE.set(id, { price, ts: Date.now() });
      }
    } catch {}
  }

  return Object.fromEntries(unique.map((id) => [id, CACHE.get(id)?.price ?? 0]));
}

export function formatUSD(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return '<$0.01';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
