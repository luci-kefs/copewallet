'use client';

import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { CustomAPI, saveCustomAPI, queryBalance } from '@/lib/custom-apis';

interface Props {
  activeAddress: string | null;
  onClose: () => void;
  onSaved: (api: CustomAPI) => void;
}

export function CustomAPIModal({ activeAddress, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('8');
  const [balanceEndpoint, setBalanceEndpoint] = useState('');
  const [balanceJsonPath, setBalanceJsonPath] = useState('data.balance');
  const [sendEndpoint, setSendEndpoint] = useState('');
  const [sendBodyTemplate, setSendBodyTemplate] = useState('{"from":"{from}","to":"{to}","amount":"{amount}"}');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('X-API-Key');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testResult, setTestResult] = useState('');
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

  const buildAPI = (): CustomAPI => ({
    id: crypto.randomUUID(),
    name, symbol, decimals: parseInt(decimals) || 8,
    balanceEndpoint, balanceJsonPath,
    sendEndpoint: sendEndpoint || undefined,
    sendBodyTemplate: sendEndpoint ? sendBodyTemplate : undefined,
    apiKey: apiKey || undefined,
    apiKeyHeader: apiKey ? apiKeyHeader : undefined,
  });

  const handleTest = async () => {
    if (!balanceEndpoint) { setErrMsg('Enter balance endpoint first'); return; }
    const addr = activeAddress ?? '0x0000000000000000000000000000000000000000';
    setTestStatus('testing'); setTestResult(''); setErrMsg('');
    try {
      const api = buildAPI();
      const balance = await queryBalance(api, addr);
      setTestResult(`Balance: ${balance} ${symbol || '?'}`);
      setTestStatus('ok');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message.slice(0, 120) : 'Test failed');
      setTestStatus('error');
    }
  };

  const handleSave = () => {
    if (!name || !symbol || !balanceEndpoint || !balanceJsonPath) { setErrMsg('Fill all required fields'); return; }
    const api = buildAPI();
    saveCustomAPI(api);
    onSaved(api);
    onClose();
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: '1.5rem', width: 460, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Add Custom API</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.6rem', padding: 7, cursor: 'pointer', color: '#aaa', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 10 }}>
            <div>
              <span style={lbl}>Name *</span>
              <div style={box}><input style={inp} placeholder="e.g. Solana" value={name} onChange={e => setName(e.target.value)} /></div>
            </div>
            <div>
              <span style={lbl}>Symbol *</span>
              <div style={box}><input style={inp} placeholder="SOL" value={symbol} onChange={e => setSymbol(e.target.value)} /></div>
            </div>
            <div>
              <span style={lbl}>Decimals</span>
              <div style={box}><input style={inp} type="number" value={decimals} onChange={e => setDecimals(e.target.value)} /></div>
            </div>
          </div>

          {/* Balance endpoint */}
          <div>
            <span style={lbl}>Balance Endpoint * <span style={{ color: '#555', fontWeight: 400 }}>(use {'{address}'} placeholder)</span></span>
            <div style={box}><input style={inp} placeholder="https://api.example.com/balance/{address}" value={balanceEndpoint} onChange={e => setBalanceEndpoint(e.target.value)} /></div>
          </div>

          <div>
            <span style={lbl}>JSON Path * <span style={{ color: '#555', fontWeight: 400 }}>dot-notation</span></span>
            <div style={box}><input style={inp} placeholder="data.balance" value={balanceJsonPath} onChange={e => setBalanceJsonPath(e.target.value)} /></div>
          </div>

          {/* Send endpoint (optional) */}
          <div>
            <span style={lbl}>Send Endpoint <span style={{ color: '#555', fontWeight: 400 }}>(optional — POST)</span></span>
            <div style={box}><input style={inp} placeholder="https://api.example.com/send" value={sendEndpoint} onChange={e => setSendEndpoint(e.target.value)} /></div>
          </div>

          {sendEndpoint && (
            <div>
              <span style={lbl}>Body Template <span style={{ color: '#555', fontWeight: 400 }}>{'{from} {to} {amount} {privateKey}'}</span></span>
              <div style={{ ...box }}>
                <textarea value={sendBodyTemplate} onChange={e => setSendBodyTemplate(e.target.value)}
                  rows={3}
                  style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }} />
              </div>
            </div>
          )}

          {/* API Key (optional) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span style={lbl}>API Key <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span></span>
              <div style={box}><input style={inp} placeholder="your-api-key" value={apiKey} onChange={e => setApiKey(e.target.value)} /></div>
            </div>
            <div>
              <span style={lbl}>Key Header</span>
              <div style={box}><input style={inp} placeholder="X-API-Key" value={apiKeyHeader} onChange={e => setApiKeyHeader(e.target.value)} /></div>
            </div>
          </div>

          {/* Test */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleTest}
              style={{ background: 'rgba(82,255,172,0.1)', border: '1px solid rgba(82,255,172,0.25)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#52ffac', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>
              {testStatus === 'testing' ? 'Testing...' : 'Test Balance'}
            </button>
            {testStatus === 'ok' && <><Check size={13} style={{ color: '#52ffac' }} /><span style={{ color: '#52ffac', fontSize: 11 }}>{testResult}</span></>}
            {testStatus === 'error' && <AlertCircle size={13} style={{ color: '#ff6b6b' }} />}
          </div>

          {errMsg && (
            <div style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: 8, padding: '8px 12px', color: '#ffa9a9', fontSize: 11 }}>
              {errMsg}
            </div>
          )}

          <button onClick={handleSave}
            style={{ background: '#52ffac', color: '#002111', border: 'none', borderRadius: '0.75rem', padding: '14px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', marginTop: 4 }}>
            Save API
          </button>
        </div>
      </div>
    </div>
  );
}
