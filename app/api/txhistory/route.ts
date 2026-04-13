// Transaction History API — Alchemy Transfers API
import { NextRequest, NextResponse } from 'next/server';
import { CHAINS } from '@/lib/chains';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { address, chainId } = await req.json();
  if (!address || !chainId) return NextResponse.json([]);

  const chain = CHAINS.find((c) => c.id === chainId);
  const rpcUrl = chain ? process.env[chain.rpcEnvKey] ?? '' : '';

  if (!rpcUrl || !rpcUrl.includes('alchemy.com')) {
    return NextResponse.json([]);
  }

  try {
    const [sentRes, recvRes] = await Promise.all([
      fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0', toBlock: 'latest',
            fromAddress: address,
            category: ['external', 'erc20', 'erc721', 'erc1155'],
            maxCount: '0x14', withMetadata: true, excludeZeroValue: true,
          }],
        }),
      }),
      fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 2,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0', toBlock: 'latest',
            toAddress: address,
            category: ['external', 'erc20', 'erc721', 'erc1155'],
            maxCount: '0x14', withMetadata: true, excludeZeroValue: true,
          }],
        }),
      }),
    ]);

    const [sentData, recvData] = await Promise.all([sentRes.json(), recvRes.json()]);

    const sent = (sentData.result?.transfers ?? []).map((t: any) => ({
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value?.toFixed(6) ?? '0',
      asset: t.asset ?? 'ETH',
      direction: 'out' as const,
      timestamp: new Date(t.metadata?.blockTimestamp ?? 0).getTime(),
      blockNum: t.blockNum,
    }));

    const recv = (recvData.result?.transfers ?? []).map((t: any) => ({
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value?.toFixed(6) ?? '0',
      asset: t.asset ?? 'ETH',
      direction: 'in' as const,
      timestamp: new Date(t.metadata?.blockTimestamp ?? 0).getTime(),
      blockNum: t.blockNum,
    }));

    const all = [...sent, ...recv]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30);

    return NextResponse.json(all);
  } catch {
    return NextResponse.json([]);
  }
}
