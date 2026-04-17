// WalletConnect v2 — Reown WalletKit integration
import { Core } from '@walletconnect/core';
import { WalletKit, WalletKitTypes } from '@reown/walletkit';
import { ethers } from 'ethers';
import { getReassembledData } from './memory-vault';
import { zeroFill } from './crypto';
import { buildMaskedTransaction, stealthDelay } from './transaction';
import { getProvider } from './provider';
import { CHAINS } from './chains';
import type { ScatteredStore } from './memory-vault';

const PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID)!;

const METADATA = {
  name: 'Cope Wallet',
  description: 'Secure ephemeral EVM wallet',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://copewallet.com',
  icons: ['https://copewallet.com/favicon.ico'],
};

// ── Singleton — one Core + one WalletKit, ever ────────────────────────────────
let _core: InstanceType<typeof Core> | null = null;
let _kit: InstanceType<typeof WalletKit> | null = null;
let _initPromise: Promise<InstanceType<typeof WalletKit>> | null = null;

// Global event callbacks — registered by the modal, fired regardless of mount order
type ProposalCb = (p: WalletKitTypes.SessionProposal) => void;
type RequestCb  = (e: WalletKitTypes.SessionRequest)  => void;
type DeleteCb   = () => void;

let _onProposal: ProposalCb | null = null;
let _onRequest:  RequestCb  | null = null;
let _onDelete:   DeleteCb   | null = null;

// Queued events that arrived before listeners registered
let _queuedProposal: WalletKitTypes.SessionProposal | null = null;
let _queuedRequest:  WalletKitTypes.SessionRequest  | null = null;

export function wcSetListeners(opts: {
  onProposal: ProposalCb;
  onRequest:  RequestCb;
  onDelete:   DeleteCb;
}): void {
  _onProposal = opts.onProposal;
  _onRequest  = opts.onRequest;
  _onDelete   = opts.onDelete;

  // Flush queued events immediately
  if (_queuedProposal) { opts.onProposal(_queuedProposal); _queuedProposal = null; }
  if (_queuedRequest)  { opts.onRequest(_queuedRequest);   _queuedRequest  = null; }
}

export function wcClearListeners(): void {
  _onProposal = null;
  _onRequest  = null;
  _onDelete   = null;
}

export async function getWalletKit(): Promise<InstanceType<typeof WalletKit>> {
  if (_kit) return _kit;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    if (!_core) {
      _core = new Core({ projectId: PROJECT_ID });
    }
    _kit = await WalletKit.init({ core: _core, metadata: METADATA });

    // Wire events ONCE on the singleton
    _kit.on('session_proposal', (proposal: WalletKitTypes.SessionProposal) => {
      if (_onProposal) _onProposal(proposal);
      else _queuedProposal = proposal; // modal not mounted yet — queue it
    });

    _kit.on('session_request', async (event: WalletKitTypes.SessionRequest) => {
      const { method } = event.params.request;
      const SUPPORTED = new Set([
        'eth_sendTransaction', 'eth_signTransaction',
        'personal_sign', 'eth_sign',
        'eth_signTypedData', 'eth_signTypedData_v4',
      ]);
      // Auto-reject unsupported immediately, no UI
      if (!SUPPORTED.has(method)) {
        try { await wcRespondError(event, `Method not supported: ${method}`); } catch {}
        return;
      }
      if (_onRequest) _onRequest(event);
      else _queuedRequest = event;
    });

    _kit.on('session_delete', () => {
      if (_onDelete) _onDelete();
    });

    return _kit;
  })();

  return _initPromise;
}

export async function clearWalletKit(): Promise<void> {
  if (_kit) {
    try {
      const sessions = _kit.getActiveSessions();
      await Promise.allSettled(
        Object.keys(sessions).map(topic =>
          _kit!.disconnectSession({ topic, reason: { code: 6000, message: 'Wallet cleared' } })
        )
      );
    } catch {}
  }
  wcClearListeners();
  _queuedProposal = null;
  _queuedRequest  = null;
  _kit = null;
  _core = null;
  _initPromise = null;
}

// ── Pairing ───────────────────────────────────────────────────────────────────
export async function wcPair(uri: string): Promise<void> {
  const kit = await getWalletKit();
  await kit.pair({ uri: uri.trim() });
}

// ── Session approval ──────────────────────────────────────────────────────────
export async function wcApproveSession(
  proposal: WalletKitTypes.SessionProposal,
  address: string
): Promise<void> {
  const kit = await getWalletKit();
  const { id, params } = proposal;
  const requiredNs = params.requiredNamespaces ?? {};
  const optionalNs = params.optionalNamespaces ?? {};

  const namespaces: Record<string, { accounts: string[]; methods: string[]; events: string[] }> = {};

  for (const key of Object.keys({ ...requiredNs, ...optionalNs })) {
    if (!key.startsWith('eip155')) continue;

    const req = requiredNs[key] ?? {};
    const opt = optionalNs[key] ?? {};

    const chainIds = [...new Set([...(req.chains ?? []), ...(opt.chains ?? [])])];

    const supportedIds = chainIds.filter(c => {
      const cid = parseInt(c.split(':')[1] ?? '0');
      return CHAINS.some(ch => ch.id === cid);
    });
    const finalIds = supportedIds.length > 0 ? supportedIds : ['eip155:1'];
    const accounts = finalIds.map(c => `${c}:${address}`);

    const methods = [...new Set([
      ...(req.methods ?? []),
      ...(opt.methods ?? []),
      'eth_sendTransaction', 'eth_signTransaction',
      'personal_sign', 'eth_sign',
      'eth_signTypedData', 'eth_signTypedData_v4',
    ])];

    const events = [...new Set([
      ...(req.events ?? []),
      ...(opt.events ?? []),
      'chainChanged', 'accountsChanged',
    ])];

    namespaces[key] = { accounts, methods, events };
  }

  await kit.approveSession({ id, namespaces });
}

export async function wcRejectSession(proposal: WalletKitTypes.SessionProposal): Promise<void> {
  const kit = await getWalletKit();
  await kit.rejectSession({ id: proposal.id, reason: { code: 4001, message: 'User rejected' } });
}

// ── Request handling ──────────────────────────────────────────────────────────
export type WcRequestResult = { success: true; result: unknown } | { success: false; error: string };

export async function handleWcRequest(
  event: WalletKitTypes.SessionRequest,
  store: ScatteredStore,
  address: string
): Promise<WcRequestResult> {
  const { method, params } = event.params.request;
  const chainId = parseInt(event.params.chainId?.split(':')[1] ?? '1');

  let keyBytes: Uint8Array | null = null;
  try {
    const rawKey = getReassembledData(store);
    const hexKey = rawKey.startsWith('0x') ? rawKey : '0x' + rawKey;
    keyBytes = new Uint8Array(Buffer.from(hexKey.slice(2), 'hex'));
    const signer = new ethers.Wallet(hexKey);

    switch (method) {
      case 'personal_sign': {
        const msgHex: string = params[0];
        const bytes = ethers.isHexString(msgHex) ? ethers.getBytes(msgHex) : ethers.toUtf8Bytes(msgHex);
        return { success: true, result: await signer.signMessage(bytes) };
      }

      case 'eth_sign': {
        const msgHex: string = params[1];
        const bytes = ethers.isHexString(msgHex) ? ethers.getBytes(msgHex) : ethers.toUtf8Bytes(msgHex);
        return { success: true, result: await signer.signMessage(bytes) };
      }

      case 'eth_signTypedData':
      case 'eth_signTypedData_v4': {
        const typedDataStr: string = params[1];
        const typedData = typeof typedDataStr === 'string' ? JSON.parse(typedDataStr) : typedDataStr;
        const { domain, types, message } = typedData;
        const filteredTypes = { ...types };
        delete filteredTypes['EIP712Domain'];
        return { success: true, result: await signer.signTypedData(domain, filteredTypes, message) };
      }

      case 'eth_signTransaction': {
        const txReq = params[0];
        const tx = await buildMaskedTransaction(
          txReq.to,
          txReq.value ? ethers.formatEther(BigInt(txReq.value)) : '0',
          address,
          chainId
        );
        return { success: true, result: await signer.signTransaction({ ...tx, type: 2 }) };
      }

      case 'eth_sendTransaction': {
        const txReq = params[0];
        const provider = getProvider(chainId);
        const tx = await buildMaskedTransaction(
          txReq.to,
          txReq.value ? ethers.formatEther(BigInt(txReq.value)) : '0',
          address,
          chainId
        );
        const finalTx = {
          ...tx,
          ...(txReq.data && txReq.data !== '0x' ? { data: txReq.data, gasLimit: 200000n } : {}),
        };
        await stealthDelay();
        const signed = await signer.signTransaction({ ...finalTx, type: 2 });
        const hash = await provider.send('eth_sendRawTransaction', [signed]) as string;
        return { success: true, result: hash };
      }

      default:
        return { success: false, error: `Method not supported: ${method}` };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Request failed' };
  } finally {
    if (keyBytes) { zeroFill(keyBytes); keyBytes = null; }
  }
}

export async function wcRespondSuccess(event: WalletKitTypes.SessionRequest, result: unknown): Promise<void> {
  const kit = await getWalletKit();
  await kit.respondSessionRequest({ topic: event.topic, response: { id: event.id, jsonrpc: '2.0', result } });
}

export async function wcRespondError(event: WalletKitTypes.SessionRequest, message: string): Promise<void> {
  const kit = await getWalletKit();
  await kit.respondSessionRequest({
    topic: event.topic,
    response: { id: event.id, jsonrpc: '2.0', error: { code: 4001, message } },
  });
}

export async function wcDisconnect(topic: string): Promise<void> {
  const kit = await getWalletKit();
  await kit.disconnectSession({ topic, reason: { code: 6000, message: 'User disconnected' } });
}

export async function wcGetActiveSessions(): Promise<Record<string, unknown>> {
  const kit = await getWalletKit();
  return kit.getActiveSessions() as unknown as Record<string, unknown>;
}
