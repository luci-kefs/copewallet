// Stellar — isolated from EVM system.
// BIP44 m/44'/148'/0' ed25519 derivation from BIP39 mnemonic.

import * as StellarSdk from '@stellar/stellar-sdk';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');

export interface XLMWallet {
  address: string;   // G... format (56 chars)
  secretKey: string; // S... format
}

export interface XLMBalance {
  xlm: number;
  isActivated: boolean;
}

export interface XLMTransaction {
  txid: string;
  amount: number;
  timestamp: number;
  type: 'sent' | 'received' | 'other';
}

export function deriveXLMWallet(mnemonic: string): XLMWallet {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const { key } = derivePath("m/44'/148'/0'", seed.toString('hex'));
  const keypair = StellarSdk.Keypair.fromRawEd25519Seed(key);
  return {
    address: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

export async function getXLMBalance(address: string): Promise<XLMBalance> {
  try {
    // Raw fetch to avoid Horizon SDK logging 404s for unfunded accounts
    const res = await fetch(`https://horizon.stellar.org/accounts/${address}`);
    if (res.status === 404) return { xlm: 0, isActivated: false };
    if (!res.ok) return { xlm: 0, isActivated: false };
    const data = await res.json() as { balances?: { asset_type: string; balance: string }[] };
    const xlmBalance = data.balances?.find(b => b.asset_type === 'native');
    return {
      xlm: xlmBalance ? parseFloat(xlmBalance.balance) : 0,
      isActivated: true,
    };
  } catch {
    return { xlm: 0, isActivated: false };
  }
}

export async function sendXLM(from: XLMWallet, to: string, amountXLM: number): Promise<string> {
  const sourceKeypair = StellarSdk.Keypair.fromSecret(from.secretKey);
  const sourceAccount = await server.loadAccount(from.address);

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.PUBLIC,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: to,
        asset: StellarSdk.Asset.native(),
        amount: amountXLM.toFixed(7),
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(sourceKeypair);
  const result = await server.submitTransaction(transaction);
  return result.hash;
}

export async function getXLMTransactions(address: string, limit = 20): Promise<XLMTransaction[]> {
  try {
    const res = await fetch(
      `https://horizon.stellar.org/accounts/${address}/payments?limit=${limit}&order=desc`
    );
    if (!res.ok) return [];
    const data = await res.json() as { _embedded?: { records?: Record<string, unknown>[] } };
    const records = data._embedded?.records ?? [];
    return records
      .filter((p) => p['type'] === 'payment' && p['asset_type'] === 'native')
      .map((p) => ({
        txid: p['transaction_hash'] as string ?? '',
        amount: parseFloat(p['amount'] as string ?? '0') * (p['from'] === address ? -1 : 1),
        timestamp: p['created_at'] ? new Date(p['created_at'] as string).getTime() / 1000 : 0,
        type: (p['from'] === address ? 'sent' : 'received') as 'sent' | 'received',
      }));
  } catch {
    return [];
  }
}
