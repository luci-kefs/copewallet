'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Shield } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { fetchAssetUrls } from '@/lib/supabase';
import { startEntropyCollection, getEntropyLevel } from '@/lib/entropy';
import { GhostLink } from '@/components/GhostLink';
import { supabase } from '@/lib/supabase';
import { getStaticBalance } from '@/lib/provider';
import { generateVisualTheme, injectThemeVariables, startCSSIntegrityWatch } from '@/lib/visual-entropy';
import { startNetworkWatch, getNetworkSignal } from '@/lib/network-profile';
import { getDecoyState, recordBadAttempt, getFakeAddress, FAKE_CRASH_HTML } from '@/lib/decoy';

// Polymorphic class obfuscator (Block 7 Task 1)
function cn_poly(...classes: string[]): string {
  const noise = Math.random().toString(36).slice(2, 6);
  return classes.filter(Boolean).join(' ') + ` _${noise}`;
}

type View = 'splash' | 'vault';

export default function CopePage() {
  const wallet = useWallet();
  const [view, setView] = useState<View>('splash');
  const [assets, setAssets] = useState<{ logo: string | null; banner: string | null }>({ logo: null, banner: null });
  const [isLoading, setIsLoading] = useState(true);
  const [entropyLevel, setEntropyLevel] = useState(0);
  const [balance, setBalance] = useState('0.0000');
  const [isNetActive, setIsNetActive] = useState(false);
  const [sessionProgress, setSessionProgress] = useState(100);
  const [panicClickCount, setPanicClickCount] = useState(0);
  const [glitchMode, setGlitchMode] = useState(false);
  const [networkSignal, setNetworkSignal] = useState<'ok' | 'suspect'>('ok');
  const [fakeCrash, setFakeCrash] = useState(false);
  const [visualThemeReady, setVisualThemeReady] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);

  // Load assets from Supabase
  useEffect(() => {
    fetchAssetUrls().then(({ logo, banner }) => {
      setAssets({ logo, banner });
      setIsLoading(false);
    });
  }, []);

  // Visual entropy + CSS integrity (Block 27)
  useEffect(() => {
    generateVisualTheme().then((theme) => {
      injectThemeVariables(theme);
      setVisualThemeReady(true);
    });
    const stopCSS = startCSSIntegrityWatch(() => wallet.triggerPanic());
    return stopCSS;
  }, [wallet]);

  // Network environment watch (Block 24)
  useEffect(() => {
    const stop = startNetworkWatch();
    const tick = setInterval(() => setNetworkSignal(getNetworkSignal()), 10_000);
    return () => { stop(); clearInterval(tick); };
  }, []);

  // Start entropy collection on splash (Block 11)
  useEffect(() => {
    if (view !== 'splash') return;
    const stop = startEntropyCollection();
    const tick = setInterval(() => setEntropyLevel(getEntropyLevel()), 100);
    return () => { stop(); clearInterval(tick); };
  }, [view]);

  // Session progress bar (Block 6 Task 2)
  useEffect(() => {
    if (!wallet.sessionStartedAt) return;
    const SESSION_MS = 30 * 60 * 1000;
    const tick = setInterval(() => {
      const elapsed = Date.now() - wallet.sessionStartedAt!;
      setSessionProgress(Math.max(0, 100 - (elapsed / SESSION_MS) * 100));
    }, 1000);
    return () => clearInterval(tick);
  }, [wallet.sessionStartedAt]);

  // Fetch balance when unlocked (Block 3)
  useEffect(() => {
    if (!wallet.isUnlocked || !wallet.activeAddress) return;
    let active = true;
    const fetchBal = async () => {
      setIsNetActive(true);
      const b = await getStaticBalance(wallet.activeAddress!);
      if (active) {
        setBalance(parseFloat(b).toFixed(4));
        setIsNetActive(false);
      }
    };
    fetchBal();
    const id = setInterval(fetchBal, 30_000);
    return () => { active = false; clearInterval(id); };
  }, [wallet.isUnlocked, wallet.activeAddress]);

  // Remote kill-switch subscription (Block 29)
  useEffect(() => {
    const channel = supabase
      .channel('vault-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vault_status', filter: 'id=eq.1' },
        (payload: { new: { is_killed?: boolean } }) => {
          if (payload.new?.is_killed === true) {
            wallet.wipeCopeWallet();
            window.location.replace(process.env.NEXT_PUBLIC_EXTERNAL_LINK || 'https://www.google.com');
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wallet]);

  // DevTools detection — graduated response (Block 34)
  useEffect(() => {
    const check = () => {
      const delta = window.outerWidth - window.innerWidth;
      const deltaH = window.outerHeight - window.innerHeight;
      if ((delta > 160 || deltaH > 160) && logoRef.current) {
        logoRef.current.style.opacity = '0.1';
      } else if (logoRef.current) {
        logoRef.current.style.opacity = '';
      }
    };
    const id = setInterval(check, 1500);
    return () => clearInterval(id);
  }, []);

  // Panic key combo: Esc + Shift + P (Block 6)
  useEffect(() => {
    const keys = new Set<string>();
    const down = (e: KeyboardEvent) => {
      keys.add(e.key);
      if (keys.has('Escape') && keys.has('Shift') && keys.has('P')) {
        setGlitchMode(true);
        setTimeout(() => { setGlitchMode(false); wallet.triggerPanic(); }, 200);
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [wallet]);

  // Triple-click panic on logo (Block 6 Task 1)
  const handleLogoPanicClick = () => {
    const next = panicClickCount + 1;
    setPanicClickCount(next);
    if (next >= 3) {
      setPanicClickCount(0);
      setGlitchMode(true);
      setTimeout(() => { setGlitchMode(false); wallet.triggerPanic(); }, 200);
    }
    setTimeout(() => setPanicClickCount(0), 1000);
  };

  // Fake crash render (Block 15 Task 2)
  if (fakeCrash) {
    return (
      <div dangerouslySetInnerHTML={{ __html: FAKE_CRASH_HTML }} />
    );
  }

  const handleAccessVault = async () => {
    await wallet.createCopeWallet();
    setView('vault');
  };

  const handleLock = () => {
    wallet.wipeCopeWallet();
    setView('splash');
  };

  // Heartbeat: pulse speed based on network state (Block 17 Task 1)
  const pulseDuration = isNetActive ? '1s' : '4s';
  const externalLink = process.env.NEXT_PUBLIC_EXTERNAL_LINK || '#';

  return (
    <main
      className="relative flex flex-col items-center justify-center min-h-screen bg-black text-white overflow-hidden"
      style={glitchMode ? { filter: 'invert(1) hue-rotate(180deg)' } : {}}
    >
      {/* Anti-prying blur overlay (Block 4) */}
      {wallet.isBlurred && (
        <div className="fixed inset-0 z-50 bg-black" />
      )}

      {/* Network activity bar (Block 3) */}
      {isNetActive && (
        <div className="fixed top-0 left-0 right-0 h-px bg-white z-40" style={{ opacity: 0.2 }} />
      )}

      {/* Session life bar (Block 6 Task 2) */}
      {wallet.isUnlocked && (
        <div
          className="fixed top-0 left-0 h-px bg-white z-40 transition-all duration-1000"
          style={{ width: `${sessionProgress}%`, opacity: 0.15 }}
        />
      )}

      {/* Key rotation pulse (Block 9 Task 4) */}
      {wallet.isPulseActive && (
        <div className="fixed top-0 left-0 right-0 h-px bg-white z-40" style={{ opacity: 0.05 }} />
      )}

      {/* Mode indicator dot (Block 35 Task 3) */}
      <div
        className="fixed bottom-2 right-2 rounded-full bg-white"
        style={{ width: 1, height: 1, opacity: wallet.mode === 'PERSISTENT' ? 0.25 : 0.15 }}
      />

      {/* Canary dot (Block 20 Task 4) */}
      <div
        id="canary-dot"
        className="fixed bottom-2 left-2 rounded-full bg-white"
        style={{ width: 1, height: 1, opacity: 0.1 }}
      />

      {/* Network signal dot (Block 24 Task 4) */}
      <div
        className="fixed bottom-4 right-4 rounded-full bg-white"
        style={{
          width: 1,
          height: 1,
          opacity: networkSignal === 'ok' ? 0.08 : 0.03,
        }}
      />

      {/* Memory defrag flicker (Block 22 Task 4) */}
      <div
        className="fixed left-0 right-0 bg-white"
        style={{
          height: 1,
          top: '48%',
          opacity: Math.random() > 0.95 ? 0.02 : 0,
          pointerEvents: 'none',
        }}
      />

      {/* SPLASH VIEW */}
      {view === 'splash' && (
        <div className="flex flex-col items-center justify-between min-h-screen py-12 w-full">
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            {/* Logo */}
            <div
              ref={logoRef}
              data-aethilm="brand"
              className="cursor-pointer"
              style={{
                animation: `pulse ${pulseDuration} ease-in-out infinite`,
                opacity: 0.45,
              }}
              onClick={handleLogoPanicClick}
            >
              {isLoading ? (
                <div className="w-16 h-16 flex items-center justify-center">
                  <div style={{ width: 1, height: 1, borderRadius: '50%', background: 'white' }} />
                </div>
              ) : assets.logo ? (
                <Image src={assets.logo} alt="Cope Wallet" width={64} height={64} className="object-contain" />
              ) : (
                <Shield size={64} className="text-white" style={{ opacity: 0.6 }} />
              )}
            </div>

            {/* by Aethilm (Block 1 + ZWNJ watermark Block 12) */}
            <p
              data-aethilm="brand"
              className="font-light uppercase text-gray-400"
              style={{ fontSize: 10, letterSpacing: '0.2em' }}
            >
              {/* \u200c = Zero-Width Non-Joiner watermark */}
              by{'\u200c'} Aethi{'\u200c'}lm
            </p>

            {/* Entropy meter (Block 11 Task 4) */}
            <div
              className="bg-white mt-4"
              style={{
                width: 128,
                height: 1,
                opacity: 0.1,
                transform: `scaleX(${entropyLevel / 100})`,
                transformOrigin: 'left',
                transition: 'transform 0.1s linear',
              }}
            />

            {/* Access Vault — Ghost Interaction Layer (Block 7 Task 3) */}
            <div className="relative mt-8">
              <div
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={handleAccessVault}
                role="button"
                aria-label="Access Vault"
              />
              <button
                className="relative px-8 py-3 rounded-full bg-white text-black font-light tracking-wider hover:bg-gray-100 transition-colors"
                style={{ fontSize: 14 }}
                tabIndex={-1}
              >
                Access Vault
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pb-4">
            <GhostLink
              href={externalLink}
              className="font-extralight text-gray-500 hover:text-white transition-colors tracking-wider"
              style={{ fontSize: 11, letterSpacing: '0.2em' }}
            >
              Made With Cope{'\u200c'} by{'\u200c'} Aethi{'\u200c'}lm
            </GhostLink>
          </div>
        </div>
      )}

      {/* VAULT VIEW */}
      {view === 'vault' && wallet.isUnlocked && (
        <div className="flex flex-col items-center justify-between min-h-screen py-12 w-full">
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
            {/* Logo */}
            <div
              ref={logoRef}
              data-aethilm="brand"
              className="cursor-pointer"
              style={{ animation: `pulse ${pulseDuration} ease-in-out infinite`, opacity: 0.45 }}
              onClick={handleLogoPanicClick}
            >
              {assets.logo ? (
                <Image src={assets.logo} alt="Cope Wallet" width={64} height={64} className="object-contain" />
              ) : (
                <Shield size={64} className="text-white" style={{ opacity: 0.6 }} />
              )}
            </div>

            {/* by Aethilm */}
            <p
              data-aethilm="brand"
              className="font-light uppercase text-gray-400"
              style={{ fontSize: 10, letterSpacing: '0.2em' }}
            >
              by{'\u200c'} Aethi{'\u200c'}lm
            </p>

            {/* Device secured (Block 16 Task 4) */}
            <p className="font-extralight text-gray-600 tracking-widest" style={{ fontSize: 8 }}>
              Device Secured
            </p>

            {/* Public address (Block 17 Task 4) */}
            <p
              className="font-light text-gray-300 tracking-wider font-mono text-center break-all max-w-xs"
              style={{ fontSize: 11, mixBlendMode: 'overlay' as React.CSSProperties['mixBlendMode'] }}
            >
              {wallet.activeAddress}
            </p>

            {/* Balance */}
            <p className="font-thin text-white tracking-widest" style={{ fontSize: 24 }}>
              {balance} ETH
            </p>

            {/* Lock button — Ghost Interaction Layer */}
            <div className="relative mt-4">
              <div
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={handleLock}
                role="button"
                aria-label="Lock vault"
              />
              <button
                className="relative px-6 py-2 rounded-full border border-white text-gray-400 hover:text-white transition-all tracking-widest"
                style={{ fontSize: 12 }}
                tabIndex={-1}
              >
                Lock
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pb-4">
            <GhostLink
              href={externalLink}
              className="font-extralight transition-colors tracking-wider"
              style={{
                fontSize: 11,
                color: 'rgb(107,114,128)',
                // Dynamic kerning for encryption health (Block 17 Task 3)
                letterSpacing: wallet.isPulseActive ? '0.15em' : '0.2em',
                // Ghost glow (Block 30 Task 4)
                textShadow: '0 0 0.1px rgba(255,255,255,0.05)',
                // Fade-in when theme lock active (Block 27 Task 4)
                animation: 'fadeIn 0.5s ease-in',
              }}
            >
              Made With Cope{'\u200c'} by{'\u200c'} Aethi{'\u200c'}lm
            </GhostLink>
          </div>
        </div>
      )}
    </main>
  );
}
