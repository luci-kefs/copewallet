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
    const account = await server.loadAccount(address);
    const xlmBalance = account.balances.find((b: { asset_type: string }) => b.asset_type === 'native');
    return {
      xlm: xlmBalance ? parseFloat((xlmBalance as { balance: string }).balance) : 0,
      isActivated: true,
    };
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e && (e as { response?: { status?: number } }).response?.status === 404) {
      return { xlm: 0, isActivated: false };
    }
    throw e;
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
    const payments = await server
      .payments()
      .forAccount(address)
      .limit(limit)
      .order('desc')
      .call();

    return (payments.records as unknown as Record<string, unknown>[])
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
