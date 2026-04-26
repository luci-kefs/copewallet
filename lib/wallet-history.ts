// Wallet history — session-based auto-tracking + optional persist.
// Mnemonic NEVER stored here. Only display metadata.

const HISTORY_KEY = '__cw_wallet_history__';
const MAX_HISTORY = 5;
const NON_EVM_WARNED_KEY = '__cw_non_evm_warned__';

export interface WalletSnapshot {
  id: string;
  address: string;           // EVM address for display
  shortAddress: string;      // 0x1234...5678
  createdAt: number;         // unix ms
  label?: string;
  isSaved: boolean;
  vaultMode: 'EPHEMERAL' | 'PERSISTENT';
}

function load(): WalletSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as WalletSnapshot[]) : [];
  } catch {
    return [];
  }
}

function save(history: WalletSnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

export function getHistory(): WalletSnapshot[] {
  return load();
}

export function addToHistory(snapshot: WalletSnapshot): void {
  const history = load();
  // Remove duplicate if same address already exists
  const filtered = history.filter((s) => s.address !== snapshot.address);
  // Add to front, keep max 5
  const updated = [snapshot, ...filtered].slice(0, MAX_HISTORY);
  save(updated);
}

export function saveWallet(id: string): void {
  const history = load();
  const updated = history.map((s) => s.id === id ? { ...s, isSaved: true } : s);
  save(updated);
}

export function unsaveWallet(id: string): void {
  const history = load();
  const updated = history.map((s) => s.id === id ? { ...s, isSaved: false } : s);
  save(updated);
}

export function removeFromHistory(id: string): void {
  const history = load();
  save(history.filter((s) => s.id !== id));
}

export function updateLabel(id: string, label: string): void {
  const history = load();
  const updated = history.map((s) => s.id === id ? { ...s, label } : s);
  save(updated);
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

export function makeSnapshot(address: string, mode: 'EPHEMERAL' | 'PERSISTENT'): WalletSnapshot {
  return {
    id: crypto.randomUUID(),
    address,
    shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
    createdAt: Date.now(),
    isSaved: false,
    vaultMode: mode,
  };
}

// Non-EVM first-use warning flag
export function hasSeenNonEVMWarning(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(NON_EVM_WARNED_KEY) === '1';
}

export function markNonEVMWarningSeen(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(NON_EVM_WARNED_KEY, '1'); } catch {}
}
