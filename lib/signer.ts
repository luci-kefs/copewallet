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

    const hexKey = '0x' + Array.from(keyBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Build a concrete ethers.Transaction (avoids any populateTransaction path)
    const tx = ethers.Transaction.from({
      to:                   transaction.to as string,
      value:                transaction.value ?? 0n,
      nonce:                transaction.nonce as number,
      gasLimit:             transaction.gasLimit ?? 21000n,
      maxFeePerGas:         transaction.maxFeePerGas as bigint,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas as bigint,
      chainId:              transaction.chainId as bigint | number,
      type:                 2,
      accessList:           [],
      data:                 transaction.data ?? '0x',
    });

    // Sign the serialized unsigned tx directly — zero provider interaction
    const signingKey = new ethers.SigningKey(hexKey);
    const digest = ethers.keccak256(tx.unsignedSerialized);
    const sig = signingKey.sign(digest);
    tx.signature = sig;

    return tx.serialized;
  } finally {
    if (keyBytes) {
      zeroFill(keyBytes);
      keyBytes = null;
    }
    wipeScatteredStore(store);
  }
}
