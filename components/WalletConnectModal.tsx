'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Link, Wifi, WifiOff, Check, AlertTriangle, Zap } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { CHAINS } from '@/lib/chains';
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
  wcSetListeners,
  wcClearListeners,
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
    // Register listeners on the singleton — works even if kit was already inited
    wcSetListeners({
      onProposal: (proposal) => {
        setPendingProposal(proposal);
      },
      onRequest: async (event) => {
        // Get dApp name
        try {
          const raw = await wcGetActiveSessions();
          const sess = raw[event.topic] as unknown as Record<string, unknown> | undefined;
          const peer = sess?.peer as Record<string, unknown> | undefined;
          const meta = peer?.metadata as Record<string, unknown> | undefined;
          const dAppName = (meta?.name as string) || 'Unknown dApp';
          setPendingRequest({
            event,
            method: event.params.request.method,
            chainId: event.params.chainId,
            params: event.params.request.params,
            dAppName,
          });
        } catch {
          setPendingRequest({
            event,
            method: event.params.request.method,
            chainId: event.params.chainId,
            params: event.params.request.params,
            dAppName: 'dApp',
          });
        }
        setRequestError('');
        setRequestDone(false);
      },
      onDelete: () => { refreshSessions(); },
    });

    // Ensure kit is initialized (noop if already done) and load sessions
    getWalletKit().then(() => refreshSessions()).catch(console.error);

    return () => { wcClearListeners(); };
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
      // "Record was recently deleted" = relay expired the request — dismiss silently
      if (msg.toLowerCase().includes('recently deleted') || msg.toLowerCase().includes('expired')) {
        setPendingRequest(null);
        return;
      }
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
          {uniqueChains.length > 0 && (() => {
            const chainNameMap: Record<number, string> = Object.fromEntries(
              CHAINS.map(c => [c.id, c.name])
            );
            const resolve = (raw: string) => {
              const num = parseInt(raw.replace('eip155:', ''), 10);
              return chainNameMap[num] ?? null;
            };
            const known = uniqueChains.map(c => resolve(c)).filter(Boolean) as string[];
            const unknownCount = uniqueChains.length - known.length;
            const display = [...new Set(known)];
            return (
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Requested Chains</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {display.map(name => (
                    <span key={name} style={{ background: 'rgba(82,255,172,0.08)', border: '1px solid rgba(82,255,172,0.2)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: '#52ffac', fontWeight: 700 }}>
                      {name}
                    </span>
                  ))}
                  {unknownCount > 0 && (
                    <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: '#555', fontWeight: 700 }}>
                      +{unknownCount} more
                    </span>
                  )}
                  {display.length === 0 && (
                    <span style={{ fontSize: 10, color: '#555', fontWeight: 700 }}>Any EVM chain</span>
                  )}
                </div>
              </div>
            );
          })()}

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
  const DAPPS: { name: string; url: string; icon: string; tag: string; color: string }[] = [
    // DeFi
    { name: 'Uniswap',       url: 'https://app.uniswap.org',          icon: 'https://app.uniswap.org/favicon.png',                         tag: 'DEX',      color: '#FF007A' },
    { name: 'Aave',          url: 'https://app.aave.com',             icon: 'https://app.aave.com/favicon.ico',                            tag: 'Lending',  color: '#B6509E' },
    { name: 'Curve',         url: 'https://curve.fi',                 icon: 'https://curve.fi/favicon-96x96.png',                          tag: 'DEX',      color: '#3466CE' },
    { name: '1inch',         url: 'https://app.1inch.io',             icon: 'https://app.1inch.io/assets/favicon/favicon-96x96.png',       tag: 'Aggreg.',  color: '#1B314F' },
    { name: 'Compound',      url: 'https://app.compound.finance',     icon: 'https://app.compound.finance/favicon.ico',                    tag: 'Lending',  color: '#00D395' },
    { name: 'Lido',          url: 'https://stake.lido.fi',            icon: 'https://stake.lido.fi/favicon.ico',                           tag: 'Staking',  color: '#00A3FF' },
    { name: 'Balancer',      url: 'https://app.balancer.fi',          icon: 'https://app.balancer.fi/favicon.ico',                         tag: 'DEX',      color: '#1E1E1E' },
    { name: 'SushiSwap',     url: 'https://www.sushi.com/swap',       icon: 'https://www.sushi.com/favicon.ico',                           tag: 'DEX',      color: '#0E0F23' },
    { name: 'dYdX',          url: 'https://dydx.exchange',            icon: 'https://dydx.exchange/favicon.ico',                           tag: 'Perps',    color: '#6966FF' },
    { name: 'GMX',           url: 'https://app.gmx.io',               icon: 'https://app.gmx.io/favicon.ico',                              tag: 'Perps',    color: '#03D1CF' },
    { name: 'Gains Network', url: 'https://gains.trade',              icon: 'https://gains.trade/favicon.ico',                             tag: 'Perps',    color: '#00B9AE' },
    { name: 'Morpho',        url: 'https://app.morpho.org',           icon: 'https://app.morpho.org/favicon.ico',                          tag: 'Lending',  color: '#2470FF' },
    { name: 'Spark',         url: 'https://app.spark.fi',             icon: 'https://app.spark.fi/favicon.ico',                            tag: 'Lending',  color: '#FF8151' },
    { name: 'Pendle',        url: 'https://app.pendle.finance',       icon: 'https://app.pendle.finance/favicon.ico',                      tag: 'Yield',    color: '#5BCEAE' },
    { name: 'Yearn',         url: 'https://yearn.fi',                 icon: 'https://yearn.fi/favicon.ico',                                tag: 'Yield',    color: '#006AE3' },
    { name: 'Convex',        url: 'https://www.convexfinance.com',    icon: 'https://www.convexfinance.com/favicon.ico',                   tag: 'Yield',    color: '#FF5A5A' },
    { name: 'Velodrome',     url: 'https://velodrome.finance',        icon: 'https://velodrome.finance/favicon.ico',                       tag: 'DEX',      color: '#FF0420' },
    { name: 'Aerodrome',     url: 'https://aerodrome.finance',        icon: 'https://aerodrome.finance/favicon.ico',                       tag: 'DEX',      color: '#0052FF' },
    { name: 'Odos',          url: 'https://app.odos.xyz',             icon: 'https://app.odos.xyz/favicon.ico',                            tag: 'Aggreg.',  color: '#A040FF' },
    { name: 'CoW Swap',      url: 'https://swap.cow.fi',              icon: 'https://swap.cow.fi/favicon.ico',                             tag: 'DEX',      color: '#FF784A' },
    // Bridges
    { name: 'Stargate',      url: 'https://stargate.finance',         icon: 'https://stargate.finance/favicon.ico',                        tag: 'Bridge',   color: '#808080' },
    { name: 'Across',        url: 'https://app.across.to',            icon: 'https://app.across.to/favicon.ico',                           tag: 'Bridge',   color: '#6CF9D8' },
    { name: 'Hop',           url: 'https://app.hop.exchange',         icon: 'https://app.hop.exchange/favicon.ico',                        tag: 'Bridge',   color: '#E96DFF' },
    { name: 'Orbiter',       url: 'https://www.orbiter.finance',      icon: 'https://www.orbiter.finance/favicon.ico',                     tag: 'Bridge',   color: '#000' },
    { name: 'Socket',        url: 'https://www.bungee.exchange',      icon: 'https://www.bungee.exchange/favicon.ico',                     tag: 'Bridge',   color: '#F55000' },
    { name: 'Synapse',       url: 'https://synapseprotocol.com',      icon: 'https://synapseprotocol.com/favicon.ico',                     tag: 'Bridge',   color: '#BF00FF' },
    // NFT
    { name: 'OpenSea',       url: 'https://opensea.io',               icon: 'https://opensea.io/static/images/logos/opensea-logo.svg',     tag: 'NFT',      color: '#2081E2' },
    { name: 'Blur',          url: 'https://blur.io',                  icon: 'https://blur.io/favicon.ico',                                 tag: 'NFT',      color: '#FF8700' },
    { name: 'Rarible',       url: 'https://rarible.com',              icon: 'https://rarible.com/favicon.png',                             tag: 'NFT',      color: '#FEDA03' },
    { name: 'Foundation',    url: 'https://foundation.app',           icon: 'https://foundation.app/favicon.ico',                          tag: 'NFT',      color: '#000' },
    { name: 'Zora',          url: 'https://zora.co',                  icon: 'https://zora.co/favicon.ico',                                 tag: 'NFT',      color: '#A040FF' },
    { name: 'Manifold',      url: 'https://app.manifold.xyz',         icon: 'https://app.manifold.xyz/favicon.ico',                        tag: 'NFT',      color: '#0038FF' },
    // Tools
    { name: 'Snapshot',      url: 'https://snapshot.org',             icon: 'https://snapshot.org/favicon.ico',                            tag: 'Govern.',  color: '#F3B04E' },
    { name: 'Safe',          url: 'https://app.safe.global',          icon: 'https://app.safe.global/favicon.ico',                         tag: 'Multisig', color: '#12FF80' },
    { name: 'Etherscan',     url: 'https://etherscan.io',             icon: 'https://etherscan.io/images/favicon3.ico',                    tag: 'Explorer', color: '#21325B' },
    { name: 'Arbiscan',      url: 'https://arbiscan.io',              icon: 'https://arbiscan.io/images/favicon3.ico',                     tag: 'Explorer', color: '#28A0F0' },
    { name: 'Basescan',      url: 'https://basescan.org',             icon: 'https://basescan.org/images/favicon3.ico',                    tag: 'Explorer', color: '#0052FF' },
    { name: 'Optimism Scan', url: 'https://optimistic.etherscan.io',  icon: 'https://optimistic.etherscan.io/images/favicon3.ico',         tag: 'Explorer', color: '#FF0420' },
    { name: 'DeBank',        url: 'https://debank.com',               icon: 'https://debank.com/favicon.ico',                              tag: 'Portfolio',color: '#FF7D00' },
    { name: 'Zapper',        url: 'https://zapper.xyz',               icon: 'https://zapper.xyz/favicon.ico',                              tag: 'Portfolio',color: '#784FFE' },
  ];

  const TAG_COLORS: Record<string, string> = {
    DEX: '#52ffac', Lending: '#60a5fa', Staking: '#38bdf8', 'Aggreg.': '#a78bfa',
    Perps: '#f87171', Yield: '#fbbf24', Bridge: '#fb923c', NFT: '#e879f9',
    'Govern.': '#f3b04e', Multisig: '#12FF80', Explorer: '#94a3b8', Portfolio: '#ff9f43',
  };

  const [dappFilter, setDappFilter] = useState('');
  const filteredDapps = dappFilter
    ? DAPPS.filter(d => d.name.toLowerCase().includes(dappFilter.toLowerCase()) || d.tag.toLowerCase().includes(dappFilter.toLowerCase()))
    : DAPPS;

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="popup-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 520, maxWidth: '96vw', padding: '28px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <div>
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
            Go to a dApp → click &quot;Connect Wallet&quot; → choose WalletConnect → copy the URI
          </p>
        </div>

        {/* dApp Browser */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>dApp Browser</p>
            <input
              type="text"
              placeholder="Search..."
              value={dappFilter}
              onChange={e => setDappFilter(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 10px', color: '#ccc', fontSize: 10, outline: 'none', width: 100 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {filteredDapps.map(d => (
              <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem', textDecoration: 'none', transition: 'all 0.15s', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '0.6rem', background: d.color + '22', border: `1px solid ${d.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={d.icon} alt={d.name} width={24} height={24} style={{ borderRadius: 4, objectFit: 'contain' }}
                    onError={e => {
                      const t = e.currentTarget as HTMLImageElement;
                      t.style.display = 'none';
                      const span = document.createElement('span');
                      span.textContent = d.name.slice(0, 1);
                      span.style.cssText = `color:${d.color || '#fff'};font-weight:900;font-size:14px;`;
                      t.parentElement?.appendChild(span);
                    }}
                  />
                </div>
                <span style={{ color: '#e5e7eb', fontSize: 9, fontWeight: 900, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>{d.name}</span>
                <span style={{ fontSize: 7, fontWeight: 900, padding: '2px 6px', borderRadius: 4, background: (TAG_COLORS[d.tag] ?? '#888') + '18', color: TAG_COLORS[d.tag] ?? '#888', letterSpacing: '0.05em' }}>{d.tag}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Active sessions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
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
