// Ephemeral Signer — Block 28
import { ethers } from 'ethers';
import { zeroFill } from './crypto';
import { ScatteredStore, getReassembledData, wipeScatteredStore } from './memory-vault';
import { getProvider } from './provider';

export async function ephemeralSign(
  store: ScatteredStore,
  transaction: ethers.TransactionRequest
): Promise<string> {
  let keyBytes: Uint8Array | null = null;

  try {
    // Reassemble private key into Uint8Array — never as a persistent string
    const rawKey = getReassembledData(store);
    const encoder = new TextEncoder();
    keyBytes = encoder.encode(rawKey);

    // Create wallet from private key bytes
    const hexKey = '0x' + Array.from(keyBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const wallet = new ethers.Wallet(hexKey, getProvider());
    const signed = await wallet.signTransaction(transaction);

    return signed;
  } finally {
    // Zero-fill immediately after signing — Block 28 Task 1
    if (keyBytes) {
      zeroFill(keyBytes);
      keyBytes = null;
    }
    // Wipe the assembled store reference
    wipeScatteredStore(store);
  }
}
