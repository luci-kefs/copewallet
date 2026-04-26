// XRP Ledger — isolated from EVM system.
// BIP44 m/44'/144'/0'/0/0 derivation from BIP39 mnemonic.

import { Client, Wallet, dropsToXrp, xrpToDrops } from 'xrpl';

const SERVER = 'wss://xrplcluster.com';

export interface XRPWalletData {
  address: string;   // r... format
  seed: string;
  privateKey: string;
  publicKey: string;
}

export interface XRPBalance {
  xrp: number;
  drops: string;
}

export interface XRPTransaction {
  txid: string;
  amount: number;
  timestamp: number;
  confirmations: number;
  type: 'sent' | 'received';
}

export function deriveXRPWallet(mnemonic: string): XRPWalletData {
  const wallet = Wallet.fromMnemonic(mnemonic.trim(), { mnemonicEncoding: 'bip39' });
  return {
    address: wallet.address,
    seed: wallet.seed ?? '',
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
  };
}

export async function getXRPBalance(address: string): Promise<XRPBalance> {
  const client = new Client(SERVER);
  try {
    await client.connect();
    const response = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated',
    });
    const drops = String(response.result.account_data.Balance);
    return { xrp: parseFloat(String(dropsToXrp(drops))), drops };
  } catch {
    return { xrp: 0, drops: '0' };
  } finally {
    await client.disconnect();
  }
}

export async function sendXRP(from: XRPWalletData, to: string, amountXRP: number): Promise<string> {
  const client = new Client(SERVER);
  try {
    await client.connect();
    const wallet = Wallet.fromSeed(from.seed);
    const prepared = await client.autofill({
      TransactionType: 'Payment',
      Account: from.address,
      Amount: xrpToDrops(String(amountXRP)),
      Destination: to,
    });
    const { tx_blob } = wallet.sign(prepared);
    const result = await client.submitAndWait(tx_blob);
    return (result.result.hash as string) ?? '';
  } finally {
    await client.disconnect();
  }
}

export async function getXRPTransactions(address: string, limit = 20): Promise<XRPTransaction[]> {
  const client = new Client(SERVER);
  try {
    await client.connect();
    const response = await client.request({
      command: 'account_tx',
      account: address,
      limit,
    });
    const txList = (response.result.transactions ?? []) as unknown as Record<string, unknown>[];
    return txList
      .filter((t) => {
        const tx = t['tx'] as Record<string, unknown> | undefined;
        return tx?.['TransactionType'] === 'Payment';
      })
      .map((t) => {
        const tx = t['tx'] as Record<string, unknown>;
        const meta = t['meta'] as Record<string, unknown> | undefined;
        const isSent = tx['Account'] === address;
        const drops = typeof tx['Amount'] === 'string' ? tx['Amount'] as string : '0';
        return {
          txid: (tx['hash'] as string) ?? '',
          amount: parseFloat(String(dropsToXrp(drops))) * (isSent ? -1 : 1),
          timestamp: typeof tx['date'] === 'number' ? (tx['date'] as number) + 946684800 : 0,
          confirmations: (meta?.['TransactionResult'] as string) === 'tesSUCCESS' ? 999 : 0,
          type: (isSent ? 'sent' : 'received') as 'sent' | 'received',
        };
      });
  } catch {
    return [];
  } finally {
    await client.disconnect();
  }
}
