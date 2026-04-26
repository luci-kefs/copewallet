// Bitcoin — isolated from EVM system.
// BIP44 m/44'/0'/0'/0/0 derivation from BIP39 mnemonic.

import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

const NETWORK = bitcoin.networks.bitcoin;
const SATOSHI = 1e8;
const BLOCKCHAIR = 'https://api.blockchair.com/bitcoin';

export interface BTCWallet {
  address: string;       // bech32 P2WPKH (bc1...)
  legacyAddress: string; // P2PKH (1...)
  privateKeyWIF: string;
  publicKey: Buffer;
}

export interface BTCBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export interface BTCUTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
}

export interface BTCTransaction {
  txid: string;
  amount: number;
  confirmations: number;
  timestamp: number;
}

export function deriveBTCWallet(mnemonic: string): BTCWallet {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const root = bip32.fromSeed(seed, NETWORK);
  const child = root.derivePath("m/44'/0'/0'/0/0");
  if (!child.privateKey) throw new Error('BTC derivation failed');

  const pubKey = child.publicKey;
  const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(pubKey), network: NETWORK });
  const p2pkh = bitcoin.payments.p2pkh({ pubkey: Buffer.from(pubKey), network: NETWORK });

  return {
    address: p2wpkh.address!,
    legacyAddress: p2pkh.address!,
    privateKeyWIF: child.toWIF(),
    publicKey: Buffer.from(pubKey),
  };
}

export async function getBTCBalance(address: string): Promise<BTCBalance> {
  const res = await fetch(`${BLOCKCHAIR}/dashboards/address/${address}`);
  if (!res.ok) throw new Error(`Blockchair error: ${res.status}`);
  const json = await res.json();
  const data = json?.data?.[address]?.address;
  if (!data) throw new Error('Address not found');
  const confirmed = (data.balance ?? 0) / SATOSHI;
  const unconfirmed = (data.unconfirmed_balance ?? 0) / SATOSHI;
  return { confirmed, unconfirmed, total: confirmed + unconfirmed };
}

export async function getBTCUTXOs(address: string): Promise<BTCUTXO[]> {
  const res = await fetch(`${BLOCKCHAIR}/outputs?q=recipient(${address}),is_spent(false)&limit=100`);
  if (!res.ok) throw new Error(`Blockchair UTXO error: ${res.status}`);
  const json = await res.json();
  const outputs = json?.data ?? [];
  return (outputs as Array<Record<string, unknown>>).map((o) => ({
    txid: o.transaction_hash as string,
    vout: o.index as number,
    value: o.value as number,
  }));
}

export async function getBTCTransactions(address: string, limit = 20): Promise<BTCTransaction[]> {
  const res = await fetch(`${BLOCKCHAIR}/dashboards/address/${address}?transaction_details=true&limit=${limit}`);
  if (!res.ok) throw new Error(`Blockchair tx error: ${res.status}`);
  const json = await res.json();
  const txs: Array<Record<string, unknown>> = json?.data?.[address]?.transactions ?? [];
  return txs.slice(0, limit).map((tx) => ({
    txid: tx.hash as string,
    amount: ((tx.balance_change as number) ?? 0) / SATOSHI,
    confirmations: (tx.confirmations as number) ?? 0,
    timestamp: tx.time ? new Date(tx.time as string).getTime() / 1000 : 0,
  }));
}

export async function estimateBTCFee(): Promise<{ slow: number; medium: number; fast: number }> {
  try {
    const res = await fetch(`${BLOCKCHAIR}/stats`);
    if (!res.ok) throw new Error('stats error');
    const json = await res.json();
    const suggested = (json?.data?.suggested_transaction_fee_per_byte_sat as number) ?? 20;
    return { slow: Math.max(1, suggested - 10), medium: suggested, fast: suggested + 20 };
  } catch {
    return { slow: 5, medium: 20, fast: 50 };
  }
}

export async function buildBTCTransaction(opts: {
  from: BTCWallet;
  to: string;
  amountBTC: number;
  feeRate: number;
}): Promise<{ hex: string; fee: number }> {
  const { from, to, amountBTC, feeRate } = opts;
  const utxos = await getBTCUTXOs(from.address);
  if (utxos.length === 0) throw new Error('No UTXOs available');

  const targetSats = Math.round(amountBTC * SATOSHI);
  const psbt = new bitcoin.Psbt({ network: NETWORK });

  let inputTotal = 0;
  const usedUtxos: BTCUTXO[] = [];

  for (const utxo of utxos) {
    usedUtxos.push(utxo);
    inputTotal += utxo.value;
    if (inputTotal >= targetSats + feeRate * 200) break;
  }

  if (inputTotal < targetSats) throw new Error('Insufficient BTC balance');

  for (const utxo of usedUtxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: bitcoin.payments.p2wpkh({ pubkey: from.publicKey, network: NETWORK }).output!,
        value: BigInt(utxo.value),
      },
    });
  }

  const estimatedVBytes = 10 + 57 * usedUtxos.length + 34 * 2;
  const feeSats = Math.ceil(feeRate * estimatedVBytes);
  const change = inputTotal - targetSats - feeSats;

  if (change < 0) throw new Error('Insufficient balance to cover fee');

  psbt.addOutput({ address: to, value: BigInt(targetSats) });
  if (change >= 546) {
    psbt.addOutput({ address: from.address, value: BigInt(change) });
  }

  const keyPair = ECPair.fromWIF(from.privateKeyWIF, NETWORK);
  for (let i = 0; i < usedUtxos.length; i++) {
    psbt.signInput(i, keyPair);
  }
  psbt.finalizeAllInputs();

  return { hex: psbt.extractTransaction().toHex(), fee: feeSats / SATOSHI };
}

export async function broadcastBTC(hex: string): Promise<string> {
  const res = await fetch(`${BLOCKCHAIR}/push/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${hex}`,
  });
  const json = await res.json();
  if (json?.data?.transaction_hash) return json.data.transaction_hash as string;
  throw new Error(json?.context?.error ?? 'Broadcast failed');
}
