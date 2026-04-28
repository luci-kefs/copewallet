// Cope Wallet — Background Service Worker (Manifest V3)
// Handles: attach flow, key storage, signing queue, dApp request routing

const STORAGE_KEY = 'cw_vault';
const SESSION_KEY = 'cw_session';

// ── Crypto helpers ─────────────────────────────────────────────────────────

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return arr;
}

async function encryptMnemonic(mnemonic, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(mnemonic));
  return { salt: toHex(salt), iv: toHex(iv), ct: toHex(ct) };
}

async function decryptMnemonic(vault, passphrase) {
  const salt = fromHex(vault.salt);
  const iv = fromHex(vault.iv);
  const ct = fromHex(vault.ct);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plain);
}

// ── Ethers loading ─────────────────────────────────────────────────────────

function loadEthers() {
  if (typeof self.ethers !== 'undefined') return self.ethers;
  try { importScripts('ethers.umd.min.js'); } catch (e) { console.error('[CW] ethers load fail', e); }
  return self.ethers;
}

// ── Session state (cleared when browser closes) ────────────────────────────

async function getSession() {
  return new Promise(resolve => {
    chrome.storage.session.get([SESSION_KEY], r => resolve(r[SESSION_KEY] || null));
  });
}

async function setSession(data) {
  return new Promise(resolve => {
    chrome.storage.session.set({ [SESSION_KEY]: data }, resolve);
  });
}

async function clearSession() {
  return new Promise(resolve => {
    chrome.storage.session.remove([SESSION_KEY], resolve);
  });
}

// ── Persistent vault ───────────────────────────────────────────────────────

async function getVault() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], r => resolve(r[STORAGE_KEY] || null));
  });
}

async function saveVault(vault) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: vault }, resolve);
  });
}

async function clearVault() {
  return new Promise(resolve => {
    chrome.storage.local.remove([STORAGE_KEY], resolve);
  });
}

// ── Signing helpers ────────────────────────────────────────────────────────

async function deriveWallet(mnemonic) {
  const ethers = loadEthers();
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  return { address: wallet.address, privateKey: wallet.privateKey };
}

function normalizeTx(tx) {
  // ethers v6 uses gasLimit; dApps send gas
  const out = { ...tx };
  if (out.gas && !out.gasLimit) { out.gasLimit = out.gas; delete out.gas; }
  // chainId must be a number for ethers v6
  if (out.chainId !== undefined) out.chainId = parseChainId(out.chainId);
  // Remove null/undefined fields ethers dislikes
  Object.keys(out).forEach(k => { if (out[k] === null || out[k] === undefined) delete out[k]; });
  return out;
}

async function signTransaction(mnemonic, txRequest) {
  const ethers = loadEthers();
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  return wallet.signTransaction(normalizeTx(txRequest));
}

async function signMessage(mnemonic, message) {
  const ethers = loadEthers();
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  return wallet.signMessage(message);
}

async function signTypedData(mnemonic, domain, types, value) {
  const ethers = loadEthers();
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  return wallet.signTypedData(domain, types, value);
}

// ── Chain → public RPC ─────────────────────────────────────────────────────

function parseChainId(chainId) {
  if (!chainId) return 1;
  if (typeof chainId === 'number') return chainId;
  // hex string like "0x1" or "0x89"
  return Number(BigInt(chainId));
}

function getRpcForChain(chainId) {
  const id = parseChainId(chainId);
  const rpcs = {
    1:       'https://cloudflare-eth.com',
    8453:    'https://mainnet.base.org',
    42161:   'https://arb1.arbitrum.io/rpc',
    10:      'https://mainnet.optimism.io',
    137:     'https://polygon-rpc.com',
    56:      'https://bsc-dataseed.binance.org',
    43114:   'https://api.avax.network/ext/bc/C/rpc',
    250:     'https://rpc.ftm.tools',
    324:     'https://mainnet.era.zksync.io',
    59144:   'https://rpc.linea.build',
    534352:  'https://rpc.scroll.io',
    81457:   'https://rpc.blast.io',
    100:     'https://rpc.gnosischain.com',
    43220:   'https://forno.celo.org',
  };
  return rpcs[id] || rpcs[1];
}

async function proxyRpc(chainId, method, params) {
  const url = getRpcForChain(chainId);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: params || [] }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result;
}

// ── Pending approvals — persisted to survive SW termination ───────────────
// We store pending request metadata in chrome.storage.session so that if the
// SW is killed while waiting, on wake-up the popup can still read the request
// and the user's Approve/Reject sends CW_APPROVE which resolves via a
// chrome.storage.onChanged listener reconstituting the flow.

const pendingRequests = new Map(); // requestId → { resolve }

async function setPendingRequest(requestId, payload) {
  await chrome.storage.session.set({ [`cw_pending_${requestId}`]: payload });
  // Badge to alert user
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#a855f7' });
}

async function clearPendingRequest(requestId) {
  await chrome.storage.session.remove([`cw_pending_${requestId}`]);
  // Clear badge if no more pending
  const all = await new Promise(r => chrome.storage.session.get(null, r));
  const remaining = Object.keys(all).filter(k => k.startsWith('cw_pending_'));
  if (remaining.length === 0) chrome.action.setBadgeText({ text: '' });
}

function requestApproval(requestId, payload) {
  return new Promise(async (resolve) => {
    pendingRequests.set(requestId, { resolve });
    await setPendingRequest(requestId, payload);
    // 5-minute timeout
    setTimeout(async () => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.get(requestId).resolve(false);
        pendingRequests.delete(requestId);
        await clearPendingRequest(requestId);
      }
    }, 300000);
  });
}

// ── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then(sendResponse).catch(err => {
    console.error('[CW bg] Error:', err);
    sendResponse({ error: err.message || String(err) });
  });
  return true; // keep async channel open
});

async function handleMessage(msg, _sender) {
  const { type } = msg;

  // ── Attach ────────────────────────────────────────────────────────────────
  if (type === 'CW_ATTACH') {
    const { mnemonic, passphrase } = msg;
    const vault = await encryptMnemonic(mnemonic, passphrase);
    const { address } = await deriveWallet(mnemonic);
    vault.address = address;
    await saveVault(vault);
    await setSession({ mnemonic, address, unlockedAt: Date.now() });
    return { ok: true, address };
  }

  // ── Unlock ────────────────────────────────────────────────────────────────
  if (type === 'CW_UNLOCK') {
    const { passphrase } = msg;
    const vault = await getVault();
    if (!vault) return { error: 'No vault — attach first' };
    try {
      const mnemonic = await decryptMnemonic(vault, passphrase);
      const { address } = await deriveWallet(mnemonic);
      await setSession({ mnemonic, address, unlockedAt: Date.now() });
      return { ok: true, address };
    } catch {
      return { error: 'Wrong passphrase' };
    }
  }

  // ── Lock ──────────────────────────────────────────────────────────────────
  if (type === 'CW_LOCK') {
    await clearSession();
    return { ok: true };
  }

  // ── Wipe ──────────────────────────────────────────────────────────────────
  if (type === 'CW_WIPE') {
    await clearSession();
    await clearVault();
    chrome.action.setBadgeText({ text: '' });
    return { ok: true };
  }

  // ── Status ────────────────────────────────────────────────────────────────
  if (type === 'CW_STATUS') {
    const vault = await getVault();
    const session = await getSession();
    return {
      hasVault: !!vault,
      isUnlocked: !!session,
      address: vault?.address || session?.address || null,
    };
  }

  // ── EIP-1193: eth_requestAccounts ─────────────────────────────────────────
  if (type === 'CW_ETH_REQUEST_ACCOUNTS') {
    const session = await getSession();
    if (!session) {
      chrome.action.setBadgeText({ text: '🔒' });
      return { error: 'Locked — click the Cope Wallet icon to unlock' };
    }
    chrome.action.setBadgeText({ text: '' });
    return { result: [session.address] };
  }

  // ── EIP-1193: eth_accounts ────────────────────────────────────────────────
  if (type === 'CW_ETH_ACCOUNTS') {
    const session = await getSession();
    return { result: session ? [session.address] : [] };
  }

  // ── EIP-1193: personal_sign ───────────────────────────────────────────────
  if (type === 'CW_PERSONAL_SIGN') {
    const { message, requestId } = msg;
    const session = await getSession();
    if (!session) return { error: 'Locked' };
    const approved = await requestApproval(requestId, { type: 'personal_sign', message });
    if (!approved) return { error: 'User rejected' };
    await clearPendingRequest(requestId);
    const sig = await signMessage(session.mnemonic, message);
    return { result: sig };
  }

  // ── EIP-1193: eth_signTypedData_v4 ────────────────────────────────────────
  if (type === 'CW_SIGN_TYPED') {
    const { domain, types, value, requestId } = msg;
    const session = await getSession();
    if (!session) return { error: 'Locked' };
    const approved = await requestApproval(requestId, { type: 'typed_data', domain, types, value });
    if (!approved) return { error: 'User rejected' };
    await clearPendingRequest(requestId);
    const sig = await signTypedData(session.mnemonic, domain, types, value);
    return { result: sig };
  }

  // ── EIP-1193: eth_sendTransaction ─────────────────────────────────────────
  if (type === 'CW_SEND_TX') {
    const { tx, requestId, chainId: msgChainId } = msg;
    const session = await getSession();
    if (!session) return { error: 'Locked' };
    const approved = await requestApproval(requestId, { type: 'send_tx', tx });
    if (!approved) return { error: 'User rejected' };
    await clearPendingRequest(requestId);
    try {
      // Resolve chainId — prefer explicit msg chainId, fallback to tx field
      const chainId = msgChainId || tx.chainId;
      const signed = await signTransaction(session.mnemonic, tx);
      const rpcUrl = getRpcForChain(chainId);
      const resp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_sendRawTransaction', params: [signed], id: 1 }),
      });
      const data = await resp.json();
      if (data.error) return { error: data.error.message };
      return { result: data.result };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ── Approval response from popup ──────────────────────────────────────────
  if (type === 'CW_APPROVE') {
    const { requestId, approved } = msg;
    const pending = pendingRequests.get(requestId);
    if (pending) {
      pending.resolve(approved);
      pendingRequests.delete(requestId);
    }
    await clearPendingRequest(requestId);
    return { ok: true };
  }

  // ── RPC pass-through — all other eth_ methods ─────────────────────────────
  if (type === 'CW_RPC') {
    const { method, params, chainId } = msg;
    try {
      const result = await proxyRpc(chainId || 1, method, params);
      return { result };
    } catch (e) {
      return { error: e.message };
    }
  }

  return { error: 'Unknown message type: ' + type };
}

console.log('[Cope Wallet] Background service worker started');
