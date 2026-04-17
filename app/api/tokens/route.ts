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

// Server-side CoinGecko ID cache: symbol → coingeckoId
const CG_ID_CACHE = new Map<string, { id: string; ts: number }>();
const CG_TTL = 24 * 60 * 60 * 1000; // 24h — coin IDs rarely change

// Well-known symbols → CoinGecko IDs to avoid API calls
const KNOWN_IDS: Record<string, string> = {
  ETH: 'ethereum', WETH: 'weth', BTC: 'bitcoin', WBTC: 'wrapped-bitcoin',
  USDT: 'tether', USDC: 'usd-coin', DAI: 'dai', BUSD: 'binance-usd',
  BNB: 'binancecoin', MATIC: 'matic-network', POL: 'matic-network',
  AVAX: 'avalanche-2', SOL: 'solana', DOT: 'polkadot', LINK: 'chainlink',
  UNI: 'uniswap', AAVE: 'aave', CRV: 'curve-dao-token', MKR: 'maker',
  SNX: 'havven', COMP: 'compound-governance-token', YFI: 'yearn-finance',
  SUSHI: 'sushi', '1INCH': '1inch', BAL: 'balancer', REN: 'republic-protocol',
  LRC: 'loopring', ZRX: '0x', ENJ: 'enjincoin', MANA: 'decentraland',
  SAND: 'the-sandbox', AXS: 'axie-infinity', SHIB: 'shiba-inu',
  PEPE: 'pepe', FLOKI: 'floki', DOGE: 'dogecoin', ARB: 'arbitrum',
  OP: 'optimism', APT: 'aptos', SUI: 'sui', INJ: 'injective-protocol',
  BLUR: 'blur', LDO: 'lido-dao', RPL: 'rocket-pool', FRAX: 'frax',
  FXS: 'frax-share', CVX: 'convex-finance', FTM: 'fantom', GNO: 'gnosis',
  CELO: 'celo', CRO: 'crypto-com-chain', GLMR: 'moonbeam', METIS: 'metis-token',
  MNT: 'mantle', KAVA: 'kava', KLAY: 'klay-token', FUSE: 'fuse-network-token',
  EVMOS: 'evmos', STG: 'stargate-finance', GMX: 'gmx', RDNT: 'radiant-capital',
  WLD: 'worldcoin-wld', PYTH: 'pyth-network', JTO: 'jito-governance-token',
  EIGEN: 'eigenlayer', PENDLE: 'pendle', ENA: 'ethena', ETHFI: 'ether-fi',
  REZ: 'renzo-restaked-eth', OMNI: 'omni-network',
};

async function resolveCoingeckoId(symbol: string, contractAddress: string, chainId: number): Promise<string | undefined> {
  const upper = symbol.toUpperCase();

  // 1. Known map
  if (KNOWN_IDS[upper]) return KNOWN_IDS[upper];

  // 2. Cache
  const cached = CG_ID_CACHE.get(upper);
  if (cached && Date.now() - cached.ts < CG_TTL) return cached.id;

  // 3. CoinGecko contract lookup — most accurate for unknown ERC-20s
  const PLATFORM: Record<number, string> = {
    1: 'ethereum', 8453: 'base', 42161: 'arbitrum-one',
    10: 'optimistic-ethereum', 137: 'polygon-pos', 56: 'binance-smart-chain',
    43114: 'avalanche', 250: 'fantom',
  };
  const platform = PLATFORM[chainId];
  if (platform && contractAddress && contractAddress !== 'native') {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${platform}/contract/${contractAddress.toLowerCase()}`,
        { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.id) {
          CG_ID_CACHE.set(upper, { id: data.id, ts: Date.now() });
          return data.id;
        }
      }
    } catch {}
  }

  // 4. CoinGecko search by symbol
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      const coins: Array<{ id: string; symbol: string; market_cap_rank?: number }> = data?.coins ?? [];
      // Pick the one whose symbol exactly matches with highest market cap rank
      const match = coins
        .filter(c => c.symbol.toUpperCase() === upper)
        .sort((a, b) => (a.market_cap_rank ?? 9999) - (b.market_cap_rank ?? 9999))[0];
      if (match) {
        CG_ID_CACHE.set(upper, { id: match.id, ts: Date.now() });
        return match.id;
      }
    }
  } catch {}

  return undefined;
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
        .filter((t: { tokenBalance: string }) =>
          t.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000')
        .slice(0, 20);

      // Resolve metadata + coingeckoId in parallel
      await Promise.all(nonZero.map(async (token: { contractAddress: string; tokenBalance: string }) => {
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
          const formatted = (Number(raw) / Math.pow(10, decimals)).toFixed(6);
          if (parseFloat(formatted) > 0) {
            const symbol: string = meta.result?.symbol ?? '???';
            // Resolve real CoinGecko ID for accurate USD pricing
            const coingeckoId = await resolveCoingeckoId(symbol, token.contractAddress, chainId);
            results.push({
              symbol,
              name: meta.result?.name ?? 'Unknown Token',
              decimals,
              balance: formatted,
              balanceRaw: token.tokenBalance,
              contractAddress: token.contractAddress,
              logo: meta.result?.logo ?? null,
              coingeckoId: coingeckoId ?? null,
            });
          }
        } catch {}
      }));
    } catch {}
  }

  return NextResponse.json(results);
}
