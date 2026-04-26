// Hedera (HBAR) — isolated from EVM system.
// Uses REST mirror API only (no heavy SDK).
// BIP44 m/44'/3030'/0'/0/0 derivation from BIP39 mnemonic.

import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { ethers } from 'ethers';

const MIRROR = 'https://mainnet-public.mirrornode.hedera.com/api/v1';
const TINYBAR_PER_HBAR = 100_000_000;

export interface HBARWallet {
  accountId: string | null;    // 0.0.XXXXXX — only after first transaction
  evmAddress: string;          // 0x... EVM-compatible address
  privateKeyHex: string;
  publicKeyHex: string;
}

export interface HBARBalance {
  hbar: number;
  tinybar: number;
}

export interface HBARTransaction {
  txid: string;
  amount: number;
  timestamp: number;
  type: string;
}

export function deriveHBARWallet(mnemonic: string): HBARWallet {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const { key } = derivePath("m/44'/3030'/0'/0/0", seed.toString('hex'));

  // Use ethers to get EVM-compatible key/address from ed25519 seed
  // Hedera supports both ed25519 and ECDSA secp256k1
  // We'll use secp256k1 for EVM compatibility
  const wallet = new ethers.Wallet(Buffer.from(key).toString('hex').padStart(64, '0'));
  return {
    accountId: null,
    evmAddress: wallet.address,
    privateKeyHex: wallet.privateKey,
    publicKeyHex: wallet.signingKey.compressedPublicKey,
  };
}

export async function getHBARBalance(evmAddress: string): Promise<HBARBalance> {
  try {
    const res = await fetch(`${MIRROR}/accounts/${evmAddress}`);
    if (!res.ok) return { hbar: 0, tinybar: 0 };
    const json = await res.json();
    const tinybar = json?.balance?.balance ?? 0;
    return { hbar: tinybar / TINYBAR_PER_HBAR, tinybar };
  } catch {
    return { hbar: 0, tinybar: 0 };
  }
}

export async function getHBARTransactions(evmAddress: string, limit = 20): Promise<HBARTransaction[]> {
  try {
    const res = await fetch(`${MIRROR}/transactions?account.id=${evmAddress}&limit=${limit}&order=desc`);
    if (!res.ok) return [];
    const json = await res.json();
    const txs = json?.transactions ?? [];
    return txs.map((tx: Record<string, unknown>) => ({
      txid: tx.transaction_id as string ?? '',
      amount: 0, // requires deeper parsing of transfers array
      timestamp: typeof tx.consensus_timestamp === 'string'
        ? parseFloat(tx.consensus_timestamp)
        : 0,
      type: tx.name as string ?? 'UNKNOWN',
    }));
  } catch {
    return [];
  }
}

// HBAR send requires Hedera SDK or REST — using HashIO JSON-RPC for EVM-compatible send
export async function sendHBAR(from: HBARWallet, to: string, amountHBAR: number): Promise<string> {
  // Hedera supports EVM transactions via JSON-RPC relay
  const RPC = 'https://mainnet.hashio.io/api';
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(from.privateKeyHex, provider);

  const tx = await wallet.sendTransaction({
    to,
    value: ethers.parseUnits(amountHBAR.toString(), 8), // HBAR has 8 decimals in EVM
  });

  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}
