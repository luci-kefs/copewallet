'use client';

// Generic chain panel — used by BTC, DOGE, BCH, SOL, XRP, XLM, NANO, HBAR, SUI, APTOS
// Designed to match WalletDashboard visual language.

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs, variants } from '@/lib/animations';

type Tab = 'receive' | 'send' | 'history';
type SendStatus = 'idle' | 'building' | 'broadcasting' | 'done' | 'error';

export interface ChainTx {
  txid: string;
  amount: number;   // negative = outgoing
  timestamp: number;
  type?: string;
}

export interface ChainPanelProps {
  // Identity
  coin: string;             // 'BTC', 'SOL', etc.
  name: string;             // 'Bitcoin', 'Solana', etc.
  color: string;            // '#F7931A'
  explorerBase: string;     // 'https://blockchair.com/bitcoin/transaction'

  // Data
  address: string | null;
  balance: number | null;   // in coin units
  usdPrice: number;
  symbol: string;           // 'BTC'

  // Actions
  onSend: (to: string, amount: number, feeSpeed: 'slow' | 'medium' | 'fast') => Promise<string>;
  onGetHistory: () => Promise<ChainTx[]>;
  onGetFees?: () => Promise<{ slow: number; medium: number; fast: number }>;
  feeUnit?: string;         // 'sat/vByte', 'lamports', etc.

  // Optional
  isLoading?: boolean;
  warning?: string;         // banner at top
}

const box: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.75rem',
  padding: '0.75rem',
};

const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.5rem',
  color: '#fff',
  padding: '0.6rem 0.75rem',
  width: '100%',
  fontSize: '0.875rem',
  outline: 'none',
};

const btn = (accent = 'var(--theme-accent)'): React.CSSProperties => ({
  background: accent,
  color: '#000',
  border: 'none',
  borderRadius: '0.5rem',
  padding: '0.6rem 1.25rem',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
  width: '100%',
});

export function ChainPanel({
  coin, name, color, explorerBase,
  address, balance, usdPrice, symbol,
  onSend, onGetHistory, onGetFees, feeUnit = 'sat/vByte',
  isLoading, warning,
}: ChainPanelProps) {
  const [tab, setTab] = useState<Tab>('receive');
  const [copied, setCopied] = useState(false);

  // Send state
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [feeSpeed, setFeeSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [fees, setFees] = useState<{ slow: number; medium: number; fast: number } | null>(null);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [txid, setTxid] = useState('');
  const [errMsg, setErrMsg] = useState('');

  // History
  const [txs, setTxs] = useState<ChainTx[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);

  const usdBalance = (balance ?? 0) * usdPrice;

  useEffect(() => {
    if (!address || !onGetFees) return;
    onGetFees().then(setFees).catch(() => {});
  }, [address, onGetFees]);

  const loadHistory = useCallback(async () => {
    setLoadingTxs(true);
    onGetHistory().then(setTxs).catch(() => setTxs([])).finally(() => setLoadingTxs(false));
  }, [onGetHistory]);

  useEffect(() => {
    if (tab === 'history' && address) loadHistory();
  }, [tab, address, loadHistory]);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!to || !amount || !address) return;
    setSendStatus('building');
    setErrMsg('');
    try {
      const txHash = await onSend(to, parseFloat(amount), feeSpeed);
      setTxid(txHash);
      setSendStatus('done');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Send failed');
      setSendStatus('error');
    }
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '0.4rem 0',
    background: 'none',
    border: 'none',
    color: active ? 'var(--theme-accent)' : 'rgba(255,255,255,0.4)',
    borderBottom: active ? '2px solid var(--theme-accent)' : '2px solid transparent',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  });

  return (
    <motion.div
      initial="hidden" animate="visible"
      variants={variants.scaleIn}
      transition={springs.smooth}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      {/* Warning */}
      {warning && (
        <div style={{ background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#ffb400' }}>
          <AlertCircle size={14} />
          {warning}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {symbol.slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{name}</div>
          {address ? (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {address}
            </div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>Loading…</div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
            {isLoading ? '…' : `${(balance ?? 0).toFixed(6)} ${symbol}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            ${usdBalance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {(['receive', 'send', 'history'] as Tab[]).map((t) => (
          <button key={t} style={tabBtnStyle(tab === t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* RECEIVE */}
        {tab === 'receive' && (
          <motion.div key="receive" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            {address ? (
              <>
                <div style={{ background: '#fff', padding: 12, borderRadius: '0.75rem' }}>
                  <QRCodeSVG value={address} size={150} />
                </div>
                <div style={{ ...box, width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ flex: 1, fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {address}
                  </span>
                  <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--theme-accent)' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Deriving address…</div>
            )}
          </motion.div>
        )}

        {/* SEND */}
        {tab === 'send' && (
          <motion.div key="send" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {sendStatus === 'done' ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ color: 'var(--theme-accent)', fontWeight: 700, marginBottom: '0.5rem' }}>Sent!</div>
                <a href={`${explorerBase}/${txid}`} target="_blank" rel="noreferrer"
                  style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  View on explorer <ExternalLink size={12} />
                </a>
                <button onClick={() => { setSendStatus('idle'); setTo(''); setAmount(''); setTxid(''); }}
                  style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '0.5rem', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                  New transfer
                </button>
              </div>
            ) : (
              <>
                <input style={inp} placeholder={`Recipient ${symbol} address`} value={to} onChange={(e) => setTo(e.target.value)} />
                <input style={inp} placeholder={`Amount (${symbol})`} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />

                {/* Fee selector */}
                {fees && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                    {(['slow', 'medium', 'fast'] as const).map((speed) => (
                      <button key={speed} onClick={() => setFeeSpeed(speed)}
                        style={{ padding: '0.4rem', borderRadius: '0.4rem', border: `1px solid ${feeSpeed === speed ? 'var(--theme-accent)' : 'rgba(255,255,255,0.1)'}`, background: feeSpeed === speed ? 'var(--theme-accent-dim)' : 'transparent', color: feeSpeed === speed ? 'var(--theme-accent)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.72rem' }}>
                        <div style={{ fontWeight: 600 }}>{speed}</div>
                        <div>{fees[speed]} {feeUnit}</div>
                      </button>
                    ))}
                  </div>
                )}

                {errMsg && (
                  <div style={{ color: '#ff6b6b', fontSize: '0.8rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <AlertCircle size={13} /> {errMsg}
                  </div>
                )}

                <button style={btn()} onClick={handleSend}
                  disabled={sendStatus === 'building' || sendStatus === 'broadcasting' || !to || !amount}>
                  {sendStatus === 'idle' ? `Send ${symbol}` : sendStatus === 'building' ? 'Building…' : 'Broadcasting…'}
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <motion.div key="history" variants={variants.staggerContainer} initial="hidden" animate="visible"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {loadingTxs ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>Loading…</div>
            ) : txs.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>No transactions yet</div>
            ) : (
              txs.map((tx) => (
                <motion.div key={tx.txid} variants={variants.staggerItem} transition={springs.smooth}
                  style={{ ...box, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: tx.amount >= 0 ? 'rgba(82,255,172,0.12)' : 'rgba(255,107,107,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {tx.amount >= 0
                      ? <ArrowDownLeft size={14} style={{ color: 'var(--theme-accent)' }} />
                      : <ArrowUpRight size={14} style={{ color: '#ff6b6b' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.6)' }}>
                      {tx.txid.slice(0, 20)}…
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                      {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: tx.amount >= 0 ? 'var(--theme-accent)' : '#ff6b6b' }}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(6)}
                    </div>
                  </div>
                  <a href={`${explorerBase}/${tx.txid}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                    <ExternalLink size={12} />
                  </a>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
