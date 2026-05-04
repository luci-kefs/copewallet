import { NextRequest, NextResponse } from 'next/server';

const CACHE: Map<string, { price: number; change24h: number | null; ts: number }> = new Map();
const CACHE_TTL = 60_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ids = req.nextUrl.searchParams.get('ids') ?? '';
  if (!ids) return NextResponse.json({});

  const unique = [...new Set(ids.split(',').filter(Boolean))];
  const uncached = unique.filter((id) => {
    const c = CACHE.get(id);
    return !c || Date.now() - c.ts >= CACHE_TTL;
  });

  if (uncached.length > 0) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${uncached.join(',')}&vs_currencies=usd&include_24hr_change=true`,
        { headers: { Accept: 'application/json' }, next: { revalidate: 60 } }
      );
      const data = await res.json();
      for (const id of uncached) {
        const price = data[id]?.usd ?? 0;
        const change24h = data[id]?.usd_24h_change ?? null;
        CACHE.set(id, { price, change24h, ts: Date.now() });
      }
    } catch {}
  }

  const result = Object.fromEntries(unique.map((id) => {
    const c = CACHE.get(id);
    return [id, { price: c?.price ?? 0, change24h: c?.change24h ?? null }];
  }));
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
