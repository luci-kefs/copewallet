'use client';
// DevTools Detection — Block 34 (Modern Chromium-safe methods)

import { useEffect, useRef } from 'react';
import { detectToStringTampering } from '@/lib/singularity';

interface DevToolsGuardProps {
  onLevel1: () => void; // disable Send button
  onLevel2: () => void; // infinite loading trap
  onLevel3: () => void; // full wipe
}

export function DevToolsGuard({ onLevel1, onLevel2, onLevel3 }: DevToolsGuardProps) {
  const detectionCount = useRef(0);
  const level = useRef(0);

  useEffect(() => {
    // Task 3: toString() tampering check (run once)
    if (detectToStringTampering()) {
      onLevel3();
      return;
    }

    const check = () => {
      let detected = false;

      // Task 1: Size-delta detection (undocked DevTools)
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      if (widthDelta > 160 || heightDelta > 160) {
        detected = true;
      }

      // Task 2: performance.now() timing gap
      const t0 = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const elapsed = performance.now() - t0;
      if (elapsed > 100) {
        detected = true;
      }

      if (!detected) {
        detectionCount.current = 0;
        return;
      }

      // Task 4: Graduated response
      detectionCount.current++;

      if (detectionCount.current === 1 && level.current < 1) {
        level.current = 1;
        onLevel1(); // Disable Send
      } else if (detectionCount.current >= 3 && level.current < 2) {
        level.current = 2;
        onLevel2(); // Infinite loading trap
      } else if (detectionCount.current >= 6 && level.current < 3) {
        level.current = 3;
        onLevel3(); // Full wipe
      }
    };

    // Run every 1500ms (Block 34 Task 1)
    const id = setInterval(check, 1500);
    return () => clearInterval(id);
  }, [onLevel1, onLevel2, onLevel3]);

  return null; // invisible sentinel
}
