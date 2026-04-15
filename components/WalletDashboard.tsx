'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Send, Copy, History, RefreshCw, Check, X,
  ExternalLink, ArrowUpRight, ArrowDownLeft, Eye, EyeOff,
  Zap, Wifi, WifiOff, AlertCircle, Link,
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
import { ChainMarquee } from '@/components/ChainMarquee';

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
  const [imgErr, setImgErr] = useState(false);
  const svgPath = CHAIN_SVG_PATHS[chain.shortName];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${chain.color}18`,
      border: `1.5px solid ${chain.color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {chain.logoUrl && !imgErr ? (
        <img
          src={chain.logoUrl}
          alt={chain.shortName}
          width={size * 0.7}
          height={size * 0.7}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
          onError={() => setImgErr(true)}
        />
      ) : svgPath ? (
        <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} style={{ color: chain.color }}>
          {svgPath}
        </svg>
      ) : (
        <span style={{ color: chain.color, fontSize: size * 0.28, fontWeight: 800, lineHeight: 1 }}>
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
  const smart = CHAINS.filter(c => c.isAlchemy && !c.isTestnet);
  const eoa = CHAINS.filter(c => !c.isAlchemy && !c.isTestnet);
  const testnets = CHAINS.filter(c => c.isTestnet);

  const ChainCard = ({ c }: { c: Chain }) => (
    <button
      onClick={() => { onSelect(c); onClose(); }}
      style={{
        background: selected.id === c.id ? 'rgba(82,255,172,0.07)' : 'rgba(255,255,255,0.03)',
        border: selected.id === c.id ? `1.5px solid #52ffac44` : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '12px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        cursor: 'pointer', position: 'relative', transition: 'all 0.15s', width: '100%',
      }}>
      {selected.id === c.id && (
        <div style={{
          position: 'absolute', top: 7, right: 7,
          width: 7, height: 7, borderRadius: '50%', background: '#52ffac',
        }} />
      )}
      <ChainIcon chain={c} size={34} />
      <span style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 700 }}>{c.symbol}</span>
      <span style={{ color: '#c6c6c6', fontSize: 9 }}>{c.name}</span>
      {c.isTestnet
        ? <span style={{ background: '#4c1d9533', color: '#a78bfa', fontSize: 7, padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>TESTNET</span>
        : c.isAlchemy
          ? <span style={{ background: 'rgba(82,255,172,0.1)', color: '#52ffac', fontSize: 7, padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>GASLESS</span>
          : <span style={{ background: '#353535', color: '#c6c6c6', fontSize: 7, padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>EOA</span>
      }
    </button>
  );

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#111', borderRadius: 24, width: 360, maxWidth: '92vw',
        maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>All Networks</span>
          <button onClick={onClose} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          <p style={{ color: '#c6c6c6', fontSize: 9, letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
            Smart Wallets (Gasless) ⓘ
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {smart.map(c => <ChainCard key={c.id} c={c} />)}
          </div>
          <p style={{ color: '#c6c6c6', fontSize: 9, letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
            EOA Wallets ⓘ
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {eoa.map(c => <ChainCard key={c.id} c={c} />)}
          </div>
          <p style={{ color: '#c6c6c6', fontSize: 9, letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10, marginTop: 16, textTransform: 'uppercase' }}>
            Testnets (Free)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {testnets.map(c => <ChainCard key={c.id} c={c} />)}
          </div>
          <p style={{ color: '#353535', fontSize: 9, textAlign: 'center' }}>
            {CHAINS.length} networks supported
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
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: 24, width: 360, maxWidth: '92vw', padding: 20, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Send {chain.symbol}</span>
          <button onClick={onClose} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        {status === 'done' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '1.5px solid rgba(82,255,172,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={22} style={{ color: '#52ffac' }} />
            </div>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>Broadcast!</span>
            <span style={{ color: '#c6c6c6', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>{txHash}</span>
            <a href={`${chain.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              style={{ color: '#52ffac', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              View on Explorer <ExternalLink size={10} />
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <GhostCapsule type="text" placeholder={`Recipient address (0x...)`} onValue={setTo} className="w-full" />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <GhostCapsule type="text" placeholder={`Amount (${chain.symbol})`} onValue={setAmount} className="w-full" />
            </div>
            {errMsg && <span style={{ color: '#ffdad6', fontSize: 10 }}>{errMsg}</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
              <ChainIcon chain={chain} size={18} />
              <span style={{ color: '#c6c6c6', fontSize: 10 }}>Network: {chain.name}</span>
              <span style={{ color: '#353535', fontSize: 9, marginLeft: 'auto' }}>Stealth delay active</span>
            </div>
            <button
              onClick={handleSend}
              disabled={status === 'signing' || status === 'sending'}
              style={{
                background: status === 'signing' || status === 'sending' ? '#1a1a1a' : '#52ffac',
                color: status === 'signing' || status === 'sending' ? '#c6c6c6' : '#000',
                border: 'none', borderRadius: 12, padding: '13px', fontSize: 13,
                fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.03em',
                cursor: status === 'signing' || status === 'sending' ? 'not-allowed' : 'pointer',
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
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: 24, width: 300, maxWidth: '92vw', padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.9)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Receive</span>
          <button onClick={onClose} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, padding: 7, cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 14 }}>
          <QRCodeSVG value={address} size={180} level="M" />
        </div>
        <p style={{ color: '#c6c6c6', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center', margin: 0, padding: '0 4px' }}>
          {address}
        </p>
        <button onClick={copy}
          style={{ background: copied ? 'rgba(82,255,172,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(82,255,172,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '8px 18px', fontSize: 10, color: copied ? '#52ffac' : '#c6c6c6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
          {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy Address</>}
        </button>
        <p style={{ color: '#353535', fontSize: 9, textAlign: 'center', margin: 0 }}>
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
  const [recvAmount, setRecvAmount] = useState('');
  const [recvMemo, setRecvMemo] = useState('');
  const [invoice, setInvoice] = useState('');
  const [invoiceCopied, setInvoiceCopied] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');
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
    } catch { setStatus('error'); }
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

  // ── No WebLN ──
  if (!hasWebLN) {
    return (
      <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertCircle size={14} style={{ color: '#facc15', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ color: '#facc15', fontSize: 11, fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>No Lightning Provider</p>
            <p style={{ color: '#c6c6c6', fontSize: 10, margin: 0, lineHeight: 1.5 }}>
              Install a WebLN-compatible browser extension to enable Lightning payments.
            </p>
          </div>
        </div>
        {[
          { name: 'Alby', desc: 'Most popular — custodial & self-hosted nodes', badge: 'Recommended' },
          { name: 'Zeus', desc: 'Connect your own LND / Core Lightning node', badge: 'Self-custody' },
          { name: 'Mutiny Wallet', desc: 'Browser-native Lightning + on-chain wallet', badge: 'PWA' },
        ].map(p => (
          <div key={p.name} style={{ background: '#0d0d0d', borderRadius: 12, padding: '10px 12px', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={14} style={{ color: '#facc15' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{p.name}</span>
                <span style={{ background: 'rgba(82,255,172,0.1)', color: '#52ffac', fontSize: 8, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{p.badge}</span>
              </div>
              <p style={{ color: '#c6c6c6', fontSize: 9, margin: '2px 0 0' }}>{p.desc}</p>
            </div>
            <Link size={12} style={{ color: '#353535', flexShrink: 0 }} />
          </div>
        ))}
        <p style={{ color: '#353535', fontSize: 9, textAlign: 'center' }}>After installing, reload this page to activate Lightning.</p>
      </div>
    );
  }

  // ── Not connected ──
  if (status === 'idle' || status === 'error') {
    return (
      <div style={{ padding: '18px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {status === 'error' ? <WifiOff size={20} style={{ color: '#facc15' }} /> : <Zap size={20} style={{ color: '#facc15' }} />}
        </div>
        <p style={{ color: '#fff', fontSize: 13, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', margin: 0 }}>Lightning Network</p>
        <p style={{ color: '#c6c6c6', fontSize: 10, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          {status === 'error' ? 'Connection failed. Make sure your node is online and try again.' : 'Connect your WebLN node to send and receive Lightning payments instantly.'}
        </p>
        <button onClick={connect}
          style={{ background: '#facc15', color: '#000', border: 'none', borderRadius: 10, padding: '9px 22px', fontSize: 11, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wifi size={12} /> Connect Node
        </button>
      </div>
    );
  }

  // ── Connecting ──
  if (status === 'connecting') {
    return (
      <div style={{ padding: '18px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(250,204,21,0.15)', borderTopColor: '#facc15' }} />
        <p style={{ color: '#c6c6c6', fontSize: 10 }}>Requesting permission...</p>
      </div>
    );
  }

  // ── Connected ──
  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: '#0d0d0d', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(250,204,21,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#52ffac', flexShrink: 0, animation: 'pulse-dot 2s ease-in-out infinite' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, margin: 0 }}>{nodeInfo?.alias || 'Lightning Node'}</p>
          {nodeInfo?.pubkey && (
            <p style={{ color: '#c6c6c6', fontSize: 8, fontFamily: 'monospace', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nodeInfo.pubkey.slice(0, 20)}...{nodeInfo.pubkey.slice(-8)}
            </p>
          )}
        </div>
        {balance != null && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ color: '#facc15', fontSize: 12, fontWeight: 700, margin: 0 }}>{balance.toLocaleString()}</p>
            <p style={{ color: '#c6c6c6', fontSize: 8, margin: 0 }}>sats</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#0d0d0d', borderRadius: 8, padding: 3, border: '1px solid #1a1a1a' }}>
        {(['receive', 'send'] as LnSubTab[]).map(t => (
          <button key={t} onClick={() => { setSubTab(t); setPayStatus('idle'); setInvoice(''); }}
            style={{ flex: 1, background: subTab === t ? '#1a1a1a' : 'none', border: subTab === t ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent', borderRadius: 6, padding: '5px 0', fontSize: 10, fontWeight: subTab === t ? 700 : 400, color: subTab === t ? '#52ffac' : '#c6c6c6', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t === 'receive' ? '↓ Receive' : '↑ Send'}
          </button>
        ))}
      </div>

      {subTab === 'receive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <GhostCapsule type="text" placeholder="Amount (sats)" onValue={setRecvAmount} className="w-full" />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <GhostCapsule type="text" placeholder="Memo (optional)" onValue={setRecvMemo} className="w-full" />
          </div>
          {genError && <p style={{ color: '#ffdad6', fontSize: 9, margin: 0 }}>{genError}</p>}
          <button onClick={makeInvoice} disabled={genLoading}
            style={{ background: genLoading ? '#1a1a1a' : '#facc15', color: genLoading ? '#c6c6c6' : '#000', border: 'none', borderRadius: 10, padding: '9px', fontSize: 11, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', cursor: genLoading ? 'not-allowed' : 'pointer' }}>
            {genLoading ? 'Generating...' : 'Generate Invoice'}
          </button>
          {invoice && (
            <div style={{ background: '#0d0d0d', borderRadius: 10, padding: '8px 10px', border: '1px solid rgba(250,204,21,0.2)' }}>
              <p style={{ color: '#c6c6c6', fontSize: 8, fontFamily: 'monospace', wordBreak: 'break-all', margin: '0 0 6px', lineHeight: 1.4 }}>
                {invoice.slice(0, 60)}...
              </p>
              <button onClick={copyInvoice}
                style={{ background: invoiceCopied ? 'rgba(82,255,172,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${invoiceCopied ? 'rgba(82,255,172,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 6, padding: '5px 10px', fontSize: 9, color: invoiceCopied ? '#52ffac' : '#c6c6c6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                {invoiceCopied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy Full Invoice</>}
              </button>
            </div>
          )}
        </div>
      )}

      {subTab === 'send' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payStatus === 'done' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '10px 0' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '1px solid rgba(82,255,172,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={20} style={{ color: '#52ffac' }} />
              </div>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', margin: 0 }}>Payment Sent!</p>
              {payPreimage && (
                <p style={{ color: '#c6c6c6', fontSize: 8, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center', margin: 0 }}>
                  Preimage: {payPreimage.slice(0, 20)}...
                </p>
              )}
              <button onClick={() => { setPayStatus('idle'); setPayReq(''); setPayPreimage(''); }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 16px', fontSize: 10, color: '#c6c6c6', cursor: 'pointer', fontWeight: 600 }}>
                Send Another
              </button>
            </div>
          ) : (
            <>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <GhostCapsule type="text" placeholder="Paste BOLT11 invoice (lnbc...)" onValue={setPayReq} className="w-full" />
              </div>
              {payError && <p style={{ color: '#ffdad6', fontSize: 9, margin: 0 }}>{payError}</p>}
              <button onClick={payInvoice} disabled={payStatus === 'paying' || !payReq.trim()}
                style={{ background: payStatus === 'paying' ? '#1a1a1a' : '#facc15', color: payStatus === 'paying' ? '#c6c6c6' : '#000', border: 'none', borderRadius: 10, padding: '9px', fontSize: 11, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', cursor: payStatus === 'paying' || !payReq.trim() ? 'not-allowed' : 'pointer' }}>
                {payStatus === 'paying' ? 'Sending...' : '⚡ Pay Invoice'}
              </button>
              <p style={{ color: '#353535', fontSize: 8, textAlign: 'center', margin: 0 }}>
                Supports BOLT11 invoices · Powered by WebLN
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
  const [sessionToggling, setSessionToggling] = useState(false);

  const address = wallet.activeAddress;
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-5)}` : '—';

  const handleSessionToggle = async () => {
    if (sessionToggling) return;
    setSessionToggling(true);
    try {
      if (wallet.isSessionLocked) {
        wallet.disableSessionLock();
      } else {
        await wallet.enableSessionLock();
      }
    } finally {
      setSessionToggling(false);
    }
  };

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
    } finally { setIsLoadingTokens(false); }
  }, [address, selectedChain.id]);

  const loadTxs = useCallback(async () => {
    if (!address) return;
    setIsLoadingTxs(true);
    try {
      const history = await fetchTxHistory(address, selectedChain.id);
      setTxs(history);
    } finally { setIsLoadingTxs(false); }
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

  const featuredChains = CHAINS.slice(0, 4);

  // ── Loading state ──
  if (!wallet.isUnlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(82,255,172,0.15)', borderTopColor: '#52ffac' }}
        />
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#c6c6c6', fontSize: 11, letterSpacing: '0.08em' }}>
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

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Network Pill ── */}
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowNetworks(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1a1a1a', border: '1px solid #353535', borderRadius: 100, padding: '5px 12px 5px 6px', cursor: 'pointer' }}>
            <ChainIcon chain={selectedChain} size={22} />
            <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{selectedChain.name}</span>
            <span style={{ color: '#52ffac', fontSize: 11, lineHeight: 1, marginLeft: 1 }}>▾</span>
          </button>
          <span style={{
            background: selectedChain.isTestnet ? '#4c1d9533' : selectedChain.isAlchemy ? 'rgba(82,255,172,0.1)' : '#353535',
            color: selectedChain.isTestnet ? '#a78bfa' : selectedChain.isAlchemy ? '#52ffac' : '#c6c6c6',
            fontSize: 8, padding: '2px 9px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.08em',
          }}>
            {selectedChain.isTestnet ? 'TESTNET' : selectedChain.isAlchemy ? 'GASLESS' : 'EOA'}
          </span>
        </motion.div>

        {/* ── Session Heading ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.03 }}>
          <h2 style={{
            fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase',
            color: '#fff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            {wallet.mode === 'PERSISTENT' ? 'Persistent\nSession' : 'New\nSession'}
          </h2>
          <p style={{ color: '#c6c6c6', fontSize: 9, margin: '4px 0 0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {wallet.mode === 'PERSISTENT' ? 'Encrypted · Device-Bound' : 'Volatile · RAM Only'}
          </p>
        </motion.div>

        {/* ── Session Lock Toggle ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.06 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid #1a1a1a' }}>
          <span style={{ color: '#c6c6c6', fontSize: 9, flex: 1, letterSpacing: '0.04em' }}>Keep session on refresh</span>
          <button
            onClick={handleSessionToggle}
            disabled={sessionToggling || !wallet.isUnlocked}
            aria-label="Toggle session lock"
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: wallet.isSessionLocked ? '#52ffac' : '#353535',
              border: 'none',
              cursor: sessionToggling || !wallet.isUnlocked ? 'not-allowed' : 'pointer',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0, padding: 0,
              opacity: !wallet.isUnlocked ? 0.4 : 1,
            }}>
            <div style={{
              position: 'absolute', top: 3, left: wallet.isSessionLocked ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: wallet.isSessionLocked ? '#000' : '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
        </motion.div>

        {/* ── Balance ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.08 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ color: '#c6c6c6', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Curated Value
            </span>
            <button onClick={() => setHideBalance(!hideBalance)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#353535', padding: 0, display: 'flex' }}>
              {hideBalance ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#52ffac', fontSize: 30, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {hideBalance ? '••••' : formatUSD(totalUSD)}
            </span>
            {isLoadingTokens && (
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(82,255,172,0.2)', borderTopColor: '#52ffac', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            )}
          </div>
        </motion.div>

        {/* ── Address Card ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.1 }}
          style={{ background: '#fff', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#9ca3af', fontSize: 8, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              {selectedChain.isAlchemy ? 'Smart Wallet · EIP-7702' : 'EOA Wallet'}
            </p>
            <span style={{ color: '#000', fontSize: 12, fontWeight: 700, fontFamily: 'monospace', cursor: 'pointer', letterSpacing: '0.02em' }} onClick={handleCopy}>
              {shortAddr}
            </span>
          </div>
          <button onClick={handleCopy} style={{ background: copied ? '#dcfce7' : '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: copied ? '#16a34a' : '#6b7280' }}>
            {copied ? <><Check size={10} /><span style={{ fontSize: 9, fontWeight: 700 }}>Copied!</span></> : <Copy size={11} />}
          </button>
        </motion.div>

        {/* ── 2×2 Action Grid ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.12 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: 'qr_code_2', label: 'RECEIVE', sub: 'Show QR code', onClick: () => setShowQR(true), accent: '#52ffac' },
            { icon: 'send', label: 'SEND', sub: `Transfer ${selectedChain.symbol}`, onClick: () => setShowSend(true), accent: '#fff' },
            { icon: 'content_copy', label: copied ? 'COPIED!' : 'COPY ADDR', sub: 'Copy to clipboard', onClick: handleCopy, accent: copied ? '#52ffac' : '#fff' },
            { icon: 'bolt', label: 'LIGHTNING', sub: 'WebLN payments', onClick: () => setActiveTab('lightning'), accent: activeTab === 'lightning' ? '#facc15' : '#fff' },
          ].map((item) => (
            <button key={item.label} onClick={item.onClick} style={{
              background: '#1a1a1a',
              border: `1px solid ${item.accent === '#52ffac' || item.accent === '#facc15' ? item.accent + '33' : '#353535'}`,
              borderRadius: 14, padding: '12px 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
              cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: item.accent, lineHeight: 1 }}>
                {item.icon}
              </span>
              <div>
                <p style={{ color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.06em', margin: 0 }}>{item.label}</p>
                <p style={{ color: '#c6c6c6', fontSize: 8, margin: '2px 0 0' }}>{item.sub}</p>
              </div>
            </button>
          ))}
        </motion.div>

        {/* ── Quick Switch Networks ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          style={{ background: '#0d0d0d', borderRadius: 14, padding: '10px 12px', border: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#c6c6c6', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Quick Switch</span>
            <button
              onClick={() => setShowNetworks(true)}
              style={{ color: '#52ffac', background: 'none', border: 'none', fontSize: 9, cursor: 'pointer', fontWeight: 700, letterSpacing: '0.06em' }}>
              All Networks →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 8 }}>
            {featuredChains.map((c) => (
              <button key={c.id} onClick={() => setSelectedChain(c)} style={{
                background: selectedChain.id === c.id ? 'rgba(82,255,172,0.07)' : 'rgba(255,255,255,0.03)',
                border: selectedChain.id === c.id ? '1px solid rgba(82,255,172,0.3)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, padding: '6px 4px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer',
              }}>
                <ChainIcon chain={c} size={24} />
                <span style={{ color: '#e5e7eb', fontSize: 8, fontWeight: 700 }}>{c.shortName}</span>
                {c.isTestnet
                  ? <span style={{ color: '#a78bfa', fontSize: 6, fontWeight: 700 }}>TEST</span>
                  : <span style={{ color: selectedChain.id === c.id ? '#52ffac' : '#353535', fontSize: 6, fontWeight: 700 }}>
                      {c.isAlchemy ? '7702' : 'EOA'}
                    </span>
                }
              </button>
            ))}
          </div>
          <ChainMarquee />
        </motion.div>

        {/* ── Balance / Txs / Lightning Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.18 }}
          style={{ background: '#111', borderRadius: 16, overflow: 'hidden', border: '1px solid #1a1a1a' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid #1a1a1a' }}>
            {(['balance', 'transactions', 'lightning'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', padding: '10px 0', marginRight: 14,
                  fontSize: 10, fontWeight: activeTab === tab ? 700 : 400,
                  color: activeTab === tab ? '#52ffac' : '#c6c6c6',
                  borderBottom: activeTab === tab ? '2px solid #52ffac' : '2px solid transparent',
                  cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                {tab === 'balance' ? 'Balance' : tab === 'transactions' ? 'Txs' : '⚡ Lightning'}
              </button>
            ))}
            <button
              onClick={handleRefresh}
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', display: 'flex', color: '#c6c6c6' }}>
              <RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* BALANCE TAB */}
          {activeTab === 'balance' && (
            <div style={{ padding: '10px 12px' }}>
              {isLoadingTokens ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid rgba(82,255,172,0.2)', borderTopColor: '#52ffac', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : tokens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '14px 0', color: '#c6c6c6', fontSize: 10 }}>
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
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i > 0 ? '1px solid #1a1a1a' : 'none' }}>
                        {token.logo
                          ? <img src={token.logo} alt={token.symbol} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: '#c6c6c6', fontSize: 9, fontWeight: 700 }}>{token.symbol.slice(0, 2)}</span>
                            </div>
                          )
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, color: '#fff', fontSize: 11, fontWeight: 600 }}>{token.symbol}</p>
                          <p style={{ margin: 0, color: '#c6c6c6', fontSize: 9 }}>{token.name}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ margin: 0, color: '#fff', fontSize: 11, fontWeight: 600 }}>
                            {hideBalance ? '••••' : `${parseFloat(token.balance) < 0.000001 ? '< 0.000001' : token.balance} ${token.symbol}`}
                          </p>
                          <p style={{ margin: 0, color: '#c6c6c6', fontSize: 9 }}>
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
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid rgba(82,255,172,0.2)', borderTopColor: '#52ffac', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : txs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 12px', color: '#c6c6c6', fontSize: 10 }}>
                  {selectedChain.isAlchemy ? `No transactions on ${selectedChain.name}` : 'TX history requires Alchemy RPC'}
                </div>
              ) : (
                txs.map((tx) => {
                  const isOut = tx.direction === 'out';
                  const date = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                  return (
                    <a key={tx.hash} href={`${selectedChain.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', textDecoration: 'none', borderBottom: '1px solid #1a1a1a', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isOut ? 'rgba(239,68,68,0.1)' : 'rgba(82,255,172,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isOut ? <ArrowUpRight size={12} style={{ color: '#ef4444' }} /> : <ArrowDownLeft size={12} style={{ color: '#52ffac' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: '#fff', fontSize: 11, fontWeight: 600 }}>{isOut ? 'Sent' : 'Received'}</p>
                        <p style={{ margin: 0, color: '#c6c6c6', fontSize: 9, fontFamily: 'monospace' }}>
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-4)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: isOut ? '#ef4444' : '#52ffac' }}>
                          {isOut ? '-' : '+'}{tx.value} {tx.asset}
                        </p>
                        <p style={{ margin: 0, color: '#c6c6c6', fontSize: 9 }}>{date}</p>
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

        {/* ── New Session ── */}
        <button
          onClick={() => { wallet.disableSessionLock(); wallet.wipeCopeWallet(); setTimeout(() => wallet.createCopeWallet(), 80); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#353535', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 0', alignSelf: 'center' }}>
          ↺ New Session
        </button>

      </div>
    </>
  );
}
