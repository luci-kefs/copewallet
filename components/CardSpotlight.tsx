'use client';
// Adapted from TempWallets/temp-wallets-website

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface CardSpotlightProps {
  children: React.ReactNode;
  radius?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function CardSpotlight({
  children,
  radius = 280,
  color = 'rgba(255,255,255,0.04)',
  style,
  className,
  onClick,
  disabled,
  onMouseEnter,
  onMouseLeave,
}: CardSpotlightProps) {
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.current = e.clientX - rect.left;
    mouseY.current = e.clientY - rect.top;
    // Update gradient live via CSS custom properties
    cardRef.current.style.setProperty('--mx', `${mouseX.current}px`);
    cardRef.current.style.setProperty('--my', `${mouseY.current}px`);
  };

  return (
    <div
      ref={cardRef}
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => { setHovered(true); onMouseEnter?.(); }}
      onMouseLeave={() => { setHovered(false); onMouseLeave?.(); }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      {/* Always-on subtle gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(${radius}px circle at var(--mx, 50%) var(--my, 50%), ${color}, transparent 80%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none',
          zIndex: 1,
          borderRadius: 'inherit',
        }}
      />
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}
