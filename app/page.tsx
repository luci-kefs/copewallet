'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Shield, Download, RefreshCw, Upload, Lock, Zap } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { fetchAssetUrls } from '@/lib/supabase';
import { startEntropyCollection, getEntropyLevel } from '@/lib/entropy';
import { GhostLink } from '@/components/GhostLink';
import { GhostCapsule } from '@/components/GhostCapsule';
import { DevToolsGuard } from '@/components/DevToolsGuard';
import { supabase } from '@/lib/supabase';
import { getStaticBalance } from '@/lib/provider';
import { generateVisualTheme, injectThemeVariables, startCSSIntegrityWatch } from '@/lib/visual-entropy';
import { startNetworkWatch, getNetworkSignal } from '@/lib/network-profile';
import { embedInPNG, extractFromPNG } from '@/lib/steganography';
import { encryptData, getCurrentKey } from '@/lib/crypto';
import { getHardwareUUID } from '@/lib/fingerprint';
import { FAKE_CRASH_HTML } from '@/lib/decoy';

type View = 'splash' | 'split' | 'fake_crash';
type RightPanel = 'idle' | 'persist_confirm' | 'new_vault' | 'access_vault' | 'persisting' | 'success';

// Polymorphic class noise (Block 7)
function cn_poly(...classes: string[]): string {
  return classes.filter(Boolean).join(' ') + ` _${Math.random().toString(36).slice(2, 5)}`;
}

export default function CopePage() {
  const wallet = useWallet();

  // Views
  const [view, setView] = useState<View>('splash');
  const [rightPanel, setRightPanel] = useState<RightPanel>('idle');

  // Assets
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Entropy
  const [entropyLevel, setEntropyLevel] = useState(0);

  // Wallet display
  const [balance, setBalance] = useState('0.0000');
  const [isNetActive, setIsNetActive] = useState(false);
  const [sessionProgress, setSessionProgress] = useState(100);

  // Panic + DevTools
  const [panicClickCount, setPanicClickCount] = useState(0);
  const [sendDisabled, setSendDisabled] = useState(false);
  const [infiniteLoading, setInfiniteLoading] = useState(false);

  // Right panel states
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [persistError, setPersistError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const logoRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Load assets ────────────────────────────────────────────────
  useEffect(() => {
    fetchAssetUrls().then(({ logo }) => {
      setLogoUrl(logo);
      setIsLoading(false);
    });
  }, []);

  // ── Visual entropy + CSS integrity (Block 27) ──────────────────
  useEffect(() => {
    generateVisualTheme().then((theme) => injectThemeVariables(theme));
    return startCSSIntegrityWatch(() => wallet.triggerPanic());
  }, [wallet]);

  // ── Network watch (Block 24) ───────────────────────────────────
  useEffect(() => {
    return startNetworkWatch();
  }, []);

  // ── Entropy meter on splash (Block 11) ────────────────────────
  useEffect(() => {
    if (view !== 'splash') return;
    const stop = startEntropyCollection();
    const t = setInterval(() => setEntropyLevel(getEntropyLevel()), 100);
    return () => { stop(); clearInterval(t); };
  }, [view]);

  // ── Auto-generate wallet when split view loads (Block 2) ───────
  useEffect(() => {
    if (view !== 'split' || wallet.isUnlocked) return;
    wallet.createCopeWallet();
  }, [view, wallet.isUnlocked]);

  // ── Session progress bar (Block 6) ────────────────────────────
  useEffect(() => {
    if (!wallet.sessionStartedAt) return;
    const SESSION_MS = 30 * 60 * 1000;
    const t = setInterval(() => {
      setSessionProgress(Math.max(0, 100 - ((Date.now() - wallet.sessionStartedAt!) / SESSION_MS) * 100));
    }, 1000);
    return () => clearInterval(t);
  }, [wallet.sessionStartedAt]);

  // ── Balance fetch (Block 3) ────────────────────────────────────
  useEffect(() => {
    if (!wallet.isUnlocked || !wallet.activeAddress) return;
    let active = true;
    const fetch = async () => {
      setIsNetActive(true);
      const b = await getStaticBalance(wallet.activeAddress!);
      if (active) { setBalance(parseFloat(b).toFixed(4)); setIsNetActive(false); }
    };
    fetch();
    const t = setInterval(fetch, 30_000);
    return () => { active = false; clearInterval(t); };
  }, [wallet.isUnlocked, wallet.activeAddress]);

  // ── Remote kill-switch (Block 29) ─────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('vault-status')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vault_status', filter: 'id=eq.1' },
        (payload: { new: { is_killed?: boolean } }) => {
          if (payload.new?.is_killed) {
            wallet.wipeCopeWallet();
            window.location.replace(process.env.NEXT_PUBLIC_EXTERNAL_LINK ?? 'https://google.com');
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [wallet]);

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
    if (passphrase.length < 8) { setPersistError('Minimum 8 karakter gerekli'); return; }
    if (passphrase !== passphraseConfirm) { setPersistError('Parolalar eşleşmiyor'); return; }

    setIsProcessing(true);
    setPersistError('');

    try {
      const hwId = await getHardwareUUID();
      await wallet.enablePersistentMode(passphrase);

      // Build steganographic PNG payload = encrypted mnemonic ref
      const combinedKey = getCurrentKey() + hwId;
      const mnemonic = wallet.getMnemonic();
      if (!mnemonic) throw new Error('Vault empty');

      const encPayload = encryptData(mnemonic, combinedKey + passphrase);
      await embedInPNG(encPayload, 'copewallet');

      setRightPanel('success');
    } catch (e) {
      setPersistError('İşlem başarısız. Tekrar dene.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── INITIALIZE NEW SECURE VAULT ───────────────────────────────
  const handleInitNewVault = () => {
    wallet.wipeCopeWallet();
    setPassphrase('');
    setPassphraseConfirm('');
    setPersistError('');
    setRightPanel('new_vault');
    // Re-create wallet automatically after wipe
    setTimeout(() => wallet.createCopeWallet(), 100);
  };

  // ── ACCESS EXISTING VAULT (Steganography decode) ──────────────
  const handleFileDrop = async (file: File) => {
    if (!file.name.endsWith('.png') && file.type !== 'image/png') {
      setAccessError('Invalid Key'); return;
    }
    setIsProcessing(true);
    setAccessError('');
    try {
      const encPayload = await extractFromPNG(file);
      // Decrypt with passphrase
      const hwId = await getHardwareUUID();
      const combinedKey = getCurrentKey() + hwId;
      // Import via passphrase input
      const decrypted = encPayload; // passphrase decryption happens in unlockPersistentVault
      await wallet.unlockPersistentVault(passphrase);
      setRightPanel('success');
    } catch {
      setAccessError('Invalid Key');
    } finally {
      setIsProcessing(false);
    }
  };

  const extLink = process.env.NEXT_PUBLIC_EXTERNAL_LINK ?? '#';
  const pulseDur = isNetActive ? '1s' : '4s';

  // ── FAKE CRASH ────────────────────────────────────────────────
  if (view === 'fake_crash') {
    return <div dangerouslySetInnerHTML={{ __html: FAKE_CRASH_HTML }} />;
  }

  const LogoEl = () => (
    <div
      ref={logoRef}
      data-aethilm="brand"
      className="cursor-pointer flex-shrink-0"
      style={{ animation: `pulse ${pulseDur} ease-in-out infinite`, opacity: 0.5 }}
      onClick={handleLogoPanic}
    >
      {isLoading ? (
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 1, height: 1, background: 'white', borderRadius: '50%' }} />
        </div>
      ) : logoUrl && !logoError ? (
        <Image
          src={logoUrl}
          alt="Cope Wallet"
          width={40}
          height={40}
          className="object-contain"
          onError={() => setLogoError(true)}
        />
      ) : (
        <Shield size={40} className="text-white" style={{ opacity: 0.5 }} />
      )}
    </div>
  );

  const BrandHeader = () => (
    <div className="flex flex-col items-center gap-1">
      <LogoEl />
      <p data-aethilm="brand"
        className="font-light uppercase text-gray-400"
        style={{ fontSize: 9, letterSpacing: '0.25em' }}>
        by{'\u200c'} Aethi{'\u200c'}lm
      </p>
    </div>
  );

  const BrandFooter = ({ style }: { style?: React.CSSProperties }) => (
    <GhostLink href={extLink}
      className="font-extralight text-gray-600 hover:text-gray-400 transition-colors"
      style={{ fontSize: 10, letterSpacing: '0.2em', ...style }}>
      Made With Cope{'\u200c'} by{'\u200c'} Aethi{'\u200c'}lm
    </GhostLink>
  );

  // ════════════════════════════════════════
  // SPLASH VIEW
  // ════════════════════════════════════════
  if (view === 'splash') {
    return (
      <main className="relative flex flex-col items-center justify-between min-h-screen bg-black text-white overflow-hidden py-12">
        <DevToolsGuard
          onLevel1={() => setSendDisabled(true)}
          onLevel2={() => setInfiniteLoading(true)}
          onLevel3={() => triggerPanic()}
        />

        {/* Canary dot */}
        <div id="canary-dot" className="fixed bottom-2 left-2 rounded-full bg-white"
          style={{ width: 1, height: 1, opacity: 0.1 }} />

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <BrandHeader />

          {/* Entropy meter */}
          <div className="bg-white mt-2" style={{
            width: 96, height: 1, opacity: 0.08,
            transform: `scaleX(${entropyLevel / 100})`,
            transformOrigin: 'left', transition: 'transform 0.1s linear'
          }} />

          {/* Access Vault — Ghost Interaction Layer */}
          <div className="relative mt-6">
            <div className="absolute inset-0 z-10 cursor-pointer" role="button"
              aria-label="Access Vault" onClick={() => setView('split')} />
            <button
              className="relative px-10 py-3 rounded-full bg-white text-black font-light tracking-widest hover:bg-gray-100 transition-colors"
              style={{ fontSize: 13 }} tabIndex={-1}>
              Access Vault
            </button>
          </div>
        </div>

        <BrandFooter />
      </main>
    );
  }

  // ════════════════════════════════════════
  // SPLIT VIEW — 50/50
  // ════════════════════════════════════════
  return (
    <main className="relative flex flex-col min-h-screen bg-black text-white overflow-hidden">
      <DevToolsGuard
        onLevel1={() => setSendDisabled(true)}
        onLevel2={() => setInfiniteLoading(true)}
        onLevel3={() => triggerPanic()}
      />

      {/* Infinite loading trap (Block 15) */}
      {infiniteLoading && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <div className="h-px bg-white w-48" style={{ opacity: 0.15 }}>
            <div className="h-full bg-white animate-[grow_10s_linear_infinite]" style={{ width: '1%' }} />
          </div>
        </div>
      )}

      {/* Anti-prying blur (Block 4) */}
      {wallet.isBlurred && <div className="fixed inset-0 z-50 bg-black" />}

      {/* Network activity bar */}
      {isNetActive && <div className="fixed top-0 left-0 right-0 h-px bg-white z-40" style={{ opacity: 0.15 }} />}

      {/* Session life bar (Block 6) */}
      {wallet.isUnlocked && (
        <div className="fixed top-0 left-0 h-px bg-white z-40 transition-all duration-1000"
          style={{ width: `${sessionProgress}%`, opacity: 0.1 }} />
      )}

      {/* Key rotation pulse (Block 9) */}
      {wallet.isPulseActive && (
        <div className="fixed top-0 left-0 right-0 h-px bg-white z-40" style={{ opacity: 0.04 }} />
      )}

      {/* Canary dot */}
      <div id="canary-dot" className="fixed bottom-2 left-2 rounded-full bg-white"
        style={{ width: 1, height: 1, opacity: 0.1 }} />
      <div className="fixed bottom-2 right-2 rounded-full bg-white"
        style={{ width: 1, height: 1, opacity: wallet.mode === 'PERSISTENT' ? 0.25 : 0.12 }} />

      {/* ── TOP HEADER ── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white border-opacity-5">
        <BrandHeader />
        <div className="flex items-center gap-2">
          {wallet.isUnlocked && (
            <span className="font-extralight text-gray-700 tracking-widest" style={{ fontSize: 8 }}>
              {wallet.mode === 'PERSISTENT' ? '● PERSISTENT' : '○ VOLATILE'}
            </span>
          )}
        </div>
      </header>

      {/* ── 50/50 SPLIT ── */}
      <div className="flex flex-1 divide-x divide-white" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>

        {/* ════════ LEFT — VOLATILE SESSION ════════ */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-6">
          {/* Volatile badge */}
          <div className="flex items-center gap-2 mb-2">
            <Zap size={10} className="text-gray-600" />
            <span className="font-extralight text-gray-600 tracking-widest uppercase" style={{ fontSize: 8 }}>
              Volatile Session
            </span>
          </div>

          {!wallet.isUnlocked ? (
            /* Generating... */
            <div className="flex flex-col items-center gap-3">
              <div className="w-px h-px bg-white rounded-full animate-ping" />
              <p className="font-extralight text-gray-700 tracking-widest" style={{ fontSize: 10 }}>
                Generating...
              </p>
            </div>
          ) : (
            /* Wallet ready */
            <div className="flex flex-col items-center gap-5 w-full max-w-sm">
              {/* Address */}
              <div className="w-full">
                <p className="font-extralight text-gray-600 tracking-widest uppercase mb-2" style={{ fontSize: 7 }}>
                  Address
                </p>
                <p className="font-light text-gray-300 tracking-wider font-mono break-all text-center"
                  style={{ fontSize: 10, mixBlendMode: 'overlay' as React.CSSProperties['mixBlendMode'] }}>
                  {wallet.activeAddress}
                </p>
              </div>

              {/* Balance */}
              <div className="text-center">
                <p className="font-thin text-white tracking-widest" style={{ fontSize: 28 }}>
                  {balance}
                </p>
                <p className="font-extralight text-gray-600 tracking-widest" style={{ fontSize: 9 }}>ETH</p>
              </div>

              {/* Volatile warning */}
              <div className="border border-white px-4 py-2 w-full text-center"
                style={{ borderColor: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <p className="font-extralight text-gray-700 tracking-wider" style={{ fontSize: 8 }}>
                  RAM only — wipes on refresh
                </p>
              </div>

              {/* Lock */}
              <button
                onClick={() => { wallet.wipeCopeWallet(); setView('splash'); }}
                className="font-extralight text-gray-700 hover:text-gray-400 transition-colors tracking-widest uppercase"
                style={{ fontSize: 8 }}>
                <Lock size={8} className="inline mr-1" />
                Wipe Session
              </button>
            </div>
          )}
        </div>

        {/* ════════ RIGHT — SECURE ANCHOR ════════ */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-5">

          {rightPanel === 'idle' && (
            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
              <p className="font-extralight text-gray-600 tracking-widest uppercase mb-2" style={{ fontSize: 8 }}>
                Secure Anchor
              </p>

              {/* Button 1: Persist */}
              <GhostButton
                icon={<Download size={11} />}
                label="Persist Current Session"
                sub="Mummify → Hardware Lock → Favicon Key"
                onClick={() => { setPersistError(''); setRightPanel('persist_confirm'); }}
                disabled={!wallet.isUnlocked}
              />

              {/* Button 2: New Vault */}
              <GhostButton
                icon={<RefreshCw size={11} />}
                label="Initialize New Secure Vault"
                sub="Wipe & start fresh"
                onClick={handleInitNewVault}
              />

              {/* Button 3: Access Existing */}
              <GhostButton
                icon={<Upload size={11} />}
                label="Access Existing Vault"
                sub="Drag & drop Favicon Key PNG"
                onClick={() => { setAccessError(''); setPassphrase(''); setRightPanel('access_vault'); }}
              />
            </div>
          )}

          {/* ── PERSIST CONFIRM ── */}
          {(rightPanel === 'persist_confirm' || rightPanel === 'new_vault') && (
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <p className="font-extralight text-gray-500 tracking-widest uppercase" style={{ fontSize: 8 }}>
                {rightPanel === 'new_vault' ? 'New Secure Vault' : 'Persist Session'}
              </p>
              <p className="font-extralight text-gray-700 tracking-wide" style={{ fontSize: 9 }}>
                Set a vault passphrase. The Favicon Key PNG will be downloaded.
              </p>

              <GhostCapsule
                type="password"
                placeholder="Vault passphrase (min 8 chars)"
                onValue={setPassphrase}
                className="w-full"
              />
              <GhostCapsule
                type="password"
                placeholder="Confirm passphrase"
                onValue={setPassphraseConfirm}
                className="w-full"
              />

              {persistError && (
                <p className="font-extralight text-red-800 tracking-wide" style={{ fontSize: 8 }}>
                  {persistError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handlePersistSession}
                  disabled={isProcessing}
                  className="flex-1 border border-white border-opacity-10 py-2 font-extralight text-gray-400 hover:text-white hover:border-opacity-20 transition-all tracking-widest"
                  style={{ fontSize: 10, borderRadius: 2 }}>
                  {isProcessing ? 'Processing...' : 'Forge Vault'}
                </button>
                <button
                  onClick={() => setRightPanel('idle')}
                  className="px-4 font-extralight text-gray-700 hover:text-gray-500 transition-colors"
                  style={{ fontSize: 10 }}>
                  ←
                </button>
              </div>
            </div>
          )}

          {/* ── ACCESS EXISTING VAULT ── */}
          {rightPanel === 'access_vault' && (
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <p className="font-extralight text-gray-500 tracking-widest uppercase" style={{ fontSize: 8 }}>
                Access Existing Vault
              </p>

              <GhostCapsule
                type="password"
                placeholder="Vault passphrase"
                onValue={setPassphrase}
                className="w-full"
              />

              {/* Drag & drop zone */}
              <div
                ref={dropRef}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileDrop(file);
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/png';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileDrop(file);
                  };
                  input.click();
                }}
                className="flex flex-col items-center justify-center cursor-pointer transition-all"
                style={{
                  border: `1px solid rgba(255,255,255,${dragOver ? 0.15 : 0.06})`,
                  borderRadius: 2,
                  padding: '24px 16px',
                  background: dragOver ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}>
                <Upload size={14} className="text-gray-700 mb-2" />
                <p className="font-extralight text-gray-600 tracking-wider text-center" style={{ fontSize: 9 }}>
                  Drop Favicon Key PNG
                </p>
                <p className="font-extralight text-gray-800 tracking-wider" style={{ fontSize: 8 }}>
                  or click to browse
                </p>
              </div>

              {isProcessing && (
                <p className="font-extralight text-gray-600 tracking-widest text-center" style={{ fontSize: 9 }}>
                  Decoding...
                </p>
              )}
              {accessError && (
                <p className="font-extralight text-red-900 tracking-wide text-center" style={{ fontSize: 8 }}>
                  {accessError}
                </p>
              )}

              <button onClick={() => setRightPanel('idle')}
                className="font-extralight text-gray-700 hover:text-gray-500 transition-colors self-start"
                style={{ fontSize: 10 }}>← Back</button>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {rightPanel === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-px h-4 bg-white" style={{ opacity: 0.3 }} />
              <p className="font-light text-white tracking-widest" style={{ fontSize: 11 }}>
                Vault Secured
              </p>
              <p className="font-extralight text-gray-600 tracking-wide text-center max-w-48" style={{ fontSize: 9 }}>
                Favicon Key PNG downloaded. Store it safely — it is your key.
              </p>
              <p className="font-extralight text-gray-800 tracking-wider" style={{ fontSize: 8, letterSpacing: '0.15em' }}>
                The image data is the key. The filename is your shadow.
              </p>
              <button onClick={() => setRightPanel('idle')}
                className="font-extralight text-gray-700 hover:text-gray-500 transition-colors mt-2"
                style={{ fontSize: 9, letterSpacing: '0.2em' }}>
                ← Return
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="flex justify-center py-4 border-t border-white" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <BrandFooter style={{
          letterSpacing: wallet.isPulseActive ? '0.15em' : '0.2em',
          textShadow: wallet.isUnlocked ? '0 0 0.1px rgba(255,255,255,0.05)' : 'none',
        }} />
      </footer>
    </main>
  );
}

// ── Ghost Button Component ─────────────────────────────────────
function GhostButton({
  icon, label, sub, onClick, disabled = false
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all group"
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 2,
        background: 'transparent',
        opacity: disabled ? 0.3 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      <span className="text-gray-600 group-hover:text-gray-400 transition-colors mt-0.5 flex-shrink-0">
        {icon}
      </span>
      <div>
        <p className="font-light text-gray-300 group-hover:text-white transition-colors tracking-wider"
          style={{ fontSize: 11 }}>
          {label}
        </p>
        <p className="font-extralight text-gray-700 group-hover:text-gray-600 transition-colors tracking-wide mt-0.5"
          style={{ fontSize: 8 }}>
          {sub}
        </p>
      </div>
    </button>
  );
}
