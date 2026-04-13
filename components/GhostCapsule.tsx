'use client';
// Shadow DOM Encapsulation — Block 21 + Block 33 (React integration fix)

import React, { useRef, useEffect } from 'react';

interface GhostCapsuleProps {
  children?: React.ReactNode;
  onValue?: (value: string) => void;
  placeholder?: string;
  type?: 'password' | 'text';
  className?: string;
}

// Module-level shadow root ref (NOT in React state — avoids re-render loops)
let _shadowRoot: ShadowRoot | null = null;

export function GhostCapsule({
  onValue,
  placeholder = '',
  type = 'text',
  className,
}: GhostCapsuleProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Attach closed shadow DOM (Block 21 Task 1)
    _shadowRoot = host.attachShadow({ mode: 'closed' });

    // Scoped styles inside shadow DOM (Block 21 Task 2)
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; }
      input {
        background: transparent;
        border: none;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        color: #ffffff;
        font-size: 11px;
        font-family: system-ui, sans-serif;
        font-weight: 200;
        letter-spacing: 0.1em;
        outline: none;
        padding: 4px 0;
        width: 100%;
        caret-color: white;
      }
      input::placeholder { color: rgba(255,255,255,0.2); }
    `;

    // Vanilla DOM input (Block 33 Task 2 — not React JSX inside shadow)
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.spellcheck = false;

    // Event decoupling (Block 21 Task 3)
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // prevent bubbling past shadow boundary
    });

    input.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = (e.target as HTMLInputElement).value;
      // Communicate via CustomEvent with composed:false (Block 33 Task 2)
      const event = new CustomEvent('ghost-value', {
        detail: val,
        bubbles: false,
        composed: false,
      });
      host.dispatchEvent(event);
      if (onValue) onValue(val);
    });

    _shadowRoot.appendChild(style);
    _shadowRoot.appendChild(input);

    // Safe zone indicator (Block 21 Task 4) — 0.5px left border
    host.style.borderLeft = '0.5px solid rgba(255,255,255,0.05)';
    host.style.paddingLeft = '4px';

    // Cleanup (Block 33 Task 3)
    return () => {
      input.removeEventListener('keydown', () => {});
      input.removeEventListener('input', () => {});
      if (_shadowRoot) {
        _shadowRoot.innerHTML = '';
        _shadowRoot = null;
      }
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={className}
      // eslint-disable-next-line react/no-unknown-property
      // intentional: shadow host, no JSX inside shadow root (Block 33 Task 4)
    />
  );
}
