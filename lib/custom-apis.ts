const STORAGE_KEY = '__cw_custom_apis__';

export interface CustomAPI {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  balanceEndpoint: string;   // GET — {address} placeholder
  balanceJsonPath: string;   // dot-path e.g. "data.balance"
  sendEndpoint?: string;     // POST — optional
  sendBodyTemplate?: string; // JSON with {from} {to} {amount} {privateKey}
  apiKey?: string;
  apiKeyHeader?: string;
}

export function loadCustomAPIs(): CustomAPI[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomAPI[];
  } catch { return []; }
}

export function saveCustomAPI(api: CustomAPI): void {
  try {
    const existing = loadCustomAPIs().filter(a => a.id !== api.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, api]));
  } catch {}
}

export function deleteCustomAPI(id: string): void {
  try {
    const updated = loadCustomAPIs().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((cur: unknown, key) => {
    if (cur && typeof cur === 'object') return (cur as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export async function queryBalance(api: CustomAPI, address: string): Promise<number> {
  const url = api.balanceEndpoint.replace('{address}', encodeURIComponent(address));
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (api.apiKey && api.apiKeyHeader) headers[api.apiKeyHeader] = api.apiKey;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const raw = getNestedValue(json, api.balanceJsonPath);
  return Number(raw) / Math.pow(10, api.decimals);
}

export async function sendViaCustomAPI(
  api: CustomAPI,
  params: { from: string; to: string; amount: string; privateKey: string }
): Promise<string> {
  if (!api.sendEndpoint) throw new Error('No send endpoint configured');
  const body = (api.sendBodyTemplate ?? '{"from":"{from}","to":"{to}","amount":"{amount}"}')
    .replace(/{from}/g, params.from)
    .replace(/{to}/g, params.to)
    .replace(/{amount}/g, params.amount)
    .replace(/{privateKey}/g, params.privateKey);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (api.apiKey && api.apiKeyHeader) headers[api.apiKeyHeader] = api.apiKey;
  const res = await fetch(api.sendEndpoint, { method: 'POST', headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return (json?.txid ?? json?.hash ?? json?.id ?? JSON.stringify(json)) as string;
}
