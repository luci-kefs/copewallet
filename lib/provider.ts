// RPC Proxy-Provider — Block 3
import { ethers } from 'ethers';

// Custom provider pointing to our internal /api/proxy
export class GhostProvider extends ethers.JsonRpcProvider {
  constructor() {
    super('/api/proxy', undefined, { staticNetwork: true });
  }

  // Override _send to route through our proxy with camouflaged payload
  async send(method: string, params: Array<unknown>): Promise<unknown> {
    const payload = {
      logType: 'system_event',
      data: btoa(JSON.stringify({ method, params })),
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

let _provider: GhostProvider | null = null;

export function getProvider(): GhostProvider {
  if (!_provider) {
    _provider = new GhostProvider();
  }
  return _provider;
}

export async function getStaticBalance(address: string): Promise<string> {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch {
    return '0.0000';
  }
}
