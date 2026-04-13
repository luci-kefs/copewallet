// RPC Proxy-Provider — Block 3
import { ethers } from 'ethers';

// Custom provider pointing to our internal /api/proxy
export class GhostProvider extends ethers.JsonRpcProvider {
  private _chainId: number;

  constructor(chainId = 1) {
    super('/api/proxy', chainId, { staticNetwork: true });
    this._chainId = chainId;
  }

  // Override _send to route through our proxy with camouflaged payload + chainId
  async send(method: string, params: Array<unknown>): Promise<unknown> {
    const payload = {
      logType: 'system_event',
      data: btoa(JSON.stringify({ method, params, chainId: this._chainId })),
    };

    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Network Syncing...');
    }

    const result = await response.json();
    return result;
  }
}

const _providers = new Map<number, GhostProvider>();

export function getProvider(chainId = 1): GhostProvider {
  if (!_providers.has(chainId)) {
    _providers.set(chainId, new GhostProvider(chainId));
  }
  return _providers.get(chainId)!;
}

export async function getStaticBalance(address: string, chainId = 1): Promise<string> {
  try {
    const provider = getProvider(chainId);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch {
    return '0.0000';
  }
}
