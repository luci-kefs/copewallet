// Ephemeral Signer — Block 28
import { ethers } from 'ethers';
import { zeroFill } from './crypto';
import { ScatteredStore, getReassembledData } from './memory-vault';

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

    // Strip 'from' — ethers v6 calls populateTransaction if 'from' is present
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { from: _from, ...cleanTx } = transaction as ethers.TransactionRequest & { from?: string };

    // Use Wallet without provider — signTransaction works offline for type-2 tx
    const wallet = new ethers.Wallet(hexKey);
    return await wallet.signTransaction({
      ...cleanTx,
      type: 2,
      accessList: cleanTx.accessList ?? [],
    });
  } finally {
    if (keyBytes) {
      zeroFill(keyBytes);
      keyBytes = null;
    }
    // Do NOT wipe the store — it must remain valid for subsequent sends
  }
}
