// Aptos — isolated from EVM system.
// BIP44 m/44'/637'/0'/0'/0' ed25519 derivation from BIP39 mnemonic.

import { Account, Aptos, AptosConfig, Network, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

const config = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(config);

const OCTA_PER_APT = 100_000_000;

export interface APTOSWallet {
  address: string;    // 0x... format
  account: Account;
}

export interface APTOSBalance {
  apt: number;
  octa: number;
}

export interface APTOSTransaction {
  txid: string;
  amount: number;
  timestamp: number;
  type: string;
  success: boolean;
}

export function deriveAPTOSWallet(mnemonic: string): APTOSWallet {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const { key } = derivePath("m/44'/637'/0'/0'/0'", seed.toString('hex'));
  const privateKey = new Ed25519PrivateKey(key);
  const account = Account.fromPrivateKey({ privateKey });
  return {
    address: account.accountAddress.toString(),
    account,
  };
}

export async function getAPTOSBalance(address: string): Promise<APTOSBalance> {
  try {
    const resources = await aptos.getAccountResource({
      accountAddress: address,
      resourceType: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
    });
    const octa = (resources as { coin?: { value?: string } })?.coin?.value ?? '0';
    return { apt: parseInt(octa) / OCTA_PER_APT, octa: parseInt(octa) };
  } catch {
    return { apt: 0, octa: 0 };
  }
}

export async function sendAPTOS(from: APTOSWallet, to: string, amountAPT: number): Promise<string> {
  const octa = Math.round(amountAPT * OCTA_PER_APT);
  const tx = await aptos.transferCoinTransaction({
    sender: from.account.accountAddress,
    recipient: to,
    amount: octa,
  });
  const signed = aptos.transaction.sign({ signer: from.account, transaction: tx });
  const result = await aptos.transaction.submit.simple({ transaction: tx, senderAuthenticator: signed });
  return result.hash;
}

export async function getAPTOSTransactions(address: string, limit = 20): Promise<APTOSTransaction[]> {
  try {
    const txs = await aptos.getAccountTransactions({ accountAddress: address, options: { limit } });
    return txs.map((tx: Record<string, unknown>) => ({
      txid: (tx.hash as string) ?? '',
      amount: 0,
      timestamp: typeof tx.timestamp === 'string' ? parseInt(tx.timestamp) / 1_000_000 : 0,
      type: (tx.type as string) ?? 'unknown',
      success: (tx.success as boolean) ?? false,
    }));
  } catch {
    return [];
  }
}
