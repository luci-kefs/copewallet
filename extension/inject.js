// Cope Wallet — MAIN world inject
// Sets window.ethereum and announces via EIP-6963

(function () {
  if (window._copeWalletInjected) return;
  window._copeWalletInjected = true;

  let _chainId = '0x1'; // updated after eth_chainId syncs
  let _accounts = [];
  const _listeners = {};

  // ── Message bridge to isolated world → background ──────────────────────

  let _reqId = 0;
  const _pending = new Map();

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const { data } = event;
    if (!data || data._cwSource !== 'background') return;
    const cb = _pending.get(data._cwId);
    if (cb) {
      _pending.delete(data._cwId);
      cb(data.response);
    }
  });

  function sendToBackground(payload) {
    return new Promise((resolve) => {
      const id = ++_reqId;
      _pending.set(id, resolve);
      window.postMessage({ _cwSource: 'inject', _cwId: id, payload }, '*');
    });
  }

  // Forward arbitrary eth_ / net_ / web3_ calls to background RPC proxy
  function rpcCall(method, params) {
    return sendToBackground({ type: 'CW_RPC', method, params: params || [], chainId: _chainId });
  }

  // ── EIP-1193 provider ───────────────────────────────────────────────────

  const provider = {
    isMetaMask: true,  // legacy compat — many dApps check this
    isCope: true,
    chainId: _chainId,

    async request({ method, params = [] }) {
      switch (method) {

        case 'eth_requestAccounts': {
          const r = await sendToBackground({ type: 'CW_ETH_REQUEST_ACCOUNTS' });
          if (r.error) throw new Error(r.error);
          _accounts = r.result || [];
          emit('accountsChanged', _accounts);
          return _accounts;
        }

        case 'eth_accounts': {
          const r = await sendToBackground({ type: 'CW_ETH_ACCOUNTS' });
          _accounts = r.result || [];
          return _accounts;
        }

        case 'eth_chainId':
          return _chainId;

        case 'net_version':
          return String(parseInt(_chainId, 16));

        case 'personal_sign': {
          const [message, _from] = params;
          const reqId = String(Date.now());
          const r = await sendToBackground({ type: 'CW_PERSONAL_SIGN', message, requestId: reqId });
          if (r.error) throw new Error(r.error);
          return r.result;
        }

        case 'eth_sign': {
          // eth_sign(account, message) — order reversed vs personal_sign
          const [_from, message] = params;
          const reqId = String(Date.now());
          const r = await sendToBackground({ type: 'CW_PERSONAL_SIGN', message, requestId: reqId });
          if (r.error) throw new Error(r.error);
          return r.result;
        }

        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4': {
          const [_from, typedDataJson] = params;
          const typedData = typeof typedDataJson === 'string' ? JSON.parse(typedDataJson) : typedDataJson;
          const reqId = String(Date.now());
          const r = await sendToBackground({
            type: 'CW_SIGN_TYPED',
            domain: typedData.domain,
            types: typedData.types,
            value: typedData.message,
            requestId: reqId,
          });
          if (r.error) throw new Error(r.error);
          return r.result;
        }

        case 'eth_sendTransaction': {
          const [tx] = params;
          const reqId = String(Date.now());
          const r = await sendToBackground({ type: 'CW_SEND_TX', tx, requestId: reqId, chainId: _chainId });
          if (r.error) throw new Error(r.error);
          return r.result;
        }

        case 'wallet_switchEthereumChain': {
          const [{ chainId }] = params;
          _chainId = chainId;
          provider.chainId = chainId;
          emit('chainChanged', chainId);
          return null;
        }

        case 'wallet_addEthereumChain': {
          const [chainParams] = params;
          if (chainParams?.chainId) {
            _chainId = chainParams.chainId;
            provider.chainId = chainParams.chainId;
            emit('chainChanged', chainParams.chainId);
          }
          return null;
        }

        case 'wallet_watchAsset':
          return true; // acknowledge, no-op

        // ── Everything else: proxy to public RPC ──────────────────────────
        default: {
          const r = await rpcCall(method, params);
          if (r.error) throw new Error(r.error);
          return r.result;
        }
      }
    },

    on(event, fn) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(fn);
      return this;
    },

    removeListener(event, fn) {
      if (_listeners[event]) {
        _listeners[event] = _listeners[event].filter(f => f !== fn);
      }
      return this;
    },

    // Legacy MetaMask-compat methods
    enable() {
      return this.request({ method: 'eth_requestAccounts' });
    },

    send(methodOrPayload, callbackOrParams) {
      if (typeof methodOrPayload === 'string') {
        return this.request({ method: methodOrPayload, params: callbackOrParams || [] });
      }
      // legacy: send(payload, callback)
      if (typeof callbackOrParams === 'function') {
        this.request({ method: methodOrPayload.method, params: methodOrPayload.params || [] })
          .then(r => callbackOrParams(null, { id: methodOrPayload.id, jsonrpc: '2.0', result: r }))
          .catch(e => callbackOrParams(e));
        return;
      }
      return this.request(methodOrPayload);
    },

    sendAsync(payload, callback) {
      this.request({ method: payload.method, params: payload.params || [] })
        .then(result => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
        .catch(err => callback(err, null));
    },
  };

  function emit(event, data) {
    (_listeners[event] || []).forEach(fn => { try { fn(data); } catch {} });
  }

  // Sync chainId on startup (non-blocking)
  rpcCall('eth_chainId', []).then(r => {
    if (r?.result) {
      _chainId = r.result;
      provider.chainId = r.result;
    }
  }).catch(() => {});

  // ── Set window.ethereum ────────────────────────────────────────────────

  try {
    Object.defineProperty(window, 'ethereum', {
      value: provider,
      writable: true,
      configurable: true,
    });
  } catch {
    window.ethereum = provider;
  }

  // ── EIP-6963 announcement ──────────────────────────────────────────────

  const eip6963Info = {
    uuid: 'cope-wallet-eip6963',
    name: 'Cope Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI4IiBmaWxsPSIjMTExMTExIi8+PHRleHQgeD0iNiIgeT0iMjMiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNhODU1ZjciPkM8L3RleHQ+PC9zdmc+',
    rdns: 'co.copewallet',
  };

  function announceProvider() {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: Object.freeze({ info: eip6963Info, provider }),
    }));
  }

  window.addEventListener('eip6963:requestProvider', announceProvider);
  announceProvider();

})();
