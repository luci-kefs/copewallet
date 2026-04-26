// Dogecoin — isolated from EVM system.
// BIP44 m/44'/3'/0'/0/0 derivation from BIP39 mnemonic.

import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

const DOGECOIN: bitcoin.Network = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: 'doge',
  bip32: { public: 0x02facafd, private: 0x02fac398 },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e,
};

const SATOSHI = 1e8;
const BLOCKCYPHER = 'https://api.blockcypher.com/v1/doge/main';

export interface DOGEWallet {
  address: string;       // P2PKH (D...)
  privateKeyWIF: string;
  publicKey: Buffer;
}

export interface DOGEBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export interface DOGEUTXO {
  txid: string;
  vout: number;
  value: number;
}

export interface DOGETransaction {
  txid: string;
  amount: number;
  confirmations: number;
  timestamp: number;
}

export function deriveDOGEWallet(mnemonic: string): DOGEWallet {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const root = bip32.fromSeed(seed, DOGECOIN);
  const child = root.derivePath("m/44'/3'/0'/0/0");
  if (!child.privateKey) throw new Error('DOGE derivation failed');

  const pubKey = child.publicKey;
  const p2pkh = bitcoin.payments.p2pkh({ pubkey: Buffer.from(pubKey), network: DOGECOIN });

  return {
    address: p2pkh.address!,
    privateKeyWIF: child.toWIF(),
    publicKey: Buffer.from(pubKey),
  };
}

export async function getDOGEBalance(address: string): Promise<DOGEBalance> {
  const res = await fetch(`${BLOCKCYPHER}/addrs/${address}/balance`);
  if (!res.ok) throw new Error(`BlockCypher error: ${res.status}`);
  const json = await res.json();
  const confirmed = (json.balance ?? 0) / SATOSHI;
  const unconfirmed = (json.unconfirmed_balance ?? 0) / SATOSHI;
  return { confirmed, unconfirmed, total: confirmed + unconfirmed };
}

export async function getDOGEUTXOs(address: string): Promise<DOGEUTXO[]> {
  const res = await fetch(`${BLOCKCYPHER}/addrs/${address}?unspentOnly=true&limit=100`);
  if (!res.ok) throw new Error(`BlockCypher UTXO error: ${res.status}`);
  const json = await res.json();
  const txrefs = (json.txrefs ?? []) as Array<Record<string, unknown>>;
  return txrefs.map((u) => ({
    txid: u.tx_hash as string,
    vout: u.tx_output_n as number,
    value: u.value as number,
  }));
}

export async function getDOGETransactions(address: string, limit = 20): Promise<DOGETransaction[]> {
  const res = await fetch(`${BLOCKCYPHER}/addrs/${address}/full?limit=${limit}`);
  if (!res.ok) throw new Error(`BlockCypher tx error: ${res.status}`);
  const json = await res.json();
  const txs = (json.txs ?? []) as Array<Record<string, unknown>>;
  return txs.slice(0, limit).map((tx) => ({
    txid: tx.hash as string,
    amount: ((tx.total as number) ?? 0) / SATOSHI,
    confirmations: (tx.confirmations as number) ?? 0,
    timestamp: tx.confirmed ? new Date(tx.confirmed as string).getTime() / 1000 : 0,
  }));
}

export async function estimateDOGEFee(): Promise<{ slow: number; medium: number; fast: number }> {
  try {
    const res = await fetch(`${BLOCKCYPHER}`);
    if (!res.ok) throw new Error('stats error');
    const json = await res.json();
    const medium = Math.round((json.medium_fee_per_kb ?? 1000000) / 1000);
    return { slow: Math.max(100, Math.round(medium * 0.5)), medium, fast: Math.round(medium * 2) };
  } catch {
    return { slow: 500, medium: 1000, fast: 2000 };
  }
}

export async function buildDOGETransaction(opts: {
  from: DOGEWallet;
  to: string;
  amountDOGE: number;
  feeRate: number;
}): Promise<{ hex: string; fee: number }> {
  const { from, to, amountDOGE, feeRate } = opts;
  const utxos = await getDOGEUTXOs(from.address);
  if (utxos.length === 0) throw new Error('No UTXOs available');

  const targetSats = Math.round(amountDOGE * SATOSHI);
  const psbt = new bitcoin.Psbt({ network: DOGECOIN });

  let inputTotal = 0;
  const usedUtxos: DOGEUTXO[] = [];

  for (const utxo of utxos) {
    usedUtxos.push(utxo);
    inputTotal += utxo.value;
    if (inputTotal >= targetSats + feeRate * 400) break;
  }

  if (inputTotal < targetSats) throw new Error('Insufficient DOGE balance');

  // DOGE uses legacy P2PKH — fetch raw tx for non-segwit inputs
  for (const utxo of usedUtxos) {
    const rawRes = await fetch(`${BLOCKCYPHER}/txs/${utxo.txid}?includeHex=true`);
    const rawJson = await rawRes.json();
    const rawHex: string = rawJson?.hex ?? '';
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(rawHex, 'hex'),
    });
  }

  const estimatedBytes = 10 + 148 * usedUtxos.length + 34 * 2;
  const feeSats = Math.ceil(feeRate * estimatedBytes);
  const change = inputTotal - targetSats - feeSats;

  if (change < 0) throw new Error('Insufficient balance to cover fee');

  psbt.addOutput({ address: to, value: BigInt(targetSats) });
  if (change >= 100000) { // DOGE dust: 0.001 DOGE
    psbt.addOutput({ address: from.address, value: BigInt(change) });
  }

  const keyPair = ECPair.fromWIF(from.privateKeyWIF, DOGECOIN);
  for (let i = 0; i < usedUtxos.length; i++) {
    psbt.signInput(i, keyPair);
  }
  psbt.finalizeAllInputs();

  return { hex: psbt.extractTransaction().toHex(), fee: feeSats / SATOSHI };
}

export async function broadcastDOGE(hex: string): Promise<string> {
  const res = await fetch(`${BLOCKCYPHER}/txs/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: hex }),
  });
  const json = await res.json();
  if (json?.tx?.hash) return json.tx.hash as string;
  throw new Error(json?.error ?? 'Broadcast failed');
}
