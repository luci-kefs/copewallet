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
const MEMPOOL = 'https://mempool.space/api';

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
  const res = await fetch(`${MEMPOOL}/address/${address}`);
  if (!res.ok) throw new Error(`mempool.space error: ${res.status}`);
  const json = await res.json();
  const confirmed = ((json.chain_stats?.funded_txo_sum ?? 0) - (json.chain_stats?.spent_txo_sum ?? 0)) / SATOSHI;
  const unconfirmed = ((json.mempool_stats?.funded_txo_sum ?? 0) - (json.mempool_stats?.spent_txo_sum ?? 0)) / SATOSHI;
  return { confirmed, unconfirmed, total: confirmed + unconfirmed };
}

export async function getBTCUTXOs(address: string): Promise<BTCUTXO[]> {
  const res = await fetch(`${MEMPOOL}/address/${address}/utxo`);
  if (!res.ok) throw new Error(`mempool.space UTXO error: ${res.status}`);
  const utxos = await res.json() as Array<Record<string, unknown>>;
  return utxos.map((u) => ({
    txid: u.txid as string,
    vout: u.vout as number,
    value: u.value as number,
  }));
}

export async function getBTCTransactions(address: string, limit = 20): Promise<BTCTransaction[]> {
  const res = await fetch(`${MEMPOOL}/address/${address}/txs`);
  if (!res.ok) throw new Error(`mempool.space tx error: ${res.status}`);
  const txs = await res.json() as Array<Record<string, unknown>>;
  return txs.slice(0, limit).map((tx) => {
    const vin = (tx.vin as Array<Record<string, unknown>>) ?? [];
    const vout = (tx.vout as Array<Record<string, unknown>>) ?? [];
    const inSum = vin.reduce((s, i) => s + ((i.prevout as Record<string, unknown>)?.value as number ?? 0), 0);
    const outSum = vout.reduce((s, o) => s + (o.value as number ?? 0), 0);
    const status = tx.status as Record<string, unknown>;
    return {
      txid: tx.txid as string,
      amount: (outSum - inSum) / SATOSHI,
      confirmations: status?.confirmed ? 1 : 0,
      timestamp: (status?.block_time as number) ?? 0,
    };
  });
}

export async function estimateBTCFee(): Promise<{ slow: number; medium: number; fast: number }> {
  try {
    const res = await fetch(`${MEMPOOL}/v1/fees/recommended`);
    if (!res.ok) throw new Error('fees error');
    const json = await res.json();
    return { slow: json.hourFee ?? 1, medium: json.halfHourFee ?? 4, fast: json.fastestFee ?? 10 };
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
  const res = await fetch(`${MEMPOOL}/tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: hex,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Broadcast failed');
  }
  return res.text();
}
