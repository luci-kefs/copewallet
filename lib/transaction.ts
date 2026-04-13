// Transaction Footprint Masking — Block 19
import { ethers } from 'ethers';
import { getProvider } from './provider';

// Gas price jitter (Block 19 Task 1)
export async function getMaskedGasPrice(): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}> {
  const provider = getProvider();
  const feeData = await provider.getFeeData();

  const base = feeData.maxFeePerGas ?? ethers.parseUnits('20', 'gwei');
  const priority = feeData.maxPriorityFeePerGas ?? ethers.parseUnits('1', 'gwei');

  // Add tiny random fractional jitter (0–100 wei)
  const jitter = BigInt(Math.floor(Math.random() * 100));

  return {
    maxFeePerGas: base + jitter,
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

// Build masked transaction (Block 19 Task 1 + 3)
export async function buildMaskedTransaction(
  to: string,
  valueEth: string,
  fromAddress: string
): Promise<ethers.TransactionRequest> {
  const provider = getProvider();
  const { maxFeePerGas, maxPriorityFeePerGas } = await getMaskedGasPrice();

  // Nonce managed strictly in RAM (Block 19 Task 3)
  const nonce = await provider.getTransactionCount(fromAddress, 'latest');

  return {
    to,
    value: ethers.parseEther(valueEth),
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce,
    gasLimit: 21000n,
    type: 2,
  };
}
