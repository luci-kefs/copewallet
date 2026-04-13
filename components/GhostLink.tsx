'use client';
// Ghost Link — Block 26

import React from 'react';

interface GhostLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
}

export function GhostLink({ href, children, className, onNavigate }: GhostLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onNavigate) onNavigate();
    setTimeout(() => {
      window.open(href, '_blank', 'noopener,noreferrer');
    }, 300);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      rel="noopener noreferrer"
      target="_blank"
      className={className}
    >
      {children}
    </a>
  );
}
