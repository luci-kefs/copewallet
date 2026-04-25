import { ethers } from 'ethers';

const STORAGE_KEY = '__cw_custom_tokens__';

export interface CustomToken {
  chainId: number;
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

export function loadCustomTokens(chainId?: number): CustomToken[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as CustomToken[];
    return chainId !== undefined ? all.filter(t => t.chainId === chainId) : all;
  } catch { return []; }
}

export function saveCustomToken(token: CustomToken): void {
  try {
    const existing = loadCustomTokens().filter(
      t => !(t.chainId === token.chainId && t.contractAddress.toLowerCase() === token.contractAddress.toLowerCase())
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, token]));
  } catch {}
}

export function deleteCustomToken(chainId: number, contractAddress: string): void {
  try {
    const updated = loadCustomTokens().filter(
      t => !(t.chainId === chainId && t.contractAddress.toLowerCase() === contractAddress.toLowerCase())
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
];

export async function fetchTokenInfo(
  rpcUrl: string,
  contractAddress: string
): Promise<{ symbol: string; name: string; decimals: number }> {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
  const [symbol, name, decimals] = await Promise.all([
    contract.symbol(),
    contract.name(),
    contract.decimals(),
  ]);
  return { symbol: String(symbol), name: String(name), decimals: Number(decimals) };
}
