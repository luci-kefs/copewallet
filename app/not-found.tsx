'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NotFound() {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const total = 5000;
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / total) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        window.location.replace('/');
      }
    }, 50);
    return () => clearInterval(tick);
  }, []);

  return (
    <main className="relative flex flex-col items-center justify-between min-h-screen bg-black text-white py-12">
      {/* Countdown bar */}
      <div
        className="fixed top-0 left-0 h-px bg-white transition-all"
        style={{ width: `${progress}%`, opacity: 0.3 }}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="font-thin text-white tracking-widest" style={{ fontSize: 11 }}>
          404 / Lost in the Void
        </p>
        <Link
          href="/"
          className="font-extralight text-gray-500 hover:text-white transition-colors tracking-widest"
          style={{ fontSize: 10 }}
        >
          Return to Presence
        </Link>
      </div>

      <div className="pb-4">
        <p className="font-extralight text-gray-600 tracking-widest" style={{ fontSize: 11 }}>
          by{'\u200c'} Aethi{'\u200c'}lm
        </p>
        <p className="font-extralight text-gray-700 tracking-widest text-center mt-1" style={{ fontSize: 9 }}>
          Made With Cope{'\u200c'} by{'\u200c'} Aethi{'\u200c'}lm
        </p>
      </div>
    </main>
  );
}
