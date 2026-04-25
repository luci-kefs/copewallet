'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, ExternalLink } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import {
  deriveLTCWallet, getLTCBalance, getLTCUTXOs, getLTCTransactions,
  estimateLTCFee, buildLTCTransaction, broadcastLTC,
  LTCWallet, LTCBalance, LTCTransaction,
} from '@/lib/ltc';
import { getPrices } from '@/lib/prices';

type Tab = 'receive' | 'send' | 'history';
type SendStatus = 'idle' | 'building' | 'broadcasting' | 'done' | 'error';
type FeeSpeed = 'slow' | 'medium' | 'fast';

const BLOCKCHAIR_EXPLORER = 'https://blockchair.com/litecoin/transaction';

export function LitecoinPanel() {
  const wallet = useWallet();
  const [ltcWallet, setLtcWallet] = useState<LTCWallet | null>(null);
  const [balance, setBalance] = useState<LTCBalance | null>(null);
  const [ltcPrice, setLtcPrice] = useState(0);
  const [tab, setTab] = useState<Tab>('receive');
  const [copied, setCopied] = useState(false);
  const [txs, setTxs] = useState<LTCTransaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);

  // Send state
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [feeSpeed, setFeeSpeed] = useState<FeeSpeed>('medium');
  const [fees, setFees] = useState<{ slow: number; medium: number; fast: number } | null>(null);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [txid, setTxid] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Derive LTC wallet from mnemonic
  useEffect(() => {
    (async () => {
      const mnemonic = await wallet.getMnemonicForExport();
      if (!mnemonic) return;
      try { setLtcWallet(deriveLTCWallet(mnemonic)); } catch {}
    })();
  }, [wallet.isUnlocked]);

  // Load balance + price
  const loadBalance = useCallback(async (addr: string) => {
    try {
      const [bal, prices] = await Promise.all([
        getLTCBalance(addr),
        getPrices(['litecoin']),
      ]);
      setBalance(bal);
      setLtcPrice(prices['litecoin'] ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (!ltcWallet) return;
    loadBalance(ltcWallet.address);
    estimateLTCFee().then(setFees).catch(() => {});
  }, [ltcWallet, loadBalance]);

  // Load transaction history
  useEffect(() => {
    if (tab !== 'history' || !ltcWallet) return;
    setLoadingTxs(true);
    getLTCTransactions(ltcWallet.address, 20)
      .then(setTxs)
      .catch(() => setTxs([]))
      .finally(() => setLoadingTxs(false));
  }, [tab, ltcWallet]);

  const handleCopy = async () => {
    if (!ltcWallet) return;
    await navigator.clipboard.writeText(ltcWallet.address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQRScan = async (file: File) => {
    try {
      const bitmap = await createImageBitmap(file);
      // @ts-expect-error BarcodeDetector not in all TS libs
      if (typeof BarcodeDetector !== 'undefined') {
        // @ts-expect-error BarcodeDetector
        const codes = await new BarcodeDetector({ formats: ['qr_code'] }).detect(bitmap);
        if (codes.length > 0) { setTo(codes[0].rawValue); return; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { default: jsQR } = await import('jsqr');
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code) setTo(code.data);
    } catch {}
  };

  const handleSend = async () => {
    if (!ltcWallet) return;
    if (!to || !amount || parseFloat(amount) <= 0) { setErrMsg('Enter recipient and amount'); return; }
    if (!fees) { setErrMsg('Fee data not loaded yet'); return; }
    setSendStatus('building'); setErrMsg('');
    try {
      const { hex, fee } = await buildLTCTransaction({
        from: ltcWallet,
        to,
        amountLTC: parseFloat(amount),
        feeRate: fees[feeSpeed],
      });
      setSendStatus('broadcasting');
      const hash = await broadcastLTC(hex);
      setTxid(hash);
      setSendStatus('done');
      void loadBalance(ltcWallet.address);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Transaction failed');
      setSendStatus('error');
    }
  };

  const box: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem',
    padding: '10px 14px', border: '1px solid rgba(255,255,255,0.07)',
  };
  const inp: React.CSSProperties = {
    width: '100%', background: 'transparent', border: 'none', outline: 'none',
    color: '#fff', fontSize: 13, fontFamily: 'inherit',
  };

  if (!ltcWallet) {
    return (
      <div style={{ padding: '20px 0', color: '#555', fontSize: 13, textAlign: 'center' }}>
        Loading LTC wallet…
      </div>
    );
  }

  const balTotal = balance?.total ?? 0;
  const balUSD = balTotal * ltcPrice;
  const shortAddr = `${ltcWallet.address.slice(0, 10)}…${ltcWallet.address.slice(-6)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#a5b4fc18', border: '1.5px solid #a5b4fc44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none">
            <circle cx="12" cy="12" r="10" fill="#a5b4fc" opacity="0.15"/>
            <text x="12" y="16" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="900">LTC</text>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 900, margin: 0 }}>Litecoin</p>
          <p style={{ color: '#555', fontSize: 10, margin: 0, fontFamily: 'monospace' }}>{shortAddr}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 900, margin: 0 }}>{balTotal.toFixed(6)} LTC</p>
          {ltcPrice > 0 && <p style={{ color: '#52ffac', fontSize: 10, margin: 0, fontWeight: 700 }}>${balUSD.toFixed(2)}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
        {(['receive', 'send', 'history'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: tab === t ? 'rgba(165,180,252,0.1)' : 'transparent', border: tab === t ? '1px solid rgba(165,180,252,0.25)' : '1px solid transparent', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', color: tab === t ? '#a5b4fc' : '#666', fontSize: 11, fontWeight: 900, textTransform: 'capitalize', transition: 'all 0.15s' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Receive */}
      {tab === 'receive' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: 14 }}>
            <QRCodeSVG value={ltcWallet.address} size={160} level="M" />
          </div>
          <div style={{ ...box, width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, color: '#ccc', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>{ltcWallet.address}</span>
            <button onClick={handleCopy} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#aaa', display: 'flex' }}>
              {copied ? <Check size={14} style={{ color: '#52ffac' }} /> : <Copy size={14} />}
            </button>
          </div>
          <p style={{ color: '#555', fontSize: 10, textAlign: 'center' }}>Send only LTC to this address (bech32 P2WPKH)</p>
        </div>
      )}

      {/* Send */}
      {tab === 'send' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sendStatus === 'done' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '2px solid rgba(82,255,172,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={22} style={{ color: '#52ffac' }} />
              </div>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, textTransform: 'uppercase' }}>Broadcast!</span>
              <span style={{ color: '#555', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>{txid}</span>
              <a href={`${BLOCKCHAIR_EXPLORER}/${txid}`} target="_blank" rel="noopener noreferrer"
                style={{ color: '#a5b4fc', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                View on Explorer <ExternalLink size={11} />
              </a>
              <button onClick={() => { setSendStatus('idle'); setTo(''); setAmount(''); setTxid(''); }}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', color: '#aaa', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                New Transaction
              </button>
            </div>
          ) : (
            <>
              {/* Recipient */}
              <div style={{ ...box, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input placeholder="Recipient LTC address" value={to} onChange={e => setTo(e.target.value)} style={{ ...inp, flex: 1 }} />
                <button onClick={() => qrInputRef.current?.click()}
                  style={{ flexShrink: 0, background: 'rgba(165,180,252,0.08)', border: '1px solid rgba(165,180,252,0.2)', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', display: 'flex' }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth={2} strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    <line x1="14" y1="14" x2="14" y2="14"/><line x1="17" y1="14" x2="21" y2="14"/>
                  </svg>
                </button>
                <input ref={qrInputRef} type="file" accept="image/*" capture="environment"
                  style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleQRScan(f); e.target.value = ''; }} />
              </div>

              {/* Amount */}
              <div style={{ ...box, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input placeholder="0.00" type="number" min="0" step="0.00001" value={amount} onChange={e => setAmount(e.target.value)}
                  style={{ ...inp, flex: 1, fontSize: 18, fontWeight: 900 }} />
                <span style={{ color: '#666', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>LTC</span>
                <button onClick={() => setAmount(balTotal.toFixed(8))}
                  style={{ flexShrink: 0, background: 'rgba(165,180,252,0.08)', border: '1px solid rgba(165,180,252,0.2)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: '#a5b4fc', fontSize: 10, fontWeight: 900 }}>
                  MAX
                </button>
              </div>

              {/* Fee selector */}
              {fees && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['slow', 'medium', 'fast'] as FeeSpeed[]).map(s => (
                    <button key={s} onClick={() => setFeeSpeed(s)}
                      style={{ flex: 1, background: feeSpeed === s ? 'rgba(165,180,252,0.12)' : 'rgba(255,255,255,0.04)', border: feeSpeed === s ? '1px solid rgba(165,180,252,0.3)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 4px', cursor: 'pointer', color: feeSpeed === s ? '#a5b4fc' : '#666', fontSize: 10, fontWeight: 900, textTransform: 'capitalize', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span>{s}</span>
                      <span style={{ fontSize: 9, color: feeSpeed === s ? '#a5b4fc' : '#444' }}>{fees[s]} sat/vB</span>
                    </button>
                  ))}
                </div>
              )}

              {errMsg && <span style={{ color: '#ffa9a9', fontSize: 11 }}>{errMsg}</span>}

              <button onClick={handleSend} disabled={sendStatus === 'building' || sendStatus === 'broadcasting'}
                style={{ background: sendStatus === 'idle' || sendStatus === 'error' ? '#a5b4fc' : '#1a1a1a', color: sendStatus === 'idle' || sendStatus === 'error' ? '#1e1b4b' : '#666', border: 'none', borderRadius: '0.75rem', padding: '14px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: sendStatus === 'building' || sendStatus === 'broadcasting' ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                {sendStatus === 'building' ? 'Building TX…' : sendStatus === 'broadcasting' ? 'Broadcasting…' : 'Send LTC'}
              </button>
            </>
          )}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loadingTxs ? (
            <p style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Loading…</p>
          ) : txs.length === 0 ? (
            <p style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>No transactions found</p>
          ) : txs.map(tx => {
            const isIn = tx.amount > 0;
            return (
              <div key={tx.txid} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 2 }}>
                  <span style={{ color: isIn ? '#52ffac' : '#ffa9a9', fontSize: 12, fontWeight: 900 }}>
                    {isIn ? '+' : ''}{tx.amount.toFixed(6)} LTC
                  </span>
                  <span style={{ color: '#555', fontSize: 9, fontFamily: 'monospace' }}>{tx.txid.slice(0, 16)}…</span>
                </div>
                <a href={`${BLOCKCHAIR_EXPLORER}/${tx.txid}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#a5b4fc', display: 'flex', marginLeft: 8 }}>
                  <ExternalLink size={12} />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
