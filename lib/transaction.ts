// Transaction Footprint Masking — Block 19
import { ethers } from 'ethers';
import { getProvider } from './provider';

// Gas price jitter (Block 19 Task 1)
export async function getMaskedGasPrice(chainId = 1): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}> {
  const provider = getProvider(chainId);

  // Use raw RPC calls — avoids getFeeData() which parses block headers (parentHash issue in ethers v6)
  let baseFee: bigint;
  let priority: bigint;
  try {
    const [gasPriceHex, priorityHex] = await Promise.all([
      provider.send('eth_gasPrice', []) as Promise<string>,
      provider.send('eth_maxPriorityFeePerGas', []) as Promise<string>,
    ]);
    baseFee = BigInt(gasPriceHex);
    priority = BigInt(priorityHex);
  } catch {
    baseFee = ethers.parseUnits('20', 'gwei');
    priority = ethers.parseUnits('1', 'gwei');
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

// Estimate network fee in ETH (maxFeePerGas × gasLimit)
export async function estimateFee(chainId = 1, isErc20 = false): Promise<{ eth: string; wei: bigint }> {
  const { maxFeePerGas } = await getMaskedGasPrice(chainId);
  const gasLimit = isErc20 ? 100000n : 21000n;
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
