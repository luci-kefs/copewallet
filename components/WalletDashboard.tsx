'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy, Check, X, ExternalLink,
  ArrowUpRight, ArrowDownLeft, Zap, Wifi, WifiOff, AlertCircle, Link,
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

function ChainIcon({ chain, size = 40 }: { chain: Chain; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const svgPath = CHAIN_SVG_PATHS[chain.shortName];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${chain.color}18`, border: `1.5px solid ${chain.color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {chain.logoUrl && !imgErr ? (
        <img src={chain.logoUrl} alt={chain.shortName} width={size * 0.7} height={size * 0.7}
          style={{ borderRadius: '50%', objectFit: 'cover' }} onError={() => setImgErr(true)} />
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
  selected: Chain; onSelect: (c: Chain) => void; onClose: () => void;
}) {
  const smart = CHAINS.filter(c => c.isAlchemy && !c.isTestnet);
  const eoa = CHAINS.filter(c => !c.isAlchemy && !c.isTestnet);
  const testnets = CHAINS.filter(c => c.isTestnet);

  const ChainCard = ({ c }: { c: Chain }) => (
    <button onClick={() => { onSelect(c); onClose(); }} style={{
      background: selected.id === c.id ? 'rgba(82,255,172,0.07)' : 'rgba(255,255,255,0.03)',
      border: selected.id === c.id ? '1.5px solid rgba(82,255,172,0.4)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: '1.5rem', padding: '12px 8px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      cursor: 'pointer', position: 'relative', transition: 'all 0.15s', width: '100%',
    }}>
      {selected.id === c.id && (
        <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#52ffac' }} />
      )}
      <ChainIcon chain={c} size={34} />
      <span style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 700 }}>{c.symbol}</span>
      <span style={{ color: '#c6c6c6', fontSize: 9 }}>{c.name}</span>
      {c.isTestnet
        ? <span style={{ background: '#4c1d9533', color: '#a78bfa', fontSize: 7, padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>TESTNET</span>
        : c.isAlchemy
          ? <span style={{ background: 'rgba(82,255,172,0.1)', color: '#52ffac', fontSize: 7, padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>GASLESS</span>
          : <span style={{ background: '#353535', color: '#c6c6c6', fontSize: 7, padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>EOA</span>
      }
    </button>
  );

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: '2rem', width: 380, maxWidth: '92vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>All Networks</span>
          <button onClick={onClose} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1 }}>
          <p style={{ color: '#c6c6c6', fontSize: 9, letterSpacing: '0.15em', fontWeight: 900, marginBottom: 12, textTransform: 'uppercase' }}>Smart Wallets (Gasless)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {smart.map(c => <ChainCard key={c.id} c={c} />)}
          </div>
          <p style={{ color: '#c6c6c6', fontSize: 9, letterSpacing: '0.15em', fontWeight: 900, marginBottom: 12, textTransform: 'uppercase' }}>EOA Wallets</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {eoa.map(c => <ChainCard key={c.id} c={c} />)}
          </div>
          <p style={{ color: '#c6c6c6', fontSize: 9, letterSpacing: '0.15em', fontWeight: 900, marginBottom: 12, textTransform: 'uppercase' }}>Testnets (Free)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {testnets.map(c => <ChainCard key={c.id} c={c} />)}
          </div>
          <p style={{ color: '#353535', fontSize: 9, textAlign: 'center' }}>{CHAINS.length} networks</p>
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
      let msg = 'Transaction failed';
      if (e instanceof Error) {
        // Extract short reason — strip JSON blobs
        const raw = e.message;
        const reasonMatch = raw.match(/reason["\s:]+([^"}{,\n]{3,80})/i)
          || raw.match(/message["\s:]+([^"}{,\n]{3,80})/i);
        if (reasonMatch) msg = reasonMatch[1].trim();
        else if (raw.length <= 120) msg = raw;
        else msg = raw.slice(0, 120) + '…';
      }
      setErrMsg(msg);
      setStatus('error');
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: '2rem', width: 400, maxWidth: '92vw', padding: '28px 28px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ color: '#fff', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            Send {chain.symbol}
          </span>
          <button onClick={onClose} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        {status === 'done' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '2px solid rgba(82,255,172,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={26} style={{ color: '#52ffac' }} />
            </div>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>Broadcast!</span>
            <span style={{ color: '#c6c6c6', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>{txHash}</span>
            <a href={`${chain.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              style={{ color: '#52ffac', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              View on Explorer <ExternalLink size={12} />
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '6px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <GhostCapsule type="text" placeholder="Recipient address (0x...)" onValue={setTo} className="w-full" />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '6px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <GhostCapsule type="text" placeholder={`Amount (${chain.symbol})`} onValue={setAmount} className="w-full" />
            </div>
            {errMsg && <span style={{ color: '#ffdad6', fontSize: 11 }}>{errMsg}</span>}
            <button onClick={handleSend} disabled={status === 'signing' || status === 'sending'}
              style={{
                background: status === 'signing' || status === 'sending' ? '#1a1a1a' : '#52ffac',
                color: status === 'signing' || status === 'sending' ? '#c6c6c6' : '#002111',
                border: 'none', borderRadius: '1rem', padding: '16px',
                fontSize: 14, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase',
                letterSpacing: '0.05em', cursor: status === 'signing' || status === 'sending' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', marginTop: 4,
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
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: '2rem', width: 320, maxWidth: '92vw', padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Receive</span>
          <button onClick={onClose} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ background: '#fff', borderRadius: '1rem', padding: 16 }}>
          <QRCodeSVG value={address} size={200} level="M" />
        </div>
        <p style={{ color: '#c6c6c6', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center', margin: 0 }}>
          {address}
        </p>
        <button onClick={copy} style={{
          background: copied ? 'rgba(82,255,172,0.1)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${copied ? 'rgba(82,255,172,0.3)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '1rem', padding: '10px 20px', fontSize: 11,
          color: copied ? '#52ffac' : '#c6c6c6', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Address</>}
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
interface WebLNNode { alias?: string; pubkey?: string; }

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
      try { const bal = await webln.getBalance?.(); if (bal?.balance != null) setBalance(bal.balance); } catch {}
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
    } catch (e: unknown) { setGenError(e instanceof Error ? e.message : 'Invoice generation failed'); }
    finally { setGenLoading(false); }
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

  if (!hasWebLN) {
    return (
      <div className="space-y-3 p-6 bg-surface-container-low rounded-xl border border-white/5">
        <div className="flex items-start gap-4 p-4 bg-surface-container rounded-xl border border-white/5">
          <AlertCircle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-black text-white text-xs uppercase tracking-widest mb-1">No Lightning Provider</p>
            <p className="text-on-surface-variant text-xs leading-relaxed">Install a WebLN-compatible browser extension to enable Lightning payments.</p>
          </div>
        </div>
        {[
          { name: 'Alby', desc: 'Most popular — custodial & self-hosted nodes', badge: 'Recommended' },
          { name: 'Zeus', desc: 'Connect your own LND / Core Lightning node', badge: 'Self-custody' },
          { name: 'Mutiny Wallet', desc: 'Browser-native Lightning + on-chain wallet', badge: 'PWA' },
        ].map(p => (
          <div key={p.name} className="flex items-center gap-4 p-4 bg-surface-container rounded-xl border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
              <Zap size={16} className="text-yellow-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm">{p.name}</span>
                <span className="bg-tertiary/10 text-tertiary text-[10px] px-2 py-0.5 rounded-full font-black">{p.badge}</span>
              </div>
              <p className="text-on-surface-variant text-xs mt-0.5">{p.desc}</p>
            </div>
            <Link size={14} className="text-surface-variant shrink-0" />
          </div>
        ))}
        <p className="text-surface-variant text-xs text-center">After installing, reload this page to activate Lightning.</p>
      </div>
    );
  }

  if (status === 'idle' || status === 'error') {
    return (
      <div className="flex flex-col items-center gap-6 p-8 bg-surface-container-low rounded-xl border border-white/5">
        <div className="w-16 h-16 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
          {status === 'error' ? <WifiOff size={24} className="text-yellow-400" /> : <Zap size={24} className="text-yellow-400" />}
        </div>
        <div className="text-center">
          <p className="font-black text-white text-lg uppercase italic tracking-tighter">Lightning Network</p>
          <p className="text-on-surface-variant text-xs mt-1 leading-relaxed max-w-xs">
            {status === 'error' ? 'Connection failed. Make sure your node is online and try again.' : 'Connect your WebLN node to send and receive Lightning payments instantly.'}
          </p>
        </div>
        <button onClick={connect} className="bg-yellow-400 text-black font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-transform">
          <Wifi size={14} /> Connect Node
        </button>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(250,204,21,0.2)', borderTopColor: '#facc15', animation: 'spin 1s linear infinite' }} />
        <p className="text-on-surface-variant text-xs">Requesting permission...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 p-4 bg-surface-container rounded-xl border border-yellow-400/20">
        <div className="w-2 h-2 rounded-full bg-tertiary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm">{nodeInfo?.alias || 'Lightning Node'}</p>
          {nodeInfo?.pubkey && <p className="text-on-surface-variant text-[10px] font-mono truncate">{nodeInfo.pubkey.slice(0, 20)}...{nodeInfo.pubkey.slice(-8)}</p>}
        </div>
        {balance != null && (
          <div className="text-right shrink-0">
            <p className="font-black text-yellow-400 text-sm">{balance.toLocaleString()}</p>
            <p className="text-on-surface-variant text-[10px]">sats</p>
          </div>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-surface-container rounded-xl border border-white/5">
        {(['receive', 'send'] as LnSubTab[]).map(t => (
          <button key={t} onClick={() => { setSubTab(t); setPayStatus('idle'); setInvoice(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${subTab === t ? 'bg-surface-container-high text-white border border-white/10' : 'text-on-surface-variant hover:text-white'}`}>
            {t === 'receive' ? '↓ Receive' : '↑ Send'}
          </button>
        ))}
      </div>

      {subTab === 'receive' && (
        <div className="space-y-3">
          <div className="bg-white/5 rounded-xl p-3 border border-white/7">
            <GhostCapsule type="text" placeholder="Amount (sats)" onValue={setRecvAmount} className="w-full" />
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/7">
            <GhostCapsule type="text" placeholder="Memo (optional)" onValue={setRecvMemo} className="w-full" />
          </div>
          {genError && <p className="text-on-error-container text-xs">{genError}</p>}
          <button onClick={makeInvoice} disabled={genLoading}
            className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] ${genLoading ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-yellow-400 text-black'}`}>
            {genLoading ? 'Generating...' : 'Generate Invoice'}
          </button>
          {invoice && (
            <div className="bg-surface-container rounded-xl p-3 border border-yellow-400/20 space-y-2">
              <p className="text-on-surface-variant text-[10px] font-mono break-all leading-relaxed">{invoice.slice(0, 60)}...</p>
              <button onClick={copyInvoice} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black ${invoiceCopied ? 'bg-tertiary/10 text-tertiary border border-tertiary/30' : 'bg-white/5 text-on-surface-variant border border-white/10'}`}>
                {invoiceCopied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy Full Invoice</>}
              </button>
            </div>
          )}
        </div>
      )}

      {subTab === 'send' && (
        <div className="space-y-3">
          {payStatus === 'done' ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-full bg-tertiary/10 border border-tertiary/30 flex items-center justify-center">
                <Check size={20} className="text-tertiary" />
              </div>
              <p className="font-black text-white uppercase italic text-base tracking-tighter">Payment Sent!</p>
              {payPreimage && <p className="text-on-surface-variant text-[10px] font-mono break-all text-center">Preimage: {payPreimage.slice(0, 20)}...</p>}
              <button onClick={() => { setPayStatus('idle'); setPayReq(''); setPayPreimage(''); }}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-on-surface-variant font-black">
                Send Another
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white/5 rounded-xl p-3 border border-white/7">
                <GhostCapsule type="text" placeholder="Paste BOLT11 invoice (lnbc...)" onValue={setPayReq} className="w-full" />
              </div>
              {payError && <p className="text-on-error-container text-xs">{payError}</p>}
              <button onClick={payInvoice} disabled={payStatus === 'paying' || !payReq.trim()}
                className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] ${payStatus === 'paying' || !payReq.trim() ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-yellow-400 text-black'}`}>
                {payStatus === 'paying' ? 'Sending...' : '⚡ Pay Invoice'}
              </button>
              <p className="text-surface-variant text-[10px] text-center">Supports BOLT11 invoices · Powered by WebLN</p>
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
  const [sessionToggling, setSessionToggling] = useState(false);
  // Track whether wallet was ever unlocked — if yes, never show skeleton again
  const [everUnlocked, setEverUnlocked] = useState(false);
  useEffect(() => { if (wallet.isUnlocked) setEverUnlocked(true); }, [wallet.isUnlocked]);

  // Freeze last known address/mode so UI doesn't blank during transient wipe
  const [frozenAddress, setFrozenAddress] = useState<string | null>(null);
  const [frozenMode, setFrozenMode] = useState(wallet.mode);
  useEffect(() => {
    if (wallet.isUnlocked && wallet.activeAddress) {
      setFrozenAddress(wallet.activeAddress);
      setFrozenMode(wallet.mode);
    }
  }, [wallet.isUnlocked, wallet.activeAddress, wallet.mode]);

  const address = wallet.activeAddress ?? frozenAddress;
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '—';

  const handleSessionToggle = async () => {
    if (sessionToggling) return;
    setSessionToggling(true);
    try {
      if (wallet.isSessionLocked) wallet.disableSessionLock();
      else await wallet.enableSessionLock();
    } finally { setSessionToggling(false); }
  };

  const loadTokens = useCallback(async () => {
    if (!address) return;
    setIsLoadingTokens(true);
    try {
      const toks = await fetchTokenBalances(address, selectedChain.id);
      setTokens(toks);
      const cgIds = [...new Set([selectedChain.coingeckoId, ...toks.map(t => t.coingeckoId).filter(Boolean) as string[]])];
      if (cgIds.length > 0) { const p = await getPrices(cgIds); setPrices(p); }
    } finally { setIsLoadingTokens(false); }
  }, [address, selectedChain.id]);

  const loadTxs = useCallback(async () => {
    if (!address) return;
    setIsLoadingTxs(true);
    try { const history = await fetchTxHistory(address, selectedChain.id); setTxs(history); }
    finally { setIsLoadingTxs(false); }
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

  // ── Loading ──
  if (!wallet.isUnlocked && !everUnlocked) {
    return (
      <section className="flex-1 p-8 md:p-16 bg-surface flex flex-col overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-12 animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="h-12 w-56 bg-white/5 rounded-xl" />
              <div className="h-3 w-36 bg-white/5 rounded-full" />
            </div>
            <div className="h-9 w-32 bg-white/5 rounded-full" />
          </div>
          {/* Toggle skeleton */}
          <div className="flex items-center justify-between py-4 border-y border-white/5">
            <div className="h-3 w-48 bg-white/5 rounded-full" />
            <div className="h-6 w-12 bg-white/5 rounded-full" />
          </div>
          {/* Balance skeleton */}
          <div className="space-y-6">
            <div className="h-3 w-32 bg-white/5 rounded-full" />
            <div className="h-28 w-64 bg-white/5 rounded-2xl" />
            <div className="h-24 bg-white/5 rounded-xl" />
          </div>
          {/* Action grid skeleton */}
          <div className="grid grid-cols-2 gap-4">
            {[0,1,2,3].map(i => <div key={i} className="h-36 bg-white/5 rounded-xl" />)}
          </div>
          {/* Tabs skeleton */}
          <div className="space-y-4">
            <div className="flex gap-12 border-b border-white/5 pb-4">
              <div className="h-3 w-16 bg-white/5 rounded-full" />
              <div className="h-3 w-24 bg-white/5 rounded-full" />
              <div className="h-3 w-20 bg-white/5 rounded-full" />
            </div>
            {[0,1,2].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {showSend && <SendModal chain={selectedChain} onClose={() => setShowSend(false)} />}
      {showNetworks && <AllNetworksModal selected={selectedChain} onSelect={setSelectedChain} onClose={() => setShowNetworks(false)} />}
      {showQR && address && <QRModal address={address} onClose={() => setShowQR(false)} />}

      <section className="flex-1 p-8 md:p-16 bg-surface flex flex-col justify-between overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-12">

          {/* ── Session Heading with Chain Selector ── */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-white">
                  {frozenMode === 'PERSISTENT' ? 'Persistent Session' : 'New Session'}
                </h2>
                <p className="text-tertiary font-black tracking-[0.2em] uppercase text-xs opacity-80">
                  {frozenMode === 'PERSISTENT' ? 'Encrypted · Device-Bound' : 'Volatile wallet — RAM only'}
                </p>
              </div>
              <button
                onClick={() => setShowNetworks(true)}
                className="bg-surface-container-high px-5 py-2.5 rounded-full flex items-center gap-3 border border-white/5 hover:border-white/10 transition-colors flex-shrink-0">
                <div className="w-2.5 h-2.5 bg-tertiary rounded-full animate-pulse shadow-[0_0_12px_rgba(82,255,172,0.8)]"></div>
                <span className="text-[0.65rem] font-black tracking-[0.2em] uppercase text-white">{selectedChain.name}</span>
                <span className="material-symbols-outlined text-on-surface-variant scale-75">expand_more</span>
              </button>
            </div>
            <div className="flex items-center justify-between py-4 border-y border-white/5">
              <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Keep session on refresh</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={wallet.isSessionLocked}
                  onChange={handleSessionToggle}
                  disabled={sessionToggling}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          {/* ── Balance Section ── */}
          <div className="space-y-6">
            <p className="text-on-surface-variant font-black tracking-[0.2em] uppercase text-xs opacity-60">Total Curated Value</p>
            <div className="flex items-end gap-4">
              <motion.h1
                key={totalUSD}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-[6rem] md:text-[9rem] font-black tracking-tighter leading-none text-white">
                {isLoadingTokens ? (
                  <span className="text-on-surface-variant opacity-30">...</span>
                ) : formatUSD(totalUSD)}
              </motion.h1>
              {isRefreshing && (
                <div className="mb-4" style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(82,255,172,0.2)', borderTopColor: '#52ffac', animation: 'spin 1s linear infinite' }} />
              )}
            </div>

            {/* ── Address Card ── */}
            <div
              className="bg-white text-black p-8 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-neutral-200 transition-all"
              onClick={handleCopy}>
              <div className="flex flex-col">
                <span className="text-[0.7rem] font-black uppercase tracking-widest opacity-60 mb-2">Active Monolith Address</span>
                <span className="text-3xl font-black tracking-tighter font-mono">{shortAddr}</span>
              </div>
              <span className="material-symbols-outlined text-4xl">{copied ? 'check' : 'content_copy'}</span>
            </div>
          </div>

          {/* ── Action Grid ── */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowNetworks(true)}
              className="bg-surface-container-highest p-10 rounded-xl flex flex-col items-center gap-4 hover:bg-white hover:text-black transition-all group active:scale-95 border border-white/5">
              <span className="material-symbols-outlined text-5xl group-hover:scale-110 transition-transform">power</span>
              <span className="font-black uppercase tracking-widest text-[0.65rem]">Connect</span>
            </button>
            <button
              onClick={() => setShowSend(true)}
              className="bg-surface-container-highest p-10 rounded-xl flex flex-col items-center gap-4 hover:bg-white hover:text-black transition-all group active:scale-95 border border-white/5">
              <span className="material-symbols-outlined text-5xl group-hover:scale-110 transition-transform">north_east</span>
              <span className="font-black uppercase tracking-widest text-[0.65rem]">Send</span>
            </button>
            <button
              onClick={() => setShowQR(true)}
              className="bg-surface-container-highest p-10 rounded-xl flex flex-col items-center gap-4 hover:bg-white hover:text-black transition-all group active:scale-95 border border-white/5">
              <span className="material-symbols-outlined text-5xl group-hover:scale-110 transition-transform">qr_code_2</span>
              <span className="font-black uppercase tracking-widest text-[0.65rem]">Qr / Receive</span>
            </button>
            <button
              onClick={() => { wallet.disableSessionLock(); wallet.wipeCopeWallet(); setTimeout(() => wallet.createCopeWallet(), 80); }}
              className="bg-surface-container-highest p-10 rounded-xl flex flex-col items-center gap-4 hover:bg-white hover:text-black transition-all group active:scale-95 border border-white/5">
              <span className="material-symbols-outlined text-5xl group-hover:scale-110 transition-transform">add_card</span>
              <span className="font-black uppercase tracking-widest text-[0.65rem]">Create New Wallet</span>
            </button>
          </div>

          {/* ── Tabs & List ── */}
          <div className="pt-8">
            <div className="flex gap-12 mb-8 border-b border-white/5">
              <button
                onClick={() => setActiveTab('balance')}
                className={`font-black uppercase tracking-widest text-xs pb-4 transition-colors ${activeTab === 'balance' ? 'text-white border-b-2 border-tertiary' : 'text-on-surface-variant hover:text-white'}`}>
                Balance
              </button>
              <button
                onClick={() => { setActiveTab('transactions'); }}
                className={`font-black uppercase tracking-widest text-xs pb-4 transition-colors ${activeTab === 'transactions' ? 'text-white border-b-2 border-tertiary' : 'text-on-surface-variant hover:text-white'}`}>
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('lightning')}
                className={`font-black uppercase tracking-widest text-xs pb-4 transition-colors ${activeTab === 'lightning' ? 'text-white border-b-2 border-tertiary' : 'text-on-surface-variant hover:text-white'}`}>
                ⚡ Lightning
              </button>
              <button onClick={handleRefresh} className="ml-auto pb-4 text-on-surface-variant hover:text-white transition-colors">
                <span className={`material-symbols-outlined text-base ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>

            {/* BALANCE TAB */}
            {activeTab === 'balance' && (
              <div className="space-y-3">
                {isLoadingTokens ? (
                  <div className="flex justify-center py-12">
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(82,255,172,0.2)', borderTopColor: '#52ffac', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : tokens.length === 0 ? (
                  <div className="flex items-center justify-between p-6 bg-surface-container-low rounded-xl border border-white/5">
                    <p className="text-on-surface-variant font-black text-xs uppercase tracking-widest">No assets on {selectedChain.name}</p>
                  </div>
                ) : (
                  tokens.map((token, i) => {
                    const cgId = token.coingeckoId ?? selectedChain.coingeckoId;
                    const price = cgId ? (prices[cgId] ?? 0) : 0;
                    const usdVal = parseFloat(token.balance || '0') * price;
                    return (
                      <div key={`${token.contractAddress}-${i}`}
                        className="flex items-center justify-between p-6 bg-surface-container-low rounded-xl border border-white/5 hover:bg-surface-container-high transition-colors cursor-pointer">
                        <div className="flex items-center gap-5">
                          {token.logo ? (
                            <img src={token.logo} alt={token.symbol}
                              className="w-14 h-14 rounded-full object-cover shrink-0"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-14 h-14 bg-surface-container-highest rounded-full flex items-center justify-center font-black text-xl shrink-0">
                              {token.symbol.slice(0, 1)}
                            </div>
                          )}
                          <div>
                            <p className="font-black text-white text-lg">{token.symbol}</p>
                            <p className="text-[0.65rem] text-on-surface-variant uppercase tracking-widest font-bold">{token.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-white text-lg">
                            {parseFloat(token.balance) < 0.000001 ? '< 0.000001' : token.balance}
                          </p>
                          <p className="text-[0.65rem] text-on-surface-variant tracking-widest font-bold">
                            {price > 0 ? formatUSD(usdVal) : 'No price data'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
              <div className="space-y-3">
                {isLoadingTxs ? (
                  <div className="flex justify-center py-12">
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(82,255,172,0.2)', borderTopColor: '#52ffac', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : txs.length === 0 ? (
                  <div className="flex items-center p-6 bg-surface-container-low rounded-xl border border-white/5">
                    <p className="text-on-surface-variant font-black text-xs uppercase tracking-widest">
                      {selectedChain.isAlchemy ? `No transactions on ${selectedChain.name}` : 'TX history requires Alchemy RPC'}
                    </p>
                  </div>
                ) : (
                  txs.map((tx) => {
                    const isOut = tx.direction === 'out';
                    const date = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                    return (
                      <a key={tx.hash} href={`${selectedChain.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between p-6 bg-surface-container-low rounded-xl border border-white/5 hover:bg-surface-container-high transition-colors cursor-pointer no-underline">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${isOut ? 'bg-red-500/10' : 'bg-tertiary/10'}`}>
                            {isOut
                              ? <ArrowUpRight size={20} className="text-red-400" />
                              : <ArrowDownLeft size={20} className="text-tertiary" />}
                          </div>
                          <div>
                            <p className="font-black text-white text-lg">{isOut ? 'Sent' : 'Received'}</p>
                            <p className="text-[0.65rem] text-on-surface-variant uppercase tracking-widest font-bold font-mono">
                              {tx.hash.slice(0, 10)}...{tx.hash.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-lg ${isOut ? 'text-red-400' : 'text-tertiary'}`}>
                            {isOut ? '-' : '+'}{tx.value} {tx.asset}
                          </p>
                          <p className="text-[0.65rem] text-on-surface-variant tracking-widest font-bold">{date}</p>
                        </div>
                      </a>
                    );
                  })
                )}
              </div>
            )}

            {/* LIGHTNING TAB */}
            {activeTab === 'lightning' && <LightningTab />}
          </div>


        </div>
      </section>
    </>
  );
}
