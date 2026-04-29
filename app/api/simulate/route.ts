// Transaction simulation via Alchemy Simulation API (alchemy_simulateAssetChanges)
import { NextRequest, NextResponse } from 'next/server';
import { CHAINS } from '@/lib/chains';

function getAlchemyUrl(chainId: number): string {
  const chain = CHAINS.find(c => c.id === chainId);
  if (!chain) return '';
  return process.env[chain.rpcEnvKey] ?? '';
}

export interface SimulationResult {
  changes: Array<{
    assetType: string;
    changeType: 'APPROVE' | 'TRANSFER';
    from: string;
    to: string;
    amount?: string;
    symbol?: string;
    decimals?: number;
    contractAddress?: string;
    tokenId?: string;
    logo?: string;
  }>;
  gasUsed: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { tx, chainId } = await req.json();
  if (!tx || !chainId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

  const rpcUrl = getAlchemyUrl(chainId);
  if (!rpcUrl || !rpcUrl.includes('alchemy.com')) {
    return NextResponse.json({ error: 'Simulation requires Alchemy RPC' });
  }

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_simulateAssetChanges',
        params: [tx],
      }),
    });

    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message ?? 'Simulation failed' });

    const result = data.result ?? {};
    return NextResponse.json({
      changes: result.changes ?? [],
      gasUsed: result.gasUsed ?? '0x0',
    } satisfies SimulationResult);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Simulation failed' });
  }
}
