// LiFi aggregator proxy — keeps the base URL server-side, rate-limits, validates inputs
import { NextRequest, NextResponse } from 'next/server';

const LIFI_BASE = 'https://li.quest/v1';

// Supported LiFi chain IDs (EVM only, subset matching our CHAINS)
const LIFI_SUPPORTED_CHAIN_IDS = new Set([
  1, 10, 56, 137, 324, 8453, 42161, 43114, 59144, 81457, 534352,
]);

// Simple in-memory rate limit: max 20 quote calls/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRate(ip)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // GET /api/swap?action=chains — return supported chains
  if (action === 'chains') {
    try {
      const res = await fetch(`${LIFI_BASE}/chains`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      });
      const data = await res.json();
      // Filter to only chains we support
      const filtered = (data.chains ?? []).filter((c: { id: number }) => LIFI_SUPPORTED_CHAIN_IDS.has(c.id));
      return NextResponse.json({ chains: filtered });
    } catch {
      return NextResponse.json({ error: 'Failed to fetch chains' }, { status: 502 });
    }
  }

  // GET /api/swap?action=tokens&chainId=1
  if (action === 'tokens') {
    const chainId = parseInt(searchParams.get('chainId') ?? '0', 10);
    if (!chainId || !LIFI_SUPPORTED_CHAIN_IDS.has(chainId)) {
      return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 });
    }
    try {
      const res = await fetch(`${LIFI_BASE}/tokens?chains=${chainId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      });
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 502 });
    }
  }

  // GET /api/swap?action=quote&fromChain=1&toChain=137&fromToken=0x...&toToken=0x...&fromAmount=1000000&fromAddress=0x...
  if (action === 'quote') {
    const fromChain = searchParams.get('fromChain');
    const toChain = searchParams.get('toChain');
    const fromToken = searchParams.get('fromToken');
    const toToken = searchParams.get('toToken');
    const fromAmount = searchParams.get('fromAmount');
    const fromAddress = searchParams.get('fromAddress');

    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    if (!LIFI_SUPPORTED_CHAIN_IDS.has(parseInt(fromChain)) || !LIFI_SUPPORTED_CHAIN_IDS.has(parseInt(toChain))) {
      return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 });
    }

    const params = new URLSearchParams({
      fromChain, toChain, fromToken, toToken, fromAmount, fromAddress,
      slippage: '0.005', // 0.5% default
      integrator: 'copewallet',
    });

    try {
      const res = await fetch(`${LIFI_BASE}/quote?${params}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data.message ?? 'Quote failed' }, { status: res.status });
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'Failed to get quote' }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
