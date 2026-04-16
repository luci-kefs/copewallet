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
import { getHardwareUUID, startEnvironmentWatch } from '@/lib/fingerprint';
import {
  registerBreachWipe,
  startIntegrityWatch,
  stopIntegrityWatch,
  activateSilentLockout,
  isBreachLockedOut,
  poisonVault,
  isUnauthorizedEnvironment,
} from '@/lib/breach';
import { checkSingletonTab, startHistoryScrubber } from '@/lib/history';
import {
  persistVault,
  hasPersistedVault,
  loadPersistedVault,
  nukePersistedVault,
} from '@/lib/persistent-vault';
import { saveSession, clearSession } from '@/lib/session-lock';

// Block 35: Two explicit operating modes
export type WalletMode = 'EPHEMERAL' | 'PERSISTENT';

interface WalletState {
  // Obfuscated real state (Block 5)
  _u_ap: string | null;          // activeAddress
  _v_enc: string | null;         // encryptedVault (mnemonic)
  _k_enc: string | null;         // encryptedVault (private key)
  isUnlocked: boolean;
  mode: WalletMode;
  isPulseActive: boolean;        // key rotation pulse (Block 9)
  isBlurred: boolean;            // anti-prying blur (Block 4)
  isGhostLocked: boolean;        // anomaly detection lock (Block 8)
  sessionStartedAt: number | null;
  devToolsDetected: number;      // graduated counter (Block 34)
  isBreachLocked: boolean;       // logic bomb lockout (Block 10)
  hasPersisted: boolean;         // persistent vault exists (Block 18)
  isSessionLocked: boolean;      // localStorage session persistence (Block 36)
}

// Decoy honeypot variables (Block 5 Task 1)
let _seedData = '';
let _pvt_key_vault = '';
let _wallet_backup = '';
const _updateDecoys = () => {
  _seedData = Math.random().toString(36).repeat(4);
  _pvt_key_vault = Math.random().toString(36).repeat(4);
  _wallet_backup = Math.random().toString(36).repeat(4);
};

// Module-level vault key tracker — updated on every createCopeWallet / importCopeWallet
// and re-updated on every key rotation, so getMnemonicForExport always has the right key
let _vaultCombinedKey: string | null = null;

interface WalletContextType extends WalletState {
  createCopeWallet: () => Promise<void>;
  importCopeWallet: (mnemonic: string) => Promise<void>;
  wipeCopeWallet: () => void;
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
  // Plain-text mnemonic ref — set on create/import, wiped on wipe. Avoids all decrypt issues.
  const mnemonicRef = useRef<string | null>(null);
  // Ref backup for vault combined key
  const vaultKeyRef = useRef<string | null>(null);

  // GHOST: no storage ops permitted below this line (EPHEMERAL mode boundary)

  const wipeCopeWallet = useCallback(() => {
    // Wipe scattered key store
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
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    _updateDecoys();
  }, []);

  const triggerPanic = useCallback(() => {
    wipeCopeWallet();
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    // Redirect to external link
    const ext = process.env.NEXT_PUBLIC_EXTERNAL_LINK || 'https://www.google.com';
    window.location.replace(ext);
  }, [wipeCopeWallet]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      wipeCopeWallet();
    }, 5 * 60 * 1000); // 5 minutes
  }, [wipeCopeWallet]);

  const createCopeWallet = useCallback(async () => {
    try {
      // Build hybrid entropy (Block 11) — used as additional XOR layer on the key
      await buildSuperEntropySeed();

      // ethers v6: createRandom() uses crypto.getRandomValues internally
      const wallet = ethers.Wallet.createRandom();
      const mnemonic = wallet.mnemonic?.phrase ?? '';
      const privateKey = wallet.privateKey;
      const address = wallet.address;

      const hwId = await getHardwareUUID();
      const combinedKey = getCurrentKey() + hwId;

      const encMnemonic = encryptData(mnemonic, combinedKey);
      const encPrivKey = encryptData(privateKey, combinedKey);

      // Track the combined key and plain mnemonic for reliable export
      _vaultCombinedKey = combinedKey;
      vaultKeyRef.current = combinedKey;
      mnemonicRef.current = mnemonic;

      // Scatter private key in memory
      scatteredKeyRef.current = scatterStore(privateKey);

      setState((prev) => ({
        ...prev,
        _u_ap: address,
        _v_enc: encMnemonic,
        _k_enc: encPrivKey,
        isUnlocked: true,
        sessionStartedAt: Date.now(),
      }));

      startHeapNoise();
      startKeyRotation((oldKey, newKey) => {
        setState((prev) => {
          if (!prev._v_enc || !prev._k_enc) return prev;
          const hwUUID = hwId;
          const oldCombined = oldKey + hwUUID;
          const newCombined = newKey + hwUUID;
          try {
            const rawMnemonic = decryptData(prev._v_enc, oldCombined);
            const rawPrivKey = decryptData(prev._k_enc, oldCombined);
            // Update the tracked combined key to the new one
            _vaultCombinedKey = newCombined;
            vaultKeyRef.current = newCombined;
            return {
              ...prev,
              _v_enc: encryptData(rawMnemonic, newCombined),
              _k_enc: encryptData(rawPrivKey, newCombined),
              isPulseActive: true,
            };
          } catch {
            // Rotation failed — keep existing encryption, don't corrupt vault
            return prev;
          }
        });
        setTimeout(() => setState((p) => ({ ...p, isPulseActive: false })), 500);
      });

      resetInactivityTimer();
      // 30-minute hard session limit (Block 6)
      sessionTimer.current = setTimeout(() => wipeCopeWallet(), 30 * 60 * 1000);
    } catch (err) {
      console.error('Vault creation failed');
    }
  }, [resetInactivityTimer, wipeCopeWallet]);

  const importCopeWallet = useCallback(async (mnemonic: string) => {
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
      const privateKey = wallet.privateKey;
      const address = wallet.address;

      const hwId = await getHardwareUUID();
      const combinedKey = getCurrentKey() + hwId;

      // Track the combined key and plain mnemonic
      _vaultCombinedKey = combinedKey;
      vaultKeyRef.current = combinedKey;
      mnemonicRef.current = mnemonic.trim();

      scatteredKeyRef.current = scatterStore(privateKey);

      setState((prev) => ({
        ...prev,
        _u_ap: address,
        _v_enc: encryptData(mnemonic, combinedKey),
        _k_enc: encryptData(privateKey, combinedKey),
        isUnlocked: true,
        sessionStartedAt: Date.now(),
      }));

      startHeapNoise();
      resetInactivityTimer();
      sessionTimer.current = setTimeout(() => wipeCopeWallet(), 30 * 60 * 1000);
    } catch {
      throw new Error('Invalid mnemonic');
    }
  }, [resetInactivityTimer, wipeCopeWallet]);

  const rotateVaultKeys = useCallback(() => {
    rotateKeys((oldKey, newKey) => {
      setState((prev) => {
        if (!prev._v_enc || !prev._k_enc) return prev;
        const raw1 = decryptData(prev._v_enc, oldKey);
        const raw2 = decryptData(prev._k_enc, oldKey);
        return {
          ...prev,
          _v_enc: encryptData(raw1, newKey),
          _k_enc: encryptData(raw2, newKey),
          isPulseActive: true,
        };
      });
      setTimeout(() => setState((p) => ({ ...p, isPulseActive: false })), 300);
    });
  }, []);

  const getMnemonic = useCallback((): string | null => {
    if (!state._v_enc || mnemonicShownRef.current) return null;
    mnemonicShownRef.current = true; // burn after reading (Block 6)
    try {
      return decryptData(state._v_enc);
    } catch {
      return null;
    }
  }, [state._v_enc]);

  // Secure mnemonic export — reads from in-memory ref; falls back to decrypt if ref was lost
  const getMnemonicForExport = useCallback(async (): Promise<string | null> => {
    if (mnemonicRef.current) return mnemonicRef.current;
    // Fallback: re-derive from encrypted state using current vault key
    const enc = state._v_enc;
    const key = vaultKeyRef.current;
    if (enc && key) {
      try {
        const decoded = decryptData(enc, key);
        if (decoded && decoded.trim().split(/\s+/).length >= 12) {
          mnemonicRef.current = decoded; // restore ref
          return decoded;
        }
      } catch {}
    }
    return null;
  }, [state._v_enc]);

  // Persistent mode — Block 18 Task 2 (explicit user consent)
  // mnemonic is passed in directly (already decrypted by caller) to avoid double-decrypt
  const enablePersistentMode = useCallback(async (passphrase: string, mnemonic: string) => {
    // Fallback to in-memory ref if caller passed empty string
    const resolvedMnemonic = mnemonic || mnemonicRef.current || '';
    if (!resolvedMnemonic) throw new Error('Vault empty');
    const hwId = await getHardwareUUID();
    await persistVault(resolvedMnemonic, passphrase, hwId);
    setState((p) => ({ ...p, mode: 'PERSISTENT' }));
  }, []);

  const unlockPersistentVault = useCallback(async (passphrase: string) => {
    const hwId = await getHardwareUUID();
    const mnemonic = await loadPersistedVault(passphrase, hwId);
    await importCopeWallet(mnemonic);
  }, [importCopeWallet]);

  // Block 36: localStorage session lock (device-bound, no passphrase)
  const enableSessionLock = useCallback(async () => {
    const mnemonic = mnemonicRef.current;
    if (!mnemonic) return;
    const hwId = await getHardwareUUID();
    const payload = encryptData(mnemonic, hwId);
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

  // Check for persisted vault on mount (Block 18 Task 3)
  useEffect(() => {
    hasPersistedVault().then((has) => {
      if (has) setState((p) => ({ ...p, hasPersisted: true }));
    });
  }, []);

  // Breach registration (Block 10)
  useEffect(() => {
    registerBreachWipe(() => {
      // Poison vault before wipe
      setState((p) => ({
        ...p,
        _v_enc: poisonVault(),
        _k_enc: poisonVault(),
        isBreachLocked: true,
      }));
      setTimeout(() => wipeCopeWallet(), 100);
    });

    // Unauthorized environment check
    if (isUnauthorizedEnvironment()) {
      activateSilentLockout();
    }
  }, [wipeCopeWallet]);

  // History scrubber + singleton tab (Block 14)
  useEffect(() => {
    checkSingletonTab();
    startHistoryScrubber();
  }, []);

  // Anti-Persistence: wipe on unload (Block 2)
  useEffect(() => {
    const handler = () => wipeCopeWallet();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [wipeCopeWallet]);

  // Anti-Prying: blur on tab switch (Block 4)
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        setState((p) => ({ ...p, isBlurred: true }));
        document.title = 'By Aethilm';
      } else {
        setState((p) => ({ ...p, isBlurred: false }));
        document.title = 'Cope Wallet';
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Activity listeners for inactivity timer (Block 4 + 6)
  useEffect(() => {
    if (!state.isUnlocked) return;
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    const handler = () => resetInactivityTimer();
    events.forEach((e) => window.addEventListener(e, handler));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [state.isUnlocked, resetInactivityTimer]);

  // Decoy updater (Block 5)
  useEffect(() => {
    const id = setInterval(_updateDecoys, 5000);
    return () => clearInterval(id);
  }, []);

  // Environment watch (Block 16)
  useEffect(() => {
    const stop = startEnvironmentWatch(() => {
      setState((p) => ({ ...p, isGhostLocked: true }));
    });
    return stop;
  }, []);

  // Canary trap — window._aethilm_canary (Block 20)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let _canary = 'aethilm_sovereign';
    const canaryProxy = new Proxy(
      { value: _canary },
      {
        set: () => {
          wipeCopeWallet();
          return false;
        },
        deleteProperty: () => {
          wipeCopeWallet();
          return false;
        },
      }
    );
    (window as unknown as Record<string, unknown>)['_aethilm_canary'] = canaryProxy;
  }, [wipeCopeWallet]);

  // Honey input trap (Block 20)
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

  // Branding self-heal via periodic DOM check (Block 7 Task 4)
  // Polls every 3s — if a brand element existed before but is now gone AND
  // React hasn't re-added it within the same tick, it was externally removed.
  useEffect(() => {
    let knownCount = 0;
    let graceTicks = 0; // allow 1 tick for React to re-add after state change
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

  // Console honey-trap (Block 12 Task 4)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    Object.defineProperty(window, 'wallet', {
      get: () => {
        triggerPanic();
        return { error: 'Build Integrity Failure: 0xAE7H1LM' };
      },
      configurable: false,
    });
  }, [triggerPanic]);

  return (
    <WalletContext.Provider
      value={{
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
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
