// GoPlus Security proxy — free public API, no key required.
// Proxied server-side to avoid CORS and to rate-limit.
import { NextRequest, NextResponse } from 'next/server';

const GOPLUS_BASE = 'https://api.gopluslabs.io/api/v1';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRate(ip)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // GET /api/scan?action=token&chainId=1&address=0x...
  if (action === 'token') {
    const chainId = searchParams.get('chainId');
    const address = searchParams.get('address');
    if (!chainId || !address) {
      return NextResponse.json({ error: 'Missing chainId or address' }, { status: 400 });
    }
    try {
      const res = await fetch(
        `${GOPLUS_BASE}/token_security/${chainId}?contract_addresses=${address}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }, signal: AbortSignal.timeout(6000) }
      );
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'Scan unavailable' }, { status: 502 });
    }
  }

  // GET /api/scan?action=address&address=0x...
  if (action === 'address') {
    const address = searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    try {
      const res = await fetch(
        `${GOPLUS_BASE}/address_security/${address}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }, signal: AbortSignal.timeout(6000) }
      );
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'Scan unavailable' }, { status: 502 });
    }
  }

  // GET /api/scan?action=dapp&url=https://...
  if (action === 'dapp') {
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    try {
      const encoded = encodeURIComponent(url);
      const res = await fetch(
        `${GOPLUS_BASE}/dapp_security?url=${encoded}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }, signal: AbortSignal.timeout(6000) }
      );
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'Scan unavailable' }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
