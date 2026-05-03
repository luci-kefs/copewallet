'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, ArrowDownUp } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { CHAINS, Chain } from '@/lib/chains';
import { ephemeralSign } from '@/lib/signer';
import { ledgerSign, LedgerEntry } from '@/lib/ledger';
import { getProvider } from '@/lib/provider';
import { ethers } from 'ethers';

// LiFi-supported chain IDs that we also have in CHAINS
const SWAP_CHAIN_IDS = new Set([1, 10, 56, 137, 324, 8453, 42161, 43114, 59144, 81457, 534352]);
const SWAP_CHAINS = CHAINS.filter(c => SWAP_CHAIN_IDS.has(c.id) && !c.isTestnet);

// ERC-20 approve ABI (minimal)
const ERC20_APPROVE_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

interface LifiToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
}

interface LifiQuote {
  action: {
    fromToken: LifiToken;
    toToken: LifiToken;
    fromAmount: string;
    slippage: number;
  };
  estimate: {
    toAmount: string;
    approvalAddress?: string;
    executionDuration: number;
    gasCosts: Array<{ amountUSD: string }>;
  };
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
    gasPrice?: string;
    chainId: number;
  };
}

type SwapStatus = 'idle' | 'quoting' | 'approving' | 'confirm' | 'signing' | 'sending' | 'done' | 'error';

function TokenPicker({ chainId, value, onChange, label }: {
  chainId: number;
  value: LifiToken | null;
  onChange: (t: LifiToken) => void;
  label: string;
}) {
  const [tokens, setTokens] = useState<LifiToken[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chainId) return;
    setLoading(true);
    fetch(`/api/swap?action=tokens&chainId=${chainId}`)
      .then(r => r.json())
      .then(d => {
        const list: LifiToken[] = d.tokens?.[chainId] ?? [];
        setTokens(list.slice(0, 200)); // cap at 200 to avoid enormous lists
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chainId]);

  const filtered = search
    ? tokens.filter(t =>
        t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 40)
    : tokens.slice(0, 40);

  const box: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', borderRadius: '1rem',
    padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
    width: '100%',
  };

  return (
    <div style={{ position: 'relative' }}>
      <p style={{ color: '#888', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{label}</p>
      <button onClick={() => setOpen(o => !o)} style={box}>
        {value ? (
          <>
            {value.logoURI && (
              <img src={value.logoURI} alt={value.symbol} width={24} height={24} style={{ borderRadius: '50%', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{value.symbol}</span>
            <span style={{ color: '#555', fontSize: 11, flex: 1, textAlign: 'left' }}>{value.name}</span>
          </>
        ) : (
          <span style={{ color: '#555', fontSize: 13 }}>{loading ? 'Loading tokens…' : 'Select token'}</span>
        )}
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#555', marginLeft: 'auto' }}>expand_more</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '1rem', marginTop: 4, maxHeight: 280, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search symbol or name…"
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <p style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>{loading ? 'Loading…' : 'No results'}</p>
            )}
            {filtered.map(t => (
              <button
                key={`${t.chainId}-${t.address}`}
                onClick={() => { onChange(t); setOpen(false); setSearch(''); }}
                style={{ width: '100%', background: 'none', border: 'none', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              >
                {t.logoURI && (
                  <img src={t.logoURI} alt={t.symbol} width={22} height={22} style={{ borderRadius: '50%', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{t.symbol}</span>
                <span style={{ color: '#555', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SwapModal({ onClose, activeLedger }: { onClose: () => void; activeLedger?: LedgerEntry | null }) {
  const wallet = useWallet();

  const [fromChain, setFromChain] = useState<Chain>(SWAP_CHAINS[0]);
  const [toChain, setToChain] = useState<Chain>(SWAP_CHAINS[1] ?? SWAP_CHAINS[0]);
  const [fromToken, setFromToken] = useState<LifiToken | null>(null);
  const [toToken, setToToken] = useState<LifiToken | null>(null);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<LifiQuote | null>(null);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [txHash, setTxHash] = useState('');
  const [approveTxHash, setApproveTxHash] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && status !== 'signing' && status !== 'sending' && status !== 'approving') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, status]);

  // Reset tokens when chains change
  useEffect(() => { setFromToken(null); }, [fromChain.id]);
  useEffect(() => { setToToken(null); }, [toChain.id]);

  const getQuote = useCallback(async () => {
    if (!fromToken || !toToken || !amount || !wallet.activeAddress) return;
    const amountNum = parseFloat(amount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) { setErrMsg('Invalid amount'); return; }

    setStatus('quoting'); setErrMsg(''); setQuote(null);

    try {
      const fromAmountWei = BigInt(Math.floor(amountNum * 10 ** fromToken.decimals)).toString();
      const params = new URLSearchParams({
        action: 'quote',
        fromChain: fromChain.id.toString(),
        toChain: toChain.id.toString(),
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: fromAmountWei,
        fromAddress: wallet.activeAddress,
      });
      const res = await fetch(`/api/swap?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Quote failed');
      setQuote(data);
      setStatus('confirm');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Quote failed');
      setStatus('error');
    }
  }, [fromToken, toToken, amount, wallet.activeAddress, fromChain.id, toChain.id]);

  const executeSwap = async () => {
    if (!quote?.transactionRequest || !wallet.activeAddress || (!wallet.scatteredKeyStore && !activeLedger)) return;
    const tx = quote.transactionRequest;

    // Check if ERC-20 approval needed
    const isNativeFrom = fromToken?.address === '0x0000000000000000000000000000000000000000';
    if (!isNativeFrom && quote.estimate.approvalAddress && fromToken) {
      setStatus('approving');
      try {
        const provider = getProvider(fromChain.id);
        const erc20 = new ethers.Contract(fromToken.address, ERC20_APPROVE_ABI, provider);
        const allowance: bigint = await erc20.allowance(wallet.activeAddress, quote.estimate.approvalAddress);
        const needed = BigInt(quote.action.fromAmount);
        if (allowance < needed) {
          const approveTx = await erc20.approve.populateTransaction(quote.estimate.approvalAddress, ethers.MaxUint256);
          const approveTxRequest: ethers.TransactionRequest = {
            to: fromToken.address,
            data: approveTx.data,
            chainId: fromChain.id,
          };
          const signedApprove = activeLedger
            ? await ledgerSign(activeLedger.derivationPath, { ...approveTxRequest, from: wallet.activeAddress })
            : await ephemeralSign(wallet.scatteredKeyStore!, approveTxRequest);
          const approveSent = await provider.send('eth_sendRawTransaction', [signedApprove]);
          if (approveSent && typeof approveSent === 'object') {
            const msg = (approveSent as Record<string, unknown>).message;
            throw new Error(typeof msg === 'string' ? msg : 'Approve failed');
          }
          setApproveTxHash(typeof approveSent === 'string' ? approveSent : '');
          // Wait ~12s for approval to mine
          await new Promise(r => setTimeout(r, 12000));
        }
      } catch (e: unknown) {
        setErrMsg(e instanceof Error ? e.message : 'Approval failed');
        setStatus('error');
        return;
      }
    }

    setStatus('signing');
    try {
      const swapTxRequest: ethers.TransactionRequest = {
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : 0n,
        chainId: tx.chainId,
        ...(tx.gasLimit ? { gasLimit: BigInt(tx.gasLimit) } : {}),
        ...(tx.gasPrice ? { gasPrice: BigInt(tx.gasPrice) } : {}),
      };
      const signed = activeLedger
        ? await ledgerSign(activeLedger.derivationPath, { ...swapTxRequest, from: wallet.activeAddress })
        : await ephemeralSign(wallet.scatteredKeyStore!, swapTxRequest);
      setStatus('sending');
      const provider = getProvider(fromChain.id);
      const result = await provider.send('eth_sendRawTransaction', [signed]);
      if (result && typeof result === 'object') {
        const msg = (result as Record<string, unknown>).message;
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(result));
      }
      setTxHash(typeof result === 'string' ? result : '');
      setStatus('done');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message.slice(0, 140) : 'Swap failed');
      setStatus('error');
    }
  };

  const toAmountDisplay = quote
    ? (parseInt(quote.estimate.toAmount) / 10 ** (toToken?.decimals ?? 18)).toFixed(6)
    : '';
  const gasCostUSD = quote?.estimate.gasCosts?.[0]?.amountUSD;
  const durationSec = quote?.estimate.executionDuration ?? 0;

  const isBusy = status === 'quoting' || status === 'approving' || status === 'signing' || status === 'sending';

  const box: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' };

  return (
    <div onClick={e => { if (e.target === e.currentTarget && !isBusy) onClose(); }}
      className="popup-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 440, maxWidth: '94vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Swap</span>
            <span style={{ color: '#555', fontSize: 10, fontWeight: 700, marginLeft: 10, letterSpacing: '0.06em' }}>via LiFi</span>
          </div>
          <button onClick={onClose} disabled={isBusy} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: isBusy ? 'not-allowed' : 'pointer', display: 'flex', opacity: isBusy ? 0.4 : 1 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>

          {/* ── Done ── */}
          {status === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '2px solid rgba(82,255,172,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={28} style={{ color: '#52ffac' }} />
              </div>
              <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, textTransform: 'uppercase' }}>Swap Sent!</span>
              <span style={{ color: '#c6c6c6', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>{txHash}</span>
              <a href={`${fromChain.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                style={{ color: '#52ffac', fontSize: 12, fontWeight: 700 }}>
                View on Explorer ↗
              </a>
              {approveTxHash && (
                <p style={{ color: '#666', fontSize: 10, textAlign: 'center' }}>Approve TX: {approveTxHash.slice(0, 20)}…</p>
              )}
              <button onClick={onClose} style={{ marginTop: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#888', fontWeight: 700, fontSize: 12, padding: '10px 28px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Close
              </button>
            </div>
          )}

          {/* ── Busy spinner ── */}
          {(status === 'quoting' || status === 'approving' || status === 'signing' || status === 'sending') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(82,255,172,0.15)', borderTopColor: '#52ffac', animation: 'spin 0.9s linear infinite' }} />
              <span style={{ color: '#c6c6c6', fontSize: 13, fontWeight: 700 }}>
                {status === 'quoting' ? 'Getting best route…'
                  : status === 'approving' ? 'Approving token spend…'
                  : status === 'signing' ? (activeLedger ? 'Check your Ledger and confirm…' : 'Signing transaction…')
                  : 'Broadcasting swap…'}
              </span>
            </div>
          )}

          {/* ── Idle / form ── */}
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* From chain */}
              <div style={box}>
                <p style={{ color: '#888', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>From chain</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SWAP_CHAINS.map(c => (
                    <button key={c.id} onClick={() => setFromChain(c)}
                      style={{ padding: '5px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: c.id === fromChain.id ? `1.5px solid ${c.color}` : '1px solid rgba(255,255,255,0.08)', background: c.id === fromChain.id ? `${c.color}18` : 'transparent', color: c.id === fromChain.id ? c.color : '#888', transition: 'all 0.15s' }}>
                      {c.shortName}
                    </button>
                  ))}
                </div>
              </div>

              {/* From token */}
              <TokenPicker chainId={fromChain.id} value={fromToken} onChange={setFromToken} label="You Pay" />

              {/* Amount */}
              <div style={box}>
                <p style={{ color: '#888', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Amount</p>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.0"
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 20, fontWeight: 900, fontFamily: 'inherit' }}
                />
              </div>

              {/* Swap icon */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    const tmpChain = fromChain; setFromChain(toChain); setToChain(tmpChain);
                    const tmpToken = fromToken; setFromToken(toToken); setToToken(tmpToken);
                  }}
                  style={{ background: 'rgba(82,255,172,0.07)', border: '1px solid rgba(82,255,172,0.18)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#52ffac' }}>
                  <ArrowDownUp size={16} />
                </button>
              </div>

              {/* To chain */}
              <div style={box}>
                <p style={{ color: '#888', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>To chain</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SWAP_CHAINS.map(c => (
                    <button key={c.id} onClick={() => setToChain(c)}
                      style={{ padding: '5px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: c.id === toChain.id ? `1.5px solid ${c.color}` : '1px solid rgba(255,255,255,0.08)', background: c.id === toChain.id ? `${c.color}18` : 'transparent', color: c.id === toChain.id ? c.color : '#888', transition: 'all 0.15s' }}>
                      {c.shortName}
                    </button>
                  ))}
                </div>
              </div>

              {/* To token */}
              <TokenPicker chainId={toChain.id} value={toToken} onChange={setToToken} label="You Receive" />

              {errMsg && <p style={{ color: '#ff8888', fontSize: 12, margin: 0 }}>{errMsg}</p>}

              <button
                onClick={getQuote}
                disabled={!fromToken || !toToken || !amount}
                style={{ background: fromToken && toToken && amount ? '#52ffac' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '1rem', color: fromToken && toToken && amount ? '#000' : '#555', fontWeight: 900, fontSize: 14, padding: '14px', cursor: fromToken && toToken && amount ? 'pointer' : 'not-allowed', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 0.2s' }}>
                Get Quote
              </button>
            </div>
          )}

          {/* ── Confirm screen ── */}
          {status === 'confirm' && quote && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ color: '#888', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Swap Preview</p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#c6c6c6', fontSize: 10, margin: '0 0 3px' }}>You pay</p>
                    <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: 0 }}>{amount} {fromToken?.symbol}</p>
                    <p style={{ color: '#555', fontSize: 10, margin: '2px 0 0' }}>{fromChain.name}</p>
                  </div>
                  <ArrowDownUp size={18} style={{ color: '#52ffac', flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <p style={{ color: '#c6c6c6', fontSize: 10, margin: '0 0 3px' }}>You receive ~</p>
                    <p style={{ color: '#52ffac', fontWeight: 900, fontSize: 18, margin: 0 }}>{toAmountDisplay} {toToken?.symbol}</p>
                    <p style={{ color: '#555', fontSize: 10, margin: '2px 0 0' }}>{toChain.name}</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                  {gasCostUSD && <span style={{ color: '#555', fontSize: 11 }}>Gas ~${gasCostUSD}</span>}
                  <span style={{ color: '#555', fontSize: 11 }}>~{Math.ceil(durationSec / 60)} min</span>
                  <span style={{ color: '#555', fontSize: 11 }}>0.5% slippage</span>
                </div>
              </div>

              {!fromToken || fromToken.address !== '0x0000000000000000000000000000000000000000' && quote.estimate.approvalAddress && (
                <p style={{ color: '#aaa', fontSize: 11, background: 'rgba(255,200,0,0.06)', border: '1px solid rgba(255,200,0,0.15)', borderRadius: 10, padding: '8px 12px', margin: 0 }}>
                  Token approval will be sent first (~12s wait), then the swap.
                </p>
              )}
              {activeLedger && (
                <p style={{ color: '#c7d2fe', fontSize: 11, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 10, padding: '8px 12px', margin: 0 }}>
                  <strong>Ledger:</strong> Your device will show contract call data. Enable &ldquo;Blind signing&rdquo; in the Ethereum app settings if prompted.
                </p>
              )}

              {errMsg && <p style={{ color: '#ff8888', fontSize: 12, margin: 0 }}>{errMsg}</p>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setStatus('idle'); setQuote(null); setErrMsg(''); }}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#888', fontWeight: 700, fontSize: 13, padding: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Back
                </button>
                <button
                  onClick={executeSwap}
                  style={{ flex: 2, background: '#52ffac', border: 'none', borderRadius: '1rem', color: '#000', fontWeight: 900, fontSize: 13, padding: '13px', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Confirm Swap
                </button>
              </div>
            </div>
          )}

          {/* Error with retry */}
          {status === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,80,80,0.1)', border: '2px solid rgba(255,80,80,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={22} style={{ color: '#ff5555' }} />
              </div>
              <span style={{ color: '#ff8888', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{errMsg}</span>
              <button onClick={() => { setStatus('idle'); setErrMsg(''); setQuote(null); }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#888', fontWeight: 700, fontSize: 12, padding: '10px 28px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Try Again
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <span style={{ color: '#333', fontSize: 10 }}>Powered by LiFi · Best-route aggregation across 30+ chains</span>
        </div>
      </div>
    </div>
  );
}
