export interface GasPrices {
  slow: number;
  medium: number;
  fast: number;
  baseFee: number;
}

const CACHE: Map<number, { data: GasPrices; ts: number }> = new Map();
const CACHE_TTL = 15_000;

export async function getGasPrices(chainId: number): Promise<GasPrices> {
  const cached = CACHE.get(chainId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  try {
    const res = await fetch(`/api/gas?chainId=${chainId}`);
    const data: GasPrices = await res.json();
    CACHE.set(chainId, { data, ts: Date.now() });
    return data;
  } catch {
    return { slow: 0, medium: 0, fast: 0, baseFee: 0 };
  }
}
