// History Scrubbing & Temporal Erasure — Block 14

// Singleton tab check (Block 14 Task 4)
const TAB_KEY = '_cope_tab_lock';

export function checkSingletonTab(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const existing = sessionStorage.getItem(TAB_KEY);
    if (existing) {
      // Another tab is open — redirect
      const ext = process.env.NEXT_PUBLIC_EXTERNAL_LINK || 'https://www.google.com';
      window.location.replace(ext);
      return false;
    }
    sessionStorage.setItem(TAB_KEY, Date.now().toString());

    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem(TAB_KEY);
    });
  } catch {}
  return true;
}

// URL masking — always stay at root (Block 14 Task 1)
export function startHistoryScrubber(): void {
  if (typeof window === 'undefined') return;

  const scrub = () => {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  };

  window.addEventListener('popstate', scrub);
  window.addEventListener('pushstate', scrub);

  // Patch history methods
  const origPush = window.history.pushState.bind(window.history);
  const origReplace = window.history.replaceState.bind(window.history);

  window.history.pushState = (...args) => {
    origPush(...args);
    scrub();
  };
  window.history.replaceState = (...args) => {
    origReplace(...args);
  };
}
