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

let _kit: InstanceType<typeof WalletKit> | null = null;

export async function getWalletKit(): Promise<InstanceType<typeof WalletKit>> {
  if (_kit) return _kit;
  const core = new Core({ projectId: PROJECT_ID });
  _kit = await WalletKit.init({ core, metadata: METADATA });
  return _kit;
}

export function clearWalletKit(): void {
  _kit = null;
}

// Pair with a wc: URI from a dApp
export async function wcPair(uri: string): Promise<void> {
  const kit = await getWalletKit();
  await kit.pair({ uri: uri.trim() });
}

// Approve a session proposal — only propose chains we know about
export async function wcApproveSession(
  proposal: WalletKitTypes.SessionProposal,
  address: string
): Promise<void> {
  const kit = await getWalletKit();
  const { id, params } = proposal;
  const requiredNs = params.requiredNamespaces ?? {};
  const optionalNs = params.optionalNamespaces ?? {};

  // Build namespaces for eip155 only
  const namespaces: Record<string, { accounts: string[]; methods: string[]; events: string[] }> = {};

  for (const key of Object.keys({ ...requiredNs, ...optionalNs })) {
    if (!key.startsWith('eip155')) continue;

    const req = requiredNs[key] ?? {};
    const opt = optionalNs[key] ?? {};

    // Collect all requested chain ids
    const chainIds = [...new Set([
      ...(req.chains ?? []),
      ...(opt.chains ?? []),
    ])];

    // Filter to chains we support
    const supportedIds = chainIds.filter(c => {
      const id = parseInt(c.split(':')[1] ?? '0');
      return CHAINS.some(ch => ch.id === id);
    });

    // If no supported chains, use eth mainnet
    const finalIds = supportedIds.length > 0 ? supportedIds : ['eip155:1'];

    const accounts = finalIds.map(c => `${c}:${address}`);

    const methods = [
      ...new Set([
        ...(req.methods ?? []),
        ...(opt.methods ?? []),
        // Always include core signing methods
        'eth_sendTransaction',
        'eth_signTransaction',
        'personal_sign',
        'eth_sign',
        'eth_signTypedData',
        'eth_signTypedData_v4',
      ]),
    ];

    const events = [...new Set([
      ...(req.events ?? []),
      ...(opt.events ?? []),
      'chainChanged',
      'accountsChanged',
    ])];

    namespaces[key] = { accounts, methods, events };
  }

  await kit.approveSession({ id, namespaces });
}

export async function wcRejectSession(proposal: WalletKitTypes.SessionProposal): Promise<void> {
  const kit = await getWalletKit();
  await kit.rejectSession({
    id: proposal.id,
    reason: { code: 4001, message: 'User rejected' },
  });
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

    // Auto-reject unsupported wallet_* methods immediately (no UI needed)
    const SUPPORTED = new Set([
      'eth_sendTransaction', 'eth_signTransaction',
      'personal_sign', 'eth_sign',
      'eth_signTypedData', 'eth_signTypedData_v4',
    ]);
    if (!SUPPORTED.has(method)) {
      return { success: false, error: `Method not supported: ${method}` };
    }

    switch (method) {
      case 'personal_sign': {
        // params: [message, address] — message is hex or utf8
        const msgHex: string = params[0];
        const bytes = ethers.isHexString(msgHex) ? ethers.getBytes(msgHex) : ethers.toUtf8Bytes(msgHex);
        const sig = await signer.signMessage(bytes);
        return { success: true, result: sig };
      }

      case 'eth_sign': {
        // Legacy: params: [address, message]
        const msgHex: string = params[1];
        const bytes = ethers.isHexString(msgHex) ? ethers.getBytes(msgHex) : ethers.toUtf8Bytes(msgHex);
        const sig = await signer.signMessage(bytes);
        return { success: true, result: sig };
      }

      case 'eth_signTypedData':
      case 'eth_signTypedData_v4': {
        // params: [address, typedDataJson]
        const typedDataStr: string = params[1];
        const typedData = typeof typedDataStr === 'string' ? JSON.parse(typedDataStr) : typedDataStr;
        const { domain, types, message } = typedData;
        // Remove EIP712Domain from types if present — ethers adds it automatically
        const filteredTypes = { ...types };
        delete filteredTypes['EIP712Domain'];
        const sig = await signer.signTypedData(domain, filteredTypes, message);
        return { success: true, result: sig };
      }

      case 'eth_signTransaction': {
        const txReq = params[0];
        const tx = await buildMaskedTransaction(
          txReq.to,
          txReq.value ? ethers.formatEther(BigInt(txReq.value)) : '0',
          address,
          chainId
        );
        const signed = await signer.signTransaction({ ...tx, type: 2 });
        return { success: true, result: signed };
      }

      case 'eth_sendTransaction': {
        const txReq = params[0];
        const provider = getProvider(chainId);
        const tx = await buildMaskedTransaction(
          txReq.to,
          txReq.value ? ethers.formatEther(BigInt(txReq.value)) : '0',
          address,
          chainId,
          txReq.data && txReq.data !== '0x' ? undefined : undefined
        );

        // Use data from dApp if present
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
  await kit.respondSessionRequest({
    topic: event.topic,
    response: { id: event.id, jsonrpc: '2.0', result },
  });
}

export async function wcRespondError(event: WalletKitTypes.SessionRequest, message: string): Promise<void> {
  const kit = await getWalletKit();
  await kit.respondSessionRequest({
    topic: event.topic,
    response: {
      id: event.id,
      jsonrpc: '2.0',
      error: { code: 4001, message },
    },
  });
}

export async function wcDisconnect(topic: string): Promise<void> {
  const kit = await getWalletKit();
  await kit.disconnectSession({ topic, reason: { code: 6000, message: 'User disconnected' } });
}

export async function wcGetActiveSessions(): Promise<Record<string, unknown>> {
  const kit = await getWalletKit();
  return kit.getActiveSessions();
}
