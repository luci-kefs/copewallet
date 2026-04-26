'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs, variants } from '@/lib/animations';

export type WarningType =
  | 'send-large'
  | 'wipe'
  | 'new-wallet'
  | 'non-evm-first'
  | 'transfer-confirm'
  | 'delete-wallet';

interface WarningBannerProps {
  type: WarningType;
  onConfirm: () => void;
  onCancel?: () => void;
  data?: { amount?: number; coin?: string; address?: string; chain?: string };
  inline?: boolean; // true = no backdrop overlay
}

const MESSAGES: Record<WarningType, { icon: React.ReactNode; title: string; body: (d?: WarningBannerProps['data']) => string; confirmLabel: string; confirmDanger?: boolean }> = {
  'send-large': {
    icon: <AlertTriangle size={18} color="#ffb400" />,
    title: 'Large Transfer',
    body: (d) => `You're about to send $${(d?.amount ?? 0).toFixed(2)} worth of ${d?.coin ?? 'crypto'}. Double-check the recipient address — transactions cannot be reversed.`,
    confirmLabel: 'Proceed',
    confirmDanger: true,
  },
  'wipe': {
    icon: <AlertTriangle size={18} color="#ff6b6b" />,
    title: 'Wipe Wallet',
    body: () => 'This will permanently erase all keys from memory. If you haven\'t saved your vault, funds will be inaccessible.',
    confirmLabel: 'Wipe',
    confirmDanger: true,
  },
  'new-wallet': {
    icon: <AlertCircle size={18} color="#ffb400" />,
    title: 'New Wallet',
    body: () => 'Creating a new wallet will replace the current session. Save your vault first if you need to recover this wallet.',
    confirmLabel: 'Create New',
    confirmDanger: true,
  },
  'non-evm-first': {
    icon: <AlertCircle size={18} color="var(--theme-accent)" />,
    title: 'Non-EVM Blockchain',
    body: (d) => `${d?.chain ?? 'This'} is a separate blockchain from Ethereum. It uses a different address format and different transaction fees. Your seed phrase works on both, but the addresses are different.`,
    confirmLabel: 'Got it',
  },
  'transfer-confirm': {
    icon: <AlertTriangle size={18} color="#ffb400" />,
    title: 'Confirm Transfer',
    body: (d) => `Transfer ${d?.coin ?? ''} to ${d?.address ? `${d.address.slice(0, 8)}…${d.address.slice(-4)}` : 'another wallet'}? This is an on-chain transaction with network fees.`,
    confirmLabel: 'Confirm Transfer',
    confirmDanger: true,
  },
  'delete-wallet': {
    icon: <AlertTriangle size={18} color="#ff6b6b" />,
    title: 'Remove Wallet',
    body: () => 'Remove this wallet from history? If it\'s not saved in a vault, you won\'t be able to recover it.',
    confirmLabel: 'Remove',
    confirmDanger: true,
  },
};

export function WarningBanner({ type, onConfirm, onCancel, data, inline = false }: WarningBannerProps) {
  const msg = MESSAGES[type];

  const content = (
    <motion.div
      variants={variants.modalEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={springs.bouncy}
      style={{
        background: '#111',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '1rem',
        padding: '1rem',
        maxWidth: 360,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>{msg.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{msg.title}</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{msg.body(data)}</div>
        </div>
        {onCancel && (
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0 }}>
            <X size={16} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {onCancel && (
          <button onClick={onCancel}
            style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.82rem' }}>
            Cancel
          </button>
        )}
        <button onClick={onConfirm}
          style={{ flex: 1, padding: '0.5rem', background: msg.confirmDanger ? 'rgba(255,107,107,0.15)' : 'var(--theme-accent-dim)', border: `1px solid ${msg.confirmDanger ? 'rgba(255,107,107,0.4)' : 'var(--theme-accent-border)'}`, borderRadius: '0.5rem', color: msg.confirmDanger ? '#ff6b6b' : 'var(--theme-accent)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
          <Check size={13} />
          {msg.confirmLabel}
        </button>
      </div>
    </motion.div>
  );

  if (inline) return content;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget && onCancel) onCancel(); }}
    >
      {content}
    </motion.div>
  );
}

// Lightweight inline alert strip (no buttons)
export function InlineWarning({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.25)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#ffb400' }}>
      <AlertTriangle size={13} />
      {children}
    </div>
  );
}
