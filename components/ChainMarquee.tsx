'use client';
// Adapted from TempWallets/temp-wallets-website marquee-cards.tsx

import React from 'react';
import { CHAINS } from '@/lib/chains';

interface ChainPillProps {
  color: string;
  shortName: string;
  name: string;
}

function ChainPill({ color, shortName, name }: ChainPillProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 12px',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 600 }}>{shortName}</span>
      <span style={{ color: '#4b5563', fontSize: 9 }}>{name}</span>
    </div>
  );
}

interface MarqueeRowProps {
  chains: typeof CHAINS;
  reverse?: boolean;
  speed?: number;
}

function MarqueeRow({ chains, reverse = false, speed = 30 }: MarqueeRowProps) {
  // Duplicate chains for seamless loop
  const items = [...chains, ...chains];

  return (
    <div style={{ overflow: 'hidden', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          animation: `marquee-${reverse ? 'reverse' : 'forward'} ${speed}s linear infinite`,
          width: 'max-content',
        }}
      >
        {items.map((c, i) => (
          <ChainPill key={`${c.id}-${i}`} color={c.color} shortName={c.shortName} name={c.name} />
        ))}
      </div>
      <style>{`
        @keyframes marquee-forward {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-reverse {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export function ChainMarquee() {
  const half = Math.ceil(CHAINS.length / 2);
  const row1 = CHAINS.slice(0, half);
  const row2 = CHAINS.slice(half);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden', padding: '2px 0', position: 'relative' }}>
      {/* Fade edges */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to right, #141414 0%, transparent 12%, transparent 88%, #141414 100%)',
      }} />
      <MarqueeRow chains={row1} speed={28} />
      <MarqueeRow chains={row2} reverse speed={32} />
    </div>
  );
}
