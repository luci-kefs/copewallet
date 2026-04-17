'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { ethers } from 'ethers';
import {
  encryptData,
  decryptData,
  startKeyRotation,
  stopKeyRotation,
  rotateKeys,
  getCurrentKey,
} from '@/lib/crypto';
import { buildSuperEntropySeed } from '@/lib/entropy';
import { scatterStore, ScatteredStore, wipeScatteredStore, startHeapNoise, stopHeapNoise } from '@/lib/memory-vault';
import {
  registerBreachWipe,
  startIntegrityWatch,
  stopIntegrityWatch,
  activateSilentLockout,
  poisonVault,
  isUnauthorizedEnvironment,
} from '@/lib/breach';
import { checkSingletonTab, startHistoryScrubber } from '@/lib/history';
import {
  persistVault,
  hasPersistedVault,
  loadPersistedVault,
} from '@/lib/persistent-vault';
import { saveSession, loadSession, clearSession, getTabKey } from '@/lib/session-lock';
import { clearWalletKit } from '@/lib/walletconnect';

export type WalletMode = 'EPHEMERAL' | 'PERSISTENT';

interface WalletState {
  _u_ap: string | null;
  _v_enc: string | null;
  _k_enc: string | null;
  isUnlocked: boolean;
  mode: WalletMode;
  isPulseActive: boolean;
  isBlurred: boolean;
  isGhostLocked: boolean;
  sessionStartedAt: number | null;
  devToolsDetected: number;
  isBreachLocked: boolean;
  hasPersisted: boolean;
  isSessionLocked: boolean;
}

let _seedData = '';
let _pvt_key_vault = '';
let _wallet_backup = '';
const _updateDecoys = () => {
  _seedData = Math.random().toString(36).repeat(4);
  _pvt_key_vault = Math.random().toString(36).repeat(4);
  _wallet_backup = Math.random().toString(36).repeat(4);
};

let _vaultCombinedKey: string | null = null;

interface WalletContextType extends WalletState {
  createCopeWallet: () => Promise<void>;
  importCopeWallet: (mnemonic: string) => Promise<void>;
  wipeCopeWallet: (opts?: { keepSession?: boolean }) => void;
  triggerPanic: () => void;
  rotateVaultKeys: () => void;
  getMnemonic: () => string | null;
  getMnemonicForExport: () => Promise<string | null>;
  activeAddress: string | null;
  scatteredKeyStore: ScatteredStore | null;
  enablePersistentMode: (passphrase: string, mnemonic: string) => Promise<void>;
  unlockPersistentVault: (passphrase: string) => Promise<void>;
  enableSessionLock: () => Promise<void>;
  disableSessionLock: () => void;
  markSessionRestored: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

const INITIAL_STATE: WalletState = {
  _u_ap: null,
  _v_enc: null,
  _k_enc: null,
  isUnlocked: false,
  mode: 'EPHEMERAL',
  isPulseActive: false,
  isBlurred: false,
  isGhostLocked: false,
  sessionStartedAt: null,
  devToolsDetected: 0,
  isBreachLocked: false,
  hasPersisted: false,
  isSessionLocked: false,
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL_STATE);
  const scatteredKeyRef = useRef<ScatteredStore | null>(null);
  const mnemonicShownRef = useRef(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mnemonicRef = useRef<string | null>(null);
  const vaultKeyRef = useRef<string | null>(null);

  const wipeCopeWallet = useCallback((opts?: { keepSession?: boolean }) => {
    if (scatteredKeyRef.current) {
      wipeScatteredStore(scatteredKeyRef.current);
      scatteredKeyRef.current = null;
    }
    mnemonicShownRef.current = false;
    mnemonicRef.current = null;
    _vaultCombinedKey = null;
    vaultKeyRef.current = null;
    setState(INITIAL_STATE);
    stopKeyRotation();
    stopHeapNoise();
    stopIntegrityWatch();
    clearWalletKit();
    if (!opts?.keepSession) clearSession();
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    _updateDecoys();
  }, []);

  const triggerPanic = useCallback(() => {
    wipeCopeWallet();
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    window.location.replace(process.env.NEXT_PUBLIC_EXTERNAL_LINK || 'https://www.google.com');
  }, [wipeCopeWallet]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => wipeCopeWallet(), 5 * 60 * 1000);
  }, [wipeCopeWallet]);

  // Key rotation handler — re-encrypts vault with new session key (no hwId)
  const makeRotationHandler = useCallback(
    () => (oldKey: string, newKey: string) => {
      setState((prev) => {
        if (!prev._v_enc || !prev._k_enc) return prev;
        try {
          const rawMnemonic = decryptData(prev._v_enc, oldKey);
          const rawPrivKey  = decryptData(prev._k_enc, oldKey);
          _vaultCombinedKey   = newKey;
          vaultKeyRef.current = newKey;
          mnemonicRef.current = rawMnemonic;
          return {
            ...prev,
            _v_enc: encryptData(rawMnemonic, newKey),
            _k_enc: encryptData(rawPrivKey,  newKey),
            isPulseActive: true,
          };
        } catch { return prev; }
      });
      setTimeout(() => setState(p => ({ ...p, isPulseActive: false })), 500);
    },
    []
  );

  const createCopeWallet = useCallback(async () => {
    try {
      await buildSuperEntropySeed();
      const wallet = ethers.Wallet.createRandom();
      const mnemonic = wallet.mnemonic?.phrase ?? '';
      if (!mnemonic || mnemonic.trim().split(/\s+/).length < 12) throw new Error('Failed to generate mnemonic');
      const privateKey = wallet.privateKey;
      const address = wallet.address;
      const sessionKey = getCurrentKey();

      _vaultCombinedKey = sessionKey;
      vaultKeyRef.current = sessionKey;
      mnemonicRef.current = mnemonic;
      scatteredKeyRef.current = scatterStore(privateKey);

      setState(prev => ({
        ...prev,
        _u_ap: address,
        _v_enc: encryptData(mnemonic, sessionKey),
        _k_enc: encryptData(privateKey, sessionKey),
        isUnlocked: true,
        sessionStartedAt: Date.now(),
      }));

      startHeapNoise();
      startKeyRotation(makeRotationHandler());
      resetInactivityTimer();
      sessionTimer.current = setTimeout(() => wipeCopeWallet(), 30 * 60 * 1000);
    } catch {
      console.error('Vault creation failed');
    }
  }, [resetInactivityTimer, wipeCopeWallet, makeRotationHandler]);

  const importCopeWallet = useCallback(async (mnemonic: string) => {
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
      const privateKey = wallet.privateKey;
      const address = wallet.address;
      const sessionKey = getCurrentKey();

      _vaultCombinedKey = sessionKey;
      vaultKeyRef.current = sessionKey;
      mnemonicRef.current = mnemonic.trim();
      scatteredKeyRef.current = scatterStore(privateKey);

      setState(prev => ({
        ...prev,
        _u_ap: address,
        _v_enc: encryptData(mnemonic, sessionKey),
        _k_enc: encryptData(privateKey, sessionKey),
        isUnlocked: true,
        sessionStartedAt: Date.now(),
      }));

      startHeapNoise();
      startKeyRotation(makeRotationHandler());
      resetInactivityTimer();
      sessionTimer.current = setTimeout(() => wipeCopeWallet(), 30 * 60 * 1000);
    } catch {
      throw new Error('Invalid mnemonic');
    }
  }, [resetInactivityTimer, wipeCopeWallet, makeRotationHandler]);

  const rotateVaultKeys = useCallback(() => {
    rotateKeys((oldKey, newKey) => {
      setState(prev => {
        if (!prev._v_enc || !prev._k_enc) return prev;
        return {
          ...prev,
          _v_enc: encryptData(decryptData(prev._v_enc, oldKey), newKey),
          _k_enc: encryptData(decryptData(prev._k_enc, oldKey), newKey),
          isPulseActive: true,
        };
      });
      setTimeout(() => setState(p => ({ ...p, isPulseActive: false })), 300);
    });
  }, []);

  const getMnemonic = useCallback((): string | null => {
    if (!state._v_enc || mnemonicShownRef.current) return null;
    mnemonicShownRef.current = true;
    try { return decryptData(state._v_enc); } catch { return null; }
  }, [state._v_enc]);

  const getMnemonicForExport = useCallback(async (): Promise<string | null> => {
    // Primary: in-memory ref (always up-to-date)
    if (mnemonicRef.current && mnemonicRef.current.trim().split(/\s+/).length >= 12) {
      return mnemonicRef.current;
    }
    // Fallback: try known keys
    const enc = state._v_enc;
    if (!enc) return null;
    const candidates: string[] = [];
    if (vaultKeyRef.current) candidates.push(vaultKeyRef.current);
    if (_vaultCombinedKey && _vaultCombinedKey !== vaultKeyRef.current) candidates.push(_vaultCombinedKey);
    candidates.push(getCurrentKey());
    for (const key of candidates) {
      try {
        const decoded = decryptData(enc, key);
        if (decoded && decoded.trim().split(/\s+/).length >= 12) {
          mnemonicRef.current = decoded;
          return decoded;
        }
      } catch {}
    }
    return null;
  }, [state._v_enc]);

  // Persist session — passphrase only, no device binding
  const enablePersistentMode = useCallback(async (passphrase: string, mnemonic: string) => {
    const resolvedMnemonic = mnemonic || mnemonicRef.current || '';
    if (!resolvedMnemonic) throw new Error('Vault empty');
    await persistVault(resolvedMnemonic, passphrase);
    setState(p => ({ ...p, mode: 'PERSISTENT' }));
  }, []);

  const unlockPersistentVault = useCallback(async (passphrase: string) => {
    const mnemonic = await loadPersistedVault(passphrase);
    await importCopeWallet(mnemonic);
    setState(p => ({ ...p, mode: 'PERSISTENT' }));
  }, [importCopeWallet]);

  const enableSessionLock = useCallback(async () => {
    const mnemonic = mnemonicRef.current;
    if (!mnemonic) return;
    const tabKey = getTabKey();
    const payload = encryptData(mnemonic, tabKey);
    saveSession(payload);
    setState((p) => ({ ...p, isSessionLocked: true }));
  }, []);

  const disableSessionLock = useCallback(() => {
    clearSession();
    setState((p) => ({ ...p, isSessionLocked: false }));
  }, []);

  const markSessionRestored = useCallback(() => {
    setState((p) => ({ ...p, isSessionLocked: true }));
  }, []);

  // Check for persisted vault on mount
  useEffect(() => {
    hasPersistedVault().then(has => { if (has) setState(p => ({ ...p, hasPersisted: true })); });
  }, []);

  // Breach registration
  useEffect(() => {
    registerBreachWipe(() => {
      setState(p => ({ ...p, _v_enc: poisonVault(), _k_enc: poisonVault(), isBreachLocked: true }));
      setTimeout(() => wipeCopeWallet(), 100);
    });
    if (isUnauthorizedEnvironment()) activateSilentLockout();
  }, [wipeCopeWallet]);

  // History scrubber + singleton tab
  useEffect(() => {
    checkSingletonTab();
    startHistoryScrubber();
  }, []);

  // Wipe on unload — keep session so refresh can restore
  useEffect(() => {
    const handler = () => wipeCopeWallet({ keepSession: true });
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [wipeCopeWallet]);

  // Blur on tab switch
  useEffect(() => {
    const handler = () => {
      if (document.hidden) { setState(p => ({ ...p, isBlurred: true })); document.title = 'By Aethilm'; }
      else { setState(p => ({ ...p, isBlurred: false })); document.title = 'Cope Wallet'; }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Activity listeners for inactivity timer
  useEffect(() => {
    if (!state.isUnlocked) return;
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    const handler = () => resetInactivityTimer();
    events.forEach(e => window.addEventListener(e, handler));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [state.isUnlocked, resetInactivityTimer]);

  // Decoy updater
  useEffect(() => {
    const id = setInterval(_updateDecoys, 5000);
    return () => clearInterval(id);
  }, []);

  // Canary trap
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canaryProxy = new Proxy({ value: 'aethilm_sovereign' }, {
      set: () => { wipeCopeWallet(); return false; },
      deleteProperty: () => { wipeCopeWallet(); return false; },
    });
    (window as unknown as Record<string, unknown>)['_aethilm_canary'] = canaryProxy;
  }, [wipeCopeWallet]);

  // Honey input trap
  useEffect(() => {
    const trap = document.createElement('input');
    trap.setAttribute('name', 'wallet_seed_backup');
    trap.setAttribute('aria-hidden', 'true');
    trap.setAttribute('tabindex', '-1');
    trap.style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none;';
    trap.addEventListener('input', () => wipeCopeWallet());
    trap.addEventListener('change', () => wipeCopeWallet());
    document.body.appendChild(trap);
    return () => { try { document.body.removeChild(trap); } catch {} };
  }, [wipeCopeWallet]);

  // Branding self-heal
  useEffect(() => {
    let knownCount = 0;
    let graceTicks = 0;
    const id = setInterval(() => {
      const current = document.querySelectorAll('[data-aethilm="brand"]').length;
      if (knownCount > 0 && current === 0) {
        if (graceTicks > 0) { graceTicks--; return; }
        wipeCopeWallet();
      } else {
        if (current > 0) knownCount = current;
        if (current === 0 && knownCount > 0) graceTicks = 1;
      }
    }, 3000);
    return () => clearInterval(id);
  }, [wipeCopeWallet]);

  // Console honey-trap
  useEffect(() => {
    if (typeof window === 'undefined') return;
    Object.defineProperty(window, 'wallet', {
      get: () => { triggerPanic(); return { error: 'Build Integrity Failure: 0xAE7H1LM' }; },
      configurable: false,
    });
  }, [triggerPanic]);

  return (
    <WalletContext.Provider value={{
      ...state,
      activeAddress: state._u_ap,
      createCopeWallet,
      importCopeWallet,
      wipeCopeWallet,
      triggerPanic,
      rotateVaultKeys,
      getMnemonic,
      getMnemonicForExport,
      scatteredKeyStore: scatteredKeyRef.current,
      enablePersistentMode,
      unlockPersistentVault,
      enableSessionLock,
      disableSessionLock,
      markSessionRestored,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
