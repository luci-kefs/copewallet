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
      let detected = false;

      // Size-delta detection: undocked/docked DevTools changes window dimensions
      // Threshold raised to 200px to avoid false positives on unusual resolutions
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      if (widthDelta > 200 || heightDelta > 200) {
        detected = true;
      }

      if (!detected) {
        // Gradually decay count when not detected
        if (detectionCount.current > 0) detectionCount.current--;
        return;
      }

      detectionCount.current++;

      // Level 1 — count ≥ 5 (~7.5s continuous): disable Send only
      if (detectionCount.current >= 5 && level.current < 1) {
        level.current = 1;
        onLevel1();
      }
      // Level 2 — count ≥ 20 (~30s continuous): loading trap
      if (detectionCount.current >= 20 && level.current < 2) {
        level.current = 2;
        onLevel2();
      }
      // Level 3 — count ≥ 40 (~60s continuous): wipe (no redirect)
      if (detectionCount.current >= 40 && level.current < 3) {
        level.current = 3;
        onLevel3();
      }
    };

    const id = setInterval(check, 1500);
    return () => clearInterval(id);
  }, [onLevel1, onLevel2, onLevel3]);

  return null;
}
