'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Shield, Download, RefreshCw, Upload, Lock, Check } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { encryptData, decryptData, getCurrentKey } from '@/lib/crypto';
import { getHardwareUUID } from '@/lib/fingerprint';
import { loadSession } from '@/lib/session-lock';
import { FAKE_CRASH_HTML } from '@/lib/decoy';

type View = 'main' | 'fake_crash';
type RightPanel = 'idle' | 'persist_confirm' | 'new_vault' | 'access_vault' | 'success';

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

  useEffect(() => {
    fetchAssetUrls().then(({ logo }) => { setLogoUrl(logo); setIsLoading(false); });
  }, []);

  useEffect(() => {
    generateVisualTheme().then((theme) => injectThemeVariables(theme));
    // CSS integrity tamper → wipe only, no redirect (redirect reserved for kill-switch)
    return startCSSIntegrityWatch(() => wallet.wipeCopeWallet());
  }, [wallet]);

  useEffect(() => { return startNetworkWatch(); }, []);

  useEffect(() => {
    const stop = startEntropyCollection();
    return stop;
  }, []);

  // Auto-generate wallet on first load — or restore from session lock
  useEffect(() => {
    (async () => {
      const saved = loadSession();
      if (saved) {
        try {
          const hwId = await getHardwareUUID();
          const mnemonic = decryptData(saved, hwId);
          if (mnemonic && mnemonic.trim().split(/\s+/).length >= 12) {
            await wallet.importCopeWallet(mnemonic);
            wallet.markSessionRestored();
            return;
          }
        } catch {}
      }
      wallet.createCopeWallet();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kill-switch (Block 29) — polling only, no persistent WebSocket
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;
    let cancelled = false;
    // Single one-shot REST check — no realtime WebSocket spam
    fetch(`${supabaseUrl}/rest/v1/vault_status?id=eq.1&select=is_killed`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data) && data[0]?.is_killed) {
          wallet.wipeCopeWallet();
          window.location.replace(process.env.NEXT_PUBLIC_EXTERNAL_LINK ?? 'https://google.com');
        }
      })
      .catch(() => {}); // ignore network errors silently
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Panic keyboard shortcut
  useEffect(() => {
    const keys = new Set<string>();
    const dn = (e: KeyboardEvent) => { keys.add(e.key); if (keys.has('Escape') && keys.has('Shift') && keys.has('P')) triggerPanic(); };
    const up = (e: KeyboardEvent) => keys.delete(e.key);
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── PERSIST SESSION ────────────────────────────────────────────
  const handlePersistSession = async () => {
    if (!wallet.isUnlocked) return;
    if (passphrase.length < 8) { setPersistError('Minimum 8 characters required'); return; }
    if (passphrase !== passphraseConfirm) { setPersistError('Passphrases do not match'); return; }
    setIsProcessing(true); setPersistError('');
    try {
      const mnemonic = await wallet.getMnemonicForExport();
      if (!mnemonic) throw new Error('Vault empty');
      await wallet.enablePersistentMode(passphrase);
      const hwId = await getHardwareUUID();
      // Use stable key (hwId + passphrase only — no rotating session key)
      // so the PNG can be decrypted on any session or device with same passphrase+hwId
      const encPayload = encryptData(mnemonic, hwId + passphrase);
      await embedInPNG(encPayload, 'copewallet');
      setRightPanel('success');
    } catch { setPersistError('Operation failed. Try again.'); }
    finally { setIsProcessing(false); }
  };

  const handleInitNewVault = () => {
    wallet.disableSessionLock();
    wallet.wipeCopeWallet();
    setPassphrase(''); setPassphraseConfirm(''); setPersistError('');
    setRightPanel('new_vault');
    setTimeout(() => wallet.createCopeWallet(), 100);
  };

  const handleFileDrop = async (file: File) => {
    if (!file.name.endsWith('.png') && file.type !== 'image/png') { setAccessError('Invalid file type — PNG only'); return; }
    if (!passphrase) { setAccessError('Enter your vault passphrase first'); return; }
    setIsProcessing(true); setAccessError('');
    try {
      const hwId = await getHardwareUUID();

      // Attempt 1: decrypt mnemonic directly from PNG (new key: hwId + passphrase)
      try {
        const encPayload = await extractFromPNG(file);
        const mnemonic = decryptData(encPayload, hwId + passphrase);
        if (mnemonic && mnemonic.trim().split(/\s+/).length >= 12) {
          await wallet.importCopeWallet(mnemonic);
          setRightPanel('success');
          return;
        }
      } catch { /* try next method */ }

      // Attempt 2: IndexedDB shards — same device, PBKDF2 path (old PNGs / re-persist)
      try {
        await wallet.unlockPersistentVault(passphrase);
        setRightPanel('success');
        return;
      } catch { /* try next method */ }

      // Both failed
      setAccessError('Wrong passphrase or invalid Key PNG');
    } catch { setAccessError('Could not read the file'); }
    finally { setIsProcessing(false); }
  };

  if (view === 'fake_crash') return <div dangerouslySetInnerHTML={{ __html: FAKE_CRASH_HTML }} />;

  const extLink = process.env.NEXT_PUBLIC_EXTERNAL_LINK ?? '#';

  return (
    <main style={{ display: 'flex', height: '100vh', background: '#000', color: '#fff', overflow: 'hidden' }}>
      <DevToolsGuard
        onLevel1={() => setSendDisabled(true)}
        onLevel2={() => setInfiniteLoading(true)}
        onLevel3={() => { /* wipe only, no redirect */ wallet.wipeCopeWallet(); }}
      />

      {/* Infinite loading trap */}
      {infiniteLoading && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 192, height: 1, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'rgba(255,255,255,0.35)', width: '2%', animation: 'loadgrow 10s linear infinite' }} />
          </div>
        </div>
      )}

      {/* Anti-prying blur */}
      {wallet.isBlurred && <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000' }} />}

      {/* Canary dot */}
      <div id="canary-dot" style={{ position: 'fixed', bottom: 4, left: 4, width: 1, height: 1, borderRadius: '50%', background: '#fff', opacity: 0.1 }} />
      <div style={{ position: 'fixed', bottom: 4, right: 4, width: 1, height: 1, borderRadius: '50%', background: '#fff', opacity: wallet.mode === 'PERSISTENT' ? 0.25 : 0.1 }} />

      {/* Key rotation pulse */}
      {wallet.isPulseActive && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 1, background: '#fff', opacity: 0.04, zIndex: 40 }} />}

      {/* ── LEFT — WALLET DASHBOARD ── */}
      <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <WalletDashboard />
      </div>

      {/* ── RIGHT — SECURE VAULT ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#000', height: '100vh' }}>
        <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: '100%' }}>

          {/* Brand logo (top-right) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
            <div ref={logoRef} data-aethilm="brand" onClick={handleLogoPanic} style={{ cursor: 'pointer' }}>
              {isLoading ? <div style={{ width: 24, height: 24 }} /> :
               logoUrl && !logoError
                ? <Image src={logoUrl} alt="Cope Wallet" width={24} height={24} style={{ objectFit: 'contain' }} onError={() => setLogoError(true)} />
                : <Shield size={20} style={{ color: '#353535' }} />}
            </div>
          </div>

          {/* Vault heading */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingBottom: 10, borderBottom: '1px solid #1a1a1a' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#52ffac' }}>shield_lock</span>
            <h2 style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
              Secure Vault
            </h2>
            <p style={{ color: '#c6c6c6', fontSize: 9, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Your Private Key Guardian
            </p>
          </div>

          {/* Volatile session warning */}
          {wallet.mode !== 'PERSISTENT' && rightPanel === 'idle' && (
            <div style={{ background: '#93000a', borderRadius: 12, padding: '9px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#ffdad6', flexShrink: 0, marginTop: 1 }}>warning</span>
              <div>
                <p style={{ color: '#ffdad6', fontSize: 10, fontWeight: 700, margin: '0 0 1px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Temporary Session</p>
                <p style={{ color: '#ffdad6', fontSize: 9, margin: 0, opacity: 0.85, lineHeight: 1.4 }}>
                  RAM only — refreshing wipes this wallet. Persist it below.
                </p>
              </div>
            </div>
          )}

          {/* ── IDLE ── */}
          {rightPanel === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { iconName: 'save', title: 'Persist Current Session', sub: 'Hardware Lock → PNG Key download', onClick: () => { setPersistError(''); setPassphrase(''); setPassphraseConfirm(''); setRightPanel('persist_confirm'); }, disabled: !wallet.isUnlocked },
                { iconName: 'add_circle', title: 'Initialize New Vault', sub: 'Wipe current session & start fresh', onClick: handleInitNewVault, disabled: false },
                { iconName: 'lock_open', title: 'Access Existing Vault', sub: 'Drop your Favicon Key PNG', onClick: () => { setAccessError(''); setPassphrase(''); setRightPanel('access_vault'); }, disabled: false },
              ].map((card, i) => (
                <motion.div key={card.title} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: i * 0.06 }}>
                  <VaultCard {...card} />
                </motion.div>
              ))}

              {/* Vault status */}
              <div style={{ background: '#0d0d0d', borderRadius: 12, padding: '10px 14px', marginTop: 2, border: '1px solid #1a1a1a' }}>
                <p style={{ color: '#353535', fontSize: 8, letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase' }}>Vault Status</p>
                {[
                  { label: 'Mode', value: wallet.mode === 'PERSISTENT' ? '● Persistent' : '○ Volatile', color: wallet.mode === 'PERSISTENT' ? '#52ffac' : '#c6c6c6' },
                  { label: 'Session', value: wallet.isUnlocked ? 'Active' : 'Idle', color: wallet.isUnlocked ? '#52ffac' : '#c6c6c6' },
                  { label: 'Key Rotation', value: wallet.isPulseActive ? 'Rotating' : 'Active', color: wallet.isPulseActive ? '#facc15' : '#52ffac' },
                  { label: 'Saved Vault', value: wallet.hasPersisted ? 'Found' : 'None', color: wallet.hasPersisted ? '#60a5fa' : '#353535' },
                ].map((row, idx, arr) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: idx < arr.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                    <span style={{ color: '#c6c6c6', fontSize: 9 }}>{row.label}</span>
                    <span style={{ color: row.color, fontSize: 9, fontWeight: 700 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Wipe session */}
              {wallet.isUnlocked && (
                <button onClick={() => { wallet.disableSessionLock(); wallet.wipeCopeWallet(); setTimeout(() => wallet.createCopeWallet(), 100); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#353535', fontSize: 8, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 0', letterSpacing: '0.08em', textTransform: 'uppercase', alignSelf: 'center' }}>
                  <Lock size={8} /> Wipe &amp; Reset Session
                </button>
              )}
            </div>
          )}

          {/* ── PERSIST / NEW VAULT FORM ── */}
          {(rightPanel === 'persist_confirm' || rightPanel === 'new_vault') && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => setRightPanel('idle')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c6c6c6', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                ← Back
              </button>
              <div style={{ background: '#111', borderRadius: 16, padding: '14px 16px', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                    {rightPanel === 'new_vault' ? 'New Vault' : 'Persist Session'}
                  </h3>
                  <p style={{ color: '#c6c6c6', fontSize: 10, margin: 0, lineHeight: 1.4 }}>
                    Set a passphrase. A Favicon Key PNG will be downloaded.
                  </p>
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '4px 12px' }}>
                  <GhostCapsule type="password" placeholder="Vault passphrase (min 8 chars)" onValue={setPassphrase} className="w-full" theme="light" />
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '4px 12px' }}>
                  <GhostCapsule type="password" placeholder="Confirm passphrase" onValue={setPassphraseConfirm} className="w-full" theme="light" />
                </div>
                {persistError && <p style={{ color: '#ffdad6', fontSize: 10, margin: 0 }}>{persistError}</p>}
                <button onClick={handlePersistSession} disabled={isProcessing}
                  style={{ background: isProcessing ? '#1a1a1a' : '#52ffac', color: isProcessing ? '#c6c6c6' : '#000', border: 'none', borderRadius: 10, padding: '11px', fontSize: 12, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                  {isProcessing ? 'Processing...' : 'Forge Vault & Download Key'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── ACCESS VAULT FORM ── */}
          {rightPanel === 'access_vault' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => setRightPanel('idle')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c6c6c6', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                ← Back
              </button>
              <div style={{ background: '#111', borderRadius: 16, padding: '14px 16px', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Access Vault</h3>
                  <p style={{ color: '#c6c6c6', fontSize: 10, margin: 0, lineHeight: 1.4 }}>Enter your passphrase and drop the Favicon Key PNG.</p>
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '4px 12px' }}>
                  <GhostCapsule type="password" placeholder="Vault passphrase" onValue={setPassphrase} className="w-full" theme="light" />
                </div>
                <div ref={dropRef}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f); }}
                  onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png'; i.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFileDrop(f); }; i.click(); }}
                  style={{ border: `1.5px dashed ${dragOver ? '#52ffac' : '#353535'}`, borderRadius: 10, padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', background: dragOver ? 'rgba(82,255,172,0.04)' : 'transparent', transition: 'all 0.15s' }}>
                  <Upload size={18} style={{ color: '#c6c6c6' }} />
                  <p style={{ color: '#fff', fontSize: 11, margin: 0, fontWeight: 700 }}>Drop Favicon Key PNG</p>
                  <p style={{ color: '#c6c6c6', fontSize: 9, margin: 0 }}>or click to browse</p>
                </div>
                {isProcessing && <p style={{ color: '#c6c6c6', fontSize: 10, textAlign: 'center' }}>Decoding...</p>}
                {accessError && <p style={{ color: '#ffdad6', fontSize: 10, margin: 0 }}>{accessError}</p>}
              </div>
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {rightPanel === 'success' && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
              <div style={{ background: '#111', borderRadius: 16, padding: '24px 16px', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '1.5px solid rgba(82,255,172,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={22} style={{ color: '#52ffac' }} />
                </div>
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', margin: 0, letterSpacing: '-0.01em' }}>Vault Secured</p>
                <p style={{ color: '#c6c6c6', fontSize: 10, textAlign: 'center', margin: 0, lineHeight: 1.5, maxWidth: 200 }}>
                  Favicon Key PNG downloaded. Store it safely — it is your only key.
                </p>
                <button onClick={() => setRightPanel('idle')}
                  style={{ background: '#52ffac', color: '#000', border: 'none', borderRadius: 10, padding: '8px 22px', fontSize: 11, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', marginTop: 4 }}>
                  ← Return
                </button>
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 'auto', paddingTop: 12 }}>
            <a href={extLink} target="_blank" rel="noopener noreferrer" data-aethilm="brand"
              style={{ color: '#353535', fontSize: 8, letterSpacing: '0.15em', textDecoration: 'none', display: 'block', textAlign: 'center', textTransform: 'uppercase' }}>
              Made With Cope by{'\u200c'} Aethi{'\u200c'}lm
            </a>
          </div>
        </div>
      </div>

      <style>{`@keyframes loadgrow { from { width: 1%; } to { width: 100%; } }`}</style>
    </main>
  );
}

// ─── Vault Card ───────────────────────────────────────────────────────────────
function VaultCard({ iconName, title, sub, onClick, disabled = false }: {
  iconName: string; title: string; sub: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 14,
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, textAlign: 'left', transition: 'border-color 0.15s',
      }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #353535', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#52ffac' }}>{iconName}</span>
      </div>
      <div>
        <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, margin: 0 }}>{title}</p>
        <p style={{ color: '#c6c6c6', fontSize: 9, margin: '2px 0 0' }}>{sub}</p>
      </div>
    </button>
  );
}
