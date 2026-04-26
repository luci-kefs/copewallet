'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs, variants } from '@/lib/animations';

import { LitecoinPanel } from '@/components/LitecoinPanel';
import { ChainPanel, ChainTx } from '@/components/ChainPanel';
import { CustomChainModal } from '@/components/CustomChainModal';
import { CustomTokenModal } from '@/components/CustomTokenModal';
import { CustomAPIModal } from '@/components/CustomAPIModal';

import { loadCustomChains, deleteCustomChain, CustomChain } from '@/lib/custom-chains';
import { loadCustomTokens, deleteCustomToken, CustomToken } from '@/lib/custom-tokens';
import { loadCustomAPIs, deleteCustomAPI, CustomAPI } from '@/lib/custom-apis';
import { useWallet } from '@/context/WalletContext';
import { getPrices } from '@/lib/prices';

// ── Chain libs ────────────────────────────────────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props { onExit: () => void; }

type Category = 'utxo' | 'account' | 'dag' | 'move' | 'ltc' | 'evm';
type UTXOChain = 'BTC' | 'DOGE' | 'BCH';
type AccountChain = 'SOL' | 'XRP' | 'XLM';
type DAGChain = 'NANO' | 'HBAR';
type MoveChain = 'SUI' | 'APTOS';

interface ChainMeta {
  coin: string;
  name: string;
  color: string;
  explorerBase: string;
  symbol: string;
  coingeckoId: string;
  feeUnit?: string;
}

const CHAIN_META: Record<string, ChainMeta> = {
  BTC:   { coin: 'BTC',   name: 'Bitcoin',      color: '#F7931A', explorerBase: 'https://blockchair.com/bitcoin/transaction',           symbol: 'BTC',   coingeckoId: 'bitcoin',       feeUnit: 'sat/vByte' },
  DOGE:  { coin: 'DOGE',  name: 'Dogecoin',     color: '#C2A633', explorerBase: 'https://blockchair.com/dogecoin/transaction',          symbol: 'DOGE',  coingeckoId: 'dogecoin',      feeUnit: 'sat/vByte' },
  BCH:   { coin: 'BCH',   name: 'Bitcoin Cash', color: '#8DC351', explorerBase: 'https://blockchair.com/bitcoin-cash/transaction',      symbol: 'BCH',   coingeckoId: 'bitcoin-cash',  feeUnit: 'sat/vByte' },
  SOL:   { coin: 'SOL',   name: 'Solana',       color: '#9945FF', explorerBase: 'https://solscan.io/tx',                               symbol: 'SOL',   coingeckoId: 'solana',        feeUnit: 'lamports' },
  XRP:   { coin: 'XRP',   name: 'XRP',          color: '#346AA9', explorerBase: 'https://xrpscan.com/tx',                             symbol: 'XRP',   coingeckoId: 'ripple' },
  XLM:   { coin: 'XLM',   name: 'Stellar',      color: '#7D00FF', explorerBase: 'https://stellarchain.io/transactions',               symbol: 'XLM',   coingeckoId: 'stellar' },
  NANO:  { coin: 'NANO',  name: 'Nano',         color: '#4A90D9', explorerBase: 'https://nanolooker.com/block',                       symbol: 'NANO',  coingeckoId: 'nano' },
  HBAR:  { coin: 'HBAR',  name: 'Hedera',       color: '#222222', explorerBase: 'https://hashscan.io/mainnet/transaction',            symbol: 'HBAR',  coingeckoId: 'hedera-hashgraph' },
  SUI:   { coin: 'SUI',   name: 'Sui',          color: '#6FBCF0', explorerBase: 'https://suiscan.xyz/mainnet/tx',                     symbol: 'SUI',   coingeckoId: 'sui' },
  APTOS: { coin: 'APTOS', name: 'Aptos',        color: '#00BFAE', explorerBase: 'https://explorer.aptoslabs.com/txn',                 symbol: 'APT',   coingeckoId: 'aptos' },
};

// ── AdvancedDashboard ─────────────────────────────────────────────────────────
export function AdvancedDashboard({ onExit }: Props) {
  const wallet = useWallet();
  const [category, setCategory] = useState<Category>('utxo');
  const [utxoChain, setUtxoChain] = useState<UTXOChain>('BTC');
  const [accountChain, setAccountChain] = useState<AccountChain>('SOL');
  const [dagChain, setDagChain] = useState<DAGChain>('NANO');
  const [moveChain, setMoveChain] = useState<MoveChain>('SUI');

  const [customChains, setCustomChains] = useState<CustomChain[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [customAPIs, setCustomAPIs] = useState<CustomAPI[]>([]);
  const [showChainModal, setShowChainModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showAPIModal, setShowAPIModal] = useState(false);

  // Per-chain derived state
  const [chainAddr, setChainAddr] = useState<string | null>(null);
  const [chainBal, setChainBal] = useState<number | null>(null);
  const [usdPrice, setUsdPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCustomChains(loadCustomChains());
    setCustomTokens(loadCustomTokens());
    setCustomAPIs(loadCustomAPIs());
  }, []);

  // Active coin key based on category + subchain selection
  const activeCoin: string = category === 'utxo' ? utxoChain
    : category === 'account' ? accountChain
    : category === 'dag' ? dagChain
    : category === 'move' ? moveChain
    : category === 'ltc' ? 'LTC'
    : '';

  const meta = CHAIN_META[activeCoin];

  // Derive address + fetch balance whenever coin or mnemonic changes
  const loadChainData = useCallback(async () => {
    if (!wallet.isUnlocked || !meta) return;
    setIsLoading(true);
    setChainAddr(null);
    setChainBal(null);
    try {
      const mnemonic = await wallet.getMnemonicForExport();
      if (!mnemonic) return;

      let address = '';
      let balance = 0;

      if (activeCoin === 'BTC') {
        const w = deriveBTCWallet(mnemonic);
        address = w.address;
        const b = await getBTCBalance(w.address);
        balance = b.total;
      } else if (activeCoin === 'DOGE') {
        const w = deriveDOGEWallet(mnemonic);
        address = w.address;
        const b = await getDOGEBalance(w.address);
        balance = b.total;
      } else if (activeCoin === 'BCH') {
        const w = deriveBCHWallet(mnemonic);
        address = w.address;
        const b = await getBCHBalance(w.address);
        balance = b.total;
      } else if (activeCoin === 'SOL') {
        const w = deriveSOLWallet(mnemonic);
        address = w.address;
        const b = await getSOLBalance(address);
        balance = b.sol;
      } else if (activeCoin === 'XRP') {
        const w = deriveXRPWallet(mnemonic);
        address = w.address;
        const b = await getXRPBalance(address);
        balance = b.xrp;
      } else if (activeCoin === 'XLM') {
        const w = deriveXLMWallet(mnemonic);
        address = w.address;
        const b = await getXLMBalance(address);
        balance = b.xlm;
      } else if (activeCoin === 'NANO') {
        const w = deriveNANOWallet(mnemonic);
        address = w.address;
        const b = await getNANOBalance(address);
        balance = b.nano;
      } else if (activeCoin === 'HBAR') {
        const w = deriveHBARWallet(mnemonic);
        address = w.evmAddress;
        const b = await getHBARBalance(address);
        balance = b.hbar;
      } else if (activeCoin === 'SUI') {
        const w = deriveSUIWallet(mnemonic);
        address = w.address;
        const b = await getSUIBalance(address);
        balance = b.sui;
      } else if (activeCoin === 'APTOS') {
        const w = deriveAPTOSWallet(mnemonic);
        address = w.address;
        const b = await getAPTOSBalance(address);
        balance = b.apt;
      }

      setChainAddr(address);
      setChainBal(balance);

      // Fetch USD price
      if (meta.coingeckoId) {
        const prices = await getPrices([meta.coingeckoId]);
        setUsdPrice(prices[meta.coingeckoId] ?? 0);
      }
    } catch {
      setChainBal(0);
    } finally {
      setIsLoading(false);
    }
  }, [wallet.isUnlocked, activeCoin]);

  useEffect(() => {
    if (category !== 'ltc' && category !== 'evm') loadChainData();
  }, [category, utxoChain, accountChain, dagChain, moveChain, loadChainData]);

  // ── onSend handler — returns txid ─────────────────────────────────────────
  const handleSend = useCallback(async (to: string, amount: number, feeSpeed: 'slow' | 'medium' | 'fast'): Promise<string> => {
    const mnemonic = await wallet.getMnemonicForExport();
    if (!mnemonic) throw new Error('Wallet locked');

    if (activeCoin === 'BTC') {
      const w = deriveBTCWallet(mnemonic);
      const fees = await estimateBTCFee();
      const feeRate = fees[feeSpeed];
      const { hex } = await buildBTCTransaction({ from: w, to, amountBTC: amount, feeRate });
      return broadcastBTC(hex);
    } else if (activeCoin === 'DOGE') {
      const w = deriveDOGEWallet(mnemonic);
      const fees = await estimateDOGEFee();
      const feeRate = fees[feeSpeed];
      const { hex } = await buildDOGETransaction({ from: w, to, amountDOGE: amount, feeRate });
      return broadcastDOGE(hex);
    } else if (activeCoin === 'BCH') {
      const w = deriveBCHWallet(mnemonic);
      const fees = await estimateBCHFee();
      const feeRate = fees[feeSpeed];
      const { hex } = await buildBCHTransaction({ from: w, to, amountBCH: amount, feeRate });
      return broadcastBCH(hex);
    } else if (activeCoin === 'SOL') {
      const w = deriveSOLWallet(mnemonic);
      return sendSOL(w, to, amount);
    } else if (activeCoin === 'XRP') {
      const w = deriveXRPWallet(mnemonic);
      return sendXRP(w, to, amount);
    } else if (activeCoin === 'XLM') {
      const w = deriveXLMWallet(mnemonic);
      return sendXLM(w, to, amount);
    } else if (activeCoin === 'NANO') {
      const w = deriveNANOWallet(mnemonic);
      return sendNANO(w, to, amount);
    } else if (activeCoin === 'HBAR') {
      const w = deriveHBARWallet(mnemonic);
      return sendHBAR(w, to, amount);
    } else if (activeCoin === 'SUI') {
      const w = deriveSUIWallet(mnemonic);
      return sendSUI(w, to, amount);
    } else if (activeCoin === 'APTOS') {
      const w = deriveAPTOSWallet(mnemonic);
      return sendAPTOS(w, to, amount);
    }
    throw new Error('Unknown chain');
  }, [wallet, activeCoin]);

  // ── onGetHistory handler ──────────────────────────────────────────────────
  const handleGetHistory = useCallback(async (): Promise<ChainTx[]> => {
    if (!chainAddr) return [];
    const toTx = (t: { txid: string; amount: number; timestamp: number }) => t;
    if (activeCoin === 'BTC')   return (await getBTCTransactions(chainAddr)).map(toTx);
    if (activeCoin === 'DOGE')  return (await getDOGETransactions(chainAddr)).map(toTx);
    if (activeCoin === 'BCH')   return (await getBCHTransactions(chainAddr)).map(toTx);
    if (activeCoin === 'SOL')   return (await getSOLTransactions(chainAddr)).map(toTx);
    if (activeCoin === 'XRP')   return (await getXRPTransactions(chainAddr)).map(toTx);
    if (activeCoin === 'XLM')   return (await getXLMTransactions(chainAddr)).map(toTx);
    if (activeCoin === 'NANO')  return (await getNANOTransactions(chainAddr)).map(toTx);
    if (activeCoin === 'HBAR')  return (await getHBARTransactions(chainAddr)).map(toTx);
    if (activeCoin === 'SUI')   return (await getSUITransactions(chainAddr)).map(toTx);
    if (activeCoin === 'APTOS') return (await getAPTOSTransactions(chainAddr)).map(toTx);
    return [];
  }, [chainAddr, activeCoin]);

  // ── onGetFees handler (UTXO only) ─────────────────────────────────────────
  const handleGetFees = useCallback(async () => {
    if (activeCoin === 'BTC')  return estimateBTCFee();
    if (activeCoin === 'DOGE') return estimateDOGEFee();
    if (activeCoin === 'BCH')  return estimateBCHFee();
    if (activeCoin === 'SOL') {
      const fee = await estimateSOLFee();
      return { slow: fee, medium: fee, fast: fee };
    }
    return { slow: 0, medium: 0, fast: 0 };
  }, [activeCoin]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const catBtn = (c: Category, label: string, icon: string) => (
    <button key={c} onClick={() => setCategory(c)} style={{
      background: category === c ? 'var(--theme-accent-dim)' : 'rgba(255,255,255,0.03)',
      border: category === c ? '1px solid var(--theme-accent-border)' : '1px solid rgba(255,255,255,0.06)',
      borderRadius: '0.75rem', padding: '8px 14px', cursor: 'pointer',
      color: category === c ? 'var(--theme-accent)' : '#888',
      fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.06em',
      display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </button>
  );

  const subChainBtn = <T extends string>(val: T, current: T, set: (v: T) => void, color: string) => (
    <button key={val} onClick={() => set(val)} style={{
      padding: '4px 12px', borderRadius: 20, border: `1px solid ${current === val ? color : 'rgba(255,255,255,0.08)'}`,
      background: current === val ? `${color}18` : 'transparent',
      color: current === val ? color : '#888', fontSize: 10, fontWeight: 900,
      textTransform: 'uppercase' as const, letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.15s',
    }}>{val}</button>
  );

  const deleteBtn = (onClick: () => void) => (
    <button onClick={onClick} style={{ background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.15)', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', color: '#ff8888', display: 'flex', alignItems: 'center' }}>
      <Trash2 size={13} />
    </button>
  );

  const addBtn = (label: string, onClick: () => void) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--theme-accent-dim)', border: '1px solid var(--theme-accent-border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: 'var(--theme-accent)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const }}>
      <Plus size={13} /> {label}
    </button>
  );

  const chainPanel = meta ? (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1.25rem', padding: 20 }}>
      <ChainPanel
        key={activeCoin}
        coin={activeCoin}
        name={meta.name}
        color={meta.color}
        explorerBase={meta.explorerBase}
        address={chainAddr}
        balance={chainBal}
        usdPrice={usdPrice}
        symbol={meta.symbol}
        onSend={handleSend}
        onGetHistory={handleGetHistory}
        onGetFees={['BTC','DOGE','BCH','SOL'].includes(activeCoin) ? handleGetFees : undefined}
        feeUnit={meta.feeUnit}
        isLoading={isLoading}
      />
    </div>
  ) : null;

  return (
    <section
      className="flex-1 pt-[64px] px-4 pb-24 md:p-16 md:pt-16 overflow-y-auto"
      style={{ background: 'var(--color-surface)', minHeight: '100vh' }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onExit} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.5rem', padding: '6px 14px', cursor: 'pointer', color: '#ccc', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <ChevronLeft size={14} /> Simple
          </button>
          <div>
            <p style={{ color: '#fff', fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: '-0.01em' }}>Advanced Mode</p>
            <p style={{ color: '#555', fontSize: 10, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              UTXO · Account · DAG · Move · Litecoin · Custom EVM
            </p>
          </div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--theme-accent)', boxShadow: '0 0 8px rgba(168,85,247,0.5)', opacity: wallet.isUnlocked ? 1 : 0.2 }} />
      </div>

      {/* Category nav */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {catBtn('utxo',    'UTXO',       'currency_bitcoin')}
        {catBtn('account', 'Account',    'account_balance')}
        {catBtn('dag',     'DAG',        'hub')}
        {catBtn('move',    'Move',       'moving')}
        {catBtn('ltc',     'Litecoin',   'toll')}
        {catBtn('evm',     'Custom EVM', 'link')}
      </div>

      <AnimatePresence mode="wait">

        {/* ── UTXO: BTC / DOGE / BCH ── */}
        {category === 'utxo' && (
          <motion.div key="utxo" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {subChainBtn<UTXOChain>('BTC',  utxoChain, setUtxoChain, '#F7931A')}
              {subChainBtn<UTXOChain>('DOGE', utxoChain, setUtxoChain, '#C2A633')}
              {subChainBtn<UTXOChain>('BCH',  utxoChain, setUtxoChain, '#8DC351')}
            </div>
            {chainPanel}
          </motion.div>
        )}

        {/* ── Account: SOL / XRP / XLM ── */}
        {category === 'account' && (
          <motion.div key="account" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {subChainBtn<AccountChain>('SOL', accountChain, setAccountChain, '#9945FF')}
              {subChainBtn<AccountChain>('XRP', accountChain, setAccountChain, '#346AA9')}
              {subChainBtn<AccountChain>('XLM', accountChain, setAccountChain, '#7D00FF')}
            </div>
            {chainPanel}
          </motion.div>
        )}

        {/* ── DAG: NANO / HBAR ── */}
        {category === 'dag' && (
          <motion.div key="dag" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {subChainBtn<DAGChain>('NANO', dagChain, setDagChain, '#4A90D9')}
              {subChainBtn<DAGChain>('HBAR', dagChain, setDagChain, '#222222')}
            </div>
            {chainPanel}
          </motion.div>
        )}

        {/* ── Move: SUI / APTOS ── */}
        {category === 'move' && (
          <motion.div key="move" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {subChainBtn<MoveChain>('SUI',   moveChain, setMoveChain, '#6FBCF0')}
              {subChainBtn<MoveChain>('APTOS', moveChain, setMoveChain, '#00BFAE')}
            </div>
            {chainPanel}
          </motion.div>
        )}

        {/* ── Litecoin ── */}
        {category === 'ltc' && (
          <motion.div key="ltc" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1.25rem', padding: 20 }}>
              <LitecoinPanel />
            </div>
          </motion.div>
        )}

        {/* ── Custom EVM ── */}
        {category === 'evm' && (
          <motion.div key="evm" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Custom Chains */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ color: '#888', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  {customChains.length} Custom Chain{customChains.length !== 1 ? 's' : ''}
                </p>
                {addBtn('Add Chain', () => setShowChainModal(true))}
              </div>
              {customChains.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '28px', textAlign: 'center' }}>
                  <p style={{ color: '#555', fontSize: 13, margin: 0 }}>No custom chains yet.</p>
                  <p style={{ color: '#444', fontSize: 11, margin: '4px 0 0' }}>Add any EVM-compatible chain using its RPC URL and Chain ID.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {customChains.map(c => (
                    <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${c.color}18`, border: `1.5px solid ${c.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: c.color, fontSize: 9, fontWeight: 900 }}>{c.shortName.slice(0, 3)}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>{c.name}</p>
                        <p style={{ color: '#555', fontSize: 10, margin: '2px 0 0', fontFamily: 'monospace' }}>ID: {c.id} · {c.symbol}</p>
                      </div>
                      {deleteBtn(() => { deleteCustomChain(c.id); setCustomChains(loadCustomChains()); })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Tokens */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ color: '#888', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  {customTokens.length} Custom Token{customTokens.length !== 1 ? 's' : ''}
                </p>
                {addBtn('Add Token', () => setShowTokenModal(true))}
              </div>
              {customTokens.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '28px', textAlign: 'center' }}>
                  <p style={{ color: '#555', fontSize: 13, margin: 0 }}>No custom tokens yet.</p>
                  <p style={{ color: '#444', fontSize: 11, margin: '4px 0 0' }}>Add any ERC-20 token by contract address.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {customTokens.map(t => (
                    <div key={`${t.chainId}-${t.contractAddress}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#ccc', fontSize: 9, fontWeight: 900 }}>{t.symbol.slice(0, 3)}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>{t.symbol} <span style={{ color: '#555', fontWeight: 400 }}>— {t.name}</span></p>
                        <p style={{ color: '#555', fontSize: 9, margin: '2px 0 0', fontFamily: 'monospace' }}>Chain {t.chainId} · {t.contractAddress.slice(0, 12)}…{t.contractAddress.slice(-6)}</p>
                      </div>
                      {deleteBtn(() => { deleteCustomToken(t.chainId, t.contractAddress); setCustomTokens(loadCustomTokens()); })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom APIs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ color: '#888', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  {customAPIs.length} Custom API{customAPIs.length !== 1 ? 's' : ''}
                </p>
                {addBtn('Add API', () => setShowAPIModal(true))}
              </div>
              {customAPIs.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '28px', textAlign: 'center' }}>
                  <p style={{ color: '#555', fontSize: 13, margin: 0 }}>No custom APIs yet.</p>
                  <p style={{ color: '#444', fontSize: 11, margin: '4px 0 0' }}>Connect any blockchain via REST API.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {customAPIs.map(a => (
                    <div key={a.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#ccc', fontSize: 9, fontWeight: 900 }}>{a.symbol.slice(0, 3)}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>{a.name} <span style={{ color: '#555', fontWeight: 400 }}>({a.symbol})</span></p>
                        <p style={{ color: '#555', fontSize: 9, margin: '2px 0 0' }}>
                          {a.sendEndpoint ? 'Read & Send' : 'Read-only'} · {a.balanceEndpoint.slice(0, 30)}…
                        </p>
                      </div>
                      {deleteBtn(() => { deleteCustomAPI(a.id); setCustomAPIs(loadCustomAPIs()); })}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* Modals */}
      {showChainModal && <CustomChainModal onClose={() => setShowChainModal(false)} onSaved={() => setCustomChains(loadCustomChains())} />}
      {showTokenModal && <CustomTokenModal customChains={customChains} activeAddress={wallet.activeAddress} onClose={() => setShowTokenModal(false)} onSaved={() => setCustomTokens(loadCustomTokens())} />}
      {showAPIModal && <CustomAPIModal activeAddress={wallet.activeAddress} onClose={() => setShowAPIModal(false)} onSaved={() => setCustomAPIs(loadCustomAPIs())} />}
    </section>
  );
}
