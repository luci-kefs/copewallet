'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy, Check, X, ExternalLink,
  ArrowUpRight, ArrowDownLeft, Zap, Wifi, WifiOff, AlertCircle, Link,
} from 'lucide-react';
import CountUp from '@/components/CountUp';
import { useWallet } from '@/context/WalletContext';
import { clearShadow } from '@/lib/session-lock';
import { CHAINS, Chain } from '@/lib/chains';
import { fetchTokenBalances, fetchTxHistory, TokenBalance, TxRecord } from '@/lib/tokens';
import { getPrices, formatUSD } from '@/lib/prices';
import { buildMaskedTransaction, stealthDelay, fireDummyEchoes, estimateFee } from '@/lib/transaction';
import { ephemeralSign } from '@/lib/signer';
import { getProvider } from '@/lib/provider';
import { ethers } from 'ethers';
import { GhostCapsule } from '@/components/GhostCapsule';
import { WalletConnectModal } from '@/components/WalletConnectModal';
import { AdvancedDashboard } from '@/components/AdvancedDashboard';
import type { ChainTx } from '@/components/ChainPanel';
import { deriveBTCWallet, getBTCBalance, getBTCTransactions, estimateBTCFee, buildBTCTransaction, broadcastBTC } from '@/lib/btc';
import { deriveDOGEWallet, getDOGEBalance, getDOGETransactions, estimateDOGEFee, buildDOGETransaction, broadcastDOGE } from '@/lib/doge';
import { deriveBCHWallet, getBCHBalance, getBCHTransactions, estimateBCHFee, buildBCHTransaction, broadcastBCH } from '@/lib/bch';
import { deriveSOLWallet, getSOLBalance, getSOLTransactions, sendSOL, estimateSOLFee } from '@/lib/sol';
import { deriveXRPWallet, getXRPBalance, getXRPTransactions, sendXRP } from '@/lib/xrp';
import { deriveXLMWallet, getXLMBalance, getXLMTransactions, sendXLM } from '@/lib/xlm';
import { deriveNANOWallet, getNANOBalance, getNANOTransactions, sendNANO } from '@/lib/nano';
import { deriveHBARWallet, getHBARBalance, getHBARTransactions, sendHBAR } from '@/lib/hedera';
import { deriveSUIWallet, getSUIBalance, getSUITransactions, sendSUI } from '@/lib/sui';
import { deriveAPTOSWallet, getAPTOSBalance, getAPTOSTransactions, sendAPTOS } from '@/lib/aptos';
import { deriveLTCWallet, getLTCBalance, getLTCTransactions, buildLTCTransaction, broadcastLTC, estimateLTCFee } from '@/lib/ltc';
import { motion, AnimatePresence } from 'framer-motion';
import { springs, variants } from '@/lib/animations';
import { getHistory, addToHistory, saveWallet, removeFromHistory, makeSnapshot, WalletSnapshot } from '@/lib/wallet-history';
import { WarningBanner } from '@/components/WarningBanner';
import { TransferModal } from '@/components/TransferModal';

type Tab = 'balance' | 'transactions' | 'lightning';

// ─── Non-EVM chain metadata ───────────────────────────────────────────────────
interface NonEvmMeta {
  coin: string; name: string; color: string;
  explorerBase: string; symbol: string; coingeckoId: string; feeUnit?: string;
  logoUrl?: string;
}
const CG_IMG = 'https://assets.coingecko.com/coins/images';
const NON_EVM_META: Record<string, NonEvmMeta> = {
  BTC:   { coin: 'BTC',   name: 'Bitcoin',      color: '#F7931A', explorerBase: 'https://blockchair.com/bitcoin/transaction',      symbol: 'BTC',   coingeckoId: 'bitcoin',          feeUnit: 'sat/vByte', logoUrl: `${CG_IMG}/1/small/bitcoin.png` },
  DOGE:  { coin: 'DOGE',  name: 'Dogecoin',     color: '#C2A633', explorerBase: 'https://blockchair.com/dogecoin/transaction',     symbol: 'DOGE',  coingeckoId: 'dogecoin',         feeUnit: 'sat/vByte', logoUrl: `${CG_IMG}/5/small/dogecoin.png` },
  BCH:   { coin: 'BCH',   name: 'Bitcoin Cash', color: '#8DC351', explorerBase: 'https://blockchair.com/bitcoin-cash/transaction', symbol: 'BCH',   coingeckoId: 'bitcoin-cash',     feeUnit: 'sat/vByte', logoUrl: `${CG_IMG}/780/small/bitcoin-cash-circle.png` },
  SOL:   { coin: 'SOL',   name: 'Solana',       color: '#9945FF', explorerBase: 'https://solscan.io/tx',                          symbol: 'SOL',   coingeckoId: 'solana',           feeUnit: 'lamports',  logoUrl: `${CG_IMG}/4128/small/solana.png` },
  XRP:   { coin: 'XRP',   name: 'XRP',          color: '#346AA9', explorerBase: 'https://xrpscan.com/tx',                        symbol: 'XRP',   coingeckoId: 'ripple',                                 logoUrl: `${CG_IMG}/44/small/xrp-symbol-white-128.png` },
  XLM:   { coin: 'XLM',   name: 'Stellar',      color: '#7D00FF', explorerBase: 'https://stellarchain.io/transactions',          symbol: 'XLM',   coingeckoId: 'stellar',                                logoUrl: `${CG_IMG}/100/small/Stellar_symbol_black_RGB.png` },
  NANO:  { coin: 'NANO',  name: 'Nano',         color: '#4A90D9', explorerBase: 'https://nanolooker.com/block',                  symbol: 'NANO',  coingeckoId: 'nano',                                   logoUrl: `${CG_IMG}/1177/small/nano.png` },
  HBAR:  { coin: 'HBAR',  name: 'Hedera',       color: '#5d8fbc', explorerBase: 'https://hashscan.io/mainnet/transaction',       symbol: 'HBAR',  coingeckoId: 'hedera-hashgraph',                       logoUrl: `${CG_IMG}/3688/small/hbar.png` },
  SUI:   { coin: 'SUI',   name: 'Sui',          color: '#6FBCF0', explorerBase: 'https://suiscan.xyz/mainnet/tx',                symbol: 'SUI',   coingeckoId: 'sui',                                    logoUrl: `${CG_IMG}/26375/small/sui_asset.jpeg` },
  APTOS: { coin: 'APTOS', name: 'Aptos',        color: '#00BFAE', explorerBase: 'https://explorer.aptoslabs.com/txn',            symbol: 'APT',   coingeckoId: 'aptos',                                  logoUrl: `${CG_IMG}/26455/small/aptos_round.png` },
  LTC:   { coin: 'LTC',   name: 'Litecoin',     color: '#A5A9B1', explorerBase: 'https://blockchair.com/litecoin/transaction',   symbol: 'LTC',   coingeckoId: 'litecoin',         feeUnit: 'sat/vByte', logoUrl: `${CG_IMG}/2/small/litecoin.png` },
};

// ─── Unified coin icon — tries logoUrl first, then jsdelivr CDN, then letter ─
function CoinIcon({ symbol, color, logoUrl, size = 34, label }: {
  symbol: string; color: string; logoUrl?: string; size?: number; label?: string;
}) {
  const [err1, setErr1] = useState(false);
  const [err2, setErr2] = useState(false);
  const cdn = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${symbol.toLowerCase()}.png`;
  const src = (!err1 && logoUrl) ? logoUrl : (!err2 ? cdn : null);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${color}18`, border: `1.5px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
      {src ? (
        <img src={src} alt={symbol} width={size * 0.72} height={size * 0.72}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
          onError={() => { if (!err1 && logoUrl) { setErr1(true); } else { setErr2(true); } }} />
      ) : (
        <span style={{ color, fontSize: size * 0.28, fontWeight: 800, lineHeight: 1 }}>{(label ?? symbol).slice(0, 3)}</span>
      )}
    </div>
  );
}

function ChainIcon({ chain, size = 40 }: { chain: Chain; size?: number }) {
  return <CoinIcon symbol={chain.shortName} color={chain.color} logoUrl={chain.logoUrl} size={size} label={chain.shortName} />;
}

// ─── All Networks Modal ───────────────────────────────────────────────────────
function AllNetworksModal({ selected, onSelect, selectedNonEvm, onSelectNonEvm, onClose }: {
  selected: Chain; onSelect: (c: Chain) => void;
  selectedNonEvm: string | null; onSelectNonEvm: (coin: string) => void;
  onClose: () => void;
}) {
  const smart = CHAINS.filter(c => c.isAlchemy && !c.isTestnet);
  const eoa = CHAINS.filter(c => !c.isAlchemy && !c.isTestnet);
  const testnets = CHAINS.filter(c => c.isTestnet);

  const ChainCard = ({ c }: { c: Chain }) => {
    const isActive = !selectedNonEvm && selected.id === c.id;
    return (
    <button onClick={() => { onSelect(c); onClose(); }} style={{
      background: isActive ? 'rgba(82,255,172,0.07)' : 'rgba(255,255,255,0.03)',
      border: isActive ? '1.5px solid rgba(82,255,172,0.4)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: '1.5rem', padding: '12px 8px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      cursor: 'pointer', position: 'relative', transition: 'all 0.15s', width: '100%',
    }}>
      {isActive && (
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
  };

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
          <p style={{ color: '#c6c6c6', fontSize: 9, letterSpacing: '0.15em', fontWeight: 900, marginBottom: 12, textTransform: 'uppercase' }}>Non-EVM Chains</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {Object.values(NON_EVM_META).map(m => (
              <button key={m.coin} onClick={() => { onSelectNonEvm(m.coin); onClose(); }} style={{
                background: selectedNonEvm === m.coin ? `${m.color}18` : 'rgba(255,255,255,0.03)',
                border: selectedNonEvm === m.coin ? `1.5px solid ${m.color}66` : '1px solid rgba(255,255,255,0.07)',
                borderRadius: '1.5rem', padding: '12px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                cursor: 'pointer', position: 'relative', transition: 'all 0.15s', width: '100%',
              }}>
                {selectedNonEvm === m.coin && (
                  <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: m.color }} />
                )}
                <CoinIcon symbol={m.symbol} color={m.color} logoUrl={m.logoUrl} size={34} />
                <span style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 700 }}>{m.symbol}</span>
                <span style={{ color: '#c6c6c6', fontSize: 9 }}>{m.name}</span>
                <span style={{ background: 'rgba(255,255,255,0.06)', color: '#888', fontSize: 7, padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>NON-EVM</span>
              </button>
            ))}
          </div>
          <p style={{ color: '#353535', fontSize: 9, textAlign: 'center' }}>{CHAINS.length} EVM + {Object.keys(NON_EVM_META).length} non-EVM networks</p>
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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  const [feeEth, setFeeEth] = useState<string | null>(null);
  const [feeUsd, setFeeUsd] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const feeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativePriceRef = useRef<number>(0);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const handleQRScan = async (file: File) => {
    const parseQRAddress = (raw: string): string =>
      raw.startsWith('ethereum:') ? raw.replace(/^ethereum:/i, '').split('?')[0].split('@')[0] : raw;

    try {
      const bitmap = await createImageBitmap(file);
      // @ts-expect-error BarcodeDetector not in all TS libs yet
      if (typeof BarcodeDetector !== 'undefined') {
        // @ts-expect-error BarcodeDetector
        const codes = await new BarcodeDetector({ formats: ['qr_code'] }).detect(bitmap);
        if (codes.length > 0) {
          const addr = parseQRAddress(codes[0].rawValue);
          if (ethers.isAddress(addr)) { setTo(addr); return; }
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { default: jsQR } = await import('jsqr');
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code) {
        const addr = parseQRAddress(code.data);
        if (ethers.isAddress(addr)) setTo(addr);
      }
    } catch {}
  };

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
                  <CoinIcon symbol={selectedChain.shortName} color={selectedChain.color} logoUrl={selectedChain.logoUrl} size={22} />
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
                          <CoinIcon symbol={c.shortName} color={c.color} logoUrl={c.logoUrl} size={20} />
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
            <div style={{ ...box, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="text" placeholder="Recipient address (0x...)" autoComplete="off"
                value={to} onChange={e => setTo(e.target.value)} style={{ ...inp, flex: 1 }} />
              <button
                type="button"
                onClick={() => qrInputRef.current?.click()}
                title="Scan QR code"
                style={{ flexShrink: 0, background: 'rgba(82,255,172,0.08)', border: '1px solid rgba(82,255,172,0.2)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#52ffac" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  <line x1="14" y1="14" x2="14" y2="14"/><line x1="17" y1="14" x2="21" y2="14"/><line x1="14" y1="17" x2="14" y2="21"/><line x1="21" y1="17" x2="17" y2="21"/>
                </svg>
              </button>
              <input
                ref={qrInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleQRScan(f); e.target.value = ''; }}
              />
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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
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

// ─── Non-EVM Send Modal ───────────────────────────────────────────────────────
function NonEvmSendModal({ coin, fromAddress, onSend, onClose }: {
  coin: string;
  fromAddress: string;
  onSend: (to: string, amount: number, feeSpeed: 'slow' | 'medium' | 'fast') => Promise<string>;
  onClose: () => void;
}) {
  const meta = NON_EVM_META[coin];
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [feeSpeed, setFeeSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [txid, setTxid] = useState('');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const hasFeeSelector = ['BTC', 'DOGE', 'BCH', 'LTC'].includes(coin);

  const handleSend = async () => {
    const amt = parseFloat(amount);
    if (!to.trim() || isNaN(amt) || amt <= 0) { setErrMsg('Enter a valid address and amount.'); return; }
    setStatus('sending'); setErrMsg('');
    try {
      const id = await onSend(to.trim(), amt, feeSpeed);
      setTxid(id);
      setStatus('done');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Send failed.');
      setStatus('error');
    }
  };

  const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 400, maxWidth: '92vw', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {meta && <CoinIcon symbol={meta.symbol} color={meta.color} logoUrl={meta.logoUrl} size={30} />}
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>Send {meta?.symbol ?? coin}</span>
          </div>
          <button onClick={onClose} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {status === 'done' ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '1.5px solid rgba(82,255,172,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={22} style={{ color: '#52ffac' }} />
            </div>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>Sent!</p>
            <p style={{ color: '#555', fontSize: 10, fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>{txid}</p>
            {meta?.explorerBase && (
              <a href={`${meta.explorerBase}/${txid}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: meta.color, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                <ExternalLink size={12} /> View on Explorer
              </a>
            )}
            <button onClick={onClose} style={{ marginTop: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 24px', color: '#ccc', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Close</button>
          </div>
        ) : (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ color: '#888', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, margin: '0 0 6px' }}>From</p>
              <p style={{ color: '#555', fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all', margin: 0 }}>{fromAddress}</p>
            </div>
            <div>
              <p style={{ color: '#888', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Recipient Address</p>
              <input style={inp} placeholder={`${meta?.name ?? coin} address`} value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div>
              <p style={{ color: '#888', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Amount ({meta?.symbol ?? coin})</p>
              <input style={inp} type="number" step="any" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            {hasFeeSelector && (
              <div>
                <p style={{ color: '#888', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Fee Speed</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['slow', 'medium', 'fast'] as const).map(s => (
                    <button key={s} onClick={() => setFeeSpeed(s)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: feeSpeed === s ? (meta?.color ?? '#52ffac') + '22' : 'rgba(255,255,255,0.04)', border: `1px solid ${feeSpeed === s ? (meta?.color ?? '#52ffac') + '66' : 'rgba(255,255,255,0.08)'}`, color: feeSpeed === s ? (meta?.color ?? '#52ffac') : '#666', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', letterSpacing: '0.05em' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {errMsg && <p style={{ color: '#ff8888', fontSize: 11, margin: 0 }}>{errMsg}</p>}
            <button onClick={handleSend} disabled={status === 'sending'}
              style={{ marginTop: 4, padding: '14px', borderRadius: 12, background: status === 'sending' ? 'rgba(255,255,255,0.06)' : (meta?.color ?? '#52ffac'), color: status === 'sending' ? '#666' : '#000', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: status === 'sending' ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
              {status === 'sending' ? 'Sending...' : `Send ${meta?.symbol ?? coin}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main WalletDashboard ─────────────────────────────────────────────────────
export function WalletDashboard() {
  const wallet = useWallet();
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
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
  const [showNonEvmSend, setShowNonEvmSend] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allChainsTotal, setAllChainsTotal] = useState<number | null>(null);
  // All chains token data for balance tab display
  type ChainTokens = { chain: Chain; toks: TokenBalance[]; p: Record<string,number> };
  const [allChainTokens, setAllChainTokens] = useState<ChainTokens[]>([]);
  // Whether user has manually selected a chain (null = not yet selected)
  const [manualChain, setManualChain] = useState<Chain | null>(null);
  // Track whether wallet was ever unlocked — if yes, never show skeleton again
  const [everUnlocked, setEverUnlocked] = useState(false);
  useEffect(() => { if (wallet.isUnlocked) setEverUnlocked(true); }, [wallet.isUnlocked]);

  // Wallet history
  const [walletHistory, setWalletHistory] = useState<WalletSnapshot[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [showWipeWarning, setShowWipeWarning] = useState(false);
  const [showNewWalletWarning, setShowNewWalletWarning] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // ── Non-EVM state ──────────────────────────────────────────────────────────
  const [selectedNonEvm, setSelectedNonEvm] = useState<string | null>(null);
  const [nonEvmAddr, setNonEvmAddr] = useState<string | null>(null);
  const [nonEvmBal, setNonEvmBal] = useState<number | null>(null);
  const [nonEvmUsdPrice, setNonEvmUsdPrice] = useState(0);
  const [nonEvmLoading, setNonEvmLoading] = useState(false);

  const loadNonEvmData = useCallback(async (coin: string) => {
    if (!wallet.isUnlocked) return;
    setNonEvmLoading(true);
    setNonEvmAddr(null);
    setNonEvmBal(null);
    try {
      const mnemonic = await wallet.getMnemonicForExport();
      if (!mnemonic) return;
      let addr = '';
      let bal = 0;
      if (coin === 'BTC')   { const w = deriveBTCWallet(mnemonic);   addr = w.address;     bal = (await getBTCBalance(addr)).total; }
      else if (coin === 'DOGE')  { const w = deriveDOGEWallet(mnemonic);  addr = w.address;     bal = (await getDOGEBalance(addr)).total; }
      else if (coin === 'BCH')   { const w = deriveBCHWallet(mnemonic);   addr = w.address;     bal = (await getBCHBalance(addr)).total; }
      else if (coin === 'SOL')   { const w = deriveSOLWallet(mnemonic);   addr = w.address;     bal = (await getSOLBalance(addr)).sol; }
      else if (coin === 'XRP')   { const w = deriveXRPWallet(mnemonic);   addr = w.address;     bal = (await getXRPBalance(addr)).xrp; }
      else if (coin === 'XLM')   { const w = deriveXLMWallet(mnemonic);   addr = w.address;     bal = (await getXLMBalance(addr)).xlm; }
      else if (coin === 'NANO')  { const w = deriveNANOWallet(mnemonic);  addr = w.address;     bal = (await getNANOBalance(addr)).nano; }
      else if (coin === 'HBAR')  { const w = deriveHBARWallet(mnemonic);  addr = w.evmAddress;  bal = (await getHBARBalance(addr)).hbar; }
      else if (coin === 'SUI')   { const w = deriveSUIWallet(mnemonic);   addr = w.address;     bal = (await getSUIBalance(addr)).sui; }
      else if (coin === 'APTOS') { const w = deriveAPTOSWallet(mnemonic); addr = w.address;     bal = (await getAPTOSBalance(addr)).apt; }
      else if (coin === 'LTC')   { const w = deriveLTCWallet(mnemonic);   addr = w.address;     bal = (await getLTCBalance(addr)).total; }
      setNonEvmAddr(addr);
      setNonEvmBal(bal);
      const meta = NON_EVM_META[coin];
      if (meta?.coingeckoId) {
        const p = await getPrices([meta.coingeckoId]);
        setNonEvmUsdPrice(p[meta.coingeckoId] ?? 0);
      }
    } catch { setNonEvmBal(0); }
    finally { setNonEvmLoading(false); }
  }, [wallet]);

  useEffect(() => {
    if (selectedNonEvm) loadNonEvmData(selectedNonEvm);
  }, [selectedNonEvm]);

  const handleNonEvmSend = useCallback(async (to: string, amount: number, feeSpeed: 'slow' | 'medium' | 'fast'): Promise<string> => {
    const mnemonic = await wallet.getMnemonicForExport();
    if (!mnemonic) throw new Error('Wallet locked');
    const coin = selectedNonEvm!;
    if (coin === 'BTC')   { const w = deriveBTCWallet(mnemonic);   const fees = await estimateBTCFee();  const { hex } = await buildBTCTransaction({ from: w, to, amountBTC: amount, feeRate: fees[feeSpeed] });   return broadcastBTC(hex); }
    if (coin === 'DOGE')  { const w = deriveDOGEWallet(mnemonic);  const fees = await estimateDOGEFee(); const { hex } = await buildDOGETransaction({ from: w, to, amountDOGE: amount, feeRate: fees[feeSpeed] }); return broadcastDOGE(hex); }
    if (coin === 'BCH')   { const w = deriveBCHWallet(mnemonic);   const fees = await estimateBCHFee();  const { hex } = await buildBCHTransaction({ from: w, to, amountBCH: amount, feeRate: fees[feeSpeed] });   return broadcastBCH(hex); }
    if (coin === 'SOL')   { const w = deriveSOLWallet(mnemonic);   return sendSOL(w, to, amount); }
    if (coin === 'XRP')   { const w = deriveXRPWallet(mnemonic);   return sendXRP(w, to, amount); }
    if (coin === 'XLM')   { const w = deriveXLMWallet(mnemonic);   return sendXLM(w, to, amount); }
    if (coin === 'NANO')  { const w = deriveNANOWallet(mnemonic);  return sendNANO(w, to, amount); }
    if (coin === 'HBAR')  { const w = deriveHBARWallet(mnemonic);  return sendHBAR(w, to, amount); }
    if (coin === 'SUI')   { const w = deriveSUIWallet(mnemonic);   return sendSUI(w, to, amount); }
    if (coin === 'APTOS') { const w = deriveAPTOSWallet(mnemonic); return sendAPTOS(w, to, amount); }
    if (coin === 'LTC')   { const w = deriveLTCWallet(mnemonic);   const fees = await estimateLTCFee(); const { hex } = await buildLTCTransaction({ from: w, to, amountLTC: amount, feeRate: fees[feeSpeed] }); return broadcastLTC(hex); }
    throw new Error('Unknown coin');
  }, [wallet, selectedNonEvm]);

  const handleNonEvmGetHistory = useCallback(async (): Promise<ChainTx[]> => {
    if (!nonEvmAddr) return [];
    const coin = selectedNonEvm!;
    const toTx = (t: { txid: string; amount: number; timestamp: number }) => t;
    if (coin === 'BTC')   return (await getBTCTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'DOGE')  return (await getDOGETransactions(nonEvmAddr)).map(toTx);
    if (coin === 'BCH')   return (await getBCHTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'SOL')   return (await getSOLTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'XRP')   return (await getXRPTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'XLM')   return (await getXLMTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'NANO')  return (await getNANOTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'HBAR')  return (await getHBARTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'SUI')   return (await getSUITransactions(nonEvmAddr)).map(toTx);
    if (coin === 'APTOS') return (await getAPTOSTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'LTC')   return (await getLTCTransactions(nonEvmAddr)).map(toTx);
    return [];
  }, [nonEvmAddr, selectedNonEvm]);

  const handleNonEvmGetFees = useCallback(async () => {
    const coin = selectedNonEvm!;
    if (coin === 'BTC')  return estimateBTCFee();
    if (coin === 'DOGE') return estimateDOGEFee();
    if (coin === 'BCH')  return estimateBCHFee();
    if (coin === 'SOL')  { const f = await estimateSOLFee(); return { slow: f, medium: f, fast: f }; }
    return { slow: 0, medium: 0, fast: 0 };
  }, [selectedNonEvm]);

  // Sync theme to document root
  useEffect(() => {
    document.documentElement.dataset.theme = mode === 'advanced' ? 'advanced' : '';
  }, [mode]);

  // Track wallet creation in history
  useEffect(() => {
    if (!wallet.isUnlocked || !wallet.activeAddress) return;
    const history = getHistory();
    const existing = history.find(s => s.address === wallet.activeAddress);
    if (existing) {
      setCurrentHistoryId(existing.id);
      setWalletHistory(history);
    } else {
      const snap = makeSnapshot(wallet.activeAddress, wallet.mode as 'EPHEMERAL' | 'PERSISTENT');
      addToHistory(snap);
      setCurrentHistoryId(snap.id);
      setWalletHistory(getHistory());
    }
  }, [wallet.isUnlocked, wallet.activeAddress]);

  // Freeze last known address so UI doesn't blank during transient wipe
  const [frozenAddress, setFrozenAddress] = useState<string | null>(null);
  const [frozenMode, setFrozenMode] = useState(wallet.mode);
  useEffect(() => {
    if (wallet.isUnlocked && wallet.activeAddress) {
      setFrozenAddress(wallet.activeAddress);
    }
  }, [wallet.isUnlocked, wallet.activeAddress]);
  // Always track mode changes immediately
  useEffect(() => {
    if (wallet.mode === 'PERSISTENT') setFrozenMode('PERSISTENT');
    else if (wallet.isUnlocked) setFrozenMode('EPHEMERAL');
  }, [wallet.mode, wallet.isUnlocked]);

  const address = wallet.activeAddress ?? frozenAddress;
  const displayAddress = (selectedNonEvm && nonEvmAddr) ? nonEvmAddr : address;
  const shortAddr = displayAddress ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}` : '—';

  const handleCopyAddress = async () => {
    const addr = displayAddress;
    if (!addr) return;
    try { await navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
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

  const handleCopy = handleCopyAddress;

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
      <section className="flex-1 pt-[64px] px-4 pb-6 md:p-16 bg-surface flex flex-col overflow-y-auto overflow-x-hidden">
        <div className="max-w-3xl mx-auto w-full space-y-6 md:space-y-12 animate-pulse">
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

  if (mode === 'advanced') return (
    <motion.div
      key="advanced"
      variants={variants.pageSwitch}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={springs.cinematic}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <AdvancedDashboard onExit={() => setMode('simple')} />
    </motion.div>
  );

  return (
    <>
      {showSend && <SendModal tokens={tokens} prices={prices} defaultChain={selectedChain} onClose={() => setShowSend(false)} />}
      {showNetworks && <AllNetworksModal selected={selectedChain} onSelect={c => { setSelectedChain(c); setManualChain(c); setSelectedNonEvm(null); }} selectedNonEvm={selectedNonEvm} onSelectNonEvm={coin => { setSelectedNonEvm(coin); }} onClose={() => setShowNetworks(false)} />}
      {showQR && displayAddress && <QRModal address={displayAddress} onClose={() => setShowQR(false)} />}
      {showWC && !selectedNonEvm && <WalletConnectModal onClose={() => setShowWC(false)} />}
      {showNonEvmSend && selectedNonEvm && displayAddress && (
        <NonEvmSendModal
          coin={selectedNonEvm}
          fromAddress={displayAddress}
          onSend={handleNonEvmSend}
          onClose={() => setShowNonEvmSend(false)}
        />
      )}
      {showTransfer && address && (
        <TransferModal onClose={() => setShowTransfer(false)} currentAddress={address} currentHistoryId={currentHistoryId} />
      )}
      <AnimatePresence>
        {showWipeWarning && (
          <WarningBanner type="wipe" onConfirm={() => { setShowWipeWarning(false); wallet.disableSessionLock(); wallet.wipeCopeWallet(); clearShadow(); }} onCancel={() => setShowWipeWarning(false)} />
        )}
        {showNewWalletWarning && (
          <WarningBanner type="new-wallet" onConfirm={() => { setShowNewWalletWarning(false); wallet.disableSessionLock(); wallet.wipeCopeWallet(); clearShadow(); setTimeout(() => wallet.createCopeWallet(), 80); }} onCancel={() => setShowNewWalletWarning(false)} />
        )}
      </AnimatePresence>

      <section className="flex-1 pt-[64px] px-4 pb-24 md:p-16 bg-surface flex flex-col justify-between overflow-y-auto overflow-x-hidden">
        <div className="max-w-3xl mx-auto w-full space-y-6 md:space-y-12">

          {/* ── Session Heading with Chain Selector + Toggle ── */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <h2 className="text-2xl md:text-5xl font-black tracking-tighter uppercase text-white">
                  {frozenMode === 'PERSISTENT' ? 'Persistent Session' : 'New Session'}
                </h2>
                <p className="text-tertiary font-black tracking-[0.2em] uppercase text-xs opacity-80">
                  {frozenMode === 'PERSISTENT' ? 'Encrypted · Device-Bound' : 'Volatile wallet — RAM only'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => setShowNetworks(true)}
                  className="bg-surface-container-high px-5 py-2.5 rounded-full flex items-center gap-3 border border-white/5 hover:border-white/10 transition-colors flex-shrink-0">
                  <div className="w-2.5 h-2.5 bg-tertiary rounded-full animate-pulse shadow-[0_0_12px_rgba(82,255,172,0.8)]"></div>
                  <span className="text-[0.65rem] font-black tracking-[0.2em] uppercase text-white">
                    {selectedNonEvm ? (NON_EVM_META[selectedNonEvm]?.name ?? selectedNonEvm) : manualChain ? manualChain.name : 'Network'}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant scale-75">expand_more</span>
                </button>
                <button
                  onClick={() => setMode('advanced')}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(82,255,172,0.07)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(82,255,172,0.2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#52ffac' }}>settings</span>
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#52ffac', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Advanced</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Balance Section ── */}
          <div className="space-y-3 md:space-y-6 fade-in">
            <p className="text-on-surface-variant font-black tracking-[0.2em] uppercase text-xs opacity-60">Total Curated Value</p>
            <div className="flex items-end gap-4">
              <h1 className="text-[3.5rem] md:text-[9rem] font-black tracking-tighter leading-none text-white">
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
              className="bg-white text-black p-5 md:p-8 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-neutral-200 transition-all"
              onClick={handleCopy}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {selectedNonEvm ? (() => {
                  const m = NON_EVM_META[selectedNonEvm];
                  return <CoinIcon symbol={m?.symbol ?? selectedNonEvm} color={m?.color ?? '#888'} logoUrl={m?.logoUrl} size={40} />;
                })() : (
                  <ChainIcon chain={selectedChain} size={40} />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[0.65rem] font-black uppercase tracking-widest opacity-60 mb-1">
                    {selectedNonEvm ? `${NON_EVM_META[selectedNonEvm]?.name ?? selectedNonEvm} Address` : 'Active Monolith Address'}
                  </span>
                  <span className="text-xl md:text-3xl font-black tracking-tighter font-mono truncate">{shortAddr}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-3xl md:text-4xl ml-3 flex-shrink-0">{copied ? 'check' : 'content_copy'}</span>
            </div>
          </div>

          {/* ── Action Grid ── */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {[
              { icon: 'power',      label: 'Connect',           onClick: () => { if (!selectedNonEvm) setShowWC(true); }, disabled: !!selectedNonEvm },
              { icon: 'north_east', label: 'Send',              onClick: () => { if (selectedNonEvm) setShowNonEvmSend(true); else setShowSend(true); } },
              { icon: 'qr_code_2', label: 'QR / Receive',      onClick: () => setShowQR(true) },
              { icon: 'add_card',  label: 'Create New Wallet', onClick: () => setShowNewWalletWarning(true) },
            ].map((item) => (
              <motion.button
                key={item.label}
                onClick={item.onClick}
                whileHover={{ scale: (item as { disabled?: boolean }).disabled ? 1 : 1.03, rotateX: 3, rotateY: -3 }}
                whileTap={{ scale: (item as { disabled?: boolean }).disabled ? 1 : 0.96 }}
                transition={springs.snappy}
                style={{ transformStyle: 'preserve-3d', perspective: 800, opacity: (item as { disabled?: boolean }).disabled ? 0.35 : 1 }}
                className="bg-surface-container-highest p-5 md:p-10 rounded-xl flex flex-col items-center gap-2 md:gap-4 hover:bg-white hover:text-black transition-colors group border border-white/5 cursor-pointer">
                <span className="material-symbols-outlined text-3xl md:text-5xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="font-black uppercase tracking-widest text-[0.6rem]">{item.label}</span>
              </motion.button>
            ))}
            {(() => {
              // Show Transfer only when another saved wallet exists AND current wallet
              // has a positive balance on the currently selected chain
              const hasOtherSaved = walletHistory.filter(s => s.isSaved && s.id !== currentHistoryId).length >= 1;
              const currentChainToks = allChainTokens.find(x => x.chain.id === selectedChain.id)?.toks ?? tokens;
              const hasBalance = currentChainToks.some(t => parseFloat(t.balance || '0') > 0);
              if (!hasOtherSaved || !hasBalance) return null;
              return (
                <motion.button
                  onClick={() => setShowTransfer(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springs.snappy}
                  className="bg-surface-container-highest p-5 md:p-8 rounded-xl flex flex-col items-center gap-2 md:gap-4 hover:bg-white hover:text-black transition-colors group active:scale-95 border border-white/5 col-span-2 cursor-pointer">
                  <span className="material-symbols-outlined text-3xl md:text-5xl group-hover:scale-110 transition-transform">swap_horiz</span>
                  <span className="font-black uppercase tracking-widest text-[0.6rem]">Transfer Between Wallets</span>
                </motion.button>
              );
            })()}
          </div>

          {/* ── Tabs & List ── */}
          <div className="pt-2 md:pt-8">
            <div className="flex gap-6 md:gap-12 mb-4 md:mb-8 border-b border-white/5">
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

            {/* Non-EVM balance card — shown when non-EVM chain selected */}
            {selectedNonEvm && activeTab === 'balance' && (() => {
              const meta = NON_EVM_META[selectedNonEvm];
              const bal = nonEvmBal;
              const usdVal = bal !== null ? bal * nonEvmUsdPrice : null;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: meta?.color ?? '#888' }} />
                    <span style={{ fontSize: 9, fontWeight: 900, color: meta?.color ?? '#888', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Current Network — {meta?.name ?? selectedNonEvm}</span>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-white text-black rounded-xl">
                    <div className="flex items-center gap-4">
                      {meta && <CoinIcon symbol={meta.symbol} color={meta.color} logoUrl={meta.logoUrl} size={48} />}
                      <div>
                        <p className="font-black text-black text-base">{meta?.symbol ?? selectedNonEvm}</p>
                        <p style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{meta?.name ?? selectedNonEvm}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {nonEvmLoading ? (
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #ddd', borderTopColor: '#333', animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <>
                          <p className="font-black text-black text-base">
                            {bal === null ? '—' : bal < 0.000001 && bal > 0 ? '< 0.000001' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(bal ?? 0)}
                          </p>
                          <p style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>{usdVal !== null && usdVal > 0 ? formatUSD(usdVal) : '—'}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* EVM balance tab */}
            {!selectedNonEvm && activeTab === 'balance' && (
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
                  (() => {
                    const items = allChainTokens.flatMap(({ chain: c, toks, p }, ci) =>
                      toks.filter(t => parseFloat(t.balance || '0') > 0 && c.id !== manualChain?.id).map((token, i) => ({ c, token, p, ci, i }))
                    );
                    return (
                      <motion.div variants={variants.staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {items.map(({ c, token, p, ci, i }) => {
                          const cgId = token.coingeckoId ?? c.coingeckoId;
                          const price = cgId ? (p[cgId] ?? 0) : 0;
                          const usdVal = parseFloat(token.balance || '0') * price;
                          return (
                            <motion.div key={`${c.id}-${token.contractAddress}-${i}`}
                              variants={variants.staggerItem}
                              transition={springs.smooth}
                              whileHover={{ x: 4, transition: springs.snappy }}
                              className="flex items-center justify-between p-6 bg-surface-container-low rounded-xl border border-white/5 hover:bg-surface-container-high transition-colors cursor-pointer">
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
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    );
                  })()
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
            {!selectedNonEvm && activeTab === 'transactions' && (
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
            {!selectedNonEvm && activeTab === 'lightning' && <LightningTab />}

            {/* Wallet History */}
            {!selectedNonEvm && activeTab === 'balance' && walletHistory.length > 0 && (
              <div style={{ paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Wallet History</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <AnimatePresence>
                    {walletHistory.map((snap, i) => {
                      const isCurrent = snap.id === currentHistoryId;
                      return (
                        <motion.div
                          key={snap.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ ...springs.smooth, delay: i * 0.04 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px',
                            background: isCurrent ? 'rgba(var(--theme-accent-rgb, 82,255,172),0.06)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isCurrent ? 'rgba(var(--theme-accent-rgb, 82,255,172),0.2)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: '0.75rem', cursor: isCurrent ? 'default' : 'pointer',
                            transition: 'all 0.15s',
                          }}
                          onClick={() => {
                            if (isCurrent) return;
                            // Switch to this wallet — show warning if different address
                            // For now navigate to advanced for non-current wallets;
                            // actual session switch requires vault restore flow
                          }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: isCurrent ? 'var(--theme-accent)' : 'rgba(255,255,255,0.4)' }}>account_balance_wallet</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: isCurrent ? 'var(--theme-accent)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {snap.shortAddress}
                              </span>
                              {isCurrent && (
                                <span style={{ fontSize: 8, fontWeight: 900, color: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb, 82,255,172),0.12)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>
                                  Current
                                </span>
                              )}
                              {snap.isSaved && !isCurrent && (
                                <span style={{ fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>
                                  Saved
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                              {snap.vaultMode === 'PERSISTENT' ? 'Persistent' : 'Ephemeral'} · {new Date(snap.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          {!snap.isSaved ? (
                            <button
                              onClick={e => { e.stopPropagation(); saveWallet(snap.id); setWalletHistory(getHistory()); }}
                              style={{ flexShrink: 0, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', padding: '3px 8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--theme-accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--theme-accent)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; }}>
                              Kaydet
                            </button>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); removeFromHistory(snap.id); setWalletHistory(getHistory()); }}
                              style={{ flexShrink: 0, background: 'none', border: 'none', padding: '3px 6px', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', borderRadius: '0.4rem', transition: 'color 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ff6b6b'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)'; }}
                              title="Remove from history">
                              <X size={12} />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Advanced Mode hint */}
            {!selectedNonEvm && activeTab === 'balance' && (
              <div style={{ paddingTop: 8, textAlign: 'center' }}>
                <button onClick={() => setMode('advanced')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', transition: 'color 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--theme-accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}>
                  Didn&apos;t find what you&apos;re looking for? Try Advanced Mode →
                </button>
              </div>
            )}
          </div>


        </div>
      </section>
    </>
  );
}
