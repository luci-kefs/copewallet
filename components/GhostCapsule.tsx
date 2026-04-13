'use client';
// Shadow DOM Encapsulation — Block 21 + Block 33 (React integration fix)

import React, { useRef, useEffect } from 'react';

interface GhostCapsuleProps {
  children?: React.ReactNode;
  onValue?: (value: string) => void;
  placeholder?: string;
  type?: 'password' | 'text';
  className?: string;
  theme?: 'dark' | 'light';
}

export function GhostCapsule({
  onValue,
  placeholder = '',
  type = 'text',
  className,
  theme = 'dark',
}: GhostCapsuleProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Instance-level shadow root — each capsule owns its own ref (Block 21)
  const shadowRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Attach closed shadow DOM (Block 21 Task 1)
    const shadow = host.attachShadow({ mode: 'closed' });
    shadowRef.current = shadow;

    // Scoped styles inside shadow DOM (Block 21 Task 2)
    const style = document.createElement('style');
    const isLight = theme === 'light';
    style.textContent = `
      :host { display: block; }
      input {
        background: transparent;
        border: none;
        border-bottom: 1px solid ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)'};
        color: ${isLight ? '#111827' : '#ffffff'};
        font-size: 13px;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 400;
        letter-spacing: 0.02em;
        outline: none;
        padding: 6px 0;
        width: 100%;
        caret-color: ${isLight ? '#111827' : 'white'};
        transition: border-color 0.15s;
      }
      input:focus {
        border-bottom-color: ${isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.35)'};
      }
      input::placeholder {
        color: ${isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)'};
      }
    `;

    // Vanilla DOM input (Block 33 Task 2 — not React JSX inside shadow)
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.spellcheck = false;

    // Event decoupling (Block 21 Task 3)
    const onKeydown = (e: KeyboardEvent) => e.stopPropagation();
    const onInput = (e: Event) => {
      e.stopPropagation();
      const val = (e.target as HTMLInputElement).value;
      // Communicate via CustomEvent with composed:false (Block 33 Task 2)
      host.dispatchEvent(new CustomEvent('ghost-value', { detail: val, bubbles: false, composed: false }));
      if (onValue) onValue(val);
    };

    input.addEventListener('keydown', onKeydown);
    input.addEventListener('input', onInput);

    shadow.appendChild(style);
    shadow.appendChild(input);

    // Safe zone indicator (Block 21 Task 4)
    host.style.borderLeft = `0.5px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`;
    host.style.paddingLeft = '4px';

    // Cleanup (Block 33 Task 3)
    return () => {
      input.removeEventListener('keydown', onKeydown);
      input.removeEventListener('input', onInput);
      shadow.innerHTML = '';
      shadowRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, type, placeholder]);

  return (
    <div
      ref={hostRef}
      className={className}
      // intentional: shadow host, no JSX inside shadow root (Block 33 Task 4)
    />
  );
}
