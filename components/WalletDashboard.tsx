'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Send, History, RefreshCw, ChevronDown, ExternalLink, ArrowUpRight, ArrowDownLeft, X, Check, Zap } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { CHAINS, FEATURED_CHAINS, Chain, getChainById } from '@/lib/chains';
import { fetchTokenBalances, fetchTxHistory, TokenBalance, TxRecord } from '@/lib/tokens';
import { getPrices, formatUSD } from '@/lib/prices';
import { buildMaskedTransaction, stealthDelay, fireDummyEchoes } from '@/lib/transaction';
import { ephemeralSign } from '@/lib/signer';
import { getProvider } from '@/lib/provider';
import { ethers } from 'ethers';
import { GhostCapsule } from '@/components/GhostCapsule';

type Tab = 'balance' | 'transactions' | 'lightning';

// ─── Send Modal ────────────────────────────────────────────────────────────────
interface SendModalProps {
  chain: Chain;
  onClose: () => void;
}

function SendModal({ chain, onClose }: SendModalProps) {
  const wallet = useWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'signing' | 'sending' | 'done' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const handleSend = async () => {
    if (!wallet.activeAddress || !wallet.scatteredKeyStore) {
      setErrMsg('Wallet not ready'); return;
    }
    if (!ethers.isAddress(to)) { setErrMsg('Invalid address'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrMsg('Invalid amount'); return;
    }

    setStatus('signing');
    setErrMsg('');
    try {
      const tx = await buildMaskedTransaction(to, amount, wallet.activeAddress, chain.id);
      const provider = getProvider(chain.id);

      setStatus('sending');
      await stealthDelay();
      fireDummyEchoes();

      const signed = await ephemeralSign(wallet.scatteredKeyStore, tx);
      const sent = await provider.broadcastTransaction(signed);
      setTxHash(sent.hash);
      setStatus('done');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Transaction failed');
      setStatus('error');
    }
  };

  const explorerUrl = `${chain.explorerUrl}/tx/${txHash}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm mx-4 bg-black border border-white flex flex-col gap-4 p-6"
        style={{ borderColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>

        <div className="flex items-center justify-between">
          <p className="font-light text-white tracking-wider" style={{ fontSize: 12 }}>
            Send {chain.symbol}
          </p>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400">
            <X size={14} />
          </button>
        </div>

        {status === 'done' ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Check size={20} className="text-white" style={{ opacity: 0.5 }} />
            <p className="font-light text-gray-300 tracking-wider" style={{ fontSize: 11 }}>
              Transaction Broadcast
            </p>
            <p className="font-mono text-gray-600 text-center break-all" style={{ fontSize: 8 }}>
              {txHash}
            </p>
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 font-extralight text-gray-500 hover:text-gray-300 transition-colors"
              style={{ fontSize: 9 }}>
              View on Explorer <ExternalLink size={9} />
            </a>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <GhostCapsule
                type="text"
                placeholder={`To address (0x...)`}
                onValue={setTo}
                className="w-full"
              />
              <GhostCapsule
                type="text"
                placeholder={`Amount (${chain.symbol})`}
                onValue={setAmount}
                className="w-full"
              />
            </div>

            {errMsg && (
              <p className="font-extralight text-red-800 tracking-wide" style={{ fontSize: 9 }}>
                {errMsg}
              </p>
            )}

            <div className="flex gap-2 text-xs" style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
              <span>Network: {chain.name}</span>
              <span>•</span>
              <span>Stealth delay active</span>
            </div>

            <button
              onClick={handleSend}
              disabled={status === 'signing' || status === 'sending'}
              className="w-full py-2.5 font-light text-black bg-white hover:bg-gray-100 transition-colors tracking-wider disabled:opacity-40"
              style={{ fontSize: 11, borderRadius: 2 }}>
              {status === 'signing' ? 'Signing...' : status === 'sending' ? 'Broadcasting...' : 'Confirm Send'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Chain Selector Dropdown ───────────────────────────────────────────────────
interface ChainSelectorProps {
  selected: Chain;
  onChange: (chain: Chain) => void;
}

function ChainSelector({ selected, onChange }: ChainSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 transition-all"
        style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          background: 'rgba(255,255,255,0.03)',
          fontSize: 10,
        }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selected.color }} />
        <span className="font-light text-gray-300 tracking-wider">{selected.shortName}</span>
        <ChevronDown size={10} className="text-gray-600" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-48 bg-black"
          style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
          {/* Featured chains */}
          <div className="p-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <p className="font-extralight text-gray-700 tracking-widest mb-1.5" style={{ fontSize: 7 }}>
              FEATURED
            </p>
            <div className="grid grid-cols-4 gap-1">
              {FEATURED_CHAINS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onChange(c); setOpen(false); }}
                  className="flex flex-col items-center gap-0.5 py-1.5 px-1 transition-all hover:bg-white hover:bg-opacity-5 rounded"
                  style={{ opacity: c.id === selected.id ? 1 : 0.6 }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  <span className="font-extralight text-gray-500 leading-none" style={{ fontSize: 7 }}>
                    {c.shortName}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {/* All chains */}
          <div className="py-1 max-h-48 overflow-y-auto">
            {CHAINS.map((c) => (
              <button
                key={c.id}
                onClick={() => { onChange(c); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white hover:bg-opacity-5"
                style={{ background: c.id === selected.id ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                <span className="font-extralight text-gray-400 tracking-wider flex-1" style={{ fontSize: 9 }}>
                  {c.name}
                </span>
                {c.id === selected.id && <Check size={8} className="text-gray-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main WalletDashboard ──────────────────────────────────────────────────────
export function WalletDashboard() {
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('balance');
  const [selectedChain, setSelectedChain] = useState<Chain>(CHAINS[0]);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isLoadingTxs, setIsLoadingTxs] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const address = wallet.activeAddress;

  // ── Load token balances ──────────────────────────────────────────
  const loadTokens = useCallback(async () => {
    if (!address) return;
    setIsLoadingTokens(true);
    try {
      const toks = await fetchTokenBalances(address, selectedChain.id);
      setTokens(toks);
      // Fetch prices for all coingecko ids
      const cgIds = toks
        .map((t) => t.coingeckoId ?? getChainById(selectedChain.id)?.coingeckoId)
        .filter(Boolean) as string[];
      // Also add native chain coingecko id
      if (selectedChain.coingeckoId) cgIds.push(selectedChain.coingeckoId);
      if (cgIds.length > 0) {
        const p = await getPrices([...new Set(cgIds)]);
        setPrices(p);
      }
    } finally {
      setIsLoadingTokens(false);
    }
  }, [address, selectedChain.id]);

  // ── Load transaction history ────────────────────────────────────
  const loadTxs = useCallback(async () => {
    if (!address) return;
    setIsLoadingTxs(true);
    try {
      const history = await fetchTxHistory(address, selectedChain.id);
      setTxs(history);
    } finally {
      setIsLoadingTxs(false);
    }
  }, [address, selectedChain.id]);

  // Load on wallet unlock or chain change
  useEffect(() => {
    if (!wallet.isUnlocked || !address) { setTokens([]); setTxs([]); return; }
    loadTokens();
  }, [wallet.isUnlocked, address, selectedChain.id]);

  useEffect(() => {
    if (activeTab === 'transactions' && wallet.isUnlocked && address) {
      loadTxs();
    }
  }, [activeTab, wallet.isUnlocked, address, selectedChain.id]);

  // ── Copy address ─────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // ── Refresh ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadTokens(), activeTab === 'transactions' ? loadTxs() : Promise.resolve()]);
    setIsRefreshing(false);
  };

  // ── Total USD balance ────────────────────────────────────────────
  const totalUSD = tokens.reduce((sum, t) => {
    const cgId = t.coingeckoId ?? selectedChain.coingeckoId;
    const price = cgId ? (prices[cgId] ?? 0) : 0;
    return sum + parseFloat(t.balance) * price;
  }, 0);

  // Format address
  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '—';

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    fontSize: 9,
    letterSpacing: '0.15em',
    borderBottom: activeTab === tab ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
    color: activeTab === tab ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
    paddingBottom: 6,
    transition: 'all 0.15s',
  });

  if (!wallet.isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-px h-px bg-white rounded-full animate-ping" />
        <p className="font-extralight text-gray-700 tracking-widest" style={{ fontSize: 9 }}>
          Initializing...
        </p>
      </div>
    );
  }

  return (
    <>
      {showSend && (
        <SendModal chain={selectedChain} onClose={() => setShowSend(false)} />
      )}

      <div className="flex flex-col h-full w-full">

        {/* ── Header: Address + Chain + Badges ── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex flex-col gap-1 min-w-0">
            {/* Address + Volatile badge */}
            <div className="flex items-center gap-2">
              <p className="font-mono text-gray-300 tracking-wider" style={{ fontSize: 10 }}>
                {shortAddr}
              </p>
              <span className="px-1.5 py-0.5 font-extralight text-gray-700 tracking-widest uppercase"
                style={{ fontSize: 6, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2 }}>
                Volatile
              </span>
            </div>
            {/* Network badge row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 font-extralight tracking-widest uppercase"
                style={{
                  fontSize: 6,
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 2,
                  color: selectedChain.color,
                }}>
                {selectedChain.name}
              </span>
              <span className="px-1.5 py-0.5 font-extralight text-gray-700 tracking-widest uppercase"
                style={{ fontSize: 6, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2 }}>
                GasLess
              </span>
              <span className="px-1.5 py-0.5 font-extralight text-gray-700 tracking-widest uppercase"
                style={{ fontSize: 6, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2 }}>
                EIP-7702
              </span>
            </div>
          </div>

          {/* Chain selector */}
          <ChainSelector selected={selectedChain} onChange={setSelectedChain} />
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex items-center gap-2 px-5 pb-4">
          <ActionBtn
            icon={<Send size={10} />}
            label="Send"
            onClick={() => setShowSend(true)}
          />
          <ActionBtn
            icon={copied ? <Check size={10} /> : <Copy size={10} />}
            label={copied ? 'Copied' : 'Copy'}
            onClick={handleCopy}
          />
          <ActionBtn
            icon={<History size={10} />}
            label="History"
            onClick={() => setActiveTab('transactions')}
            active={activeTab === 'transactions'}
          />
          <ActionBtn
            icon={<RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} />}
            label="Refresh"
            onClick={handleRefresh}
          />
          <ActionBtn
            icon={<Zap size={10} />}
            label="New"
            onClick={() => {
              wallet.wipeCopeWallet();
              setTimeout(() => wallet.createCopeWallet(), 80);
            }}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-5 px-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button style={tabStyle('balance')} onClick={() => setActiveTab('balance')}
            className="uppercase tracking-widest font-extralight">
            Balance
          </button>
          <button style={tabStyle('transactions')} onClick={() => setActiveTab('transactions')}
            className="uppercase tracking-widest font-extralight">
            Transactions
          </button>
          <button style={tabStyle('lightning')} onClick={() => setActiveTab('lightning')}
            className="uppercase tracking-widest font-extralight">
            Lightning
          </button>
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* BALANCE TAB */}
          {activeTab === 'balance' && (
            <div className="flex flex-col">
              {/* Total Balance */}
              <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <p className="font-extralight text-gray-600 tracking-widest uppercase mb-1" style={{ fontSize: 7 }}>
                  Total Balance
                </p>
                <p className="font-thin text-white tracking-widest" style={{ fontSize: 26 }}>
                  {formatUSD(totalUSD)}
                </p>
              </div>

              {/* Token list */}
              {isLoadingTokens ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-px h-4 bg-white opacity-10 animate-pulse" />
                </div>
              ) : tokens.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <p className="font-extralight text-gray-700 tracking-widest" style={{ fontSize: 9 }}>
                    No assets found
                  </p>
                  <p className="font-extralight text-gray-800 tracking-wider text-center px-8" style={{ fontSize: 8 }}>
                    This wallet has no balances on {selectedChain.name}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {tokens.map((token, i) => {
                    const cgId = token.coingeckoId ?? selectedChain.coingeckoId;
                    const price = cgId ? (prices[cgId] ?? 0) : 0;
                    const usdValue = parseFloat(token.balance) * price;
                    return (
                      <div key={`${token.contractAddress}-${i}`}
                        className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          {token.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={token.logo} alt={token.symbol} className="w-6 h-6 rounded-full"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(255,255,255,0.05)', fontSize: 7 }}>
                              <span className="font-extralight text-gray-600">{token.symbol.slice(0, 2)}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-light text-gray-300 tracking-wider" style={{ fontSize: 10 }}>
                              {token.symbol}
                            </p>
                            <p className="font-extralight text-gray-700 tracking-wide" style={{ fontSize: 8 }}>
                              {token.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-light text-gray-300 tracking-wider" style={{ fontSize: 10 }}>
                            {token.balance}
                          </p>
                          {price > 0 && (
                            <p className="font-extralight text-gray-600 tracking-wide" style={{ fontSize: 8 }}>
                              {formatUSD(usdValue)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
            <div className="flex flex-col">
              {isLoadingTxs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-px h-4 bg-white opacity-10 animate-pulse" />
                </div>
              ) : txs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <p className="font-extralight text-gray-700 tracking-widest" style={{ fontSize: 9 }}>
                    No transactions found
                  </p>
                  <p className="font-extralight text-gray-800 tracking-wider" style={{ fontSize: 8 }}>
                    {selectedChain.isAlchemy ? `No activity on ${selectedChain.name}` : 'History requires Alchemy RPC'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {txs.map((tx) => {
                    const isOut = tx.direction === 'out';
                    const date = tx.timestamp
                      ? new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—';
                    const explorerUrl = `${selectedChain.explorerUrl}/tx/${tx.hash}`;
                    return (
                      <a
                        key={tx.hash}
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-5 py-3 hover:bg-white hover:bg-opacity-5 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            {isOut
                              ? <ArrowUpRight size={9} className="text-gray-500" />
                              : <ArrowDownLeft size={9} className="text-gray-500" />
                            }
                          </div>
                          <div>
                            <p className="font-light text-gray-300 tracking-wider" style={{ fontSize: 10 }}>
                              {isOut ? 'Sent' : 'Received'}
                            </p>
                            <p className="font-extralight text-gray-700 tracking-wide font-mono" style={{ fontSize: 7 }}>
                              {tx.hash.slice(0, 8)}...{tx.hash.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                          <p className="font-light tracking-wider" style={{
                            fontSize: 10,
                            color: isOut ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)',
                          }}>
                            {isOut ? '-' : '+'}{tx.value} {tx.asset}
                          </p>
                          <p className="font-extralight text-gray-700 tracking-wide" style={{ fontSize: 7 }}>
                            {date}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LIGHTNING TAB */}
          {activeTab === 'lightning' && (
            <div className="flex flex-col items-center gap-3 py-10 px-5">
              <Zap size={16} className="text-gray-700" />
              <p className="font-extralight text-gray-600 tracking-widest uppercase" style={{ fontSize: 8 }}>
                Lightning Nodes
              </p>
              <p className="font-extralight text-gray-800 tracking-wider text-center max-w-xs" style={{ fontSize: 8 }}>
                Lightning Network integration coming soon. Connect your node to enable instant payments.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────────────
function ActionBtn({
  icon, label, onClick, active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-3 py-2 transition-all hover:bg-white hover:bg-opacity-5"
      style={{
        borderRadius: 3,
        border: active ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.05)',
        minWidth: 44,
      }}>
      <span style={{ color: active ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>
        {icon}
      </span>
      <span className="font-extralight tracking-widest uppercase"
        style={{ fontSize: 6, color: active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}>
        {label}
      </span>
    </button>
  );
}
