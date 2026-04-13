// RPC Proxy + Stealth Network Layer — Blocks 3, 8, 19, 25
import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiting (Block 3)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60_000; // 1 minute

// Multi-provider swarm (Block 25)
const RPC_PROVIDERS = [
  process.env.PRIVATE_RPC_URL,
  process.env.PRIVATE_RPC_URL_2,
  process.env.PRIVATE_RPC_URL_3,
].filter(Boolean) as string[];

// User-agent rotation pool (Blocks 8, 25)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
];

// Ghost lock state (Block 8 Task 3)
const ghostLock = new Map<string, number>(); // ip -> lockUntil

function getClientId(req: NextRequest): string {
  return req.headers.get('x-real-ip') ?? req.headers.get('cf-connecting-ip') ?? 'anon';
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  if (record.count >= RATE_LIMIT) return true;
  record.count++;
  return false;
}

function isGhostLocked(clientId: string): boolean {
  const lockUntil = ghostLock.get(clientId);
  if (!lockUntil) return false;
  if (Date.now() > lockUntil) {
    ghostLock.delete(clientId);
    return false;
  }
  return true;
}

function pickProvider(): string {
  if (RPC_PROVIDERS.length === 0) return '';
  return RPC_PROVIDERS[Math.floor(Math.random() * RPC_PROVIDERS.length)];
}

function randomDelay(min: number, max: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.floor(Math.random() * (max - min)) + min));
}

async function forwardToProvider(method: string, params: unknown[]): Promise<unknown> {
  const providerUrl = pickProvider();
  if (!providerUrl) {
    // Return dummy data if no RPC configured
    return { id: 1, jsonrpc: '2.0', result: '0x0' };
  }

  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  // Traffic jitter (Block 8 Task 2) — 50–400ms
  await randomDelay(50, 400);

  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });

  const res = await fetch(providerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ua,
      // Strip identifying headers
    },
    body,
  });

  return res.json();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const clientId = getClientId(req);

  if (isGhostLocked(clientId)) {
    return NextResponse.json(
      { id: 1, jsonrpc: '2.0', result: null, error: { message: 'Network Congested' } },
      { status: 200 }
    );
  }

  if (isRateLimited(clientId)) {
    // Trigger ghost lock for 60s
    ghostLock.set(clientId, Date.now() + 60_000);
    return NextResponse.json(
      { id: 1, jsonrpc: '2.0', result: null, error: { message: 'Network Congested' } },
      { status: 200 }
    );
  }

  let body: { logType?: string; data?: string; method?: string; params?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Network Syncing...' }, { status: 400 });
  }

  // Decode camouflaged payload (Block 8 Task 1)
  let method: string;
  let params: unknown[];

  if (body.logType === 'system_event' && body.data) {
    try {
      const decoded = JSON.parse(atob(body.data));
      method = decoded.method;
      params = decoded.params ?? [];
    } catch {
      return NextResponse.json({ error: 'Network Syncing...' }, { status: 400 });
    }
  } else if (body.method) {
    method = body.method;
    params = (body.params as unknown[]) ?? [];
  } else {
    return NextResponse.json({ error: 'Network Syncing...' }, { status: 400 });
  }

  // Temporal jitter for sensitive ops (Block 14 Task 2)
  const sensitiveOps = ['eth_sendRawTransaction', 'eth_signTransaction'];
  if (sensitiveOps.includes(method)) {
    await randomDelay(100, 2000);
  }

  const result = await forwardToProvider(method, params);

  // Rotate content-type occasionally (Block 8 Task 4)
  const contentTypes = ['application/json', 'application/json', 'text/plain'];
  const ct = contentTypes[Math.floor(Math.random() * contentTypes.length)];

  return new NextResponse(JSON.stringify(result), {
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
