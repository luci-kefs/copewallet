// Litecoin — fully isolated from EVM system.
// Uses BIP44 m/44'/2'/0'/0/0 derivation from same BIP39 mnemonic.

import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

const LITECOIN: bitcoin.Network = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: { public: 0x019da462, private: 0x019d9cfe },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

const SATOSHI = 1e8;
const BLOCKCHAIR = 'https://api.blockchair.com/litecoin';

export interface LTCWallet {
  address: string;       // bech32 P2WPKH (ltc1...)
  legacyAddress: string; // P2PKH (L... / M...)
  privateKeyWIF: string;
  publicKey: Buffer;
}

export interface LTCBalance {
  confirmed: number;    // LTC
  unconfirmed: number;
  total: number;
}

export interface LTCUTXO {
  txid: string;
  vout: number;
  value: number;        // satoshis
}

export interface LTCTransaction {
  txid: string;
  amount: number;       // LTC — negative for outgoing
  confirmations: number;
  timestamp: number;
}

export function deriveLTCWallet(mnemonic: string): LTCWallet {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const root = bip32.fromSeed(seed, LITECOIN);
  const child = root.derivePath("m/44'/2'/0'/0/0");
  if (!child.privateKey) throw new Error('LTC derivation failed');

  const pubKey = child.publicKey;

  // bech32 P2WPKH
  const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(pubKey), network: LITECOIN });
  // legacy P2PKH
  const p2pkh = bitcoin.payments.p2pkh({ pubkey: Buffer.from(pubKey), network: LITECOIN });

  const wif = child.toWIF();

  return {
    address: p2wpkh.address!,
    legacyAddress: p2pkh.address!,
    privateKeyWIF: wif,
    publicKey: Buffer.from(pubKey),
  };
}

export async function getLTCBalance(address: string): Promise<LTCBalance> {
  const res = await fetch(`${BLOCKCHAIR}/dashboards/address/${address}`);
  if (!res.ok) throw new Error(`Blockchair error: ${res.status}`);
  const json = await res.json();
  const data = json?.data?.[address]?.address;
  if (!data) throw new Error('Address not found');
  const confirmed = (data.balance ?? 0) / SATOSHI;
  const unconfirmed = (data.unconfirmed_balance ?? 0) / SATOSHI;
  return { confirmed, unconfirmed, total: confirmed + unconfirmed };
}

export async function getLTCUTXOs(address: string): Promise<LTCUTXO[]> {
  const res = await fetch(
    `${BLOCKCHAIR}/outputs?q=recipient(${address}),is_spent(false)&limit=100`
  );
  if (!res.ok) throw new Error(`Blockchair UTXO error: ${res.status}`);
  const json = await res.json();
  const outputs = json?.data ?? [];
  return (outputs as Array<Record<string, unknown>>).map((o) => ({
    txid: o.transaction_hash as string,
    vout: o.index as number,
    value: o.value as number,
  }));
}

export async function getLTCTransactions(
  address: string,
  limit = 20
): Promise<LTCTransaction[]> {
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

export async function estimateLTCFee(): Promise<{ slow: number; medium: number; fast: number }> {
  try {
    const res = await fetch(`${BLOCKCHAIR}/stats`);
    if (!res.ok) throw new Error('stats error');
    const json = await res.json();
    const suggested = (json?.data?.suggested_transaction_fee_per_byte_sat as number) ?? 10;
    return { slow: Math.max(1, suggested - 5), medium: suggested, fast: suggested + 10 };
  } catch {
    return { slow: 2, medium: 10, fast: 25 };
  }
}

export async function buildLTCTransaction(opts: {
  from: LTCWallet;
  to: string;
  amountLTC: number;
  feeRate: number;  // sat/vByte
}): Promise<{ hex: string; fee: number }> {
  const { from, to, amountLTC, feeRate } = opts;
  const utxos = await getLTCUTXOs(from.address);
  if (utxos.length === 0) throw new Error('No UTXOs available');

  const targetSats = Math.round(amountLTC * SATOSHI);
  const psbt = new bitcoin.Psbt({ network: LITECOIN });

  let inputTotal = 0;
  const usedUtxos: LTCUTXO[] = [];

  for (const utxo of utxos) {
    usedUtxos.push(utxo);
    inputTotal += utxo.value;
    if (inputTotal >= targetSats + feeRate * 200) break; // rough threshold
  }

  if (inputTotal < targetSats) throw new Error('Insufficient LTC balance');

  // Fetch raw txs for segwit inputs
  for (const utxo of usedUtxos) {
    const rawRes = await fetch(`${BLOCKCHAIR}/raw/transaction/${utxo.txid}`);
    const rawJson = await rawRes.json();
    const rawHex: string = rawJson?.data?.[utxo.txid]?.raw_transaction ?? '';
    const rawBuf = Buffer.from(rawHex, 'hex');
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: bitcoin.payments.p2wpkh({ pubkey: from.publicKey, network: LITECOIN }).output!,
        value: BigInt(utxo.value),
      },
    });
    void rawBuf; // available if needed for non-segwit
  }

  // Estimate fee: 10+57*n_in+34*n_out vBytes for P2WPKH
  const estimatedVBytes = 10 + 57 * usedUtxos.length + 34 * 2;
  const feeSats = Math.ceil(feeRate * estimatedVBytes);
  const change = inputTotal - targetSats - feeSats;

  if (change < 0) throw new Error('Insufficient balance to cover fee');

  psbt.addOutput({ address: to, value: BigInt(targetSats) });
  if (change >= 546) { // dust threshold
    psbt.addOutput({ address: from.address, value: BigInt(change) });
  }

  const keyPair = ECPair.fromWIF(from.privateKeyWIF, LITECOIN);
  for (let i = 0; i < usedUtxos.length; i++) {
    psbt.signInput(i, keyPair);
  }
  psbt.finalizeAllInputs();

  return { hex: psbt.extractTransaction().toHex(), fee: feeSats / SATOSHI };
}

export async function broadcastLTC(hex: string): Promise<string> {
  const res = await fetch(`${BLOCKCHAIR}/push/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${hex}`,
  });
  const json = await res.json();
  if (json?.data?.transaction_hash) return json.data.transaction_hash as string;
  throw new Error(json?.context?.error ?? 'Broadcast failed');
}
