// GoPlus Security client helpers — all calls go through /api/scan proxy.

export type RiskLevel = 'safe' | 'warning' | 'danger' | 'unknown';

export interface TokenRisk {
  level: RiskLevel;
  flags: string[];
}

export interface AddressRisk {
  level: RiskLevel;
  flags: string[];
}

export interface DAppRisk {
  level: RiskLevel;
  flags: string[];
}

// ── Token (ERC-20) security scan ──────────────────────────────────────────────

export async function scanToken(chainId: number, contractAddress: string): Promise<TokenRisk> {
  try {
    const res = await fetch(`/api/scan?action=token&chainId=${chainId}&address=${contractAddress}`);
    if (!res.ok) return { level: 'unknown', flags: [] };
    const data = await res.json();
    const result = data?.result?.[contractAddress.toLowerCase()] as Record<string, string> | undefined;
    if (!result) return { level: 'unknown', flags: [] };

    const flags: string[] = [];
    let level: RiskLevel = 'safe';

    // Hard danger signals
    if (result.is_honeypot === '1') { flags.push('Honeypot — cannot sell'); level = 'danger'; }
    if (result.is_blacklisted === '1') { flags.push('Blacklist function enabled'); level = 'danger'; }
    if (result.can_take_back_ownership === '1') { flags.push('Owner can reclaim contract'); level = 'danger'; }
    if (result.owner_change_balance === '1') { flags.push('Owner can change balances'); level = 'danger'; }
    if (result.hidden_owner === '1') { flags.push('Hidden owner'); level = 'danger'; }
    if (result.selfdestruct === '1') { flags.push('Selfdestruct function'); level = 'danger'; }
    if (result.external_call === '1') { flags.push('External calls in transfer'); if (level !== 'danger') level = 'warning'; }

    // Warning signals
    if (result.is_mintable === '1') { flags.push('Mintable (supply can increase)'); if (level === 'safe') level = 'warning'; }
    if (result.trading_cooldown === '1') { flags.push('Trading cooldown restriction'); if (level === 'safe') level = 'warning'; }
    if (result.is_anti_whale === '1') { flags.push('Anti-whale limit on sells'); if (level === 'safe') level = 'warning'; }
    if (result.is_proxy === '1') { flags.push('Proxy contract (upgradeable)'); if (level === 'safe') level = 'warning'; }
    if (result.is_open_source !== '1') { flags.push('Contract not verified'); if (level === 'safe') level = 'warning'; }

    // High buy/sell tax
    const buyTax = parseFloat(result.buy_tax ?? '0');
    const sellTax = parseFloat(result.sell_tax ?? '0');
    if (sellTax > 0.1) { flags.push(`High sell tax: ${(sellTax * 100).toFixed(0)}%`); level = 'danger'; }
    else if (sellTax > 0.05) { flags.push(`Sell tax: ${(sellTax * 100).toFixed(0)}%`); if (level === 'safe') level = 'warning'; }
    if (buyTax > 0.1) { flags.push(`High buy tax: ${(buyTax * 100).toFixed(0)}%`); if (level !== 'danger') level = 'warning'; }

    return { level, flags };
  } catch {
    return { level: 'unknown', flags: [] };
  }
}

// ── Recipient address scan ────────────────────────────────────────────────────

export async function scanAddress(address: string): Promise<AddressRisk> {
  try {
    const res = await fetch(`/api/scan?action=address&address=${address}`);
    if (!res.ok) return { level: 'unknown', flags: [] };
    const data = await res.json();
    const result = data?.result as Record<string, string> | undefined;
    if (!result) return { level: 'unknown', flags: [] };

    const flags: string[] = [];
    let level: RiskLevel = 'safe';

    if (result.blacklist_doubt === '1') { flags.push('Flagged in blacklist databases'); level = 'danger'; }
    if (result.phishing_activities === '1') { flags.push('Known phishing address'); level = 'danger'; }
    if (result.stealing_attack === '1') { flags.push('Linked to theft attacks'); level = 'danger'; }
    if (result.fake_kyc === '1') { flags.push('Linked to fake KYC scam'); level = 'danger'; }
    if (result.malicious_mining_activities === '1') { flags.push('Malicious mining activity'); level = 'danger'; }
    if (result.darkweb_transactions === '1') { flags.push('Darkweb transaction history'); if (level !== 'danger') level = 'warning'; }
    if (result.cybercrime === '1') { flags.push('Associated with cybercrime'); level = 'danger'; }
    if (result.money_laundering === '1') { flags.push('Money laundering flags'); level = 'danger'; }
    if (result.financial_crime === '1') { flags.push('Financial crime flags'); level = 'danger'; }
    if (result.sanctioned === '1') { flags.push('Sanctioned address (OFAC/other)'); level = 'danger'; }
    if (result.mixer === '1') { flags.push('Tornado Cash / mixer'); if (level === 'safe') level = 'warning'; }
    if (result.honeypot_related_address === '1') { flags.push('Honeypot-related address'); level = 'danger'; }
    if (result.contract_address === '1') { flags.push('Recipient is a smart contract'); if (level === 'safe') level = 'warning'; }

    return { level, flags };
  } catch {
    return { level: 'unknown', flags: [] };
  }
}

// ── dApp URL scan ─────────────────────────────────────────────────────────────

export async function scanDApp(url: string): Promise<DAppRisk> {
  try {
    const res = await fetch(`/api/scan?action=dapp&url=${encodeURIComponent(url)}`);
    if (!res.ok) return { level: 'unknown', flags: [] };
    const data = await res.json();
    const result = data?.result as Record<string, unknown> | undefined;
    if (!result) return { level: 'unknown', flags: [] };

    const flags: string[] = [];
    let level: RiskLevel = 'safe';

    if (result.is_malicious === '1') { flags.push('Malicious dApp detected'); level = 'danger'; }
    if (result.is_phishing === '1') { flags.push('Phishing site'); level = 'danger'; }
    if (result.is_contract_security === '0') { flags.push('Contract security issues'); if (level !== 'danger') level = 'warning'; }

    // project_name might confirm it matches known protocol
    const riskLevel = result.project_security_level;
    if (riskLevel === 'high_risk') { flags.push('High risk project'); level = 'danger'; }
    else if (riskLevel === 'medium_risk') { flags.push('Medium risk project'); if (level === 'safe') level = 'warning'; }

    return { level, flags };
  } catch {
    return { level: 'unknown', flags: [] };
  }
}

// ── Risk badge colors ─────────────────────────────────────────────────────────

export function riskColor(level: RiskLevel): string {
  if (level === 'danger') return '#f87171';
  if (level === 'warning') return '#fbbf24';
  if (level === 'safe') return '#4ade80';
  return '#6b7280';
}

export function riskBg(level: RiskLevel): string {
  if (level === 'danger') return 'rgba(248,113,113,0.12)';
  if (level === 'warning') return 'rgba(251,191,36,0.12)';
  if (level === 'safe') return 'rgba(74,222,128,0.10)';
  return 'rgba(107,114,128,0.10)';
}
