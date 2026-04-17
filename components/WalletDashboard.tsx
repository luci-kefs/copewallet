'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy, Check, X, ExternalLink,
  ArrowUpRight, ArrowDownLeft, Zap, Wifi, WifiOff, AlertCircle, Link,
} from 'lucide-react';
import CountUp from '@/components/CountUp';
import { useWallet } from '@/context/WalletContext';
import { CHAINS, Chain } from '@/lib/chains';
import { fetchTokenBalances, fetchTxHistory, TokenBalance, TxRecord } from '@/lib/tokens';
import { getPrices, formatUSD } from '@/lib/prices';
import { buildMaskedTransaction, stealthDelay, fireDummyEchoes, estimateFee } from '@/lib/transaction';
import { ephemeralSign } from '@/lib/signer';
import { getProvider } from '@/lib/provider';
import { ethers } from 'ethers';
import { GhostCapsule } from '@/components/GhostCapsule';
import { WalletConnectModal } from '@/components/WalletConnectModal';

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
      className="popup-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 380, maxWidth: '92vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, fontStyle: 'normal', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>All Networks</span>
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
function SendModal({ tokens, prices, defaultChain, onClose }: {
  tokens: TokenBalance[];
  prices: Record<string, number>;
  defaultChain: Chain;
  onClose: () => void;
}) {
  const wallet = useWallet();
  const [to, setTo] = useState('');
  const [whole, setWhole] = useState('');
  const [dec, setDec] = useState('');
  const [selectedChain, setSelectedChain] = useState<Chain>(defaultChain);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [chainTokens, setChainTokens] = useState<TokenBalance[]>(tokens);
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [status, setStatus] = useState<'idle' | 'signing' | 'sending' | 'done' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [feeEth, setFeeEth] = useState<string | null>(null);
  const [feeUsd, setFeeUsd] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const feeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativePriceRef = useRef<number>(0);

  // Re-fetch tokens whenever selected chain changes
  useEffect(() => {
    if (!wallet.activeAddress) return;
    fetchTokenBalances(wallet.activeAddress, selectedChain.id)
      .then(toks => {
        setChainTokens(toks);
        const withBal = toks.filter(t => parseFloat(t.balance || '0') > 0);
        setSelectedToken(withBal[0] ?? toks.find(t => t.contractAddress === 'native') ?? toks[0] ?? null);
      })
      .catch(() => { setChainTokens([]); setSelectedToken(null); });
  }, [selectedChain.id, wallet.activeAddress]);

  // Cache native token price for fee USD conversion
  useEffect(() => {
    getPrices([selectedChain.coingeckoId]).then(p => {
      nativePriceRef.current = p[selectedChain.coingeckoId] ?? 0;
    }).catch(() => {});
  }, [selectedChain.id]);

  // Real-time fee estimation — debounced 500ms, uses eth_estimateGas when params known
  const refreshFee = useCallback((
    toAddr: string, amtStr: string, token: TokenBalance | null, chain: Chain, fromAddr: string
  ) => {
    if (feeTimerRef.current) clearTimeout(feeTimerRef.current);
    const isErc20 = !!(token && token.contractAddress !== 'native');

    // Build txParams if we have enough info for eth_estimateGas
    let txParams: Parameters<typeof estimateFee>[2];
    const validTo = ethers.isAddress(toAddr);
    const amt = parseFloat(amtStr);
    if (validTo && amt > 0 && fromAddr) {
      try {
        if (isErc20 && token && token.contractAddress !== 'native') {
          const amountRaw = ethers.parseUnits(amtStr, token.decimals ?? 18);
          const addr = toAddr.toLowerCase().replace('0x', '').padStart(64, '0');
          const amtHex = amountRaw.toString(16).padStart(64, '0');
          txParams = {
            from: fromAddr,
            to: token.contractAddress as string,
            value: 0n,
            data: '0xa9059cbb' + addr + amtHex,
          };
        } else {
          txParams = {
            from: fromAddr,
            to: toAddr,
            value: ethers.parseEther(amtStr),
          };
        }
      } catch { txParams = undefined; }
    }

    setFeeLoading(true);
    feeTimerRef.current = setTimeout(async () => {
      try {
        const { eth } = await estimateFee(chain.id, isErc20, txParams);
        const ethNum = parseFloat(eth);
        const formatted = ethNum < 0.000001 ? ethNum.toExponential(2) : ethNum.toFixed(8).replace(/\.?0+$/, '');
        setFeeEth(formatted);
        setFeeUsd(ethNum * nativePriceRef.current);
      } catch {
        setFeeEth(null); setFeeUsd(null);
      } finally {
        setFeeLoading(false);
      }
    }, 500);
  }, []);

  // Trigger fee refresh on any relevant change
  useEffect(() => {
    if (!wallet.activeAddress) return;
    const amtStr = `${whole || '0'}.${dec || '0'}`;
    refreshFee(to, amtStr, selectedToken, selectedChain, wallet.activeAddress);
    return () => { if (feeTimerRef.current) clearTimeout(feeTimerRef.current); };
  }, [to, whole, dec, selectedToken?.contractAddress, selectedChain.id, wallet.activeAddress]);

  const isNative = !selectedToken || selectedToken.contractAddress === 'native';
  const amountStr = `${whole || '0'}.${dec || '0'}`;
  const amountNum = parseFloat(amountStr);
  const selectedBal = parseFloat(selectedToken?.balance ?? '0');
  const tokenSymbol = selectedToken?.symbol ?? selectedChain.symbol;

  const digitsOnly = (e: React.KeyboardEvent) => {
    if (!/^\d$/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleSend = async () => {
    if (!wallet.activeAddress || !wallet.scatteredKeyStore) { setErrMsg('Wallet not ready'); return; }
    if (!ethers.isAddress(to)) { setErrMsg('Invalid address'); return; }
    if (!amountNum || amountNum <= 0 || isNaN(amountNum)) { setErrMsg('Invalid amount'); return; }
    if (amountNum > selectedBal) { setErrMsg('Secili Networkta Bakiye Yetersiz'); return; }

    setStatus('signing'); setErrMsg('');
    try {
      const contractAddr = (!isNative && selectedToken) ? selectedToken.contractAddress as string : undefined;
      const decimals = selectedToken?.decimals ?? 18;
      const tx = await buildMaskedTransaction(to, amountStr, wallet.activeAddress, selectedChain.id, contractAddr, decimals);
      setStatus('sending');
      await stealthDelay();
      void fireDummyEchoes();
      const signed = await ephemeralSign(wallet.scatteredKeyStore, tx);
      const provider = getProvider(selectedChain.id);
      const result = await provider.send('eth_sendRawTransaction', [signed]);
      if (result && typeof result === 'object') {
        const err = (result as Record<string, unknown>).error ?? result;
        const errMsg_ = (err as Record<string, unknown>).message;
        throw new Error(typeof errMsg_ === 'string' ? errMsg_ : JSON.stringify(err));
      }
      setTxHash(typeof result === 'string' ? result : '');
      setStatus('done');
    } catch (e: unknown) {
      let msg = 'Transaction failed';
      try {
        const raw: string = (() => {
          if (e instanceof Error) return e.message;
          if (typeof e === 'string') return e;
          try { return JSON.stringify(e); } catch { return 'Unknown error'; }
        })();
        const jsonMatch = raw.match(/\{[\s\S]{0,500}\}/);
        if (jsonMatch) {
          try {
            const p = JSON.parse(jsonMatch[0]);
            const inner = p?.error?.message ?? p?.message ?? p?.reason;
            msg = typeof inner === 'string' ? inner.slice(0, 140) : 'Transaction rejected by network';
          } catch { msg = raw.slice(0, 120) + (raw.length > 120 ? '…' : ''); }
        } else {
          const m = raw.match(/reason["\s:]+([^"}{,\n]{3,80})/i) ?? raw.match(/message["\s:]+([^"}{,\n]{3,80})/i);
          msg = m ? m[1].trim() : (raw.length <= 120 ? raw : raw.slice(0, 120) + '…');
        }
      } catch {}
      setErrMsg(String(msg));
      setStatus('error');
    }
  };

  const box: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', borderRadius: '1rem',
    padding: '10px 16px', border: '1px solid rgba(255,255,255,0.07)',
  };
  const inp: React.CSSProperties = {
    width: '100%', background: 'transparent', border: 'none', outline: 'none',
    color: '#fff', fontSize: 13, fontFamily: 'inherit',
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="popup-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 420, maxWidth: '94vw', padding: '28px', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ color: '#fff', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Send</span>
          <button onClick={onClose} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {status === 'done' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '2px solid rgba(82,255,172,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={26} style={{ color: '#52ffac' }} />
            </div>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, textTransform: 'uppercase' }}>Broadcast!</span>
            <span style={{ color: '#c6c6c6', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>{txHash}</span>
            <a href={`${selectedChain.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              style={{ color: '#52ffac', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              View on Explorer <ExternalLink size={12} />
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Row: Network + Token selectors side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

              {/* Network dropdown */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setNetworkOpen(o => !o); setTokenOpen(false); }}
                  style={{ ...box, width: '100%', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${selectedChain.color}22`, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedChain.logoUrl
                      ? <img src={selectedChain.logoUrl} alt={selectedChain.shortName} width={22} height={22} style={{ objectFit: 'cover' }} />
                      : <svg viewBox="0 0 24 24" width={12} height={12} fill={selectedChain.color}>{CHAIN_SVG_PATHS[selectedChain.shortName] ?? <circle cx="12" cy="12" r="8"/>}</svg>
                    }
                  </div>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#fff', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedChain.name}</span>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={2.5} strokeLinecap="round" style={{ transform: networkOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {networkOpen && (
                  <div className="popup-enter" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                    {CHAINS.map(c => {
                      const active = selectedChain.id === c.id;
                      return (
                        <button key={c.id} onClick={() => { setSelectedChain(c); setNetworkOpen(false); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', width: '100%', border: 'none', background: active ? `${c.color}18` : 'transparent', cursor: 'pointer' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${c.color}22`, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {c.logoUrl ? <img src={c.logoUrl} alt={c.shortName} width={20} height={20} style={{ objectFit: 'cover' }} /> : <svg viewBox="0 0 24 24" width={11} height={11} fill={c.color}>{CHAIN_SVG_PATHS[c.shortName] ?? <circle cx="12" cy="12" r="8"/>}</svg>}
                          </div>
                          <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: active ? c.color : '#ccc', textAlign: 'left' }}>{c.name}</span>
                          {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Token dropdown */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setTokenOpen(o => !o); setNetworkOpen(false); }}
                  style={{ ...box, width: '100%', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  {selectedToken?.logo
                    ? <img src={selectedToken.logo} width={22} height={22} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt={selectedToken.symbol} />
                    : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{(selectedToken?.symbol ?? '?').slice(0,2)}</div>
                  }
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#fff', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedToken?.symbol ?? 'Select'}</span>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={2.5} strokeLinecap="round" style={{ transform: tokenOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {tokenOpen && (
                  <div className="popup-enter" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                    {chainTokens.length === 0
                      ? <p style={{ color: '#555', fontSize: 11, padding: '12px 14px', textAlign: 'center' }}>No tokens found</p>
                      : chainTokens.map((t, i) => {
                          const active = selectedToken?.contractAddress === t.contractAddress;
                          const bal = parseFloat(t.balance || '0');
                          return (
                            <button key={i} onClick={() => { setSelectedToken(t); setTokenOpen(false); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', width: '100%', border: 'none', background: active ? 'rgba(255,255,255,0.06)' : 'transparent', cursor: 'pointer' }}>
                              {t.logo
                                ? <img src={t.logo} width={20} height={20} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt={t.symbol} />
                                : <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{t.symbol.slice(0,2)}</div>
                              }
                              <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: active ? '#fff' : '#ccc', textAlign: 'left' }}>{t.symbol}</span>
                              <span style={{ fontSize: 9, color: '#555', fontWeight: 700 }}>{bal > 0 ? (bal < 0.0001 ? '<0.0001' : bal.toFixed(4)) : '0'}</span>
                              {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#52ffac', flexShrink: 0 }} />}
                            </button>
                          );
                        })
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Balance hint */}
            {selectedToken && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 4px' }}>
                <span style={{ fontSize: 10, color: '#555', fontWeight: 700 }}>
                  Balance: {selectedBal < 0.000001 && selectedBal > 0 ? '< 0.000001' : selectedBal.toFixed(6)} {tokenSymbol}
                </span>
              </div>
            )}

            {/* Recipient */}
            <div style={box}>
              <input type="text" placeholder="Recipient address (0x...)" autoComplete="off"
                value={to} onChange={e => setTo(e.target.value)} style={inp} />
            </div>

            {/* Amount */}
            <div style={{ ...box, display: 'flex', alignItems: 'center', gap: 0 }}>
              <input type="text" inputMode="numeric" placeholder="0" autoComplete="off"
                value={whole} onKeyDown={digitsOnly}
                onChange={e => setWhole(e.target.value.replace(/\D/g, ''))}
                style={{ ...inp, width: '40%', textAlign: 'right', fontSize: 20, fontWeight: 900 }} />
              <span style={{ color: '#52ffac', fontSize: 24, fontWeight: 900, padding: '0 4px', flexShrink: 0 }}>.</span>
              <input type="text" inputMode="numeric" placeholder="00" autoComplete="off"
                value={dec} onKeyDown={digitsOnly}
                onChange={e => setDec(e.target.value.replace(/\D/g, '').slice(0, 18))}
                style={{ ...inp, width: '40%', fontSize: 20, fontWeight: 900 }} />
              <button
                onClick={() => { const s = selectedBal.toFixed(18).replace(/\.?0+$/, ''); const [w, d=''] = s.split('.'); setWhole(w); setDec(d); }}
                style={{ fontSize: 9, fontWeight: 900, color: '#52ffac', background: 'rgba(82,255,172,0.08)', border: '1px solid rgba(82,255,172,0.2)', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', marginLeft: 6, flexShrink: 0, textTransform: 'uppercase' }}>
                Max
              </button>
              <span style={{ color: '#666', fontSize: 10, fontWeight: 900, marginLeft: 6, flexShrink: 0 }}>{tokenSymbol}</span>
            </div>

            {/* Network fee — live from eth_estimateGas */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px' }}>
              <span style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Network Fee</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {feeLoading && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(82,255,172,0.2)', borderTopColor: '#52ffac', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                )}
                {feeEth !== null ? (
                  <span style={{ fontSize: 10, fontWeight: 900, color: ethers.isAddress(to) && amountNum > 0 ? '#ccc' : '#666' }}>
                    ~{feeEth} {selectedChain.symbol}
                    {feeUsd !== null && feeUsd > 0 && (
                      <span style={{ color: '#555', marginLeft: 5 }}>({formatUSD(feeUsd)})</span>
                    )}
                  </span>
                ) : (
                  !feeLoading && <span style={{ fontSize: 10, color: '#444', fontWeight: 700 }}>—</span>
                )}
              </span>
            </div>

            {errMsg && <span style={{ color: '#ffdad6', fontSize: 11 }}>{errMsg}</span>}

            <button onClick={handleSend} disabled={status === 'signing' || status === 'sending'}
              style={{
                background: status === 'signing' || status === 'sending' ? '#1a1a1a' : '#52ffac',
                color: status === 'signing' || status === 'sending' ? '#c6c6c6' : '#002111',
                border: 'none', borderRadius: '1rem', padding: '16px',
                fontSize: 14, fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.05em', cursor: status === 'signing' || status === 'sending' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', marginTop: 4,
              }}>
              {status === 'signing' ? 'Signing...' : status === 'sending' ? 'Broadcasting...' : `Send ${tokenSymbol}`}
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
      className="popup-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 320, maxWidth: '92vw', padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, fontStyle: 'normal', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Receive</span>
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
          <p className="font-black text-white text-lg uppercase tracking-tighter">Lightning Network</p>
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
              <p className="font-black text-white uppercase text-base tracking-tighter">Payment Sent!</p>
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
  const [showWC, setShowWC] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionToggling, setSessionToggling] = useState(false);
  const [allChainsTotal, setAllChainsTotal] = useState<number | null>(null);
  // All chains token data for balance tab display
  type ChainTokens = { chain: Chain; toks: TokenBalance[]; p: Record<string,number> };
  const [allChainTokens, setAllChainTokens] = useState<ChainTokens[]>([]);
  // Whether user has manually selected a chain (null = not yet selected)
  const [manualChain, setManualChain] = useState<Chain | null>(null);
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

  // Compute all-chains total + auto-select highest-balance chain on first unlock
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (!wallet.isUnlocked || !address) return;
    const doAutoSelect = !autoSelectedRef.current;
    autoSelectedRef.current = true;
    // Fetch ALL Alchemy chains (including testnets — user may hold testnet ETH)
    const alchemyChains = CHAINS.filter(c => c.isAlchemy);
    Promise.all(
      alchemyChains.map(async c => {
        try {
          const toks = await fetchTokenBalances(address, c.id);
          const cgIds = [...new Set([c.coingeckoId, ...toks.map(t => t.coingeckoId).filter(Boolean) as string[]])];
          const p = await getPrices(cgIds);
          const usd = toks.reduce((s, t) => {
            const cg = t.coingeckoId ?? c.coingeckoId;
            return s + parseFloat(t.balance || '0') * (p[cg] ?? 0);
          }, 0);
          return { chain: c, usd, toks, p };
        } catch { return { chain: c, usd: 0, toks: [], p: {} }; }
      })
    ).then(results => {
      const total = results.reduce((s, r) => s + r.usd, 0);
      setAllChainsTotal(total);
      setAllChainTokens(results.map(r => ({ chain: r.chain, toks: r.toks, p: r.p })));
      if (doAutoSelect) {
        const best = results.reduce((a, b) => b.usd > a.usd ? b : a, results[0]);
        if (best && best.usd > 0) {
          setSelectedChain(best.chain);
          setTokens(best.toks);
          setPrices(best.p);
        }
      }
    }).catch(() => { setAllChainsTotal(0); });
  }, [wallet.isUnlocked, address]);

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

  const chainTotalUSD = tokens.reduce((sum, t) => {
    const price = prices[t.coingeckoId ?? ''] ?? prices[selectedChain.coingeckoId] ?? 0;
    return sum + parseFloat(t.balance || '0') * price;
  }, 0);
  // After initial load: show selected chain's USD. Before: show all-chains total loading.
  const isLoadingTotal = allChainsTotal === null && wallet.isUnlocked;
  // Once allChainsTotal resolves, display selected chain's USD for network-switch UX
  const displayTotal = isLoadingTotal ? 0 : chainTotalUSD;

  // CountUp fires ONCE on initial load — not on manual network changes
  const countUpFiredRef = useRef(false);
  const prevTotalUSDRef = useRef(0);
  const [countFrom, setCountFrom] = useState(0);
  const [countTo, setCountTo] = useState(0);
  const [countKey, setCountKey] = useState(0);
  const [showFullBalance, setShowFullBalance] = useState(false);
  useEffect(() => {
    if (isLoadingTotal) return;
    if (!countUpFiredRef.current) {
      // First time: animate from 0 to initial total
      countUpFiredRef.current = true;
      setCountFrom(0);
      setCountTo(chainTotalUSD);
      setCountKey(1);
      prevTotalUSDRef.current = chainTotalUSD;
    } else {
      // Manual network switch: just update display value, no animation
      setCountFrom(chainTotalUSD);
      setCountTo(chainTotalUSD);
      prevTotalUSDRef.current = chainTotalUSD;
    }
  }, [chainTotalUSD, isLoadingTotal]);

  // ── Loading ──
  if (!wallet.isUnlocked && !everUnlocked) {
    return (
      <section className="flex-1 pt-[72px] px-8 pb-8 md:p-16 bg-surface flex flex-col overflow-y-auto">
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
      {showSend && <SendModal tokens={tokens} prices={prices} defaultChain={selectedChain} onClose={() => setShowSend(false)} />}
      {showNetworks && <AllNetworksModal selected={selectedChain} onSelect={c => { setSelectedChain(c); setManualChain(c); }} onClose={() => setShowNetworks(false)} />}
      {showQR && address && <QRModal address={address} onClose={() => setShowQR(false)} />}
      {showWC && <WalletConnectModal onClose={() => setShowWC(false)} />}

      <section className="flex-1 pt-[72px] px-8 pb-8 md:p-16 bg-surface flex flex-col justify-between overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-12">

          {/* ── Session Heading with Chain Selector ── */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white">
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
                <span className="text-[0.65rem] font-black tracking-[0.2em] uppercase text-white">
                  {manualChain ? manualChain.name : 'Network'}
                </span>
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
          <div className="space-y-6 fade-in">
            <p className="text-on-surface-variant font-black tracking-[0.2em] uppercase text-xs opacity-60">Total Curated Value</p>
            <div className="flex items-end gap-4">
              <h1 className="text-[6rem] md:text-[9rem] font-black tracking-tighter leading-none text-white">
                {isLoadingTotal ? (
                  <span className="text-on-surface-variant opacity-30">...</span>
                ) : (
                  <span className="flex items-baseline gap-0">
                    <span className="text-on-surface-variant opacity-60">$</span>
                    {/* Show full balance or masked: "24.63..." */}
                    {showFullBalance ? (
                      <span>{countTo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                    ) : (
                      <span className="flex items-baseline gap-0">
                        {/* Whole number + first 2 decimals always visible */}
                        <CountUp
                          key={countKey + '_vis'}
                          from={Math.floor(countFrom)}
                          to={Math.floor(countTo)}
                          separator=","
                          duration={2.5}
                          startWhen={!isLoadingTokens}
                        />
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>.</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {String(Math.round((countTo % 1) * 100)).padStart(2, '0')}
                        </span>
                        {/* ... tap to reveal rest */}
                        <button
                          onClick={() => setShowFullBalance(true)}
                          className="hover:opacity-80 transition-opacity font-black"
                          style={{ fontSize: '0.55em', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 2px', lineHeight: 1, color: 'rgba(255,255,255,0.3)', letterSpacing: '-0.02em', alignSelf: 'flex-end', marginBottom: '0.15em' }}>
                          ...
                        </button>
                      </span>
                    )}
                  </span>
                )}
              </h1>
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
              onClick={() => setShowWC(true)}
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
                {/* Current network — clean white card matching the rest of the list */}
                {manualChain && (() => {
                  const ct = allChainTokens.find(x => x.chain.id === manualChain.id);
                  const ctToks = ct?.toks ?? tokens;
                  const ctP = ct?.p ?? prices;
                  // Show all tokens for current network (native + ERC-20 with balance)
                  const currentToks = ctToks.filter(t => parseFloat(t.balance || '0') > 0);
                  return (
                    <div className="slide-up mb-1">
                      {/* Current network label */}
                      <div className="flex items-center gap-2 px-1 mb-2">
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#52ffac' }} />
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#52ffac', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Current Network — {manualChain.name}</span>
                      </div>
                      {currentToks.length === 0 ? (
                        <div className="flex items-center justify-between p-6 bg-white text-black rounded-xl">
                          <div className="flex items-center gap-4">
                            <ChainIcon chain={manualChain} size={48} />
                            <div>
                              <p className="font-black text-black text-base">{manualChain.symbol}</p>
                              <p style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{manualChain.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-black text-base">0</p>
                            <p style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700 }}>—</p>
                          </div>
                        </div>
                      ) : (
                        currentToks.map((token, i) => {
                          const cgId = token.coingeckoId ?? manualChain.coingeckoId;
                          const price = cgId ? (ctP[cgId] ?? 0) : 0;
                          const usdVal = parseFloat(token.balance || '0') * price;
                          const bal = parseFloat(token.balance || '0');
                          return (
                            <div key={`cur-${token.contractAddress}-${i}`}
                              className="flex items-center justify-between p-6 bg-white text-black rounded-xl"
                              style={{ marginBottom: i < currentToks.length - 1 ? 4 : 0 }}>
                              <div className="flex items-center gap-4">
                                {token.logo
                                  ? <img src={token.logo} alt={token.symbol} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  : <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#333', flexShrink: 0 }}>{token.symbol.slice(0,1)}</div>
                                }
                                <div>
                                  <p style={{ fontWeight: 900, color: '#000', fontSize: '1.05rem' }}>{token.symbol}</p>
                                  <p style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{manualChain.name}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p style={{ fontWeight: 900, color: '#000', fontSize: '1.05rem' }}>
                                  {bal < 0.000001 ? '< 0.000001' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(bal)}
                                </p>
                                <p style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>{usdVal > 0 ? formatUSD(usdVal) : '—'}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}

                {/* All chains with non-zero balance */}
                {isLoadingTotal ? (
                  <div className="flex justify-center py-12">
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(82,255,172,0.2)', borderTopColor: '#52ffac', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : allChainTokens.length > 0 ? (
                  allChainTokens.flatMap(({ chain: c, toks, p }, ci) =>
                    // Skip current network — already shown as white card above
                    toks.filter(t => parseFloat(t.balance || '0') > 0 && c.id !== manualChain?.id).map((token, i) => {
                      const cgId = token.coingeckoId ?? c.coingeckoId;
                      const price = cgId ? (p[cgId] ?? 0) : 0;
                      const usdVal = parseFloat(token.balance || '0') * price;
                      return (
                        <div key={`${c.id}-${token.contractAddress}-${i}`}
                          className="slide-up flex items-center justify-between p-6 bg-surface-container-low rounded-xl border border-white/5 hover:bg-surface-container-high transition-all cursor-pointer"
                          style={{ animationDelay: `${(ci * 3 + i) * 40}ms` }}>
                          <div className="flex items-center gap-5">
                            {token.logo ? (
                              <img src={token.logo} alt={token.symbol} className="w-14 h-14 rounded-full object-cover shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div className="w-14 h-14 bg-surface-container-highest rounded-full flex items-center justify-center font-black text-xl shrink-0">
                                {token.symbol.slice(0, 1)}
                              </div>
                            )}
                            <div>
                              <p className="font-black text-white text-lg">{token.symbol}</p>
                              <p className="text-[0.65rem] text-on-surface-variant uppercase tracking-widest font-bold">{c.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-white text-lg">
                              {parseFloat(token.balance) < 0.000001 ? '< 0.000001' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(parseFloat(token.balance))}
                            </p>
                            <p className="text-[0.65rem] text-on-surface-variant tracking-widest font-bold">
                              {price > 0 ? formatUSD(usdVal) : '—'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : tokens.filter(t => parseFloat(t.balance || '0') > 0).map((token, i) => {
                  const cgId = token.coingeckoId ?? selectedChain.coingeckoId;
                  const price = cgId ? (prices[cgId] ?? 0) : 0;
                  const usdVal = parseFloat(token.balance || '0') * price;
                  return (
                    <div key={`${token.contractAddress}-${i}`}
                      className="slide-up flex items-center justify-between p-6 bg-surface-container-low rounded-xl border border-white/5 hover:bg-surface-container-high transition-all cursor-pointer"
                      style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="flex items-center gap-5">
                        {token.logo ? (
                          <img src={token.logo} alt={token.symbol} className="w-14 h-14 rounded-full object-cover shrink-0"
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
                          {parseFloat(token.balance) < 0.000001 ? '< 0.000001' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(parseFloat(token.balance))}
                        </p>
                        <p className="text-[0.65rem] text-on-surface-variant tracking-widest font-bold">
                          {price > 0 ? formatUSD(usdVal) : '—'}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                    const txDate = tx.timestamp ? new Date(tx.timestamp) : null;
                    const date = txDate ? txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                    const time = txDate ? txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
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
                          <p className="text-[0.65rem] text-on-surface-variant tracking-widest font-bold">{date}{time ? ` · ${time}` : ''}</p>
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
