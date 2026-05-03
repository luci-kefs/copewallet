// Ledger WebHID integration — lazy-loads @ledgerhq packages to keep main bundle small.
// Uses Option B architecture: Ledger wallet appears as a saved-vault WalletSnapshot
// with vaultMode 'LEDGER', stored in history without a mnemonic blob.

import { ethers } from 'ethers';
import { getProvider } from './provider';

export const LEDGER_DERIVATION_PATH = "m/44'/60'/0'/0/0";

export function isWebHIDSupported(): boolean {
  return typeof navigator !== 'undefined' && 'hid' in navigator;
}

// Lazy-load Ledger transports — only imported when user clicks "Connect Ledger"
async function loadTransport() {
  const mod = await import('@ledgerhq/hw-transport-webhid');
  return mod.default;
}

async function loadEth() {
  const mod = await import('@ledgerhq/hw-app-eth');
  return mod.default;
}

export interface LedgerDevice {
  address: string;
  derivationPath: string;
}

// Connect to Ledger and get EVM address. Prompts the user to pick a HID device.
export async function connectLedger(
  derivationPath = LEDGER_DERIVATION_PATH
): Promise<LedgerDevice> {
  if (!isWebHIDSupported()) {
    throw new Error('WebHID not supported — use Chrome, Edge, or Brave');
  }

  const Transport = await loadTransport();
  const Eth = await loadEth();

  let transport;
  try {
    transport = await Transport.create();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('No device selected') || msg.includes('cancelled')) {
      throw new Error('No Ledger selected');
    }
    throw new Error(`Ledger connection failed: ${msg}`);
  }

  try {
    const eth = new Eth(transport);
    const result = await eth.getAddress(derivationPath, false, false);
    return { address: result.address, derivationPath };
  } finally {
    await transport.close();
  }
}

// Sign a transaction with Ledger. The device must be unlocked and on the Ethereum app.
export async function ledgerSign(
  derivationPath: string,
  tx: ethers.TransactionRequest
): Promise<string> {
  const Transport = await loadTransport();
  const Eth = await loadEth();

  let transport;
  try {
    transport = await Transport.create();
  } catch {
    throw new Error('Could not connect to Ledger — unlock device and open Ethereum app');
  }

  try {
    const eth = new Eth(transport);

    // Resolve chainId — required for EIP-155
    const chainId = Number(tx.chainId ?? 1);

    // Populate gas fields if missing
    let populated = { ...tx };
    if (!populated.nonce || !populated.maxFeePerGas) {
      const provider = getProvider(chainId);
      const [nonce, feeData] = await Promise.all([
        provider.getTransactionCount(tx.from as string, 'latest'),
        provider.getFeeData(),
      ]);
      populated = {
        ...populated,
        nonce: populated.nonce ?? nonce,
        maxFeePerGas: populated.maxFeePerGas ?? feeData.maxFeePerGas ?? ethers.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: populated.maxPriorityFeePerGas ?? feeData.maxPriorityFeePerGas ?? ethers.parseUnits('1', 'gwei'),
      };
    }

    // Build an unsigned serialized tx for Ledger to sign
    const unsignedTx: ethers.TransactionLike = {
      type: 2,
      chainId,
      nonce: Number(populated.nonce),
      to: populated.to as string,
      value: populated.value ?? 0n,
      data: populated.data ?? '0x',
      gasLimit: populated.gasLimit ?? 21000n,
      maxFeePerGas: populated.maxFeePerGas as bigint,
      maxPriorityFeePerGas: populated.maxPriorityFeePerGas as bigint,
      accessList: populated.accessList ?? [],
    };

    const serialized = ethers.Transaction.from(unsignedTx).unsignedSerialized;
    const rawHex = serialized.startsWith('0x') ? serialized.slice(2) : serialized;

    const { r, s, v } = await eth.signTransaction(derivationPath, rawHex, null);

    // Attach signature and re-serialize
    const signedTx = ethers.Transaction.from({
      ...unsignedTx,
      signature: { r: '0x' + r, s: '0x' + s, v: parseInt(v, 16) },
    });

    return signedTx.serialized;
  } finally {
    await transport.close();
  }
}

// ── Ledger history helpers ─────────────────────────────────────────────────────

const LEDGER_KEY = '__cw_ledger_devices__';

export interface LedgerEntry {
  id: string;
  address: string;
  derivationPath: string;
  label?: string;
  addedAt: number;
}

export function loadLedgerDevices(): LedgerEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    return raw ? (JSON.parse(raw) as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveLedgerDevice(entry: LedgerEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadLedgerDevices().filter(e => e.address !== entry.address);
    localStorage.setItem(LEDGER_KEY, JSON.stringify([entry, ...existing]));
  } catch {}
}

export function removeLedgerDevice(address: string): void {
  if (typeof window === 'undefined') return;
  try {
    const updated = loadLedgerDevices().filter(e => e.address !== address);
    localStorage.setItem(LEDGER_KEY, JSON.stringify(updated));
  } catch {}
}

export function getLedgerDevice(address: string): LedgerEntry | null {
  return loadLedgerDevices().find(e => e.address === address) ?? null;
}
