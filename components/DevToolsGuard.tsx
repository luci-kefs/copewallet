'use client';
// DevTools Detection — Block 34 (Modern Chromium-safe methods)

import { useEffect, useRef } from 'react';
import { detectToStringTampering } from '@/lib/singularity';

interface DevToolsGuardProps {
  onLevel1: () => void; // disable Send button
  onLevel2: () => void; // infinite loading trap
  onLevel3: () => void; // full wipe (no redirect — keeps session safe)
}

export function DevToolsGuard({ onLevel1, onLevel2, onLevel3 }: DevToolsGuardProps) {
  const detectionCount = useRef(0);
  const level = useRef(0);

  useEffect(() => {
    // toString() tampering check (run once — catches injected proxy objects)
    if (detectToStringTampering()) {
      onLevel3();
      return;
    }

    const check = () => {
      // Size-delta detection: DevTools docked side/bottom adds significant space
      // Require BOTH axes to exceed threshold to avoid false positives on
      // Windows HiDPI, snapped windows, or unusual browser chrome sizes
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      const detected = widthDelta > 400 && heightDelta > 100;

      if (!detected) {
        if (detectionCount.current > 0) detectionCount.current--;
        return;
      }

      detectionCount.current++;

      // Level 1 — count ≥ 8 (~12s): disable Send only
      if (detectionCount.current >= 8 && level.current < 1) {
        level.current = 1;
        onLevel1();
      }
      // Level 2 skipped — loading trap causes false UX disruption
      // Level 3 — count ≥ 50 (~75s continuous): wipe session
      if (detectionCount.current >= 50 && level.current < 3) {
        level.current = 3;
        onLevel3();
      }
    };

    const id = setInterval(check, 1500);
    return () => clearInterval(id);
  }, [onLevel1, onLevel2, onLevel3]);

  return null;
}
