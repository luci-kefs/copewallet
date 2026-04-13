'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Send, Copy, History, RefreshCw, Check, X,
  ExternalLink, ArrowUpRight, ArrowDownLeft, Eye, EyeOff,
  Zap, ChevronRight, Wifi, WifiOff, AlertCircle, Link,
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

// ─── Chain SVG Paths ─────────────────────────────────────────────────────────
const CHAIN_SVG_PATHS: Record<string, React.ReactNode> = {
  ETH:   <><polygon points="12,2 20,13 12,16 4,13" fill="currentColor" opacity="0.85"/><polygon points="12,16 20,13 12,22 4,13" fill="currentColor"/></>,
  BASE:  <><circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15"/><path d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6c3 0 5.5-2.1 5.9-5h-5.9V11h8c.1.6.1 1 .1 1 0 4.4-3.6 8-8 8S4 16.4 4 12 7.6 4 12 4c2.1 0 4 .8 5.5 2.1l-2.1 2.1C14.4 7.3 13.3 6 12 6z" fill="currentColor"/></>,
  ARB:   <><path d="M12 2 L22 18 L18 18 L14 10 L16 18 L12 18 L8 10 L10 18 L6 18 Z" fill="currentColor"/></>,
  OP:    <><circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/><circle cx="12" cy="12" r="5" fill="currentColor"/></>,
  MATIC: <><path d="M12 2 L22 7 L22 17 L12 22 L2 17 L2 7 Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5"/><text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="900">POL</text></>,
  ZK:    <><path d="M4 7h12l-8 10h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
  LINEA: <><line x1="4" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><line x1="4" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><line x1="4" y1="16" x2="12" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></>,
  SCR:   <><path d="M17 4H9a5 5 0 0 0 0 10h6a3 3 0 0 1 0 6H7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></>,
  BLAST: <><path d="M13 2 L6 13 L11 13 L9 22 L18 9 L13 9 Z" fill="currentColor"/></>,
  BNB:   <><path d="M12 2 L14.5 4.5 L12 7 L9.5 4.5 Z M7 7 L9.5 9.5 L7 12 L4.5 9.5 Z M17 7 L19.5 9.5 L17 12 L14.5 9.5 Z M9.5 9.5 L12 12 L14.5 9.5 L12 7 Z M7 12 L9.5 14.5 L12 12 L9.5 9.5 Z M14.5 9.5 L17 12 L14.5 14.5 L12 12 Z M9.5 14.5 L12 17 L14.5 14.5 L12 12 Z M12 17 L14.5 19.5 L12 22 L9.5 19.5 Z" fill="currentColor"/></>,
  AVAX:  <><path d="M9 18 L12 13 L15 18 Z" fill="currentColor"/><path d="M4 18 L10 7 L13 12 L8 18 Z" fill="currentColor" opacity="0.7"/><path d="M14 18 L16 14 L20 18 Z" fill="currentColor" opacity="0.5"/></>,
  FTM:   <><path d="M12 2 L8 8 L12 11 L16 8 Z M8 8 L4 12 L8 16 L12 11 Z M16 8 L20 12 L16 16 L12 11 Z M8 16 L12 11 L16 16 L12 22 Z" fill="currentColor" opacity="0.9"/></>,
  GNO:   <><circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/><path d="M9 9 L15 15 M15 9 L9 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></>,
};

// ─── Chain SVG Icon ───────────────────────────────────────────────────────────
function ChainIcon({ chain, size = 40 }: { chain: Chain; size?: number }) {
  const svgPath = CHAIN_SVG_PATHS[chain.shortName];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${chain.color}18`,
      border: `1.5px solid ${chain.color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {svgPath ? (
        <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56}
          style={{ color: chain.color }}>
          {svgPath}
        </svg>
      ) : (
        <span style={{ color: chain.color, fontSize: size * 0.28, fontWeight: 800, lineHeight: 1, fontFamily: "'SF Pro Rounded', 'Inter', system-ui, sans-serif" }}>
          {chain.shortName.slice(0, 3)}
        </span>
      )}
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
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: 22, width: 300, maxWidth: '92vw', padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, boxShadow: '0 32px 80px rgba(0,0,0,0.9)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: "'SF Pro Rounded', 'Inter', system-ui, sans-serif" }}>Receive</span>
          <button onClick={onClose} style={{ color: '#6b7280', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, padding: 7, cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 14 }}>
          <QRCodeSVG value={address} size={180} level="M" />
        </div>
        <p style={{ color: '#9ca3af', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center', margin: 0, padding: '0 4px' }}>
          {address}
        </p>
        <button onClick={copy}
          style={{ background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '7px 16px', fontSize: 10, color: copied ? '#22c55e' : '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontFamily: "'SF Pro Rounded', 'Inter', system-ui, sans-serif" }}>
          {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy Address</>}
        </button>
        <p style={{ color: '#374151', fontSize: 9, textAlign: 'center', margin: 0 }}>
          Send only EVM-compatible assets to this address
        </p>
      </div>
    </div>
  );
}

// ─── Lightning Tab ────────────────────────────────────────────────────────────
type LnStatus = 'idle' | 'connecting' | 'connected' | 'error';
type LnSubTab = 'receive' | 'send';

interface WebLNNode { alias?: string; pubkey?: string; color?: string; }

function LightningTab() {
  const [status, setStatus] = useState<LnStatus>('idle');
  const [nodeInfo, setNodeInfo] = useState<WebLNNode | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<LnSubTab>('receive');

  // Receive
  const [recvAmount, setRecvAmount] = useState('');
  const [recvMemo, setRecvMemo] = useState('');
  const [invoice, setInvoice] = useState('');
  const [invoiceCopied, setInvoiceCopied] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');

  // Send
  const [payReq, setPayReq] = useState('');
  const [payStatus, setPayStatus] = useState<'idle' | 'paying' | 'done' | 'error'>('idle');
  const [payError, setPayError] = useState('');
  const [payPreimage, setPayPreimage] = useState('');

  const webln = typeof window !== 'undefined' ? (window as any).webln : null;
  const hasWebLN = !!webln;

  const connect = async () => {
    if (!webln) return;
    setStatus('connecting');
    try {
      await webln.enable();
      const info = await webln.getInfo();
      setNodeInfo(info?.node ?? {});
      try {
        const bal = await webln.getBalance?.();
        if (bal?.balance != null) setBalance(bal.balance);
      } catch {}
      setStatus('connected');
    } catch {
      setStatus('error');
    }
  };

  const makeInvoice = async () => {
    if (!webln || status !== 'connected') return;
    const sats = parseInt(recvAmount, 10);
    if (!sats || sats < 1) { setGenError('Enter a valid amount in sats'); return; }
    setGenLoading(true); setGenError(''); setInvoice('');
    try {
      const result = await webln.makeInvoice({ amount: sats, defaultMemo: recvMemo || 'Cope Wallet' });
      setInvoice(result.paymentRequest);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Invoice generation failed');
    } finally { setGenLoading(false); }
  };

  const copyInvoice = async () => {
    if (!invoice) return;
    await navigator.clipboard.writeText(invoice).catch(() => {});
    setInvoiceCopied(true);
    setTimeout(() => setInvoiceCopied(false), 2000);
  };

  const payInvoice = async () => {
    if (!webln || status !== 'connected' || !payReq.trim()) return;
    setPayStatus('paying'); setPayError(''); setPayPreimage('');
    try {
      const result = await webln.sendPayment(payReq.trim());
      setPayPreimage(result?.preimage ?? '');
      setPayStatus('done');
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : 'Payment failed');
      setPayStatus('error');
    }
  };

  // ── No WebLN installed ──
  if (!hasWebLN) {
    return (
      <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: '#fef9c3', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertCircle size={14} style={{ color: '#ca8a04', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ color: '#92400e', fontSize: 11, fontWeight: 600, margin: '0 0 2px' }}>No Lightning provider detected</p>
            <p style={{ color: '#92400e', fontSize: 10, margin: 0, lineHeight: 1.5 }}>
              Install a WebLN-compatible browser extension to enable Lightning payments.
            </p>
          </div>
        </div>
        {[
          { name: 'Alby', desc: 'Most popular — custodial & self-hosted nodes', badge: 'Recommended' },
          { name: 'Zeus', desc: 'Connect your own LND / Core Lightning node', badge: 'Self-custody' },
          { name: 'Mutiny Wallet', desc: 'Browser-native Lightning + on-chain wallet', badge: 'PWA' },
        ].map(p => (
          <div key={p.name} style={{ background: '#0d0d0d', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={14} style={{ color: '#facc15' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#f3f4f6', fontSize: 11, fontWeight: 600 }}>{p.name}</span>
                <span style={{ background: '#1e3a8a33', color: '#93c5fd', fontSize: 8, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>{p.badge}</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: 9, margin: '2px 0 0' }}>{p.desc}</p>
            </div>
            <Link size={12} style={{ color: '#374151', flexShrink: 0 }} />
          </div>
        ))}
        <p style={{ color: '#374151', fontSize: 9, textAlign: 'center' }}>After installing, reload this page to activate Lightning.</p>
      </div>
    );
  }

  // ── Not connected yet ──
  if (status === 'idle' || status === 'error') {
    return (
      <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {status === 'error' ? <WifiOff size={20} style={{ color: '#ca8a04' }} /> : <Zap size={20} style={{ color: '#ca8a04' }} />}
        </div>
        <p style={{ color: '#f3f4f6', fontSize: 12, fontWeight: 600, margin: 0 }}>Lightning Network</p>
        <p style={{ color: '#6b7280', fontSize: 10, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          {status === 'error' ? 'Connection failed. Make sure your node is online and try again.' : 'Connect your WebLN node to send and receive Lightning payments instantly.'}
        </p>
        <button onClick={connect}
          style={{ background: '#facc15', color: '#000', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wifi size={12} /> Connect Node
        </button>
      </div>
    );
  }

  // ── Connecting ──
  if (status === 'connecting') {
    return (
      <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(250,204,21,0.2)', borderTopColor: '#facc15' }} />
        <p style={{ color: '#6b7280', fontSize: 10 }}>Requesting permission...</p>
      </div>
    );
  }

  // ── Connected ──
  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Node info card */}
      <div style={{ background: '#0d0d0d', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(250,204,21,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#f3f4f6', fontSize: 11, fontWeight: 600, margin: 0 }}>
            {nodeInfo?.alias || 'Lightning Node'}
          </p>
          {nodeInfo?.pubkey && (
            <p style={{ color: '#6b7280', fontSize: 8, fontFamily: 'monospace', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nodeInfo.pubkey.slice(0, 20)}...{nodeInfo.pubkey.slice(-8)}
            </p>
          )}
        </div>
        {balance != null && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ color: '#facc15', fontSize: 12, fontWeight: 700, margin: 0 }}>{balance.toLocaleString()}</p>
            <p style={{ color: '#6b7280', fontSize: 8, margin: 0 }}>sats</p>
          </div>
        )}
      </div>

      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 4, background: '#0d0d0d', borderRadius: 8, padding: 3 }}>
        {(['receive', 'send'] as LnSubTab[]).map(t => (
          <button key={t} onClick={() => { setSubTab(t); setPayStatus('idle'); setInvoice(''); }}
            style={{ flex: 1, background: subTab === t ? '#1c1c1c' : 'none', border: subTab === t ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent', borderRadius: 6, padding: '5px 0', fontSize: 10, fontWeight: subTab === t ? 600 : 400, color: subTab === t ? '#f3f4f6' : '#6b7280', cursor: 'pointer', textTransform: 'capitalize' }}>
            {t === 'receive' ? '↓ Receive' : '↑ Send'}
          </button>
        ))}
      </div>

      {/* RECEIVE */}
      {subTab === 'receive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '3px 10px' }}>
            <GhostCapsule type="text" placeholder="Amount (sats)" onValue={setRecvAmount} className="w-full" theme="light" />
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '3px 10px' }}>
            <GhostCapsule type="text" placeholder="Memo (optional)" onValue={setRecvMemo} className="w-full" theme="light" />
          </div>
          {genError && <p style={{ color: '#ef4444', fontSize: 9, margin: 0 }}>{genError}</p>}
          <button onClick={makeInvoice} disabled={genLoading}
            style={{ background: genLoading ? '#374151' : '#facc15', color: genLoading ? '#9ca3af' : '#000', border: 'none', borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 700, cursor: genLoading ? 'not-allowed' : 'pointer' }}>
            {genLoading ? 'Generating...' : 'Generate Invoice'}
          </button>
          {invoice && (
            <div style={{ background: '#0d0d0d', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(250,204,21,0.2)' }}>
              <p style={{ color: '#6b7280', fontSize: 8, fontFamily: 'monospace', wordBreak: 'break-all', margin: '0 0 6px', lineHeight: 1.4 }}>
                {invoice.slice(0, 60)}...
              </p>
              <button onClick={copyInvoice}
                style={{ background: invoiceCopied ? '#16a34a22' : 'rgba(255,255,255,0.06)', border: `1px solid ${invoiceCopied ? '#16a34a44' : 'rgba(255,255,255,0.08)'}`, borderRadius: 6, padding: '5px 10px', fontSize: 9, color: invoiceCopied ? '#22c55e' : '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                {invoiceCopied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy Full Invoice</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* SEND */}
      {subTab === 'send' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payStatus === 'done' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#16a34a22', border: '1px solid #16a34a44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={18} style={{ color: '#22c55e' }} />
              </div>
              <p style={{ color: '#f3f4f6', fontSize: 12, fontWeight: 600, margin: 0 }}>Payment Sent!</p>
              {payPreimage && (
                <p style={{ color: '#6b7280', fontSize: 8, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center', margin: 0 }}>
                  Preimage: {payPreimage.slice(0, 20)}...
                </p>
              )}
              <button onClick={() => { setPayStatus('idle'); setPayReq(''); setPayPreimage(''); }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 14px', fontSize: 10, color: '#9ca3af', cursor: 'pointer' }}>
                Send Another
              </button>
            </div>
          ) : (
            <>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '3px 10px' }}>
                <GhostCapsule type="text" placeholder="Paste BOLT11 invoice (lnbc...)" onValue={setPayReq} className="w-full" theme="light" />
              </div>
              {payError && <p style={{ color: '#ef4444', fontSize: 9, margin: 0 }}>{payError}</p>}
              <button onClick={payInvoice} disabled={payStatus === 'paying' || !payReq.trim()}
                style={{ background: payStatus === 'paying' ? '#374151' : '#facc15', color: payStatus === 'paying' ? '#9ca3af' : '#000', border: 'none', borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 700, cursor: payStatus === 'paying' || !payReq.trim() ? 'not-allowed' : 'pointer' }}>
                {payStatus === 'paying' ? 'Sending...' : '⚡ Pay Invoice'}
              </button>
              <p style={{ color: '#374151', fontSize: 8, textAlign: 'center', margin: 0 }}>
                Supports BOLT11 invoices • Powered by WebLN
              </p>
            </>
          )}
        </div>
      )}
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
    { label: 'QR / Receive', icon: <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="5" y="5" width="3" height="3" fill="currentColor"/><rect x="16" y="5" width="3" height="3" fill="currentColor"/><rect x="5" y="16" width="3" height="3" fill="currentColor"/><path d="M14 14h3v3m0 4v-4h4M14 21h4"/></svg>, onClick: () => setShowQR(true), color: '#059669' },
    { label: 'Send', icon: <Send size={18} />, onClick: () => setShowSend(true) },
    { label: copied ? 'Copied!' : 'Copy Addr', icon: copied ? <Check size={18} /> : <Copy size={18} />, onClick: handleCopy },
    { label: 'History', icon: <History size={18} />, onClick: () => setActiveTab('transactions'), active: activeTab === 'transactions' },
    { label: 'New Session', icon: <RefreshCw size={18} />, onClick: () => { wallet.wipeCopeWallet(); setTimeout(() => wallet.createCopeWallet(), 80); } },
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

      <div style={{ background: 'transparent', minHeight: '100%', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          style={{ textAlign: 'center', paddingBottom: 2 }}>
          <h2 style={{ color: '#f9fafb', fontSize: 15, fontWeight: 800, margin: 0, fontFamily: "'SF Pro Rounded', 'Inter', system-ui, sans-serif" }}>New Session</h2>
          <p style={{ color: '#6b7280', fontSize: 10, margin: '2px 0 0', fontFamily: "'SF Pro Rounded', 'Inter', system-ui, sans-serif" }}>Volatile wallet — RAM only</p>
        </motion.div>

        {/* ── Address Card (white) ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
          style={{ background: '#fff', borderRadius: 18, padding: '10px 16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ color: '#374151', fontSize: 11, fontWeight: 700, fontFamily: "'SF Pro Rounded', 'Inter', system-ui, sans-serif" }}>{selectedChain.name} Wallet</span>
            <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 8, padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontFamily: "'SF Pro Rounded', 'Inter', system-ui, sans-serif" }}>GasLess / EIP-7702</span>
          </div>
          <p style={{ color: '#1e3a8a', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', margin: 0, fontFamily: 'monospace', cursor: 'pointer' }} onClick={handleCopy}>
            {shortAddr}
          </p>
          <p style={{ color: '#9ca3af', fontSize: 8, margin: '3px 0 0', fontFamily: "'SF Pro Rounded', 'Inter', system-ui, sans-serif" }}>
            {wallet.mode === 'PERSISTENT' ? '● Persistent mode' : '○ Volatile — wipes on close'}
          </p>
        </motion.div>

        {/* ── Floating Dock ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <FloatingDock items={dockItems} />
        </motion.div>

        {/* ── Networks (dark card) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          style={{ background: '#0d0d0d', borderRadius: 14, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#f9fafb', fontSize: 12, fontWeight: 600 }}>More Networks</span>
            <button
              onClick={() => setShowNetworks(true)}
              style={{ color: '#6b7280', background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
              See List <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 8 }}>
            {featuredChains.map((c, i) => (
              <motion.button key={c.id}
                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.18 + i * 0.04 }}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedChain(c)}
                style={{
                  background: selectedChain.id === c.id ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                  border: selectedChain.id === c.id ? `1px solid ${c.color}55` : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '7px 4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer',
                }}>
                <ChainIcon chain={c} size={28} />
                <span style={{ color: '#e5e7eb', fontSize: 9, fontWeight: 700 }}>{c.name}</span>
                <span style={{ color: c.color, fontSize: 7, fontWeight: 600 }}>Gasless</span>
                <span style={{ color: '#374151', fontSize: 6 }}>EIP-7702</span>
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
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid #f3f4f6' }}>
            {(['balance', 'transactions', 'lightning'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', padding: '9px 0', marginRight: 14,
                  fontSize: 11, fontWeight: activeTab === tab ? 700 : 400,
                  color: activeTab === tab ? '#111827' : '#9ca3af',
                  borderBottom: activeTab === tab ? '2px solid #111827' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>
                {tab === 'balance' ? 'Balance' : tab === 'transactions' ? 'Txs' : '⚡ Lightning'}
              </button>
            ))}
            <button
              onClick={handleRefresh}
              style={{ marginLeft: 'auto', background: '#f9fafb', border: 'none', borderRadius: 7, padding: 5, cursor: 'pointer', display: 'flex', color: '#374151' }}>
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* BALANCE TAB */}
          {activeTab === 'balance' && (
            <div style={{ padding: '10px 12px' }}>
              {/* Total balance row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
                    <span style={{ color: '#6b7280', fontSize: 9 }}>Total Balance</span>
                    <button
                      onClick={() => setHideBalance(!hideBalance)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}>
                      {hideBalance ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                  </div>
                  <span style={{ color: '#111827', fontSize: 22, fontWeight: 800 }}>
                    {hideBalance ? '••••' : formatUSD(totalUSD)}
                  </span>
                </div>
                <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 9, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, marginTop: 3 }}>
                  ↗ Live
                </span>
              </div>

              {/* Token list */}
              {isLoadingTokens ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #e5e7eb', borderTopColor: '#374151', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : tokens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0', color: '#9ca3af', fontSize: 10 }}>
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
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                        {token.logo
                          ? <img src={token.logo} alt={token.symbol} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: '#374151', fontSize: 9, fontWeight: 700 }}>{token.symbol.slice(0, 2)}</span>
                            </div>
                          )
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, color: '#111827', fontSize: 11, fontWeight: 600 }}>{token.symbol}</p>
                          <p style={{ margin: 0, color: '#9ca3af', fontSize: 9 }}>{token.name.toUpperCase()}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ margin: 0, color: '#111827', fontSize: 11, fontWeight: 600 }}>
                            {hideBalance ? '••••' : `${parseFloat(token.balance) < 0.000001 ? '< 0.000001' : token.balance} ${token.symbol}`}
                          </p>
                          <p style={{ margin: 0, color: '#9ca3af', fontSize: 9 }}>
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
            <div style={{ padding: '6px 0' }}>
              {isLoadingTxs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #e5e7eb', borderTopColor: '#374151', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : txs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 12px', color: '#9ca3af', fontSize: 10 }}>
                  {selectedChain.isAlchemy ? `No transactions on ${selectedChain.name}` : 'TX history requires Alchemy RPC'}
                </div>
              ) : (
                txs.map((tx) => {
                  const isOut = tx.direction === 'out';
                  const date = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                  return (
                    <a key={tx.hash} href={`${selectedChain.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', textDecoration: 'none', borderBottom: '1px solid #f9fafb', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isOut ? '#fef2f2' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isOut ? <ArrowUpRight size={12} style={{ color: '#ef4444' }} /> : <ArrowDownLeft size={12} style={{ color: '#22c55e' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: '#111827', fontSize: 11, fontWeight: 600 }}>{isOut ? 'Sent' : 'Received'}</p>
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: 9, fontFamily: 'monospace' }}>
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-4)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: isOut ? '#ef4444' : '#22c55e' }}>
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
          {activeTab === 'lightning' && <LightningTab />}
        </motion.div>
      </div>
    </>
  );
}
