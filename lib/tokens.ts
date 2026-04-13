// Token balance fetching via Alchemy Token API
import { ethers } from 'ethers';

export interface TokenBalance {
  symbol: string;
  name: string;
  decimals: number;
  balance: string;       // formatted
  balanceRaw: string;    // raw hex
  contractAddress: string | 'native';
  logo?: string;
  coingeckoId?: string;
}

// Fetch native + ERC-20 token balances via Alchemy
export async function fetchTokenBalances(
  address: string,
  chainId: number
): Promise<TokenBalance[]> {
  try {
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, chainId }),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// Fetch transaction history via Alchemy
export interface TxRecord {
  hash: string;
  from: string;
  to: string;
  value: string;
  asset: string;
  direction: 'in' | 'out';
  timestamp: number;
  blockNum: string;
}

export async function fetchTxHistory(
  address: string,
  chainId: number
): Promise<TxRecord[]> {
  try {
    const res = await fetch('/api/txhistory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, chainId }),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
