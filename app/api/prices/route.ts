import { NextRequest, NextResponse } from 'next/server';

const CACHE: Map<string, { price: number; ts: number }> = new Map();
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
        `https://api.coingecko.com/api/v3/simple/price?ids=${uncached.join(',')}&vs_currencies=usd`,
        { headers: { Accept: 'application/json' }, next: { revalidate: 60 } }
      );
      const data = await res.json();
      for (const id of uncached) {
        const price = data[id]?.usd ?? 0;
        CACHE.set(id, { price, ts: Date.now() });
      }
    } catch {}
  }

  const result = Object.fromEntries(unique.map((id) => [id, CACHE.get(id)?.price ?? 0]));
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
