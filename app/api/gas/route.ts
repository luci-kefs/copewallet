// Gas price oracle — EIP-1559 baseFee + tip tiers
import { NextRequest, NextResponse } from 'next/server';
import { CHAINS } from '@/lib/chains';

const CACHE: Map<number, { slow: number; medium: number; fast: number; baseFee: number; ts: number }> = new Map();
const CACHE_TTL = 15_000; // 15s

function getRpcUrl(chainId: number): string {
  const chain = CHAINS.find(c => c.id === chainId);
  if (!chain) return '';
  return process.env[chain.rpcEnvKey] ?? '';
}

async function rpc(url: string, method: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

function hexToGwei(hex: string): number {
  return parseInt(hex, 16) / 1e9;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const chainId = parseInt(req.nextUrl.searchParams.get('chainId') ?? '1', 10);

  const cached = CACHE.get(chainId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached, { headers: { 'Cache-Control': 'public, max-age=15' } });
  }

  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) return NextResponse.json({ slow: 0, medium: 0, fast: 0, baseFee: 0 });

  try {
    // eth_feeHistory: last 10 blocks, 10th/50th/90th percentile priority fees
    const feeHistory = await rpc(rpcUrl, 'eth_feeHistory', [10, 'latest', [10, 50, 90]]) as any;
    const rewards = feeHistory?.reward as string[][] ?? [];
    const baseFees = feeHistory?.baseFeePerGas as string[] ?? [];

    const baseFee = baseFees.length > 0 ? hexToGwei(baseFees[baseFees.length - 1]) : 0;

    const avgReward = (idx: number): number => {
      const vals = rewards.map((r: string[]) => parseInt(r[idx] ?? '0x0', 16) / 1e9).filter(v => v > 0);
      if (vals.length === 0) return 0;
      return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    };

    const tipSlow   = avgReward(0);
    const tipMedium = avgReward(1);
    const tipFast   = avgReward(2);

    const result = {
      slow:    parseFloat((baseFee + tipSlow).toFixed(2)),
      medium:  parseFloat((baseFee + tipMedium).toFixed(2)),
      fast:    parseFloat((baseFee + tipFast).toFixed(2)),
      baseFee: parseFloat(baseFee.toFixed(2)),
      ts:      Date.now(),
    };
    CACHE.set(chainId, result);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=15' } });
  } catch {
    return NextResponse.json({ slow: 0, medium: 0, fast: 0, baseFee: 0 });
  }
}
