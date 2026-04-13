// Multi-Chain RPC Proxy — Blocks 3, 8, 19, 25
import { NextRequest, NextResponse } from 'next/server';
import { CHAINS } from '@/lib/chains';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;

// Ghost lock
const ghostLock = new Map<string, number>();

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
];

function getClientId(req: NextRequest): string {
  return req.headers.get('x-real-ip') ?? req.headers.get('cf-connecting-ip') ?? 'anon';
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const r = rateLimitMap.get(clientId);
  if (!r || now > r.resetAt) { rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_WINDOW }); return false; }
  if (r.count >= RATE_LIMIT) return true;
  r.count++;
  return false;
}

function isGhostLocked(clientId: string): boolean {
  const u = ghostLock.get(clientId);
  if (!u) return false;
  if (Date.now() > u) { ghostLock.delete(clientId); return false; }
  return true;
}

function getRpcUrl(chainId: number): string {
  const chain = CHAINS.find((c) => c.id === chainId);
  if (!chain) return process.env.PRIVATE_RPC_URL ?? '';
  const url = process.env[chain.rpcEnvKey] ?? '';
  return url;
}

function randomDelay(min: number, max: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.floor(Math.random() * (max - min)) + min));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const clientId = getClientId(req);

  if (isGhostLocked(clientId)) {
    return NextResponse.json({ id: 1, jsonrpc: '2.0', result: null, error: { message: 'Network Congested' } });
  }

  if (isRateLimited(clientId)) {
    ghostLock.set(clientId, Date.now() + 60_000);
    return NextResponse.json({ id: 1, jsonrpc: '2.0', result: null, error: { message: 'Network Congested' } });
  }

  let body: { logType?: string; data?: string; method?: string; params?: unknown[]; chainId?: number };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Network Syncing...' }, { status: 400 });
  }

  let method: string;
  let params: unknown[];
  let chainId: number = 1;

  // Decode camouflaged payload (Block 8)
  if (body.logType === 'system_event' && body.data) {
    try {
      const decoded = JSON.parse(atob(body.data));
      method = decoded.method;
      params = decoded.params ?? [];
      chainId = decoded.chainId ?? 1;
    } catch {
      return NextResponse.json({ error: 'Network Syncing...' }, { status: 400 });
    }
  } else if (body.method) {
    method = body.method;
    params = (body.params as unknown[]) ?? [];
    chainId = body.chainId ?? 1;
  } else {
    return NextResponse.json({ error: 'Network Syncing...' }, { status: 400 });
  }

  // Jitter for sensitive ops (Block 8)
  await randomDelay(50, 200);

  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) {
    // No RPC configured — return dummy
    const dummy: Record<string, unknown> = {
      eth_blockNumber: '0x0', eth_getBalance: '0x0',
      net_version: String(chainId), eth_chainId: '0x' + chainId.toString(16),
    };
    return NextResponse.json({ id: 1, jsonrpc: '2.0', result: dummy[method] ?? '0x0' });
  }

  try {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': ua },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const result = await res.json();
    return new NextResponse(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ id: 1, jsonrpc: '2.0', result: '0x0' });
  }
}
