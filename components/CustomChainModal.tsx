'use client';

import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { CustomChain, saveCustomChain } from '@/lib/custom-chains';

interface Props {
  onClose: () => void;
  onSaved: (chain: CustomChain) => void;
}

export function CustomChainModal({ onClose, onSaved }: Props) {
  const [chainId, setChainId] = useState('');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');
  const [explorerUrl, setExplorerUrl] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
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

  const handleTest = async () => {
    if (!rpcUrl) { setErrMsg('Enter RPC URL first'); return; }
    setStatus('testing'); setErrMsg('');
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      const id = parseInt(chainId);
      if (id && Number(network.chainId) !== id) {
        setErrMsg(`RPC returned chain ID ${network.chainId}, expected ${id}`);
        setStatus('error'); return;
      }
      if (!chainId) setChainId(network.chainId.toString());
      setStatus('ok');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message.slice(0, 100) : 'RPC connection failed');
      setStatus('error');
    }
  };

  const handleSave = () => {
    const id = parseInt(chainId);
    if (!id || !name || !symbol || !rpcUrl) { setErrMsg('Fill all required fields'); return; }
    const chain: CustomChain = {
      id, name, shortName: shortName || symbol.toUpperCase().slice(0, 6),
      symbol, rpcUrl, explorerUrl, color, decimals: 18,
    };
    saveCustomChain(chain);
    onSaved(chain);
    onClose();
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: '1.5rem', width: 420, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Add Custom Chain</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.6rem', padding: 7, cursor: 'pointer', color: '#aaa', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span style={lbl}>Chain ID *</span>
              <div style={box}><input style={inp} placeholder="e.g. 2020" value={chainId} onChange={e => setChainId(e.target.value.replace(/\D/g, ''))} /></div>
            </div>
            <div>
              <span style={lbl}>Symbol *</span>
              <div style={box}><input style={inp} placeholder="e.g. RON" value={symbol} onChange={e => setSymbol(e.target.value)} /></div>
            </div>
          </div>

          <div>
            <span style={lbl}>Network Name *</span>
            <div style={box}><input style={inp} placeholder="e.g. Ronin" value={name} onChange={e => setName(e.target.value)} /></div>
          </div>

          <div>
            <span style={lbl}>Short Name</span>
            <div style={box}><input style={inp} placeholder="e.g. RON (auto-filled from symbol)" value={shortName} onChange={e => setShortName(e.target.value)} /></div>
          </div>

          <div>
            <span style={lbl}>RPC URL *</span>
            <div style={{ ...box, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="https://..." value={rpcUrl} onChange={e => { setRpcUrl(e.target.value); setStatus('idle'); }} />
              <button onClick={handleTest} style={{ flexShrink: 0, background: 'rgba(82,255,172,0.1)', border: '1px solid rgba(82,255,172,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#52ffac', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>
                {status === 'testing' ? '...' : 'Test'}
              </button>
              {status === 'ok' && <Check size={14} style={{ color: '#52ffac', flexShrink: 0 }} />}
              {status === 'error' && <AlertCircle size={14} style={{ color: '#ff6b6b', flexShrink: 0 }} />}
            </div>
          </div>

          <div>
            <span style={lbl}>Explorer URL</span>
            <div style={box}><input style={inp} placeholder="https://..." value={explorerUrl} onChange={e => setExplorerUrl(e.target.value)} /></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ ...lbl, marginBottom: 0 }}>Color</span>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ width: 36, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent', padding: 0 }} />
            <span style={{ color: '#555', fontSize: 11 }}>{color}</span>
          </div>

          {errMsg && (
            <div style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: 8, padding: '8px 12px', color: '#ffa9a9', fontSize: 11 }}>
              {errMsg}
            </div>
          )}

          <button onClick={handleSave}
            style={{ background: '#52ffac', color: '#002111', border: 'none', borderRadius: '0.75rem', padding: '14px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', marginTop: 4 }}>
            Save Chain
          </button>
        </div>
      </div>
    </div>
  );
}
