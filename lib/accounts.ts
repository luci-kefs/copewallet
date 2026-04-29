// Multi-account BIP44 derivation for EVM — m/44'/60'/0'/0/N
import { ethers } from 'ethers';

export interface DerivedAccount {
  index: number;
  address: string;
  path: string;
}

export function deriveAccounts(mnemonic: string, count: number = 5): DerivedAccount[] {
  const root = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0");
  return Array.from({ length: count }, (_, i) => {
    const child = root.deriveChild(i);
    return { index: i, address: child.address, path: `m/44'/60'/0'/0/${i}` };
  });
}

export function deriveAccountAtIndex(mnemonic: string, index: number): DerivedAccount {
  const root = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0");
  const child = root.deriveChild(index);
  return { index, address: child.address, path: `m/44'/60'/0'/0/${index}` };
}

export function getPrivateKeyAtIndex(mnemonic: string, index: number): string {
  const root = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0");
  return root.deriveChild(index).privateKey;
}

const ACTIVE_ACCOUNT_KEY = '__cw_active_account_idx__';

export function getActiveAccountIndex(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(ACTIVE_ACCOUNT_KEY) ?? '0', 10) || 0;
}

export function setActiveAccountIndex(index: number): void {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(index));
}
