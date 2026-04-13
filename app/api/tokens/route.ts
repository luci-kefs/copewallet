// Token Balances API — Alchemy Token API + native balance
import { NextRequest, NextResponse } from 'next/server';
import { CHAINS } from '@/lib/chains';

function getAlchemyUrl(chainId: number): string {
  const chain = CHAINS.find((c) => c.id === chainId);
  if (!chain) return process.env.PRIVATE_RPC_URL ?? '';
  return process.env[chain.rpcEnvKey] ?? '';
}

function isAlchemyUrl(url: string): boolean {
  return url.includes('alchemy.com');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { address, chainId } = await req.json();
  if (!address || !chainId) return NextResponse.json([]);

  const rpcUrl = getAlchemyUrl(chainId);
  const results = [];

  // 1. Native balance via RPC
  try {
    const balRes = await fetch(rpcUrl || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
    });
    const balData = await balRes.json();
    const chain = CHAINS.find((c) => c.id === chainId);
    const rawBal = BigInt(balData.result ?? '0x0');
    const formatted = (Number(rawBal) / 1e18).toFixed(6);
    results.push({
      symbol: chain?.symbol ?? 'ETH',
      name: chain?.name ?? 'Ethereum',
      decimals: 18,
      balance: formatted,
      balanceRaw: balData.result ?? '0x0',
      contractAddress: 'native',
      coingeckoId: chain?.coingeckoId,
    });
  } catch {}

  // 2. ERC-20 token balances (Alchemy only)
  if (rpcUrl && isAlchemyUrl(rpcUrl)) {
    try {
      const tokenRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 2,
          method: 'alchemy_getTokenBalances',
          params: [address, 'erc20'],
        }),
      });
      const tokenData = await tokenRes.json();
      const nonZero = (tokenData.result?.tokenBalances ?? [])
        .filter((t: { tokenBalance: string }) => t.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000')
        .slice(0, 20);

      for (const token of nonZero) {
        try {
          const metaRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 3,
              method: 'alchemy_getTokenMetadata',
              params: [token.contractAddress],
            }),
          });
          const meta = await metaRes.json();
          const decimals = meta.result?.decimals ?? 18;
          const raw = BigInt(token.tokenBalance);
          const formatted = (Number(raw) / Math.pow(10, decimals)).toFixed(4);
          if (parseFloat(formatted) > 0) {
            results.push({
              symbol: meta.result?.symbol ?? '???',
              name: meta.result?.name ?? 'Unknown Token',
              decimals,
              balance: formatted,
              balanceRaw: token.tokenBalance,
              contractAddress: token.contractAddress,
              logo: meta.result?.logo,
            });
          }
        } catch {}
      }
    } catch {}
  }

  return NextResponse.json(results);
}
