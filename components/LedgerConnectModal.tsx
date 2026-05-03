'use client';

import React, { useState } from 'react';
import { X, Usb, CheckCircle, AlertCircle } from 'lucide-react';
import {
  connectLedger,
  saveLedgerDevice,
  isWebHIDSupported,
  LEDGER_DERIVATION_PATH,
  LedgerEntry,
} from '@/lib/ledger';

interface Props {
  onConnect: (entry: LedgerEntry) => void;
  onClose: () => void;
}

type ConnectStatus = 'idle' | 'connecting' | 'done' | 'error';

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
};
const card: React.CSSProperties = {
  background: '#1a1a2e', borderRadius: 16, padding: 28, width: '100%',
  maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,.6)',
};
const btn = (color = '#4f46e5'): React.CSSProperties => ({
  background: color, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px',
  width: '100%', cursor: 'pointer', fontSize: 15, fontWeight: 600, marginTop: 8,
});
const stepBox: React.CSSProperties = {
  background: 'rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 14px',
  marginBottom: 8, fontSize: 13, color: 'rgba(255,255,255,.7)',
};

export function LedgerConnectModal({ onConnect, onClose }: Props) {
  const [status, setStatus] = useState<ConnectStatus>('idle');
  const [error, setError] = useState('');
  const [connectedEntry, setConnectedEntry] = useState<LedgerEntry | null>(null);
  const [derivationPath, setDerivationPath] = useState(LEDGER_DERIVATION_PATH);

  const supported = isWebHIDSupported();

  const handleConnect = async () => {
    setStatus('connecting');
    setError('');
    try {
      const device = await connectLedger(derivationPath);
      const entry: LedgerEntry = {
        id: crypto.randomUUID(),
        address: device.address,
        derivationPath: device.derivationPath,
        addedAt: Date.now(),
        label: 'Ledger',
      };
      saveLedgerDevice(entry);
      setConnectedEntry(entry);
      setStatus('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed');
      setStatus('error');
    }
  };

  const handleConfirm = () => {
    if (connectedEntry) onConnect(connectedEntry);
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={card}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Usb size={20} color="#818cf8" />
            <span style={{ fontWeight: 700, fontSize: 17, color: '#fff' }}>Connect Ledger</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {!supported && (
          <div style={{ background: 'rgba(239,68,68,.15)', borderRadius: 10, padding: 14, marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>
            WebHID is not supported in this browser. Please use Chrome, Edge, or Brave.
          </div>
        )}

        {status === 'idle' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={stepBox}>1. Connect your Ledger via USB</div>
              <div style={stepBox}>2. Unlock the device (enter PIN)</div>
              <div style={stepBox}>3. Open the Ethereum app on Ledger</div>
              <div style={stepBox}>4. Click Connect below and approve in the browser popup</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>Derivation path</div>
              <input
                value={derivationPath}
                onChange={e => setDerivationPath(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 8, padding: '8px 12px', color: '#fff', width: '100%',
                  fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              style={btn(supported ? '#4f46e5' : '#374151')}
              onClick={handleConnect}
              disabled={!supported}
            >
              Connect Ledger
            </button>
          </>
        )}

        {status === 'connecting' && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,.7)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔌</div>
            <div style={{ fontSize: 14 }}>Waiting for Ledger approval...</div>
            <div style={{ fontSize: 12, marginTop: 8, color: 'rgba(255,255,255,.4)' }}>
              Check your device screen and approve the connection
            </div>
          </div>
        )}

        {status === 'done' && connectedEntry && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <CheckCircle size={40} color="#4ade80" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: 6 }}>Ledger Connected</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontFamily: 'monospace', marginBottom: 20 }}>
              {connectedEntry.address.slice(0, 10)}...{connectedEntry.address.slice(-8)}
            </div>
            <button style={btn('#16a34a')} onClick={handleConfirm}>
              Use This Address
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <AlertCircle size={36} color="#f87171" style={{ marginBottom: 12 }} />
            <div style={{ color: '#fca5a5', fontSize: 14, marginBottom: 16 }}>{error}</div>
            <button style={btn('#4f46e5')} onClick={() => setStatus('idle')}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
