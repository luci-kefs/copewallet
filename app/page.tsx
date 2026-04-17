'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Download, RefreshCw, Upload, Lock, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { fetchAssetUrls } from '@/lib/supabase';
import { startEntropyCollection } from '@/lib/entropy';
import { DevToolsGuard } from '@/components/DevToolsGuard';
import { WalletDashboard } from '@/components/WalletDashboard';
import { supabase } from '@/lib/supabase';
import { generateVisualTheme, injectThemeVariables, startCSSIntegrityWatch } from '@/lib/visual-entropy';
import { startNetworkWatch } from '@/lib/network-profile';
import { embedInPNG, extractFromPNG } from '@/lib/steganography';
import { encryptData, decryptData } from '@/lib/crypto';
import { loadSession, getTabKey } from '@/lib/session-lock';
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
  const [vaultDrawerOpen, setVaultDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);

  const openVault = () => setVaultDrawerOpen(true);
  const closeVault = () => {
    setDrawerClosing(true);
    setTimeout(() => { setVaultDrawerOpen(false); setDrawerClosing(false); }, 260);
  };

  const dropRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAssetUrls()
      .then(({ logo }) => { setLogoUrl(logo); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    generateVisualTheme().then((theme) => injectThemeVariables(theme));
    return startCSSIntegrityWatch(() => wallet.wipeCopeWallet());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const tabKey = getTabKey();
          const mnemonic = decryptData(saved, tabKey);
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
      .catch(() => {});
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
    if (passphrase.length < 8) { setPersistError('Minimum 8 characters required'); return; }
    if (passphrase !== passphraseConfirm) { setPersistError('Passphrases do not match'); return; }
    setIsProcessing(true); setPersistError('');
    try {
      const mnemonic = await wallet.getMnemonicForExport();
      if (!mnemonic) throw new Error('Vault empty');
      await wallet.enablePersistentMode(passphrase, mnemonic);
      const encPayload = encryptData(mnemonic, passphrase);
      await embedInPNG(encPayload, 'copewallet');
      setRightPanel('success');
    } catch (e) { setPersistError(e instanceof Error ? e.message : 'Operation failed. Try again.'); }
    finally { setIsProcessing(false); }
  };

  const handleInitNewVault = () => {
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
      const encPayload = await extractFromPNG(file);
      const mnemonic = decryptData(encPayload, passphrase);
      if (mnemonic && mnemonic.trim().split(/\s+/).length >= 12) {
        await wallet.importCopeWallet(mnemonic);
        setRightPanel('success');
        return;
      }
      setAccessError('Wrong passphrase or invalid Key PNG');
    } catch { setAccessError('Wrong passphrase or invalid Key PNG'); }
    finally { setIsProcessing(false); }
  };

  if (view === 'fake_crash') return <div dangerouslySetInnerHTML={{ __html: FAKE_CRASH_HTML }} />;

  const extLink = process.env.NEXT_PUBLIC_EXTERNAL_LINK ?? '#';

  if (isLoading) return (
    <main className="flex flex-col md:flex-row h-screen w-full bg-background text-on-background animate-pulse">
      {/* Left skeleton */}
      <section className="flex-1 p-8 md:p-16 bg-surface flex flex-col overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-12">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="h-12 w-56 bg-white/5 rounded-xl" />
              <div className="h-3 w-36 bg-white/5 rounded-full" />
            </div>
            <div className="h-9 w-32 bg-white/5 rounded-full" />
          </div>
          <div className="flex items-center justify-between py-4 border-y border-white/5">
            <div className="h-3 w-48 bg-white/5 rounded-full" />
            <div className="h-6 w-12 bg-white/5 rounded-full" />
          </div>
          <div className="space-y-6">
            <div className="h-3 w-32 bg-white/5 rounded-full" />
            <div className="h-28 w-72 bg-white/5 rounded-2xl" />
            <div className="h-24 bg-white/5 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[0,1,2,3].map(i => <div key={i} className="h-36 bg-white/5 rounded-xl" />)}
          </div>
          <div className="space-y-4">
            <div className="flex gap-12 border-b border-white/5 pb-4">
              {[0,1,2].map(i => <div key={i} className="h-3 w-16 bg-white/5 rounded-full" />)}
            </div>
            {[0,1,2].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
          </div>
        </div>
      </section>
      {/* Right skeleton */}
      <section className="flex-1 bg-surface-container-lowest p-8 md:p-16 flex flex-col gap-8 border-t md:border-t-0 md:border-l border-white/10">
        <div className="space-y-4">
          <div className="h-12 w-64 bg-white/5 rounded-xl" />
          <div className="h-3 w-44 bg-white/5 rounded-full" />
          <div className="h-28 bg-white/5 rounded-xl mt-4" />
        </div>
        <div className="space-y-4">
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
        </div>
        <div className="h-48 bg-white/5 rounded-xl" />
        <div className="h-56 bg-white/5 rounded-2xl" />
      </section>
    </main>
  );

  // Vault panel content — shared between desktop sidebar and mobile drawer
  const VaultContent = (
    <section className="flex-1 bg-surface-container-lowest p-8 md:p-16 flex flex-col relative overflow-hidden border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto">
      {/* Background Decorative Texture */}
      <div className="absolute inset-0 monolith-gradient pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full justify-between gap-12 max-w-3xl mx-auto w-full">

        {/* ── IDLE ── */}
        {rightPanel === 'idle' && (
          <>
            {/* Vault Header */}
            <div className="space-y-6">
              <div className="flex items-center gap-5 text-tertiary">
                <span className="material-symbols-outlined text-5xl">shield_lock</span>
                <h2 className="text-5xl font-black tracking-tighter uppercase">Secure Vault</h2>
              </div>
              <p className="text-on-surface-variant font-black tracking-[0.2em] uppercase text-xs">Your private key guardian</p>

              {/* Permanent Zone Alert */}
              <div className="bg-error-container p-8 rounded-xl flex items-start gap-6 border border-white/5 mt-4">
                <span className="material-symbols-outlined text-on-error-container text-3xl">warning</span>
                <div>
                  <p className="font-black text-on-error-container uppercase tracking-[0.2em] text-[0.65rem] mb-2">Permanent Zone Alert</p>
                  <p className="text-sm text-on-error-container/90 leading-relaxed font-medium">
                    All session data is encrypted with a rolling ephemeral key. Once the session ends, unvaulted assets become inaccessible without hardware verification.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Zone */}
            <div className="space-y-5">
              <button
                onClick={() => { setPersistError(''); setPassphrase(''); setPassphraseConfirm(''); setRightPanel('persist_confirm'); }}
                disabled={!wallet.isUnlocked}
                className="w-full group bg-tertiary hover:bg-tertiary-container text-on-tertiary p-10 rounded-xl flex justify-between items-center transition-all shadow-[0_20px_50px_rgba(82,255,172,0.1)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                <div className="flex items-center gap-8">
                  <span className="material-symbols-outlined text-5xl">verified_user</span>
                  <span className="text-3xl font-black tracking-tighter uppercase text-left">Persist Current Session</span>
                </div>
                <span className="material-symbols-outlined text-4xl group-hover:translate-x-3 transition-transform">arrow_forward</span>
              </button>

              <button
                onClick={handleInitNewVault}
                className="w-full group bg-surface-container-high hover:bg-white hover:text-black text-white p-10 rounded-xl flex justify-between items-center transition-all border border-white/10 active:scale-[0.98]">
                <div className="flex items-center gap-8">
                  <span className="material-symbols-outlined text-5xl">add_moderator</span>
                  <span className="text-3xl font-black tracking-tighter uppercase text-left">Initialize New Vault</span>
                </div>
                <span className="material-symbols-outlined text-4xl group-hover:translate-x-3 transition-transform">arrow_forward</span>
              </button>

              <button
                onClick={() => { setAccessError(''); setPassphrase(''); setRightPanel('access_vault'); }}
                className="w-full group bg-surface-container-high hover:bg-white hover:text-black text-white p-10 rounded-xl flex justify-between items-center transition-all border border-white/10 active:scale-[0.98]">
                <div className="flex items-center gap-8">
                  <span className="material-symbols-outlined text-5xl">key</span>
                  <span className="text-3xl font-black tracking-tighter uppercase text-left">Access Existing Vault</span>
                </div>
                <span className="material-symbols-outlined text-4xl group-hover:translate-x-3 transition-transform">arrow_forward</span>
              </button>
            </div>

            {/* Status Table */}
            <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5 backdrop-blur-xl">
              <div className="px-8 py-5 border-b border-white/10 bg-white/[0.02]">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-on-surface-variant">System Diagnostics</p>
              </div>
              <div className="divide-y divide-white/5">
                <div className="flex justify-between items-center px-8 py-5">
                  <span className="text-xs font-bold uppercase text-on-surface-variant tracking-widest">Vault Mode</span>
                  <span className={`px-4 py-1.5 text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-white/10 ${wallet.mode === 'PERSISTENT' ? 'bg-tertiary/10 text-tertiary border-tertiary/20' : 'bg-surface-variant text-white'}`}>
                    {wallet.mode === 'PERSISTENT' ? 'Persistent' : 'Volatile'}
                  </span>
                </div>
                <div className="flex justify-between items-center px-8 py-5">
                  <span className="text-xs font-bold uppercase text-on-surface-variant tracking-widest">Session Status</span>
                  <span className={`text-xs font-black uppercase tracking-[0.2em] ${wallet.isUnlocked ? 'text-tertiary' : 'text-white'}`}>
                    {wallet.isUnlocked ? 'Active' : 'Idle'}
                  </span>
                </div>
                <div className="flex justify-between items-center px-8 py-5">
                  <span className="text-xs font-bold uppercase text-on-surface-variant tracking-widest">Key Rotation</span>
                  <span className={`text-xs font-black uppercase tracking-[0.2em] ${wallet.isPulseActive ? 'text-yellow-400' : 'text-tertiary'}`}>
                    {wallet.isPulseActive ? 'Rotating' : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between items-center px-8 py-5">
                  <span className="text-xs font-bold uppercase text-on-surface-variant tracking-widest">Saved Vault</span>
                  <span className={`text-xs font-black uppercase tracking-[0.2em] ${wallet.hasPersisted ? 'text-blue-400' : 'text-on-surface-variant'}`}>
                    {wallet.hasPersisted ? 'Found' : 'None Detected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Anchor */}
            <div className="w-full h-56 rounded-2xl overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-1000 border border-white/10">
              {/* Brand logo clickable area (panic trigger) */}
              <div ref={logoRef} data-aethilm="brand" onClick={handleLogoPanic} className="absolute inset-0 cursor-pointer z-10">
                {logoUrl && !logoError && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Cope Wallet" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} onError={() => setLogoError(true)} />
                )}
              </div>
              <img
                alt="Encryption visualization"
                className="w-full h-full object-cover opacity-40"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV3rq0CBGGIjwUWM3L1b8JPDzLlg1fqKTm7Z1IXPglOv1hxAsNZnbqDgpnF5oetmxLAT8XIDpVAmeYQh6D9OQXCq5g3jmI8XFn6VLyLdFpVTBCEH4v4UV7H8iyy1DgGYwIFYeG8qhxAqCpcBI2JbSoCHwr4iK-hN2Fu-e0VX6N4b9yOdDoRaqiVmiUxdVKX2_DS2uUflmw_9zHKvYgqQe5slou1PZ7Fjy6bYpPbt8LzxfveI2OBKz-Sh5R6tGh-dLVNyZh_63flbA"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            </div>

            {/* Footer */}
            <a href={extLink} target="_blank" rel="noopener noreferrer" data-aethilm="brand"
              className="text-surface-variant text-[0.6rem] tracking-[0.15em] no-underline text-center uppercase self-center">
              Made With Cope by{'\u200c'} Aethi{'\u200c'}lm
            </a>
          </>
        )}

        {/* ── PERSIST / NEW VAULT FORM ── */}
        {(rightPanel === 'persist_confirm' || rightPanel === 'new_vault') && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
            className="space-y-8">
            <div className="flex items-center gap-5 text-tertiary">
              <span className="material-symbols-outlined text-5xl">shield_lock</span>
              <h2 className="text-5xl font-black tracking-tighter uppercase">Secure Vault</h2>
            </div>

            <button onClick={() => setRightPanel('idle')}
              className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors font-black uppercase tracking-widest text-xs">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back
            </button>

            <div className="space-y-5">
              <div>
                <h3 className="text-3xl font-black tracking-tighter uppercase text-white mb-2">
                  {rightPanel === 'new_vault' ? 'New Vault' : 'Persist Session'}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Set a passphrase. A Favicon Key PNG will be downloaded to your device.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 space-y-4">
                <div className="bg-neutral-100 rounded-lg px-4 py-3">
                  <input
                    type="password"
                    placeholder="Vault passphrase (min 8 chars)"
                    autoComplete="off"
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-neutral-900 text-sm placeholder-neutral-400"
                  />
                </div>
                <div className="bg-neutral-100 rounded-lg px-4 py-3">
                  <input
                    type="password"
                    placeholder="Confirm passphrase"
                    autoComplete="off"
                    value={passphraseConfirm}
                    onChange={e => setPassphraseConfirm(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-neutral-900 text-sm placeholder-neutral-400"
                  />
                </div>
                {persistError && <p className="text-red-500 text-xs font-bold">{persistError}</p>}
              </div>
              <button
                onClick={handlePersistSession}
                disabled={isProcessing}
                className={`w-full p-8 rounded-xl font-black uppercase tracking-[0.1em] text-sm transition-all active:scale-[0.98] flex items-center justify-between ${isProcessing ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-50' : 'bg-tertiary text-on-tertiary hover:bg-tertiary-container shadow-[0_20px_50px_rgba(82,255,172,0.1)]'}`}>
                <span>{isProcessing ? 'Processing...' : 'Forge Vault & Download Key'}</span>
                {!isProcessing && <span className="material-symbols-outlined text-2xl">download</span>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ACCESS VAULT FORM ── */}
        {rightPanel === 'access_vault' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
            className="space-y-8">
            <div className="flex items-center gap-5 text-tertiary">
              <span className="material-symbols-outlined text-5xl">shield_lock</span>
              <h2 className="text-5xl font-black tracking-tighter uppercase">Secure Vault</h2>
            </div>

            <button onClick={() => setRightPanel('idle')}
              className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors font-black uppercase tracking-widest text-xs">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back
            </button>

            <div className="space-y-5">
              <div>
                <h3 className="text-3xl font-black tracking-tighter uppercase text-white mb-2">Access Vault</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Enter your passphrase and drop the Favicon Key PNG.</p>
              </div>
              <div className="bg-white rounded-xl p-6 space-y-4">
                <div className="bg-neutral-100 rounded-lg px-4 py-3">
                  <input
                    type="password"
                    placeholder="Vault passphrase"
                    autoComplete="off"
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-neutral-900 text-sm placeholder-neutral-400"
                  />
                </div>
                <div
                  ref={dropRef}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f); }}
                  onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png'; i.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFileDrop(f); }; i.click(); }}
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${dragOver ? 'border-tertiary bg-tertiary/5' : 'border-neutral-300'}`}>
                  <Upload size={24} className="text-neutral-400" />
                  <p className="font-black text-neutral-800 text-sm uppercase tracking-widest">Drop Favicon Key PNG</p>
                  <p className="text-neutral-400 text-xs">or click to browse</p>
                </div>
                {isProcessing && <p className="text-neutral-500 text-xs text-center font-bold uppercase tracking-widest">Decoding...</p>}
                {accessError && <p className="text-red-500 text-xs font-bold">{accessError}</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {rightPanel === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center h-full gap-10">
            <div className="w-24 h-24 rounded-full bg-tertiary/10 border-2 border-tertiary/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-tertiary">verified</span>
            </div>
            <div className="text-center space-y-3">
              <p className="text-4xl font-black tracking-tighter uppercase text-white">Vault Secured</p>
              <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto">
                Favicon Key PNG downloaded. Store it safely — it is your only key.
              </p>
            </div>
            <button onClick={() => setRightPanel('idle')}
              className="bg-tertiary text-on-tertiary font-black uppercase tracking-[0.1em] text-sm px-10 py-5 rounded-xl active:scale-[0.98] transition-transform">
              ← Return
            </button>
          </motion.div>
        )}

      </div>
    </section>
  );

  return (
    <main className="flex flex-col md:flex-row h-screen w-full bg-background text-on-background">
      <DevToolsGuard
        onLevel1={() => setSendDisabled(true)}
        onLevel2={() => setInfiniteLoading(true)}
        onLevel3={() => { wallet.wipeCopeWallet(); }}
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

      {/* ── MOBILE NAVBAR (hidden on md+) ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5"
        style={{ height: 56, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-white font-black uppercase tracking-tighter text-base">Cope Wallet</span>
        <button
          onClick={() => vaultDrawerOpen ? closeVault() : openVault()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', background: vaultDrawerOpen ? 'rgba(82,255,172,0.1)' : 'rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#52ffac' }}>shield_lock</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: '#52ffac', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Secure Vault</span>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(82,255,172,0.7)" strokeWidth={2.5} strokeLinecap="round"
            style={{ transform: vaultDrawerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      {/* ── MOBILE VAULT DRAWER (hidden on md+) ── */}
      {(vaultDrawerOpen || drawerClosing) && (
        <div className="md:hidden fixed inset-0 z-20" style={{ top: 56 }}>
          <div
            onClick={closeVault}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            className={drawerClosing ? 'fade-in' : 'popup-backdrop'}
          />
          <div
            className={drawerClosing ? 'drawer-exit' : 'drawer-enter'}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, overflowY: 'auto', background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {VaultContent}
          </div>
        </div>
      )}

      {/* ── LEFT — WALLET DASHBOARD ── */}
      <div className="flex-1 md:flex-1 flex flex-col min-h-0">
        <WalletDashboard />
      </div>

      {/* ── RIGHT — SECURE VAULT (desktop only) ── */}
      <div className="hidden md:flex flex-1">
        {VaultContent}
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
