'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs, variants } from '@/lib/animations';
import { WalletSnapshot, getHistory } from '@/lib/wallet-history';
import { WarningBanner } from '@/components/WarningBanner';
import { useWallet } from '@/context/WalletContext';
import { fetchTokenBalances, TokenBalance } from '@/lib/tokens';
import { getPrices } from '@/lib/prices';
import { CHAINS } from '@/lib/chains';
import { buildMaskedTransaction } from '@/lib/transaction';
import { ephemeralSign } from '@/lib/signer';
import { getProvider } from '@/lib/provider';

interface Props {
  onClose: () => void;
  currentAddress: string;
  currentHistoryId: string | null;
}

type Step = 'select-target' | 'select-coin' | 'enter-amount' | 'confirm' | 'done';
type SendStatus = 'idle' | 'sending' | 'done' | 'error';

export function TransferModal({ onClose, currentAddress, currentHistoryId }: Props) {
  const wallet = useWallet();

  const [step, setStep] = useState<Step>('select-target');
  const [savedWallets, setSavedWallets] = useState<WalletSnapshot[]>([]);
  const [target, setTarget] = useState<WalletSnapshot | null>(null);

  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [tokenChainId, setTokenChainId] = useState<number>(CHAINS[0].id);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  const [amount, setAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [txHash, setTxHash] = useState('');
  const [errMsg, setErrMsg] = useState('');

  // Load saved wallets (excluding current)
  useEffect(() => {
    const history = getHistory();
    setSavedWallets(history.filter(s => s.isSaved && s.id !== currentHistoryId));
  }, [currentHistoryId]);

  // Load tokens when target selected
  useEffect(() => {
    if (!currentAddress) return;
    setIsLoadingTokens(true);
    const chainId = CHAINS[0].id; // default ETH
    setTokenChainId(chainId);
    fetchTokenBalances(currentAddress, chainId)
      .then(async (toks) => {
        const nonZero = toks.filter(t => parseFloat(t.balance || '0') > 0);
        setTokens(nonZero);
        if (nonZero.length > 0) setSelectedToken(nonZero[0]);
        const cgIds = [...new Set([CHAINS[0].coingeckoId, ...nonZero.map(t => t.coingeckoId).filter(Boolean) as string[]])];
        const p = await getPrices(cgIds);
        setPrices(p);
      })
      .catch(() => {})
      .finally(() => setIsLoadingTokens(false));
  }, [currentAddress]);

  const selectedBal = parseFloat(selectedToken?.balance || '0');
  const selectedPrice = prices[selectedToken?.coingeckoId ?? ''] ?? prices[CHAINS[0].coingeckoId] ?? 0;
  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum * selectedPrice;

  const handleSend = async () => {
    if (!target || !selectedToken || !amountNum || !wallet.scatteredKeyStore) return;
    setSendStatus('sending');
    setErrMsg('');
    try {
      const isNative = !selectedToken.contractAddress || selectedToken.contractAddress === 'native';
      const txReq = await buildMaskedTransaction(
        target.address,
        amount,
        currentAddress,
        tokenChainId,
        isNative ? undefined : selectedToken.contractAddress,
        selectedToken.decimals ?? 18,
      );
      const provider = getProvider(tokenChainId);
      const signed = await ephemeralSign(wallet.scatteredKeyStore, txReq);
      const sentTx = await provider.broadcastTransaction(signed);
      setTxHash(sentTx.hash);
      setSendStatus('done');
      setStep('done');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Transfer failed');
      setSendStatus('error');
    }
    setShowConfirm(false);
  };

  const explorerUrl = CHAINS.find(c => c.id === tokenChainId)?.explorerUrl ?? CHAINS[0].explorerUrl;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      >
        <motion.div
          variants={variants.modalEnter}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={springs.bouncy}
          style={{ background: '#111', borderRadius: '1.5rem', width: 420, maxWidth: '100%', padding: 24, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Transfer</p>
              <p style={{ color: '#555', fontSize: 10, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Between saved wallets</p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', color: '#888', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          <AnimatePresence mode="wait">

            {/* ── STEP 1: Select target wallet ── */}
            {step === 'select-target' && (
              <motion.div key="select-target" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ color: '#888', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  Send to
                </p>
                {savedWallets.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', padding: 24, textAlign: 'center' }}>
                    <p style={{ color: '#555', fontSize: 13, margin: 0 }}>No other saved wallets.</p>
                    <p style={{ color: '#444', fontSize: 11, margin: '6px 0 0' }}>
                      Save at least one more wallet in history to transfer between them.
                    </p>
                  </div>
                ) : (
                  savedWallets.map((snap) => (
                    <button key={snap.id} onClick={() => { setTarget(snap); setStep('select-coin'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', width: '100%' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--theme-accent-border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-accent-dim)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>account_balance_wallet</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontSize: 12, fontWeight: 700, margin: 0, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {snap.shortAddress}
                        </p>
                        <p style={{ color: '#555', fontSize: 10, margin: '2px 0 0' }}>
                          {snap.vaultMode === 'PERSISTENT' ? 'Persistent' : 'Ephemeral'} · {new Date(snap.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight size={14} style={{ color: '#555', flexShrink: 0 }} />
                    </button>
                  ))
                )}
              </motion.div>
            )}

            {/* ── STEP 2: Select coin ── */}
            {step === 'select-coin' && (
              <motion.div key="select-coin" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Target reminder */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 9, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>To:</span>
                  <span style={{ fontSize: 11, color: '#fff', fontFamily: 'monospace' }}>{target?.shortAddress}</span>
                </div>

                <p style={{ color: '#888', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Select coin</p>

                {isLoadingTokens ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--theme-accent)', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : tokens.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', padding: 24, textAlign: 'center' }}>
                    <p style={{ color: '#555', fontSize: 13, margin: 0 }}>No tokens with balance found.</p>
                  </div>
                ) : (
                  tokens.map((tok, i) => {
                    const bal = parseFloat(tok.balance || '0');
                    const price = prices[tok.coingeckoId ?? ''] ?? prices[CHAINS[0].coingeckoId] ?? 0;
                    const usd = bal * price;
                    const isSelected = selectedToken?.contractAddress === tok.contractAddress;
                    return (
                      <button key={i} onClick={() => { setSelectedToken(tok); setStep('enter-amount'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: isSelected ? 'var(--theme-accent-dim)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isSelected ? 'var(--theme-accent-border)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '1rem', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', width: '100%' }}>
                        {tok.logo
                          ? <img src={tok.logo} alt={tok.symbol} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{tok.symbol.slice(0,1)}</div>
                        }
                        <div style={{ flex: 1 }}>
                          <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>{tok.symbol}</p>
                          <p style={{ color: '#555', fontSize: 10, margin: '2px 0 0' }}>{bal.toFixed(6)}</p>
                        </div>
                        <p style={{ color: '#888', fontSize: 11, fontWeight: 700, margin: 0 }}>${usd.toFixed(2)}</p>
                      </button>
                    );
                  })
                )}

                <button onClick={() => setStep('select-target')} style={{ background: 'none', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>
                  ← Change target
                </button>
              </motion.div>
            )}

            {/* ── STEP 3: Enter amount ── */}
            {step === 'enter-amount' && (
              <motion.div key="enter-amount" variants={variants.fadeUp} initial="hidden" animate="visible" exit="hidden" transition={springs.smooth}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Summary bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: '#888' }}>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>To</span>
                  <span style={{ fontFamily: 'monospace', color: '#fff' }}>{target?.shortAddress}</span>
                  <span style={{ margin: '0 4px' }}>·</span>
                  <span style={{ fontWeight: 700, color: 'var(--theme-accent)' }}>{selectedToken?.symbol}</span>
                </div>

                {/* Amount input */}
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '14px 16px' }}>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    autoFocus
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 28, fontWeight: 900, fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: '#555' }}>≈ ${usdValue.toFixed(2)}</span>
                    <button onClick={() => setAmount(String(selectedBal))}
                      style={{ fontSize: 9, fontWeight: 900, color: 'var(--theme-accent)', background: 'var(--theme-accent-dim)', border: '1px solid var(--theme-accent-border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Max
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: 10, color: '#555', margin: 0 }}>
                  Balance: {selectedBal.toFixed(6)} {selectedToken?.symbol}
                </p>

                {sendStatus === 'error' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ff6b6b', fontSize: 11 }}>
                    <AlertCircle size={13} /> {errMsg}
                  </div>
                )}

                <button
                  disabled={!amountNum || amountNum <= 0 || amountNum > selectedBal}
                  onClick={() => setShowConfirm(true)}
                  style={{ padding: '12px', borderRadius: '0.75rem', border: 'none', background: (!amountNum || amountNum > selectedBal) ? 'rgba(255,255,255,0.06)' : 'var(--theme-accent)', color: (!amountNum || amountNum > selectedBal) ? '#555' : 'var(--theme-accent-text, #000)', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: (!amountNum || amountNum > selectedBal) ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                  Review Transfer
                </button>

                <button onClick={() => setStep('select-coin')} style={{ background: 'none', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>
                  ← Change coin
                </button>
              </motion.div>
            )}

            {/* ── DONE ── */}
            {step === 'done' && (
              <motion.div key="done" variants={variants.scaleIn} initial="hidden" animate="visible" transition={springs.bouncy}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '2px solid rgba(82,255,172,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={24} style={{ color: 'var(--theme-accent)' }} />
                </div>
                <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', margin: 0 }}>Transferred!</p>
                <p style={{ color: '#555', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center', margin: 0 }}>
                  {txHash.slice(0, 20)}…{txHash.slice(-8)}
                </p>
                <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--theme-accent)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  View on Explorer
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                </a>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Transfer confirmation warning */}
      <AnimatePresence>
        {showConfirm && (
          <WarningBanner
            type="transfer-confirm"
            data={{ coin: selectedToken?.symbol, address: target?.address, amount: usdValue }}
            onConfirm={handleSend}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
