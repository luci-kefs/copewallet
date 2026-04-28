// Service Worker ethers loader
// Snapshots globalThis keys before/after importScripts to find what the UMD added,
// then builds self.ethers from whatever was exported.

(function () {
  const before = new Set(Object.keys(globalThis));

  try {
    importScripts('ethers.umd.min.js');
  } catch (e) {
    console.error('[CW] importScripts ethers failed:', e);
    return;
  }

  // Log what the UMD actually set
  const added = Object.keys(globalThis).filter(k => !before.has(k));
  console.log('[CW] ethers UMD added globals:', added);
  console.log('[CW] self.ethers after import:', typeof self.ethers);
  console.log('[CW] self.Wallet after import:', typeof self.Wallet);

  // Case 1: UMD set self.ethers directly (expected path)
  if (typeof self.ethers !== 'undefined' && typeof self.ethers.Wallet !== 'undefined') {
    console.log('[CW] ethers loaded via self.ethers OK');
    return;
  }

  // Case 2: UMD set individual globals (globalThis.Wallet etc.)
  if (typeof self.Wallet !== 'undefined') {
    console.log('[CW] Building self.ethers from individual globals');
    self.ethers = {
      Wallet: self.Wallet,
      Contract: self.Contract,
      JsonRpcProvider: self.JsonRpcProvider,
      formatEther: self.formatEther,
      parseEther: self.parseEther,
      formatUnits: self.formatUnits,
      parseUnits: self.parseUnits,
      getAddress: self.getAddress,
      isAddress: self.isAddress,
      hexlify: self.hexlify,
      toBeHex: self.toBeHex,
      toBigInt: self.toBigInt,
    };
    return;
  }

  // Case 3: UMD set nothing recognizable — collect whatever was added
  if (added.length > 0) {
    console.warn('[CW] ethers UMD added unknown globals, attempting to find namespace');
    // If one of the added keys has a Wallet property, it's our ethers namespace
    for (const key of added) {
      if (globalThis[key] && typeof globalThis[key].Wallet !== 'undefined') {
        self.ethers = globalThis[key];
        console.log('[CW] Found ethers namespace at globalThis.' + key);
        return;
      }
    }
    // Last resort: expose all added globals under self.ethers
    const ns = {};
    for (const key of added) ns[key] = globalThis[key];
    if (ns.Wallet || ns.Contract) { self.ethers = ns; return; }
  }

  console.error('[CW] ethers failed to load — self.ethers is still undefined');
})();
