// Bitcoin Cash — isolated from EVM system.
// BIP44 m/44'/145'/0'/0/0 derivation from BIP39 mnemonic.

import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

// BCH uses bitcoin mainnet params for address generation
const NETWORK = bitcoin.networks.bitcoin;
const SATOSHI = 1e8;
const BITCORE = 'https://api.bitcore.io/api/BCH/mainnet';

export interface BCHWallet {
  address: string;       // Legacy P2PKH (1...)
  privateKeyWIF: string;
  publicKey: Buffer;
}

export interface BCHBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export interface BCHUTXO {
  txid: string;
  vout: number;
  value: number;
}

export interface BCHTransaction {
  txid: string;
  amount: number;
  confirmations: number;
  timestamp: number;
}

export function deriveBCHWallet(mnemonic: string): BCHWallet {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const root = bip32.fromSeed(seed, NETWORK);
  const child = root.derivePath("m/44'/145'/0'/0/0");
  if (!child.privateKey) throw new Error('BCH derivation failed');

  const pubKey = child.publicKey;
  const p2pkh = bitcoin.payments.p2pkh({ pubkey: Buffer.from(pubKey), network: NETWORK });

  return {
    address: p2pkh.address!,
    privateKeyWIF: child.toWIF(),
    publicKey: Buffer.from(pubKey),
  };
}

export async function getBCHBalance(address: string): Promise<BCHBalance> {
  const res = await fetch(`${BITCORE}/address/${address}/balance`);
  if (!res.ok) throw new Error(`bitcore.io error: ${res.status}`);
  const json = await res.json();
  const confirmed = (json.confirmed ?? 0) / SATOSHI;
  const unconfirmed = (json.unconfirmed ?? 0) / SATOSHI;
  return { confirmed, unconfirmed, total: (json.balance ?? 0) / SATOSHI };
}

export async function getBCHUTXOs(address: string): Promise<BCHUTXO[]> {
  const res = await fetch(`${BITCORE}/address/${address}?unspent=true&limit=100`);
  if (!res.ok) throw new Error(`bitcore.io UTXO error: ${res.status}`);
  const utxos = await res.json() as Array<Record<string, unknown>>;
  return utxos.map((u) => ({
    txid: u.mintTxid as string,
    vout: u.mintIndex as number,
    value: u.value as number,
  }));
}

export async function getBCHTransactions(address: string, limit = 20): Promise<BCHTransaction[]> {
  const res = await fetch(`${BITCORE}/address/${address}/txs?limit=${limit}`);
  if (!res.ok) throw new Error(`bitcore.io tx error: ${res.status}`);
  const txs = await res.json() as Array<Record<string, unknown>>;
  return txs.slice(0, limit).map((tx) => ({
    txid: tx.txid as string,
    amount: ((tx.value as number) ?? 0) / SATOSHI,
    confirmations: (tx.confirmations as number) ?? 0,
    timestamp: tx.blockTimeNormalized ? new Date(tx.blockTimeNormalized as string).getTime() / 1000 : 0,
  }));
}

export async function estimateBCHFee(): Promise<{ slow: number; medium: number; fast: number }> {
  return { slow: 1, medium: 2, fast: 5 };
}

export async function buildBCHTransaction(opts: {
  from: BCHWallet;
  to: string;
  amountBCH: number;
  feeRate: number;
}): Promise<{ hex: string; fee: number }> {
  const { from, to, amountBCH, feeRate } = opts;
  const utxos = await getBCHUTXOs(from.address);
  if (utxos.length === 0) throw new Error('No UTXOs available');

  const targetSats = Math.round(amountBCH * SATOSHI);
  const psbt = new bitcoin.Psbt({ network: NETWORK });

  let inputTotal = 0;
  const usedUtxos: BCHUTXO[] = [];

  for (const utxo of utxos) {
    usedUtxos.push(utxo);
    inputTotal += utxo.value;
    if (inputTotal >= targetSats + feeRate * 400) break;
  }

  if (inputTotal < targetSats) throw new Error('Insufficient BCH balance');

  for (const utxo of usedUtxos) {
    const rawRes = await fetch(`${BITCORE}/tx/${utxo.txid}/raw`);
    const rawHex: string = rawRes.ok ? await rawRes.text() : '';
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(rawHex.replace(/"/g, ''), 'hex'),
    });
  }

  const estimatedBytes = 10 + 148 * usedUtxos.length + 34 * 2;
  const feeSats = Math.ceil(feeRate * estimatedBytes);
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

export async function broadcastBCH(hex: string): Promise<string> {
  const res = await fetch(`${BITCORE}/tx/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawTx: hex }),
  });
  const json = await res.json();
  if (json?.txid) return json.txid as string;
  throw new Error(json?.error ?? 'Broadcast failed');
}
