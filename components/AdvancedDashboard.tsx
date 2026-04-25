'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronLeft } from 'lucide-react';
import { LitecoinPanel } from '@/components/LitecoinPanel';
import { CustomChainModal } from '@/components/CustomChainModal';
import { CustomTokenModal } from '@/components/CustomTokenModal';
import { CustomAPIModal } from '@/components/CustomAPIModal';
import { loadCustomChains, deleteCustomChain, CustomChain } from '@/lib/custom-chains';
import { loadCustomTokens, deleteCustomToken, CustomToken } from '@/lib/custom-tokens';
import { loadCustomAPIs, deleteCustomAPI, CustomAPI } from '@/lib/custom-apis';
import { useWallet } from '@/context/WalletContext';

interface Props {
  onExit: () => void;
}

type Section = 'litecoin' | 'chains' | 'tokens' | 'apis';

export function AdvancedDashboard({ onExit }: Props) {
  const wallet = useWallet();
  const [section, setSection] = useState<Section>('litecoin');
  const [customChains, setCustomChains] = useState<CustomChain[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [customAPIs, setCustomAPIs] = useState<CustomAPI[]>([]);
  const [showChainModal, setShowChainModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showAPIModal, setShowAPIModal] = useState(false);

  useEffect(() => {
    setCustomChains(loadCustomChains());
    setCustomTokens(loadCustomTokens());
    setCustomAPIs(loadCustomAPIs());
  }, []);

  const sectionBtn = (s: Section, label: string, icon: string) => (
    <button onClick={() => setSection(s)}
      style={{
        background: section === s ? 'rgba(82,255,172,0.08)' : 'rgba(255,255,255,0.03)',
        border: section === s ? '1px solid rgba(82,255,172,0.25)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '0.75rem', padding: '8px 14px', cursor: 'pointer',
        color: section === s ? '#52ffac' : '#888', fontSize: 11, fontWeight: 900,
        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
        display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
      }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </button>
  );

  const deleteBtn = (onClick: () => void) => (
    <button onClick={onClick}
      style={{ background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.15)', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', color: '#ff8888', display: 'flex', alignItems: 'center' }}>
      <Trash2 size={13} />
    </button>
  );

  const addBtn = (label: string, onClick: () => void) => (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(82,255,172,0.08)', border: '1px solid rgba(82,255,172,0.2)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: '#52ffac', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const }}>
      <Plus size={13} /> {label}
    </button>
  );

  return (
    <section
      className="flex-1 pt-[64px] px-4 pb-24 md:p-16 md:pt-16 overflow-y-auto"
      style={{ background: 'var(--color-surface)', minHeight: '100vh' }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onExit}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.5rem', padding: '6px 14px', cursor: 'pointer', color: '#ccc', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <ChevronLeft size={14} /> Simple
          </button>
          <div>
            <p style={{ color: '#fff', fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: '-0.01em' }}>Advanced Mode</p>
            <p style={{ color: '#555', fontSize: 10, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Custom chains · Tokens · APIs · Litecoin</p>
          </div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#52ffac', opacity: wallet.isUnlocked ? 1 : 0.2 }} />
      </div>

      {/* Section nav */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {sectionBtn('litecoin', 'Litecoin', 'currency_bitcoin')}
        {sectionBtn('chains', 'EVM Chains', 'link')}
        {sectionBtn('tokens', 'ERC-20 Tokens', 'toll')}
        {sectionBtn('apis', 'Custom APIs', 'api')}
      </div>

      {/* ── Litecoin ── */}
      {section === 'litecoin' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1.25rem', padding: 20 }}>
          <LitecoinPanel />
        </div>
      )}

      {/* ── Custom EVM Chains ── */}
      {section === 'chains' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
      )}

      {/* ── Custom ERC-20 Tokens ── */}
      {section === 'tokens' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
      )}

      {/* ── Custom APIs ── */}
      {section === 'apis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: '#888', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              {customAPIs.length} Custom API{customAPIs.length !== 1 ? 's' : ''}
            </p>
            {addBtn('Add API', () => setShowAPIModal(true))}
          </div>

          {customAPIs.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '28px', textAlign: 'center' }}>
              <p style={{ color: '#555', fontSize: 13, margin: 0 }}>No custom APIs yet.</p>
              <p style={{ color: '#444', fontSize: 11, margin: '4px 0 0' }}>Connect any blockchain via REST API — balance & send endpoints.</p>
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
      )}

      {/* Modals */}
      {showChainModal && (
        <CustomChainModal
          onClose={() => setShowChainModal(false)}
          onSaved={() => setCustomChains(loadCustomChains())}
        />
      )}
      {showTokenModal && (
        <CustomTokenModal
          customChains={customChains}
          activeAddress={wallet.activeAddress}
          onClose={() => setShowTokenModal(false)}
          onSaved={() => setCustomTokens(loadCustomTokens())}
        />
      )}
      {showAPIModal && (
        <CustomAPIModal
          activeAddress={wallet.activeAddress}
          onClose={() => setShowAPIModal(false)}
          onSaved={() => setCustomAPIs(loadCustomAPIs())}
        />
      )}
    </section>
  );
}
