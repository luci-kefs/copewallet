// Psychological Defense & Decoy UI — Block 15

export type DecoyState =
  | 'normal'
  | 'glitch'
  | 'fake_crash'
  | 'infinite_loading'
  | 'fake_success';

let _decoyState: DecoyState = 'normal';
let _badAttempts = 0;
const MAX_ATTEMPTS = 3;

export function getDecoyState(): DecoyState {
  return _decoyState;
}

export function recordBadAttempt(): DecoyState {
  _badAttempts++;
  if (_badAttempts >= MAX_ATTEMPTS) {
    // Trigger fake crash after 3 bad attempts
    _decoyState = 'glitch';
    setTimeout(() => {
      _decoyState = 'fake_crash';
    }, 400);
  }
  return _decoyState;
}

export function resetBadAttempts(): void {
  _badAttempts = 0;
  _decoyState = 'normal';
}

// Called from proxy when abuse pattern detected
export function triggerInfiniteLoading(): void {
  _decoyState = 'infinite_loading';
}

// Show fake success to brute-force attackers
export function triggerFakeSuccess(): void {
  _decoyState = 'fake_success';
}

// Fake wallet address for hallucination (Block 15 Task 4)
export function getFakeAddress(): string {
  const chars = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * 16)];
  return addr;
}

// Fake crash page HTML that looks like Chrome error
export const FAKE_CRASH_HTML = `
  <div style="font-family:sans-serif;padding:48px;background:#fff;min-height:100vh;color:#202124">
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" stroke="#dadce0" strokeWidth="2"/>
      <text x="50%" y="55%" textAnchor="middle" fontSize="28" fill="#dadce0">:(</text>
    </svg>
    <h1 style="font-size:24px;font-weight:400;margin:24px 0 8px;color:#202124">
      This page isn't working
    </h1>
    <p style="color:#5f6368;font-size:14px">
      copewallet.com is currently unable to handle this request.
    </p>
    <p style="color:#80868b;font-size:12px;margin-top:32px">HTTP ERROR 500</p>
  </div>
`;
