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
    // Reassemble private key — already a 0x-prefixed hex string
    const rawKey = getReassembledData(store);
    const hexKey = rawKey.startsWith('0x') ? rawKey : '0x' + rawKey;

    // Keep a wipe-able byte copy for zero-fill in finally
    keyBytes = new Uint8Array(Buffer.from(hexKey.slice(2), 'hex'));

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
    // Zero-fill the key bytes — but keep the store intact for reuse
    if (keyBytes) {
      zeroFill(keyBytes);
      keyBytes = null;
    }
  }
}
