'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Link, Wifi, WifiOff, Check, AlertTriangle, Zap } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import {
  getWalletKit,
  wcPair,
  wcApproveSession,
  wcRejectSession,
  handleWcRequest,
  wcRespondSuccess,
  wcRespondError,
  wcDisconnect,
  wcGetActiveSessions,
  clearWalletKit,
} from '@/lib/walletconnect';
import type { WalletKitTypes } from '@reown/walletkit';

interface ActiveSession {
  topic: string;
  name: string;
  icon: string | null;
  url: string;
}

interface PendingRequest {
  event: WalletKitTypes.SessionRequest;
  method: string;
  chainId: string;
  params: unknown;
  dAppName: string;
}

const METHOD_LABELS: Record<string, string> = {
  eth_sendTransaction:  'Send Transaction',
  eth_signTransaction:  'Sign Transaction',
  personal_sign:        'Sign Message',
  eth_sign:             'Sign Message (Legacy)',
  eth_signTypedData:    'Sign Typed Data',
  eth_signTypedData_v4: 'Sign Typed Data v4',
};

export function WalletConnectModal({ onClose }: { onClose: () => void }) {
  const wallet = useWallet();
  const [uri, setUri] = useState('');
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState('');
  const [sessions, setSessions] = useState<ActiveSession[]>([]);

  // Pending proposal (waiting for user approve/reject)
  const [pendingProposal, setPendingProposal] = useState<WalletKitTypes.SessionProposal | null>(null);
  // Pending signing request
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestDone, setRequestDone] = useState(false);

  const kitRef = useRef(false);

  const refreshSessions = useCallback(async () => {
    try {
      const raw = await wcGetActiveSessions();
      const list: ActiveSession[] = Object.entries(raw).map(([topic, s]) => {
        const sess = s as unknown as Record<string, unknown>;
        const peer = sess.peer as Record<string, unknown> | undefined;
        const meta = peer?.metadata as Record<string, unknown> | undefined;
        return {
          topic,
          name: (meta?.name as string) || 'Unknown dApp',
          icon: (meta?.icons as string[])?.[0] ?? null,
          url: (meta?.url as string) || '',
        };
      });
      setSessions(list);
    } catch {}
  }, []);

  useEffect(() => {
    if (kitRef.current) return;
    kitRef.current = true;

    (async () => {
      try {
        const kit = await getWalletKit();

        kit.on('session_proposal', (proposal: WalletKitTypes.SessionProposal) => {
          setPendingProposal(proposal);
        });

        kit.on('session_request', async (event: WalletKitTypes.SessionRequest) => {
          // Get dApp name from active sessions
          const activeSessions = kit.getActiveSessions();
          const sess = activeSessions[event.topic] as unknown as Record<string, unknown> | undefined;
          const peer = sess?.peer as Record<string, unknown> | undefined;
          const meta = peer?.metadata as Record<string, unknown> | undefined;
          const dAppName = (meta?.name as string) || 'Unknown dApp';

          const { method, params: reqParams } = event.params.request;

          setPendingRequest({
            event,
            method,
            chainId: event.params.chainId,
            params: reqParams,
            dAppName,
          });
          setRequestError('');
          setRequestDone(false);
        });

        kit.on('session_delete', () => {
          refreshSessions();
        });

        await refreshSessions();
      } catch (e) {
        console.error('WalletKit init error', e);
      }
    })();
  }, [refreshSessions]);

  const handlePair = async () => {
    if (!uri.trim()) { setPairError('Paste a wc: URI first'); return; }
    if (!uri.trim().startsWith('wc:')) { setPairError('Must start with wc:'); return; }
    setPairLoading(true); setPairError('');
    try {
      await wcPair(uri.trim());
      setUri('');
    } catch (e) {
      setPairError(e instanceof Error ? e.message : 'Pairing failed');
    } finally {
      setPairLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!pendingProposal || !wallet.activeAddress) return;
    try {
      await wcApproveSession(pendingProposal, wallet.activeAddress);
      setPendingProposal(null);
      await refreshSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    if (!pendingProposal) return;
    try { await wcRejectSession(pendingProposal); } catch {}
    setPendingProposal(null);
  };

  const handleApproveRequest = async () => {
    if (!pendingRequest || !wallet.scatteredKeyStore || !wallet.activeAddress) return;
    setRequestLoading(true); setRequestError('');
    try {
      const res = await handleWcRequest(pendingRequest.event, wallet.scatteredKeyStore, wallet.activeAddress);
      if (res.success) {
        await wcRespondSuccess(pendingRequest.event, res.result);
        setRequestDone(true);
        setTimeout(() => { setPendingRequest(null); setRequestDone(false); }, 1800);
      } else {
        setRequestError(res.error);
        await wcRespondError(pendingRequest.event, res.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setRequestError(msg);
      try { await wcRespondError(pendingRequest.event, msg); } catch {}
    } finally {
      setRequestLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!pendingRequest) return;
    try { await wcRespondError(pendingRequest.event, 'User rejected'); } catch {}
    setPendingRequest(null);
  };

  const handleDisconnect = async (topic: string) => {
    try { await wcDisconnect(topic); } catch {}
    await refreshSessions();
  };

  // ── Pending Session Proposal ───────────────────────────────────────────────
  if (pendingProposal) {
    const meta = pendingProposal.params.proposer.metadata;
    const reqChains = [
      ...Object.values(pendingProposal.params.requiredNamespaces ?? {}).flatMap(n => n.chains ?? []),
      ...Object.values(pendingProposal.params.optionalNamespaces ?? {}).flatMap(n => n.chains ?? []),
    ];
    const uniqueChains = [...new Set(reqChains)];

    return (
      <div onClick={e => { if (e.target === e.currentTarget) handleReject(); }}
        className="popup-backdrop"
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 400, maxWidth: '94vw', padding: '28px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Connect Request</span>
            <button onClick={handleReject} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {/* dApp info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '1rem', marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
            {meta.icons?.[0] ? (
              <img src={meta.icons[0]} alt={meta.name} style={{ width: 48, height: 48, borderRadius: '0.75rem', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'rgba(82,255,172,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Link size={20} style={{ color: '#52ffac' }} />
              </div>
            )}
            <div>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>{meta.name}</p>
              <p style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{meta.url}</p>
            </div>
          </div>

          {/* Requested chains */}
          {uniqueChains.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Requested Chains</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {uniqueChains.map(c => (
                  <span key={c} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: '#ccc', fontWeight: 700 }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Your address */}
          <div style={{ padding: '10px 14px', background: 'rgba(82,255,172,0.05)', border: '1px solid rgba(82,255,172,0.15)', borderRadius: '0.75rem', marginBottom: 20 }}>
            <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Your Address</p>
            <p style={{ color: '#52ffac', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>{wallet.activeAddress}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={handleReject} style={{ padding: '14px', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c6c6c6', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
              Reject
            </button>
            <button onClick={handleApprove} style={{ padding: '14px', borderRadius: '1rem', border: 'none', background: '#52ffac', color: '#002111', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
              Approve
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending Signing Request ────────────────────────────────────────────────
  if (pendingRequest) {
    const methodLabel = METHOD_LABELS[pendingRequest.method] ?? pendingRequest.method;
    const isSign = !pendingRequest.method.includes('send');
    const paramsStr = JSON.stringify(pendingRequest.params, null, 2);

    return (
      <div onClick={e => { if (e.target === e.currentTarget) handleRejectRequest(); }}
        className="popup-backdrop"
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 420, maxWidth: '94vw', padding: '28px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
              {isSign ? 'Signature Request' : 'Transaction Request'}
            </span>
            <button onClick={handleRejectRequest} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {requestDone ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '2px solid rgba(82,255,172,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={24} style={{ color: '#52ffac' }} />
              </div>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 15, textTransform: 'uppercase' }}>Confirmed!</p>
            </div>
          ) : (
            <>
              {/* From dApp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                <p style={{ color: '#c6c6c6', fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: '#f59e0b' }}>{pendingRequest.dAppName}</span> is requesting
                </p>
              </div>

              {/* Method */}
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', marginBottom: 14 }}>
                <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Method</p>
                <p style={{ color: '#52ffac', fontSize: 12, fontWeight: 900 }}>{methodLabel}</p>
                <p style={{ color: '#333', fontSize: 9, marginTop: 2 }}>Chain: {pendingRequest.chainId}</p>
              </div>

              {/* Params preview */}
              <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', marginBottom: 16, maxHeight: 160, overflowY: 'auto' }}>
                <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Details</p>
                <pre style={{ color: '#888', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {paramsStr.length > 600 ? paramsStr.slice(0, 600) + '\n...' : paramsStr}
                </pre>
              </div>

              {/* Warning */}
              <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.75rem', marginBottom: 20 }}>
                <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#d97706', fontSize: 10, lineHeight: 1.5 }}>
                  {pendingRequest.method.includes('send')
                    ? 'This will broadcast a transaction. Verify the details carefully.'
                    : 'Only sign messages from sites you trust.'}
                </p>
              </div>

              {requestError && (
                <p style={{ color: '#ffdad6', fontSize: 11, marginBottom: 14 }}>{requestError}</p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={handleRejectRequest} disabled={requestLoading}
                  style={{ padding: '14px', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c6c6c6', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                  Reject
                </button>
                <button onClick={handleApproveRequest} disabled={requestLoading}
                  style={{ padding: '14px', borderRadius: '1rem', border: 'none', background: requestLoading ? '#1a1a1a' : '#52ffac', color: requestLoading ? '#555' : '#002111', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: requestLoading ? 'not-allowed' : 'pointer' }}>
                  {requestLoading ? 'Signing...' : 'Confirm'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main Connect Modal ─────────────────────────────────────────────────────
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="popup-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 420, maxWidth: '94vw', padding: '28px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '0.75rem', background: 'rgba(82,255,172,0.1)', border: '1px solid rgba(82,255,172,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} style={{ color: '#52ffac' }} />
            </div>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>WalletConnect</span>
          </div>
          <button onClick={onClose} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* URI Input */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
            Paste WalletConnect URI
          </p>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="wc:abc123...@2?relay-protocol=irn&symKey=..."
              value={uri}
              onChange={e => setUri(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handlePair(); }}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 11, fontFamily: 'monospace' }}
            />
            <button onClick={handlePair} disabled={pairLoading}
              style={{ background: pairLoading ? '#1a1a1a' : '#52ffac', color: pairLoading ? '#555' : '#002111', border: 'none', borderRadius: '0.6rem', padding: '8px 14px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', cursor: pairLoading ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
              {pairLoading ? '...' : 'Pair'}
            </button>
          </div>
          {pairError && <p style={{ color: '#ffdad6', fontSize: 10, marginTop: 6 }}>{pairError}</p>}
          <p style={{ color: '#333', fontSize: 9, marginTop: 6 }}>
            Go to a dApp → click "Connect Wallet" → choose WalletConnect → copy the URI
          </p>
        </div>

        {/* Active sessions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Active Sessions
            </p>
            <button onClick={refreshSessions} style={{ background: 'none', border: 'none', color: '#333', fontSize: 9, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              Refresh
            </button>
          </div>

          {sessions.length === 0 ? (
            <div style={{ padding: '24px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <WifiOff size={20} style={{ color: '#333' }} />
              <p style={{ color: '#333', fontSize: 11, fontWeight: 700 }}>No active connections</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map(s => (
                <div key={s.topic} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem' }}>
                  {s.icon ? (
                    <img src={s.icon} alt={s.name} style={{ width: 36, height: 36, borderRadius: '0.6rem', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '0.6rem', background: 'rgba(82,255,172,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wifi size={16} style={{ color: '#52ffac' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                    <p style={{ color: '#333', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url}</p>
                  </div>
                  <button onClick={() => handleDisconnect(s.topic)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '6px 10px', fontSize: 9, color: '#c6c6c6', cursor: 'pointer', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
