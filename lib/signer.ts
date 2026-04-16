// Ephemeral Signer — Block 28
import { ethers } from 'ethers';
import { zeroFill } from './crypto';
import { ScatteredStore, getReassembledData, wipeScatteredStore } from './memory-vault';
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

    // No provider needed for signing — avoids block/parentHash fetches
    // Strip 'from' field — ethers v6 triggers populateTransaction (block fetch) if 'from' is present
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { from: _from, ...cleanTx } = transaction as ethers.TransactionRequest & { from?: string };
    const wallet = new ethers.Wallet(hexKey);
    const signed = await wallet.signTransaction(cleanTx);

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
