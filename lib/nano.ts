// Nano — isolated from EVM system.
// Uses nanocurrency-web for wallet derivation and signing.

import { wallet as nanoWallet, block } from 'nanocurrency-web';

const API = 'https://rpc.nano.to';

export interface NANOWallet {
  address: string;   // nano_... format
  privateKey: string;
  publicKey: string;
}

export interface NANOBalance {
  nano: number;
  raw: string;
}

export interface NANOTransaction {
  txid: string;
  amount: number;
  timestamp: number;
  type: 'send' | 'receive';
  account: string;
}

const RAW_PER_NANO = BigInt('1000000000000000000000000000000');

function rawToNano(raw: string): number {
  if (!raw || raw === '0') return 0;
  const rawBig = BigInt(raw);
  const whole = rawBig / RAW_PER_NANO;
  const remainder = rawBig % RAW_PER_NANO;
  return Number(whole) + Number(remainder) / 1e30;
}

function nanoToRaw(nano: number): string {
  const whole = Math.floor(nano);
  const frac = nano - whole;
  return (BigInt(whole) * RAW_PER_NANO + BigInt(Math.round(frac * 1e30))).toString();
}

export function deriveNANOWallet(mnemonic: string): NANOWallet {
  const derived = nanoWallet.fromMnemonic(mnemonic.trim());
  const account = derived.accounts[0];
  return {
    address: account.address,
    privateKey: account.privateKey,
    publicKey: account.publicKey,
  };
}

async function rpc(action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) throw new Error(`Nano RPC error: ${res.status}`);
  return res.json();
}

export async function getNANOBalance(address: string): Promise<NANOBalance> {
  try {
    const data = await rpc('account_balance', { account: address });
    const balance = (data.balance as string) ?? '0';
    return { nano: rawToNano(balance), raw: balance };
  } catch {
    return { nano: 0, raw: '0' };
  }
}

export async function getNANOTransactions(address: string, limit = 20): Promise<NANOTransaction[]> {
  try {
    const data = await rpc('account_history', { account: address, count: limit });
    const history = (data.history as Array<Record<string, unknown>>) ?? [];
    return history.map((h) => ({
      txid: h.hash as string ?? '',
      amount: rawToNano(h.amount as string ?? '0'),
      timestamp: parseInt(h.local_timestamp as string ?? '0'),
      type: h.type as 'send' | 'receive',
      account: h.account as string ?? '',
    }));
  } catch {
    return [];
  }
}

export async function sendNANO(from: NANOWallet, to: string, amountNANO: number): Promise<string> {
  // Fetch account info for frontier and balance
  const info = await rpc('account_info', { account: from.address, representative: true });
  if (info.error) throw new Error('Account not opened — receive Nano first');

  const frontier = info.frontier as string;
  const currentBalance = info.balance as string;
  const representative = info.representative as string;

  const amountRaw = nanoToRaw(amountNANO);
  const newBalance = (BigInt(currentBalance) - BigInt(amountRaw)).toString();

  if (BigInt(newBalance) < 0n) throw new Error('Insufficient NANO balance');

  // Get PoW
  const workData = await rpc('work_generate', { hash: frontier, difficulty: 'fffffff800000000' });
  const work = workData.work as string;

  // Build and sign block
  const sendBlock = block.send({
    walletBalanceRaw: currentBalance,
    fromAddress: from.address,
    toAddress: to,
    representativeAddress: representative,
    frontier,
    amountRaw,
    work,
  }, from.privateKey);

  // Broadcast
  const result = await rpc('process', { json_block: 'true', subtype: 'send', block: sendBlock });
  if (result.hash) return result.hash as string;
  throw new Error((result.error as string) ?? 'NANO broadcast failed');
}
