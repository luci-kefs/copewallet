// Staking API — APY fetch + position reads for Lido and Rocket Pool
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { CHAINS } from '@/lib/chains';

const APY_CACHE: Map<string, { apy: number; ts: number }> = new Map();
const APY_TTL = 300_000; // 5 min

function getEthRpc(): string {
  const eth = CHAINS.find(c => c.id === 1);
  return eth ? (process.env[eth.rpcEnvKey] ?? '') : '';
}

// ── APY fetch ────────────────────────────────────────────────────────────────

async function fetchLidoAPY(): Promise<number> {
  const cached = APY_CACHE.get('lido');
  if (cached && Date.now() - cached.ts < APY_TTL) return cached.apy;
  const res = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/sma', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  const data = await res.json();
  const apy = parseFloat(data?.data?.smaApr ?? '0');
  APY_CACHE.set('lido', { apy, ts: Date.now() });
  return apy;
}

async function fetchRocketPoolAPY(): Promise<number> {
  const cached = APY_CACHE.get('rocketpool');
  if (cached && Date.now() - cached.ts < APY_TTL) return cached.apy;
  const res = await fetch('https://api.rocketpool.net/api/apr', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  const data = await res.json();
  // RP returns { yearlyAPR: "3.45" }
  const apy = parseFloat(data?.yearlyAPR ?? data?.apr ?? '0');
  APY_CACHE.set('rocketpool', { apy, ts: Date.now() });
  return apy;
}

// ── ERC-20 balanceOf ─────────────────────────────────────────────────────────

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function getEthValue(uint256) view returns (uint256)'];

async function getStakedPositions(address: string): Promise<{ protocol: string; balance: string; balanceETH: string }[]> {
  const rpcUrl = getEthRpc();
  if (!rpcUrl) return [];

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const positions: { protocol: string; balance: string; balanceETH: string }[] = [];

  // Lido stETH — 1 stETH ≈ 1 ETH (rebasing token)
  try {
    const stETH = new ethers.Contract('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', ERC20_ABI, provider);
    const bal: bigint = await stETH.balanceOf(address);
    if (bal > 0n) {
      const human = ethers.formatEther(bal);
      positions.push({ protocol: 'lido', balance: human, balanceETH: human });
    }
  } catch {}

  // Rocket Pool rETH — need getEthValue to convert to ETH
  try {
    const rETH = new ethers.Contract('0xae78736Cd615f374D3085123A210448E74Fc6393', ERC20_ABI, provider);
    const bal: bigint = await rETH.balanceOf(address);
    if (bal > 0n) {
      let ethVal = bal; // fallback 1:1
      try { ethVal = await rETH.getEthValue(bal); } catch {}
      positions.push({
        protocol: 'rocketpool',
        balance: ethers.formatEther(bal),
        balanceETH: ethers.formatEther(ethVal),
      });
    }
  } catch {}

  return positions;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action');

  if (action === 'apy') {
    const protocol = searchParams.get('protocol');
    try {
      const apy = protocol === 'lido' ? await fetchLidoAPY() : await fetchRocketPoolAPY();
      return NextResponse.json({ apy }, { headers: { 'Cache-Control': 'public, max-age=300' } });
    } catch {
      return NextResponse.json({ apy: 0 });
    }
  }

  if (action === 'positions') {
    const address = searchParams.get('address') ?? '';
    if (!address || !ethers.isAddress(address)) return NextResponse.json([]);
    try {
      const positions = await getStakedPositions(address);
      return NextResponse.json(positions);
    } catch {
      return NextResponse.json([]);
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
