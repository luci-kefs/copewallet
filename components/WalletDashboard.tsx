'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  QrCode, Send, Copy, History, RefreshCw, Check, X,
  ExternalLink, ArrowUpRight, ArrowDownLeft, Eye, EyeOff,
  Zap, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { CHAINS, Chain } from '@/lib/chains';
import { fetchTokenBalances, fetchTxHistory, TokenBalance, TxRecord } from '@/lib/tokens';
import { getPrices, formatUSD } from '@/lib/prices';
import { buildMaskedTransaction, stealthDelay, fireDummyEchoes } from '@/lib/transaction';
import { ephemeralSign } from '@/lib/signer';
import { getProvider } from '@/lib/provider';
import { ethers } from 'ethers';
import { GhostCapsule } from '@/components/GhostCapsule';
import { FloatingDock } from '@/components/FloatingDock';
import { ChainMarquee } from '@/components/ChainMarquee';
import { CardSpotlight } from '@/components/CardSpotlight';

type Tab = 'balance' | 'transactions' | 'lightning';

// ─── Chain SVG Icon ───────────────────────────────────────────────────────────
function ChainIcon({ chain, size = 40 }: { chain: Chain; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${chain.color}1a`,
      border: `1.5px solid ${chain.color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ color: chain.color, fontSize: size * 0.32, fontWeight: 700, lineHeight: 1 }}>
        {chain.shortName.slice(0, 3)}
      </span>
    </div>
  );
}

// ─── All Networks Modal ───────────────────────────────────────────────────────
function AllNetworksModal({ selected, onSelect, onClose }: {
  selected: Chain;
  onSelect: (c: Chain) => void;
  onClose: () => void;
}) {
  const smart = CHAINS.filter(c => c.isAlchemy);
  const eoa = CHAINS.filter(c => !c.isAlchemy);

  const ChainCard = ({ c }: { c: Chain }) => (
    <button
      onClick={() => { onSelect(c); onClose(); }}
      style={{
        background: selected.id === c.id ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
        border: selected.id === c.id ? `1.5px solid ${c.color}88` : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '12px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
        width: '100%',
      }}>
      {selected.id === c.id && (
        <div style={{
          position: 'absolute', top: 7, right: 7,
          width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
        }} />
      )}
      <ChainIcon chain={c} size={34} />
      <span style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 700 }}>{c.symbol}</span>
      <span style={{ color: '#9ca3af', fontSize: 9 }}>{c.name}</span>
      {c.isAlchemy
        ? <span style={{ background: '#1e40af33', color: '#93c5fd', fontSize: 7, padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>7702</span>
        : <span style={{ background: '#374151', color: '#9ca3af', fontSize: 7, padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>EOA</span>
      }
    </button>
  );

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#111', borderRadius: 16, width: 360, maxWidth: '92vw',
        maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>All Networks</span>
          <button onClick={onClose} style={{ color: '#6b7280', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          <p style={{ color: '#6b7280', fontSize: 9, letterSpacing: '0.12em', fontWeight: 600, marginBottom: 10 }}>
            EVM SMART WALLETS (GASLESS) ⓘ
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {smart.map(c => <ChainCard key={c.id} c={c} />)}
          </div>
          <p style={{ color: '#6b7280', fontSize: 9, letterSpacing: '0.12em', fontWeight: 600, marginBottom: 10 }}>
            EVM EOA WALLETS ⓘ
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {eoa.map(c => <ChainCard key={c.id} c={c} />)}
          </div>
          <p style={{ color: '#4b5563', fontSize: 9, textAlign: 'center', marginTop: 16 }}>
            {CHAINS.length} networks
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Send Modal ───────────────────────────────────────────────────────────────
function SendModal({ chain, onClose }: { chain: Chain; onClose: () => void }) {
  const wallet = useWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'signing' | 'sending' | 'done' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const handleSend = async () => {
    if (!wallet.activeAddress || !wallet.scatteredKeyStore) { setErrMsg('Wallet not ready'); return; }
    if (!ethers.isAddress(to)) { setErrMsg('Invalid address'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setErrMsg('Invalid amount'); return; }
    setStatus('signing'); setErrMsg('');
    try {
      const tx = await buildMaskedTransaction(to, amount, wallet.activeAddress, chain.id);
      setStatus('sending');
      await stealthDelay();
      void fireDummyEchoes();
      const signed = await ephemeralSign(wallet.scatteredKeyStore, tx);
      const provider = getProvider(chain.id);
      const sent = await provider.broadcastTransaction(signed);
      setTxHash(sent.hash);
      setStatus('done');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Transaction failed');
      setStatus('error');
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: 16, width: 360, maxWidth: '92vw', padding: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Send {chain.symbol}</span>
          <button onClick={onClose} style={{ color: '#6b7280', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        {status === 'done' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#16a34a22', border: '1.5px solid #16a34a66', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={22} style={{ color: '#22c55e' }} />
            </div>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Broadcast!</span>
            <span style={{ color: '#6b7280', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>{txHash}</span>
            <a href={`${chain.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              style={{ color: '#60a5fa', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              View on Explorer <ExternalLink size={10} />
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '4px 12px' }}>
              <GhostCapsule type="text" placeholder={`Recipient address (0x...)`} onValue={setTo} className="w-full" />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '4px 12px' }}>
              <GhostCapsule type="text" placeholder={`Amount (${chain.symbol})`} onValue={setAmount} className="w-full" />
            </div>
            {errMsg && <span style={{ color: '#f87171', fontSize: 10 }}>{errMsg}</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <ChainIcon chain={chain} size={18} />
              <span style={{ color: '#9ca3af', fontSize: 10 }}>Network: {chain.name}</span>
              <span style={{ color: '#374151', fontSize: 9, marginLeft: 'auto' }}>Stealth delay active</span>
            </div>
            <button
              onClick={handleSend}
              disabled={status === 'signing' || status === 'sending'}
              style={{
                background: status === 'signing' || status === 'sending' ? '#374151' : '#fff',
                color: status === 'signing' || status === 'sending' ? '#9ca3af' : '#000',
                border: 'none', borderRadius: 10, padding: '12px', fontSize: 13,
                fontWeight: 600, cursor: status === 'signing' || status === 'sending' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}>
              {status === 'signing' ? 'Signing...' : status === 'sending' ? 'Broadcasting...' : `Send ${chain.symbol}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ address, onClose }: { address: string; onClose: () => void }) {
  // Simple QR placeholder — shows address in large mono text
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: 16, width: 320, maxWidth: '92vw', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Receive</span>
          <button onClick={onClose} style={{ color: '#6b7280', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>
        {/* QR placeholder grid */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <QrCode size={140} style={{ color: '#000' }} />
        </div>
        <p style={{ color: '#9ca3af', fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>
          {address}
        </p>
        <p style={{ color: '#6b7280', fontSize: 9, textAlign: 'center' }}>
          Send only compatible assets to this address
        </p>
      </div>
    </div>
  );
}

// ─── Main WalletDashboard ─────────────────────────────────────────────────────
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
  const [showNetworks, setShowNetworks] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  const address = wallet.activeAddress;
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-5)}` : '—';

  // Load token balances
  const loadTokens = useCallback(async () => {
    if (!address) return;
    setIsLoadingTokens(true);
    try {
      const toks = await fetchTokenBalances(address, selectedChain.id);
      setTokens(toks);
      const cgIds = [...new Set([
        selectedChain.coingeckoId,
        ...toks.map(t => t.coingeckoId).filter(Boolean) as string[],
      ])];
      if (cgIds.length > 0) {
        const p = await getPrices(cgIds);
        setPrices(p);
      }
    } finally {
      setIsLoadingTokens(false);
    }
  }, [address, selectedChain.id]);

  // Load TX history
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

  useEffect(() => {
    if (!wallet.isUnlocked || !address) { setTokens([]); setTxs([]); return; }
    loadTokens();
  }, [wallet.isUnlocked, address, selectedChain.id]);

  useEffect(() => {
    if (activeTab === 'transactions' && wallet.isUnlocked && address) loadTxs();
  }, [activeTab, wallet.isUnlocked, address, selectedChain.id]);

  const handleCopy = async () => {
    if (!address) return;
    try { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadTokens(), activeTab === 'transactions' ? loadTxs() : Promise.resolve()]);
    setIsRefreshing(false);
  };

  const totalUSD = tokens.reduce((sum, t) => {
    const price = t.coingeckoId ? (prices[t.coingeckoId] ?? 0) : (prices[selectedChain.coingeckoId] ?? 0);
    return sum + parseFloat(t.balance || '0') * price;
  }, 0);

  // Featured 4 chains for the quick row
  const featuredChains = CHAINS.slice(0, 4);

  const dockItems = [
    { label: 'Connect', icon: <QrCode size={18} />, onClick: () => setShowQR(true), color: '#059669' },
    { label: 'Send', icon: <Send size={18} />, onClick: () => setShowSend(true) },
    { label: copied ? 'Copied!' : 'Copy', icon: copied ? <Check size={18} /> : <Copy size={18} />, onClick: handleCopy },
    { label: 'History', icon: <History size={18} />, onClick: () => setActiveTab('transactions'), active: activeTab === 'transactions' },
    { label: 'New', icon: <RefreshCw size={18} />, onClick: () => { wallet.wipeCopeWallet(); setTimeout(() => wallet.createCopeWallet(), 80); } },
  ];

  if (!wallet.isUnlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.08)', borderTopColor: 'rgba(255,255,255,0.5)' }}
        />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ color: '#6b7280', fontSize: 12 }}
        >
          Generating wallet...
        </motion.span>
      </div>
    );
  }

  return (
    <>
      {showSend && <SendModal chain={selectedChain} onClose={() => setShowSend(false)} />}
      {showNetworks && <AllNetworksModal selected={selectedChain} onSelect={setSelectedChain} onClose={() => setShowNetworks(false)} />}
      {showQR && address && <QRModal address={address} onClose={() => setShowQR(false)} />}

      <div style={{ background: 'transparent', minHeight: '100%', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ textAlign: 'center', paddingBottom: 4 }}
        >
          <h2 style={{ color: '#f9fafb', fontSize: 18, fontWeight: 700, margin: 0 }}>New Session</h2>
          <p style={{ color: '#6b7280', fontSize: 11, margin: '3px 0 0' }}>Volatile wallet — RAM only</p>
        </motion.div>

        {/* ── Address Card (white) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', textAlign: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ color: '#374151', fontSize: 12, fontWeight: 500 }}>
              {selectedChain.name} Wallet
            </span>
            <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 9, padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>
              GasLess / EIP-7702
            </span>
          </div>
          <p style={{ color: '#1e3a8a', fontSize: 17, fontWeight: 700, letterSpacing: '0.03em', margin: 0, fontFamily: 'monospace', cursor: 'pointer' }}
            onClick={handleCopy}>
            {shortAddr}
          </p>
          <p style={{ color: '#9ca3af', fontSize: 9, margin: '4px 0 0' }}>
            {wallet.mode === 'PERSISTENT' ? '● Persistent mode' : '○ Volatile mode — wipes on close'}
          </p>
        </motion.div>

        {/* ── Floating Dock (action buttons) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <FloatingDock items={dockItems} />
        </motion.div>

        {/* ── Networks (dark card) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          style={{ background: '#141414', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: '#f9fafb', fontSize: 13, fontWeight: 600 }}>More Networks</span>
            <button
              onClick={() => setShowNetworks(true)}
              style={{ color: '#6b7280', background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
              See List <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
            {featuredChains.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18 + i * 0.04 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedChain(c)}
                style={{
                  background: selectedChain.id === c.id ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                  border: selectedChain.id === c.id ? `1px solid ${c.color}66` : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, padding: '10px 6px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  cursor: 'pointer',
                }}>
                <ChainIcon chain={c} size={36} />
                <span style={{ color: '#e5e7eb', fontSize: 10, fontWeight: 700 }}>{c.name}</span>
                <span style={{ color: c.color, fontSize: 8, fontWeight: 600 }}>Gasless</span>
                <span style={{ color: '#4b5563', fontSize: 7 }}>EIP-7702</span>
              </motion.button>
            ))}
          </div>
          {/* Chain marquee ticker */}
          <ChainMarquee />
        </motion.div>

        {/* ── Balance / Transactions Card (white) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
          style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}
        >
          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f3f4f6' }}>
            {(['balance', 'transactions', 'lightning'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', padding: '13px 0', marginRight: 18,
                  fontSize: 12, fontWeight: activeTab === tab ? 700 : 400,
                  color: activeTab === tab ? '#111827' : '#9ca3af',
                  borderBottom: activeTab === tab ? '2px solid #111827' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>
                {tab === 'balance' ? 'Balance' : tab === 'transactions' ? 'Transactions' : 'Lightning Nodes'}
              </button>
            ))}
            <button
              onClick={handleRefresh}
              style={{ marginLeft: 'auto', background: '#f9fafb', border: 'none', borderRadius: 8, padding: 7, cursor: 'pointer', display: 'flex', color: '#374151' }}>
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* BALANCE TAB */}
          {activeTab === 'balance' && (
            <div style={{ padding: '14px 16px' }}>
              {/* Total balance row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ color: '#6b7280', fontSize: 11 }}>Total Balance</span>
                    <button
                      onClick={() => setHideBalance(!hideBalance)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}>
                      {hideBalance ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>
                  <span style={{ color: '#111827', fontSize: 26, fontWeight: 800 }}>
                    {hideBalance ? '••••' : formatUSD(totalUSD)}
                  </span>
                </div>
                <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 10, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, marginTop: 4 }}>
                  ↗ Live
                </span>
              </div>

              {/* Token list */}
              {isLoadingTokens ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #e5e7eb', borderTopColor: '#374151', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : tokens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#9ca3af', fontSize: 11 }}>
                  No assets on {selectedChain.name}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {tokens.map((token, i) => {
                    const cgId = token.coingeckoId ?? selectedChain.coingeckoId;
                    const price = cgId ? (prices[cgId] ?? 0) : 0;
                    const usdVal = parseFloat(token.balance || '0') * price;
                    return (
                      <div key={`${token.contractAddress}-${i}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                        {token.logo
                          ? <img src={token.logo} alt={token.symbol} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : (
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: '#374151', fontSize: 10, fontWeight: 700 }}>{token.symbol.slice(0, 2)}</span>
                            </div>
                          )
                        }
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, color: '#111827', fontSize: 13, fontWeight: 600 }}>{token.symbol}</p>
                          <p style={{ margin: 0, color: '#9ca3af', fontSize: 10 }}>{token.name.toUpperCase()}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, color: '#111827', fontSize: 12, fontWeight: 600 }}>
                            {hideBalance ? '••••' : `${parseFloat(token.balance) < 0.000001 ? '< 0.000001' : token.balance} ${token.symbol}`}
                          </p>
                          <p style={{ margin: 0, color: '#9ca3af', fontSize: 10 }}>
                            {price > 0 ? (hideBalance ? '••••' : formatUSD(usdVal)) : 'No price data'}
                          </p>
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
            <div style={{ padding: '8px 0' }}>
              {isLoadingTxs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #e5e7eb', borderTopColor: '#374151', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : txs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 16px', color: '#9ca3af', fontSize: 11 }}>
                  {selectedChain.isAlchemy ? `No transactions on ${selectedChain.name}` : 'TX history requires Alchemy RPC'}
                </div>
              ) : (
                txs.map((tx) => {
                  const isOut = tx.direction === 'out';
                  const date = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                  return (
                    <a key={tx.hash} href={`${selectedChain.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', textDecoration: 'none', borderBottom: '1px solid #f9fafb', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: isOut ? '#fef2f2' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isOut ? <ArrowUpRight size={15} style={{ color: '#ef4444' }} /> : <ArrowDownLeft size={15} style={{ color: '#22c55e' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, color: '#111827', fontSize: 12, fontWeight: 600 }}>{isOut ? 'Sent' : 'Received'}</p>
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: 9, fontFamily: 'monospace' }}>
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-4)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: isOut ? '#ef4444' : '#22c55e' }}>
                          {isOut ? '-' : '+'}{tx.value} {tx.asset}
                        </p>
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: 9 }}>{date}</p>
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          )}

          {/* LIGHTNING TAB */}
          {activeTab === 'lightning' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 16px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={22} style={{ color: '#ca8a04' }} />
              </div>
              <p style={{ color: '#374151', fontSize: 13, fontWeight: 600, margin: 0 }}>Lightning Nodes</p>
              <p style={{ color: '#9ca3af', fontSize: 11, textAlign: 'center', maxWidth: 200, margin: 0, lineHeight: 1.5 }}>
                Lightning Network integration coming soon. Connect your node for instant payments.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
