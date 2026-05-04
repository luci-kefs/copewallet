export interface TokenApproval {
  token: string;
  symbol: string;
  decimals: number;
  spender: string;
  spenderName: string;
  allowance: string;
  unlimited: boolean;
}

export async function fetchApprovals(address: string, chainId: number): Promise<TokenApproval[]> {
  try {
    const res = await fetch(`/api/approvals?address=${address}&chainId=${chainId}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
