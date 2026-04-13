'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Shield, Download, RefreshCw, Upload, Lock, X, Check } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { fetchAssetUrls } from '@/lib/supabase';
import { startEntropyCollection } from '@/lib/entropy';
import { GhostCapsule } from '@/components/GhostCapsule';
import { DevToolsGuard } from '@/components/DevToolsGuard';
import { WalletDashboard } from '@/components/WalletDashboard';
import { supabase } from '@/lib/supabase';
import { generateVisualTheme, injectThemeVariables, startCSSIntegrityWatch } from '@/lib/visual-entropy';
import { startNetworkWatch } from '@/lib/network-profile';
import { embedInPNG, extractFromPNG } from '@/lib/steganography';
import { encryptData, getCurrentKey } from '@/lib/crypto';
import { getHardwareUUID } from '@/lib/fingerprint';
import { FAKE_CRASH_HTML } from '@/lib/decoy';

type View = 'main' | 'fake_crash';
type RightPanel = 'idle' | 'persist_confirm' | 'new_vault' | 'access_vault' | 'persisting' | 'success';

export default function CopePage() {
  const wallet = useWallet();
  const [view, setView] = useState<View>('main');
  const [rightPanel, setRightPanel] = useState<RightPanel>('idle');

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sendDisabled, setSendDisabled] = useState(false);
  const [infiniteLoading, setInfiniteLoading] = useState(false);
  const [panicClickCount, setPanicClickCount] = useState(0);

  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [persistError, setPersistError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const dropRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  // ── Load assets ────────────────────────────────────────────────
  useEffect(() => {
    fetchAssetUrls().then(({ logo }) => { setLogoUrl(logo); setIsLoading(false); });
  }, []);

  // ── Visual entropy + CSS integrity (Block 27) ──────────────────
  useEffect(() => {
    generateVisualTheme().then((theme) => injectThemeVariables(theme));
    return startCSSIntegrityWatch(() => wallet.triggerPanic());
  }, [wallet]);

  // ── Network watch (Block 24) ───────────────────────────────────
  useEffect(() => { return startNetworkWatch(); }, []);

  // ── Entropy collection on startup ────────────────────────────
  useEffect(() => {
    const stop = startEntropyCollection();
    return stop;
  }, []);

  // ── Auto-generate wallet on load ──────────────────────────────
  useEffect(() => {
    if (!wallet.isUnlocked) wallet.createCopeWallet();
  }, []);

  // ── Remote kill-switch (Block 29) ─────────────────────────────
  useEffect(() => {
    // Only subscribe if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;

    let ch: ReturnType<typeof supabase.channel> | null = null;
    let failed = false;

    try {
      ch = supabase.channel('vault-status')
        .on('postgres_changes' as any,
          { event: 'UPDATE', schema: 'public', table: 'vault_status', filter: 'id=eq.1' },
          (payload: any) => {
            if (payload?.new?.is_killed) {
              wallet.wipeCopeWallet();
              window.location.replace(process.env.NEXT_PUBLIC_EXTERNAL_LINK ?? 'https://google.com');
            }
          })
        .subscribe((status: string) => {
          // On any error/timeout, remove channel and do NOT retry
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !failed) {
            failed = true;
            if (ch) { supabase.removeChannel(ch); ch = null; }
          }
        });
    } catch {}
    return () => { if (ch) supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Panic keyboard shortcut (Block 6) ─────────────────────────
  useEffect(() => {
    const keys = new Set<string>();
    const dn = (e: KeyboardEvent) => {
      keys.add(e.key);
      if (keys.has('Escape') && keys.has('Shift') && keys.has('P')) triggerPanic();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key);
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  const triggerPanic = useCallback(() => {
    setView('fake_crash');
    setTimeout(() => wallet.triggerPanic(), 200);
  }, [wallet]);

  const handleLogoPanic = () => {
    const n = panicClickCount + 1;
    setPanicClickCount(n);
    if (n >= 3) { setPanicClickCount(0); triggerPanic(); }
    setTimeout(() => setPanicClickCount(0), 1000);
  };

  // ── PERSIST CURRENT SESSION ───────────────────────────────────
  const handlePersistSession = async () => {
    if (!wallet.isUnlocked || !wallet.activeAddress) return;
    if (passphrase.length < 8) { setPersistError('Minimum 8 characters required'); return; }
    if (passphrase !== passphraseConfirm) { setPersistError('Passphrases do not match'); return; }
    setIsProcessing(true); setPersistError('');
    try {
      // Get mnemonic with proper hwId-combined key BEFORE any state changes
      const mnemonic = await wallet.getMnemonicForExport();
      if (!mnemonic) throw new Error('Vault empty');

      // Persist to IndexedDB (Block 18)
      await wallet.enablePersistentMode(passphrase);

      // Embed in steganographic PNG for offline backup (Block 31)
      const hwId = await getHardwareUUID();
      const encPayload = encryptData(mnemonic, getCurrentKey() + hwId + passphrase);
      await embedInPNG(encPayload, 'copewallet');
      setRightPanel('success');
    } catch (e) {
      setPersistError('Operation failed. Try again.');
    }
    finally { setIsProcessing(false); }
  };

  const handleInitNewVault = () => {
    wallet.wipeCopeWallet();
    setPassphrase(''); setPassphraseConfirm(''); setPersistError('');
    setRightPanel('new_vault');
    setTimeout(() => wallet.createCopeWallet(), 100);
  };

  const handleFileDrop = async (file: File) => {
    if (!file.name.endsWith('.png') && file.type !== 'image/png') { setAccessError('Invalid Key'); return; }
    setIsProcessing(true); setAccessError('');
    try {
      await extractFromPNG(file);
      await wallet.unlockPersistentVault(passphrase);
      setRightPanel('success');
    } catch { setAccessError('Invalid Key or wrong passphrase'); }
    finally { setIsProcessing(false); }
  };

  // ── FAKE CRASH ────────────────────────────────────────────────
  if (view === 'fake_crash') return <div dangerouslySetInnerHTML={{ __html: FAKE_CRASH_HTML }} />;

  const extLink = process.env.NEXT_PUBLIC_EXTERNAL_LINK ?? '#';

  return (
    <main style={{ display: 'flex', minHeight: '100vh', background: '#000', color: '#fff', overflow: 'hidden' }}>
      <DevToolsGuard
        onLevel1={() => setSendDisabled(true)}
        onLevel2={() => setInfiniteLoading(true)}
        onLevel3={() => triggerPanic()}
      />

      {/* Infinite loading trap (Block 15) */}
      {infiniteLoading && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 192, height: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'rgba(255,255,255,0.4)', width: '2%', animation: 'grow 10s linear infinite' }} />
          </div>
        </div>
      )}

      {/* Anti-prying blur (Block 4) */}
      {wallet.isBlurred && <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000' }} />}

      {/* Canary dot */}
      <div id="canary-dot" style={{ position: 'fixed', bottom: 6, left: 6, width: 1, height: 1, borderRadius: '50%', background: 'white', opacity: 0.1 }} />
      <div style={{ position: 'fixed', bottom: 6, right: 6, width: 1, height: 1, borderRadius: '50%', background: 'white', opacity: wallet.mode === 'PERSISTENT' ? 0.25 : 0.12 }} />

      {/* ── LEFT — WALLET DASHBOARD ── */}
      <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
        <WalletDashboard />

        {/* Wipe session link */}
        {wallet.isUnlocked && (
          <div style={{ padding: '0 14px 16px', marginTop: -4 }}>
            <button
              onClick={() => { wallet.wipeCopeWallet(); setTimeout(() => wallet.createCopeWallet(), 100); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.08em' }}>
              <Lock size={8} /> Wipe &amp; Reset Session
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT — SECURE VAULT ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
            <div>
              <h2 style={{ color: '#f9fafb', fontSize: 18, fontWeight: 700, margin: 0 }}>Secure Vault</h2>
              <p style={{ color: '#6b7280', fontSize: 11, margin: '3px 0 0' }}>Your private key guardian</p>
            </div>
            {/* Logo */}
            <div ref={logoRef} data-aethilm="brand" onClick={handleLogoPanic} style={{ cursor: 'pointer', flexShrink: 0 }}>
              {isLoading ? (
                <div style={{ width: 32, height: 32 }} />
              ) : logoUrl && !logoError ? (
                <Image src={logoUrl} alt="Cope Wallet" width={32} height={32} style={{ objectFit: 'contain' }} onError={() => setLogoError(true)} />
              ) : (
                <Shield size={28} style={{ color: '#4b5563' }} />
              )}
            </div>
          </div>

          {/* ── IDLE — 3 vault buttons ── */}
          {rightPanel === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <VaultCard
                icon={<Download size={16} />}
                title="Persist Current Session"
                sub="Mummify → Hardware Lock → PNG Key"
                onClick={() => { setPersistError(''); setPassphrase(''); setPassphraseConfirm(''); setRightPanel('persist_confirm'); }}
                disabled={!wallet.isUnlocked}
              />
              <VaultCard
                icon={<RefreshCw size={16} />}
                title="Initialize New Secure Vault"
                sub="Wipe current session & start fresh"
                onClick={handleInitNewVault}
              />
              <VaultCard
                icon={<Upload size={16} />}
                title="Access Existing Vault"
                sub="Drag & drop your Favicon Key PNG"
                onClick={() => { setAccessError(''); setPassphrase(''); setRightPanel('access_vault'); }}
              />

              {/* Vault status */}
              <div style={{ background: '#141414', borderRadius: 12, padding: '12px 16px', marginTop: 4 }}>
                <p style={{ color: '#4b5563', fontSize: 9, letterSpacing: '0.1em', margin: '0 0 8px', fontWeight: 600 }}>VAULT STATUS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <StatusRow label="Mode" value={wallet.mode === 'PERSISTENT' ? '● Persistent' : '○ Volatile'} valueColor={wallet.mode === 'PERSISTENT' ? '#22c55e' : '#6b7280'} />
                  <StatusRow label="Wallet" value={wallet.isUnlocked ? 'Active' : 'Locked'} valueColor={wallet.isUnlocked ? '#22c55e' : '#ef4444'} />
                  <StatusRow label="Key Rotation" value={wallet.isPulseActive ? 'Rotating...' : 'Active'} valueColor={wallet.isPulseActive ? '#f59e0b' : '#22c55e'} />
                  <StatusRow label="Persistence" value={wallet.hasPersisted ? 'Vault found' : 'None'} valueColor={wallet.hasPersisted ? '#60a5fa' : '#6b7280'} />
                </div>
              </div>
            </div>
          )}

          {/* ── PERSIST / NEW VAULT FORM ── */}
          {(rightPanel === 'persist_confirm' || rightPanel === 'new_vault') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Back button */}
              <button onClick={() => setRightPanel('idle')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: 0, width: 'fit-content' }}>
                ← Back
              </button>

              {/* White form card */}
              <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h3 style={{ color: '#111827', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
                    {rightPanel === 'new_vault' ? 'New Secure Vault' : 'Persist Session'}
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                    Set a vault passphrase. A Favicon Key PNG will be downloaded — store it safely.
                  </p>
                </div>

                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '4px 14px' }}>
                  <GhostCapsule
                    type="password"
                    placeholder="Vault passphrase (min 8 chars)"
                    onValue={setPassphrase}
                    className="w-full"
                    theme="light"
                  />
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '4px 14px' }}>
                  <GhostCapsule
                    type="password"
                    placeholder="Confirm passphrase"
                    onValue={setPassphraseConfirm}
                    className="w-full"
                    theme="light"
                  />
                </div>

                {persistError && (
                  <p style={{ color: '#ef4444', fontSize: 10, margin: 0 }}>{persistError}</p>
                )}

                <button
                  onClick={handlePersistSession}
                  disabled={isProcessing}
                  style={{
                    background: isProcessing ? '#e5e7eb' : '#111827',
                    color: isProcessing ? '#9ca3af' : '#fff',
                    border: 'none', borderRadius: 10, padding: '12px',
                    fontSize: 13, fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  {isProcessing ? 'Processing...' : 'Forge Vault & Download Key'}
                </button>
              </div>
            </div>
          )}

          {/* ── ACCESS VAULT FORM ── */}
          {rightPanel === 'access_vault' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => setRightPanel('idle')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: 0, width: 'fit-content' }}>
                ← Back
              </button>

              <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h3 style={{ color: '#111827', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
                    Access Existing Vault
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                    Enter your passphrase and drop your Favicon Key PNG.
                  </p>
                </div>

                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '4px 14px' }}>
                  <GhostCapsule
                    type="password"
                    placeholder="Vault passphrase"
                    onValue={setPassphrase}
                    className="w-full"
                    theme="light"
                  />
                </div>

                {/* Drag & drop zone */}
                <div
                  ref={dropRef}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f); }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = 'image/png';
                    input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFileDrop(f); };
                    input.click();
                  }}
                  style={{
                    border: `1.5px dashed ${dragOver ? '#6b7280' : '#d1d5db'}`,
                    borderRadius: 10, padding: '24px 16px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    cursor: 'pointer', background: dragOver ? '#f9fafb' : 'transparent',
                    transition: 'all 0.15s',
                  }}>
                  <Upload size={20} style={{ color: '#9ca3af' }} />
                  <p style={{ color: '#374151', fontSize: 11, margin: 0, fontWeight: 500 }}>Drop Favicon Key PNG</p>
                  <p style={{ color: '#9ca3af', fontSize: 10, margin: 0 }}>or click to browse</p>
                </div>

                {isProcessing && <p style={{ color: '#6b7280', fontSize: 10, textAlign: 'center' }}>Decoding...</p>}
                {accessError && <p style={{ color: '#ef4444', fontSize: 10 }}>{accessError}</p>}
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {rightPanel === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '28px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', border: '1.5px solid #16a34a44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={24} style={{ color: '#16a34a' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#111827', fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Vault Secured</p>
                  <p style={{ color: '#9ca3af', fontSize: 11, margin: 0, lineHeight: 1.5, maxWidth: 220 }}>
                    Favicon Key PNG downloaded. Store it safely — it is your key.
                  </p>
                </div>
                <p style={{ color: '#d1d5db', fontSize: 9, textAlign: 'center', fontStyle: 'italic' }}>
                  The image data is the key. The filename is your shadow.
                </p>
                <button onClick={() => setRightPanel('idle')}
                  style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ← Return
                </button>
              </div>
            </div>
          )}

          {/* Footer brand */}
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <a href={extLink} target="_blank" rel="noopener noreferrer"
              data-aethilm="brand"
              style={{ color: '#374151', fontSize: 9, letterSpacing: '0.15em', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Made With Cope by{'\u200c'} Aethi{'\u200c'}lm
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes grow { from { width: 1%; } to { width: 100%; } }
      `}</style>
    </main>
  );
}

// ─── Vault Card (right panel action button) ───────────────────────────────────
function VaultCard({ icon, title, sub, onClick, disabled = false }: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        textAlign: 'left', width: '100%',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#1e1e1e'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#141414'; }}
    >
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#9ca3af' }}>
        {icon}
      </div>
      <div>
        <p style={{ color: '#f3f4f6', fontSize: 12, fontWeight: 600, margin: 0 }}>{title}</p>
        <p style={{ color: '#6b7280', fontSize: 10, margin: '2px 0 0' }}>{sub}</p>
      </div>
    </button>
  );
}

// ─── Status Row ───────────────────────────────────────────────────────────────
function StatusRow({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#6b7280', fontSize: 10 }}>{label}</span>
      <span style={{ color: valueColor, fontSize: 10, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
