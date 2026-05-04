// Liquid staking helpers — Lido (stETH) + Rocket Pool (rETH)
// All reads via direct contract calls; writes go through ephemeralSign / ledgerSign.

export interface StakingProtocol {
  id: 'lido' | 'rocketpool';
  name: string;
  token: string;          // receipt token symbol
  tokenAddress: string;   // mainnet contract
  color: string;
  apy: number | null;     // fetched from each protocol's public stats API
  description: string;
}

export interface StakedPosition {
  protocol: 'lido' | 'rocketpool';
  balance: string;        // receipt token units (human-readable)
  balanceETH: string;     // equivalent ETH
  balanceUSD: number;
}

// ── Protocol definitions ────────────────────────────────────────────────────

export const STAKING_PROTOCOLS: StakingProtocol[] = [
  {
    id: 'lido',
    name: 'Lido',
    token: 'stETH',
    tokenAddress: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    color: '#00a3ff',
    apy: null,
    description: 'Largest liquid staking protocol. Stake any amount, receive stETH 1:1.',
  },
  {
    id: 'rocketpool',
    name: 'Rocket Pool',
    token: 'rETH',
    tokenAddress: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    color: '#ff6c1a',
    apy: null,
    description: 'Decentralized staking, no minimum. rETH accrues ETH yield over time.',
  },
];

// ── APY fetch ────────────────────────────────────────────────────────────────

export async function fetchStakingAPYs(): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  try {
    const [lidoRes, rpRes] = await Promise.allSettled([
      fetch('/api/staking?action=apy&protocol=lido').then(r => r.json()),
      fetch('/api/staking?action=apy&protocol=rocketpool').then(r => r.json()),
    ]);
    if (lidoRes.status === 'fulfilled') result['lido'] = lidoRes.value.apy ?? 0;
    if (rpRes.status === 'fulfilled')   result['rocketpool'] = rpRes.value.apy ?? 0;
  } catch {}
  return result;
}

// ── Positions fetch ──────────────────────────────────────────────────────────

export async function fetchStakedPositions(address: string, ethPrice: number): Promise<StakedPosition[]> {
  try {
    const res = await fetch(`/api/staking?action=positions&address=${address}`);
    if (!res.ok) return [];
    const data: { protocol: 'lido' | 'rocketpool'; balance: string; balanceETH: string }[] = await res.json();
    return data.map(d => ({
      ...d,
      balanceUSD: parseFloat(d.balanceETH) * ethPrice,
    }));
  } catch {
    return [];
  }
}

// ── Stake tx params ──────────────────────────────────────────────────────────

// Returns calldata for staking `amountWei` ETH into the given protocol
export function buildStakeTx(
  protocol: 'lido' | 'rocketpool',
  amountWei: bigint,
  referral?: string,
): { to: string; data: string; value: bigint } {
  if (protocol === 'lido') {
    // Lido: submit(address _referral) payable
    const ref = referral ?? '0x0000000000000000000000000000000000000000';
    const selector = '0xa1903eab'; // keccak256('submit(address)').slice(0,4)
    const paddedRef = ref.toLowerCase().replace('0x', '').padStart(64, '0');
    return {
      to: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      data: `0x${selector.slice(2)}${paddedRef}`,
      value: amountWei,
    };
  } else {
    // Rocket Pool: deposit() payable on RocketDepositPool
    return {
      to: '0xDD3f50F8A6CafbE9b31a427582963f465E745AF8', // RocketDepositPool mainnet
      data: '0xd0e30db0',                               // keccak256('deposit()').slice(0,4)
      value: amountWei,
    };
  }
}
