// Transaction Footprint Masking — Block 19
import { ethers } from 'ethers';
import { getProvider } from './provider';

// Chain-specific gas fallbacks (gwei) — used when RPC call fails
const GAS_FALLBACKS: Record<number, { base: string; priority: string }> = {
  1:        { base: '20',    priority: '1'      }, // Ethereum
  8453:     { base: '0.005', priority: '0.001'  }, // Base
  42161:    { base: '0.01',  priority: '0.001'  }, // Arbitrum
  10:       { base: '0.005', priority: '0.001'  }, // Optimism
  137:      { base: '50',    priority: '30'     }, // Polygon
  324:      { base: '0.05',  priority: '0.01'   }, // zkSync
  59144:    { base: '0.05',  priority: '0.01'   }, // Linea
  534352:   { base: '0.05',  priority: '0.01'   }, // Scroll
  81457:    { base: '0.005', priority: '0.001'  }, // Blast
  56:       { base: '3',     priority: '1'      }, // BNB
  43114:    { base: '25',    priority: '2'      }, // Avalanche
  11155111: { base: '10',    priority: '1'      }, // Sepolia
  84532:    { base: '0.005', priority: '0.001'  }, // Base Sepolia
  421614:   { base: '0.01',  priority: '0.001'  }, // Arb Sepolia
};
const DEFAULT_FALLBACK = { base: '10', priority: '1' };

// Gas price jitter (Block 19 Task 1)
export async function getMaskedGasPrice(chainId = 1): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}> {
  const provider = getProvider(chainId);
  const fb = GAS_FALLBACKS[chainId] ?? DEFAULT_FALLBACK;

  let baseFee: bigint;
  let priority: bigint;
  try {
    // Try both calls; if priority fails fall back gracefully
    const gasPriceHex = await (provider.send('eth_gasPrice', []) as Promise<string>);
    baseFee = BigInt(gasPriceHex);
    try {
      const priorityHex = await (provider.send('eth_maxPriorityFeePerGas', []) as Promise<string>);
      priority = BigInt(priorityHex);
    } catch {
      priority = ethers.parseUnits(fb.priority, 'gwei');
    }
  } catch {
    baseFee = ethers.parseUnits(fb.base, 'gwei');
    priority = ethers.parseUnits(fb.priority, 'gwei');
  }

  // Add tiny random fractional jitter (0–100 wei)
  const jitter = BigInt(Math.floor(Math.random() * 100));

  return {
    maxFeePerGas: baseFee + jitter,
    maxPriorityFeePerGas: priority + jitter,
  };
}

// Stealth delay before broadcast (Block 19 Task 2) — 1–7 seconds
export async function stealthDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * 6000) + 1000;
  return new Promise((r) => setTimeout(r, ms));
}

// Dummy dry-run echoes to confuse traffic analysis (Block 19 Task 4)
const DUMMY_CONTRACTS = [
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000001',
];

export async function fireDummyEchoes(): Promise<void> {
  const provider = getProvider();
  const count = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < count; i++) {
    try {
      await provider.call({
        to: DUMMY_CONTRACTS[Math.floor(Math.random() * DUMMY_CONTRACTS.length)],
        data: '0x',
      });
    } catch {}
  }
}

// Estimate network fee — uses eth_estimateGas when tx params known, fallback otherwise
export async function estimateFee(
  chainId = 1,
  isErc20 = false,
  txParams?: { from: string; to: string; value?: bigint; data?: string }
): Promise<{ eth: string; wei: bigint }> {
  const provider = getProvider(chainId);
  const { maxFeePerGas } = await getMaskedGasPrice(chainId);

  let gasLimit: bigint;
  if (txParams) {
    try {
      const estimated = await provider.send('eth_estimateGas', [{
        from: txParams.from,
        to: txParams.to,
        value: txParams.value ? '0x' + txParams.value.toString(16) : '0x0',
        data: txParams.data ?? '0x',
      }]) as string;
      gasLimit = BigInt(estimated);
      // Add 20% buffer so tx doesn't run out of gas
      gasLimit = gasLimit * 12n / 10n;
    } catch {
      gasLimit = isErc20 ? 100000n : 21000n;
    }
  } else {
    gasLimit = isErc20 ? 100000n : 21000n;
  }

  const wei = maxFeePerGas * gasLimit;
  const eth = ethers.formatEther(wei);
  return { eth, wei };
}

// ERC-20 transfer(address,uint256) selector
const ERC20_TRANSFER_SELECTOR = '0xa9059cbb';

function encodeErc20Transfer(recipient: string, amountRaw: bigint): string {
  const addr = recipient.toLowerCase().replace('0x', '').padStart(64, '0');
  const amt = amountRaw.toString(16).padStart(64, '0');
  return ERC20_TRANSFER_SELECTOR + addr + amt;
}

// Build masked transaction — native ETH or ERC-20 token
export async function buildMaskedTransaction(
  to: string,
  valueStr: string,       // human-readable amount (e.g. "1.5")
  fromAddress: string,
  chainId = 1,
  tokenContract?: string, // undefined = native; '0x...' = ERC-20 contract
  tokenDecimals = 18,
): Promise<ethers.TransactionRequest> {
  const provider = getProvider(chainId);
  const { maxFeePerGas, maxPriorityFeePerGas } = await getMaskedGasPrice(chainId);
  const nonce = await provider.getTransactionCount(fromAddress, 'latest');
  const jitter = BigInt(Math.floor(Math.random() * 100));

  if (tokenContract && tokenContract !== 'native') {
    // ERC-20 transfer
    const amountRaw = ethers.parseUnits(valueStr, tokenDecimals);
    const data = encodeErc20Transfer(to, amountRaw);
    return {
      to: tokenContract,
      value: 0n,
      data,
      maxFeePerGas: maxFeePerGas + jitter,
      maxPriorityFeePerGas: maxPriorityFeePerGas + jitter,
      nonce,
      gasLimit: 100000n,  // ERC-20 needs more gas than native
      type: 2,
      chainId,
      accessList: [],
    };
  }

  // Native transfer
  return {
    to,
    value: ethers.parseEther(valueStr),
    maxFeePerGas: maxFeePerGas + jitter,
    maxPriorityFeePerGas: maxPriorityFeePerGas + jitter,
    nonce,
    gasLimit: 21000n,
    type: 2,
    chainId,
    accessList: [],
  };
}
