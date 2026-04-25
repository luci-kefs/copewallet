'use client';

import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { CHAINS } from '@/lib/chains';
import { CustomChain } from '@/lib/custom-chains';
import { CustomToken, saveCustomToken, fetchTokenInfo } from '@/lib/custom-tokens';

interface Props {
  customChains: CustomChain[];
  activeAddress: string | null;
  onClose: () => void;
  onSaved: (token: CustomToken) => void;
}

export function CustomTokenModal({ customChains, activeAddress, onClose, onSaved }: Props) {
  const allChains = [
    ...CHAINS.filter(c => !c.isTestnet).map(c => ({ id: c.id, name: c.name, rpcUrl: '', symbol: c.symbol, isBuiltin: true })),
    ...customChains.map(c => ({ id: c.id, name: c.name, rpcUrl: c.rpcUrl, symbol: c.symbol, isBuiltin: false })),
  ];

  const [selectedChainId, setSelectedChainId] = useState(1);
  const [contractAddress, setContractAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const box: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem',
    padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)',
  };
  const inp: React.CSSProperties = {
    width: '100%', background: 'transparent', border: 'none', outline: 'none',
    color: '#fff', fontSize: 13, fontFamily: 'inherit',
  };
  const lbl: React.CSSProperties = {
    color: '#888', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', marginBottom: 4, display: 'block',
  };

  const handleFetch = async () => {
    if (!contractAddress || contractAddress.length !== 42) { setErrMsg('Enter a valid contract address (0x...)'); return; }
    const chain = allChains.find(c => c.id === selectedChainId);
    if (!chain) return;
    // For builtin chains, use public RPC fallbacks
    const rpcUrl = chain.isBuiltin
      ? (CHAINS.find(c => c.id === selectedChainId)?.rpcEnvKey ? `/api/proxy-rpc?chainId=${selectedChainId}` : `https://rpc.ankr.com/eth`)
      : (chain as { rpcUrl: string }).rpcUrl;
    setFetchStatus('loading'); setErrMsg('');
    try {
      const info = await fetchTokenInfo(rpcUrl, contractAddress);
      setTokenSymbol(info.symbol);
      setTokenName(info.name);
      setDecimals(info.decimals.toString());
      setFetchStatus('ok');
    } catch {
      setErrMsg('Could not read token info. Enter manually.');
      setFetchStatus('error');
    }
  };

  const handleSave = () => {
    if (!contractAddress || !tokenSymbol || !tokenName) { setErrMsg('Fill all required fields'); return; }
    const token: CustomToken = {
      chainId: selectedChainId,
      contractAddress,
      symbol: tokenSymbol,
      name: tokenName,
      decimals: parseInt(decimals) || 18,
    };
    saveCustomToken(token);
    onSaved(token);
    onClose();
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: '1.5rem', width: 420, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Add Custom Token</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.6rem', padding: 7, cursor: 'pointer', color: '#aaa', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span style={lbl}>Network</span>
            <div style={{ ...box, padding: '6px 10px' }}>
              <select value={selectedChainId} onChange={e => setSelectedChainId(parseInt(e.target.value))}
                style={{ ...inp, cursor: 'pointer' }}>
                {allChains.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
              </select>
            </div>
          </div>

          <div>
            <span style={lbl}>Contract Address *</span>
            <div style={{ ...box, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="0x..." value={contractAddress}
                onChange={e => { setContractAddress(e.target.value); setFetchStatus('idle'); }} />
              <button onClick={handleFetch} style={{ flexShrink: 0, background: 'rgba(82,255,172,0.1)', border: '1px solid rgba(82,255,172,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#52ffac', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>
                {fetchStatus === 'loading' ? '...' : 'Auto-fill'}
              </button>
              {fetchStatus === 'ok' && <Check size={14} style={{ color: '#52ffac', flexShrink: 0 }} />}
              {fetchStatus === 'error' && <AlertCircle size={14} style={{ color: '#ff6b6b', flexShrink: 0 }} />}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span style={lbl}>Symbol *</span>
              <div style={box}><input style={inp} placeholder="e.g. USDC" value={tokenSymbol} onChange={e => setTokenSymbol(e.target.value)} /></div>
            </div>
            <div>
              <span style={lbl}>Decimals</span>
              <div style={box}><input style={inp} type="number" value={decimals} onChange={e => setDecimals(e.target.value)} /></div>
            </div>
          </div>

          <div>
            <span style={lbl}>Token Name *</span>
            <div style={box}><input style={inp} placeholder="e.g. USD Coin" value={tokenName} onChange={e => setTokenName(e.target.value)} /></div>
          </div>

          {errMsg && (
            <div style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: 8, padding: '8px 12px', color: '#ffa9a9', fontSize: 11 }}>
              {errMsg}
            </div>
          )}

          <button onClick={handleSave}
            style={{ background: '#52ffac', color: '#002111', border: 'none', borderRadius: '0.75rem', padding: '14px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', marginTop: 4 }}>
            Save Token
          </button>
        </div>
      </div>
    </div>
  );
}
