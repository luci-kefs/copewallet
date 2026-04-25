const STORAGE_KEY = '__cw_custom_chains__';

export interface CustomChain {
  id: number;
  name: string;
  shortName: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  color: string;
  decimals: number;
}

export function loadCustomChains(): CustomChain[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomChain[];
  } catch { return []; }
}

export function saveCustomChain(chain: CustomChain): void {
  try {
    const existing = loadCustomChains().filter(c => c.id !== chain.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, chain]));
  } catch {}
}

export function deleteCustomChain(id: number): void {
  try {
    const updated = loadCustomChains().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}
