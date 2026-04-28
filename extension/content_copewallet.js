// Cope Wallet — Content Script for copewallet.com
// Bridges the "Connect Extension" postMessage from the site to the background SW

const ALLOWED_ORIGINS = ['https://www.copewallet.com', 'https://copewallet.com', 'http://localhost:3000'];

// Tell the site the extension is installed
window.postMessage({ type: 'CW_EXT_PRESENT', version: chrome.runtime.getManifest().version }, window.location.origin);

window.addEventListener('message', async (event) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) return;
  const { data } = event;
  if (!data || typeof data !== 'object') return;

  // ── Attach request from site ─────────────────────────────────────────────
  if (data.type === 'CW_ATTACH_REQUEST') {
    const { mnemonic, passphrase } = data;
    if (!mnemonic || !passphrase) return;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'CW_ATTACH', mnemonic, passphrase });
      window.postMessage({
        type: 'CW_ATTACH_RESULT',
        ok: result?.ok || false,
        address: result?.address || null,
        error: result?.error || null,
      }, event.origin);
    } catch (err) {
      const msg = err.message || String(err);
      const isInvalidated = msg.includes('Extension context invalidated') || msg.includes('context invalidated');
      window.postMessage({
        type: 'CW_ATTACH_RESULT',
        ok: false,
        error: isInvalidated
          ? 'Extension was reloaded — please refresh this page and try again.'
          : msg,
      }, event.origin);
    }
    return;
  }

  // ── Status check from site ────────────────────────────────────────────────
  if (data.type === 'CW_STATUS_REQUEST') {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'CW_STATUS' });
      window.postMessage({ type: 'CW_STATUS_RESULT', ...result }, event.origin);
    } catch {
      window.postMessage({ type: 'CW_STATUS_RESULT', hasVault: false, isUnlocked: false, address: null }, event.origin);
    }
  }
});
