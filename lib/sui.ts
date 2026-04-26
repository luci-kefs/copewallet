// Sui — isolated from EVM system.
// Uses Ed25519 derivation from BIP39 mnemonic (Sui standard path).
// Balance/TX via Sui JSON-RPC; signing via @mysten/sui CoreClient.

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

const RPC = 'https://fullnode.mainnet.sui.io';
const MIST_PER_SUI = 1_000_000_000;

export interface SUIWallet {
  address: string;
  keypair: Ed25519Keypair;
}

export interface SUIBalance {
  sui: number;
  mist: bigint;
}

export interface SUITransaction {
  txid: string;
  amount: number;
  timestamp: number;
  type: string;
}

export function deriveSUIWallet(mnemonic: string): SUIWallet {
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic.trim());
  return {
    address: keypair.getPublicKey().toSuiAddress(),
    keypair,
  };
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json() as { result?: T; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result as T;
}

export async function getSUIBalance(address: string): Promise<SUIBalance> {
  try {
    const result = await rpc<{ totalBalance: string }>('suix_getBalance', [address, '0x2::sui::SUI']);
    const mist = BigInt(result.totalBalance);
    return { sui: Number(mist) / MIST_PER_SUI, mist };
  } catch {
    return { sui: 0, mist: 0n };
  }
}

export async function sendSUI(from: SUIWallet, to: string, amountSUI: number): Promise<string> {
  // Dynamically import to bypass abstract class TypeScript constraint
  const { CoreClient } = await import('@mysten/sui/client');
  const client = new (CoreClient as unknown as new (opts: { network: string }) => {
    signAndExecuteTransaction: (opts: { signer: Ed25519Keypair; transaction: Transaction }) => Promise<{ digest: string }>;
  })({ network: 'mainnet' });

  const mist = BigInt(Math.round(amountSUI * MIST_PER_SUI));
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [mist]);
  tx.transferObjects([coin], to);
  tx.setSender(from.address);

  const result = await client.signAndExecuteTransaction({
    signer: from.keypair,
    transaction: tx,
  });

  return result.digest;
}

export async function getSUITransactions(address: string, limit = 20): Promise<SUITransaction[]> {
  try {
    interface SuiTxPage { data: { digest: string; timestampMs?: string }[] }
    const result = await rpc<SuiTxPage>('suix_queryTransactionBlocks', [
      { filter: { FromAddress: address } },
      null,
      limit,
      true,
    ]);
    return result.data.map((tx) => ({
      txid: tx.digest,
      amount: 0,
      timestamp: tx.timestampMs ? Number(tx.timestampMs) / 1000 : 0,
      type: 'Transaction',
    }));
  } catch {
    return [];
  }
}
