'use client';
// Adapted from TempWallets/temp-wallets-website

import React from 'react';
import { motion } from 'framer-motion';

interface AuroraBackgroundProps {
  children: React.ReactNode;
  showRadialGradient?: boolean;
  className?: string;
}

export function AuroraBackground({ children, showRadialGradient = true, className }: AuroraBackgroundProps) {
  return (
    <div
      className={className}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#000', color: '#fff', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            backgroundImage: [
              'repeating-linear-gradient(100deg, #000 0%, #000 7%, transparent 10%, transparent 12%, #000 16%)',
              'repeating-linear-gradient(100deg, #1a0533 10%, #2d1b4e 15%, #0d1b3e 20%, #1a0533 25%, #2d1b4e 30%)',
            ].join(', '),
            backgroundSize: '300% 200%',
            backgroundPosition: '50% 50%, 50% 50%',
            filter: 'blur(8px) invert(0)',
            maskImage: showRadialGradient
              ? 'radial-gradient(ellipse at 100% 0%, black 40%, transparent 70%)'
              : undefined,
            WebkitMaskImage: showRadialGradient
              ? 'radial-gradient(ellipse at 100% 0%, black 40%, transparent 70%)'
              : undefined,
            opacity: 0.5,
            position: 'absolute',
            inset: '-10px',
            willChange: 'transform',
            animation: 'aurora 60s linear infinite',
          }}
        />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {children}
      </div>
      <style>{`
        @keyframes aurora {
          0%   { background-position: 50% 50%, 50% 50%; }
          50%  { background-position: 350% 50%, 350% 50%; }
          100% { background-position: 50% 50%, 50% 50%; }
        }
      `}</style>
    </div>
  );
}
