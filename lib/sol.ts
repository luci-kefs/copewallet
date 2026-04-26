// Solana — isolated from EVM system.
// BIP44 m/44'/501'/0'/0' ed25519 derivation from BIP39 mnemonic.

import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';

const RPC = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC, 'confirmed');

export interface SOLWallet {
  address: string;
  keypair: Keypair;
}

export interface SOLBalance {
  sol: number;
  lamports: number;
}

export interface SOLTransaction {
  txid: string;
  amount: number;
  timestamp: number;
  confirmations: number;
}

export function deriveSOLWallet(mnemonic: string): SOLWallet {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const { key } = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
  const keypair = Keypair.fromSeed(key);
  return {
    address: keypair.publicKey.toBase58(),
    keypair,
  };
}

export async function getSOLBalance(address: string): Promise<SOLBalance> {
  const pubkey = new PublicKey(address);
  const lamports = await connection.getBalance(pubkey);
  return { sol: lamports / LAMPORTS_PER_SOL, lamports };
}

export async function sendSOL(from: SOLWallet, to: string, amountSOL: number): Promise<string> {
  const toPubkey = new PublicKey(to);
  const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.keypair.publicKey,
      toPubkey,
      lamports,
    })
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [from.keypair]);
  return sig;
}

export async function getSOLTransactions(address: string, limit = 20): Promise<SOLTransaction[]> {
  try {
    const pubkey = new PublicKey(address);
    const sigs = await connection.getSignaturesForAddress(pubkey, { limit });
    return sigs.map((s) => ({
      txid: s.signature,
      amount: 0, // full amount requires fetching each tx
      timestamp: s.blockTime ?? 0,
      confirmations: s.confirmationStatus === 'finalized' ? 999 : 1,
    }));
  } catch {
    return [];
  }
}

export async function estimateSOLFee(): Promise<number> {
  // SOL fees are very low and fixed (~5000 lamports per signature)
  return 5000 / LAMPORTS_PER_SOL;
}
