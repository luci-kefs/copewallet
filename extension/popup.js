// Cope Wallet — Popup Script

const $ = id => document.getElementById(id);

const screens = {
  attach: $('screenAttach'),
  unlock: $('screenUnlock'),
  dash:   $('screenDash'),
};

// ── Screen management ──────────────────────────────────────────────────────

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle('active', key === name);
  });
  $('lockBtn').style.display = (name === 'dash') ? '' : 'none';
}

// ── Startup ────────────────────────────────────────────────────────────────

let _currentAddress = null;
let _currentChainId = 1;

async function init() {
  const status = await bg('CW_STATUS');
  if (!status.hasVault) {
    showScreen('attach');
    return;
  }
  if (status.isUnlocked) {
    _currentAddress = status.address;
    await loadDashboard(status.address);
    showScreen('dash');
    return;
  }
  $('unlockAddr').textContent = fmtAddr(status.address);
  showScreen('unlock');
}

// ── Dashboard ──────────────────────────────────────────────────────────────

async function loadDashboard(address) {
  _currentAddress = address;
  $('dashAddr').textContent = address || '—';
  $('dashBalance').textContent = '…';
  $('dashBalanceUsd').textContent = 'Fetching…';
  updateChainLabel();

  if (address) {
    fetchBalance(address).catch(() => {
      $('dashBalance').textContent = 'Error';
      $('dashBalanceUsd').textContent = '';
    });
  }

  await checkPending();
}

async function fetchBalance(address) {
  const rpc = getRpcUrl(_currentChainId);
  const resp = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 1 }),
  });
  const data = await resp.json();
  const wei = BigInt(data.result || '0x0');
  const eth = Number(wei) / 1e18;
  const symbol = CHAIN_META[_currentChainId]?.symbol || 'ETH';
  $('dashBalance').textContent = eth.toFixed(6) + ' ' + symbol;

  try {
    const cgId = CHAIN_META[_currentChainId]?.coingeckoId || 'ethereum';
    const priceResp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
    const priceData = await priceResp.json();
    const price = priceData?.[cgId]?.usd || 0;
    $('dashBalanceUsd').textContent = price ? '≈ $' + (eth * price).toFixed(2) : '';
  } catch {
    $('dashBalanceUsd').textContent = '';
  }
}

// ── Chain selector ─────────────────────────────────────────────────────────

const CHAIN_META = {
  1:       { name: 'Ethereum',   symbol: 'ETH',  coingeckoId: 'ethereum',      rpc: 'https://cloudflare-eth.com' },
  8453:    { name: 'Base',       symbol: 'ETH',  coingeckoId: 'ethereum',      rpc: 'https://mainnet.base.org' },
  42161:   { name: 'Arbitrum',   symbol: 'ETH',  coingeckoId: 'ethereum',      rpc: 'https://arb1.arbitrum.io/rpc' },
  10:      { name: 'Optimism',   symbol: 'ETH',  coingeckoId: 'ethereum',      rpc: 'https://mainnet.optimism.io' },
  137:     { name: 'Polygon',    symbol: 'POL',  coingeckoId: 'matic-network', rpc: 'https://polygon-rpc.com' },
  56:      { name: 'BNB Chain',  symbol: 'BNB',  coingeckoId: 'binancecoin',   rpc: 'https://bsc-dataseed.binance.org' },
  43114:   { name: 'Avalanche',  symbol: 'AVAX', coingeckoId: 'avalanche-2',   rpc: 'https://api.avax.network/ext/bc/C/rpc' },
  250:     { name: 'Fantom',     symbol: 'FTM',  coingeckoId: 'fantom',        rpc: 'https://rpc.ftm.tools' },
  324:     { name: 'zkSync Era', symbol: 'ETH',  coingeckoId: 'ethereum',      rpc: 'https://mainnet.era.zksync.io' },
  59144:   { name: 'Linea',      symbol: 'ETH',  coingeckoId: 'ethereum',      rpc: 'https://rpc.linea.build' },
  100:     { name: 'Gnosis',     symbol: 'xDAI', coingeckoId: 'xdai',          rpc: 'https://rpc.gnosischain.com' },
};

function getRpcUrl(chainId) {
  return CHAIN_META[chainId]?.rpc || 'https://cloudflare-eth.com';
}

function updateChainLabel() {
  const meta = CHAIN_META[_currentChainId];
  $('chainSelect').value = String(_currentChainId);
}

// Populate chain dropdown
const chainSelect = $('chainSelect');
Object.entries(CHAIN_META).forEach(([id, meta]) => {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = meta.name;
  chainSelect.appendChild(opt);
});
chainSelect.value = '1';

chainSelect.addEventListener('change', () => {
  _currentChainId = parseInt(chainSelect.value, 10);
  if (_currentAddress) fetchBalance(_currentAddress).catch(() => {});
});

// ── Pending approval ───────────────────────────────────────────────────────

let _pendingId = null;

async function checkPending() {
  const all = await new Promise(r => chrome.storage.session.get(null, r));
  const pendingKey = Object.keys(all).find(k => k.startsWith('cw_pending_'));
  if (!pendingKey) {
    $('pendingSection').style.display = 'none';
    $('dashMain').style.display = '';
    return;
  }
  _pendingId = pendingKey.replace('cw_pending_', '');
  const payload = all[pendingKey];
  showPendingRequest(payload);
}

function showPendingRequest(payload) {
  $('pendingSection').style.display = '';
  $('dashMain').style.display = 'none';

  if (payload.type === 'personal_sign') {
    $('pendingTitle').textContent = 'Signature Request';
    // Decode hex message to readable text if possible
    let msg = payload.message || '';
    if (msg.startsWith('0x')) {
      try { msg = decodeURIComponent(escape(String.fromCharCode(...new Uint8Array(msg.slice(2).match(/.{2}/g).map(b => parseInt(b, 16)))))); } catch {}
    }
    $('pendingDetail').textContent = msg;
  } else if (payload.type === 'typed_data') {
    $('pendingTitle').textContent = 'Sign Typed Data';
    $('pendingDetail').textContent = JSON.stringify(payload.value, null, 2);
  } else if (payload.type === 'send_tx') {
    $('pendingTitle').textContent = 'Send Transaction';
    const tx = payload.tx;
    const weiVal = tx.value ? BigInt(tx.value) : 0n;
    const ethVal = (Number(weiVal) / 1e18).toFixed(6);
    $('pendingDetail').textContent =
      `To: ${tx.to || '?'}\nValue: ${ethVal} ETH\nData: ${tx.data && tx.data !== '0x' ? tx.data.slice(0, 42) + '…' : 'none'}`;
  }
}

// Auto-refresh when a new pending request arrives while popup is open
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session') return;
  const newPending = Object.keys(changes).find(k => k.startsWith('cw_pending_') && changes[k].newValue);
  if (newPending) checkPending();
});

$('approveBtn').addEventListener('click', async () => {
  if (!_pendingId) return;
  await bg('CW_APPROVE', { requestId: _pendingId, approved: true });
  _pendingId = null;
  $('pendingSection').style.display = 'none';
  $('dashMain').style.display = '';
});

$('rejectBtn').addEventListener('click', async () => {
  if (!_pendingId) return;
  await bg('CW_APPROVE', { requestId: _pendingId, approved: false });
  _pendingId = null;
  $('pendingSection').style.display = 'none';
  $('dashMain').style.display = '';
});

// ── Lock / Wipe ────────────────────────────────────────────────────────────

$('lockBtn').addEventListener('click', async () => {
  await bg('CW_LOCK');
  _currentAddress = null;
  init();
});

[$('wipeBtn'), $('wipeBtnDash')].forEach(btn => btn && btn.addEventListener('click', async () => {
  if (!confirm('Disconnect and wipe all extension data?\nYou can re-attach from copewallet.com.')) return;
  await bg('CW_WIPE');
  _currentAddress = null;
  init();
}));

// ── Attach screen ──────────────────────────────────────────────────────────

$('openSiteBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.copewallet.com' });
  window.close();
});

// ── Unlock screen ──────────────────────────────────────────────────────────

$('pinInput').addEventListener('keydown', e => { if (e.key === 'Enter') doUnlock(); });
$('unlockBtn').addEventListener('click', doUnlock);

async function doUnlock() {
  const passphrase = $('pinInput').value.trim();
  if (!passphrase) return;
  $('unlockErr').textContent = '';
  $('unlockBtn').disabled = true;
  $('unlockBtn').textContent = 'Unlocking…';
  const result = await bg('CW_UNLOCK', { passphrase });
  $('unlockBtn').disabled = false;
  $('unlockBtn').textContent = 'Unlock';
  if (result.error) {
    $('unlockErr').textContent = result.error;
    $('pinInput').value = '';
    return;
  }
  $('pinInput').value = '';
  _currentAddress = result.address;
  await loadDashboard(result.address);
  showScreen('dash');
}

// ── Address copy ───────────────────────────────────────────────────────────

$('dashAddr').addEventListener('click', () => {
  const addr = $('dashAddr').textContent;
  if (!addr || addr === '—') return;
  navigator.clipboard.writeText(addr).then(() => {
    $('copyHint').textContent = 'Copied!';
    setTimeout(() => { $('copyHint').textContent = 'Click to copy'; }, 1500);
  });
});

// ── Send flow ──────────────────────────────────────────────────────────────

$('sendBtn').addEventListener('click', () => {
  $('sendForm').style.display = '';
  $('sendBtn').style.display = 'none';
  $('receiveBtn').style.display = 'none';
  $('sendErr').textContent = '';
  $('sendErr').style.color = '#ff8888';
});

$('backBtn').addEventListener('click', () => {
  $('sendForm').style.display = 'none';
  $('sendBtn').style.display = '';
  $('receiveBtn').style.display = '';
  $('sendErr').textContent = '';
});

$('sendSubmit').addEventListener('click', async () => {
  const to = $('sendTo').value.trim();
  const amount = $('sendAmount').value.trim();
  $('sendErr').textContent = '';

  if (!to || !/^0x[0-9a-fA-F]{40}$/.test(to)) {
    $('sendErr').textContent = 'Invalid address (must be 0x + 40 hex chars)';
    return;
  }
  const amtFloat = parseFloat(amount);
  if (!amtFloat || amtFloat <= 0) {
    $('sendErr').textContent = 'Invalid amount';
    return;
  }

  $('sendSubmit').disabled = true;
  $('sendSubmit').textContent = 'Sending…';

  // Build tx — nonce + gasPrice from RPC
  let nonce = '0x0', gasPrice = '0x3B9ACA00'; // 1 gwei fallback
  try {
    const rpc = getRpcUrl(_currentChainId);
    const [nonceResp, gpResp] = await Promise.all([
      fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc:'2.0', method:'eth_getTransactionCount', params:[_currentAddress,'latest'], id:1 }) }),
      fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc:'2.0', method:'eth_gasPrice', params:[], id:2 }) }),
    ]);
    const nonceData = await nonceResp.json();
    const gpData    = await gpResp.json();
    nonce    = nonceData.result || '0x0';
    gasPrice = gpData.result    || gasPrice;
  } catch {}

  const weiVal = BigInt(Math.round(amtFloat * 1e18));
  const tx = {
    to,
    value:    '0x' + weiVal.toString(16),
    chainId:  _currentChainId,
    nonce,
    gasPrice,
    gasLimit: '0x5208', // 21000 — standard ETH transfer
  };

  const reqId = String(Date.now());
  const result = await bg('CW_SEND_TX', { tx, requestId: reqId, chainId: _currentChainId });

  $('sendSubmit').disabled = false;
  $('sendSubmit').textContent = 'Send';

  if (result.error) {
    $('sendErr').textContent = result.error;
    return;
  }

  const txHash = result.result || '';
  $('sendErr').style.color = '#88ff88';
  $('sendErr').textContent = 'Sent! ' + txHash.slice(0, 18) + '…';
  $('sendTo').value = '';
  $('sendAmount').value = '';
  // Refresh balance after 3s
  setTimeout(() => { if (_currentAddress) fetchBalance(_currentAddress).catch(() => {}); }, 3000);
  setTimeout(() => { $('sendErr').textContent = ''; $('sendErr').style.color = '#ff8888'; }, 6000);
});

// ── Receive ────────────────────────────────────────────────────────────────

$('receiveBtn').addEventListener('click', () => {
  const addr = $('dashAddr').textContent;
  if (!addr || addr === '—') return;
  navigator.clipboard.writeText(addr).then(() => {
    $('copyHint').textContent = 'Address copied!';
    setTimeout(() => { $('copyHint').textContent = 'Click to copy'; }, 2000);
  });
});

// ── Background messaging ───────────────────────────────────────────────────

function bg(type, extra = {}) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type, ...extra }, r => {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else resolve(r || {});
    });
  });
}

// ── Utils ──────────────────────────────────────────────────────────────────

function fmtAddr(addr) {
  if (!addr) return '—';
  return addr.slice(0, 8) + '…' + addr.slice(-6);
}

// ── Start ──────────────────────────────────────────────────────────────────
init();
