// Token approval reader — returns ERC-20 allowances > 0 for an address
import { NextRequest, NextResponse } from 'next/server';
import { CHAINS } from '@/lib/chains';
import { ethers } from 'ethers';

// Common spenders to always check (DEX routers, bridges)
const KNOWN_SPENDERS: Record<number, { address: string; name: string }[]> = {
  1: [
    { address: '0x000000000022D473030F116dDEE9F6B43aC78BA3', name: 'Permit2' },
    { address: '0x1111111254EEB25477B68fb85Ed929f73A960582', name: '1inch v5' },
    { address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', name: 'Uniswap v3' },
    { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', name: 'Uniswap v2' },
    { address: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', name: 'SushiSwap' },
    { address: '0x3fc91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', name: 'Uniswap UniversalRouter' },
    { address: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', name: 'SushiSwap Router' },
  ],
  137: [
    { address: '0x000000000022D473030F116dDEE9F6B43aC78BA3', name: 'Permit2' },
    { address: '0x1111111254EEB25477B68fb85Ed929f73A960582', name: '1inch v5' },
    { address: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', name: 'QuickSwap' },
    { address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', name: 'Uniswap v3' },
  ],
  42161: [
    { address: '0x000000000022D473030F116dDEE9F6B43aC78BA3', name: 'Permit2' },
    { address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', name: 'Uniswap v3' },
    { address: '0x1111111254EEB25477B68fb85Ed929f73A960582', name: '1inch v5' },
  ],
  10: [
    { address: '0x000000000022D473030F116dDEE9F6B43aC78BA3', name: 'Permit2' },
    { address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', name: 'Uniswap v3' },
  ],
  8453: [
    { address: '0x000000000022D473030F116dDEE9F6B43aC78BA3', name: 'Permit2' },
    { address: '0x2626664c2603336E57B271c5C0b26F421741e481', name: 'Uniswap v3 Base' },
  ],
};

const ERC20_ALLOWANCE_ABI = ['function allowance(address owner, address spender) view returns (uint256)'];
const ERC20_SYMBOL_ABI    = ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'];

function getRpcUrl(chainId: number): string {
  const chain = CHAINS.find(c => c.id === chainId);
  if (!chain) return '';
  return process.env[chain.rpcEnvKey] ?? '';
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const address  = searchParams.get('address') ?? '';
  const chainId  = parseInt(searchParams.get('chainId') ?? '1', 10);

  if (!address || !ethers.isAddress(address)) return NextResponse.json([]);

  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) return NextResponse.json([]);

  const spenders = KNOWN_SPENDERS[chainId] ?? [];
  if (spenders.length === 0) return NextResponse.json([]);

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Fetch token list from Alchemy for this address
    const alchemyNftBase = rpcUrl.replace('/v2/', '/v2/');
    const tokRes = await fetch(`${rpcUrl.replace('/v2/', '/v2/')}/getTokenBalances?address=${address}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
      }),
    });

    let tokenContracts: string[] = [];
    if (tokRes.ok) {
      const tokData = await tokRes.json();
      tokenContracts = (tokData.result?.tokenBalances ?? [])
        .filter((t: any) => t.tokenBalance && BigInt(t.tokenBalance) > 0n)
        .map((t: any) => t.contractAddress as string);
    }

    if (tokenContracts.length === 0) return NextResponse.json([]);

    // For each token x spender combination, check allowance
    const approvals: { token: string; symbol: string; decimals: number; spender: string; spenderName: string; allowance: string; unlimited: boolean }[] = [];

    await Promise.allSettled(
      tokenContracts.map(async (tokenAddr) => {
        let symbol = '???';
        let decimals = 18;
        try {
          const erc20 = new ethers.Contract(tokenAddr, ERC20_SYMBOL_ABI, provider);
          [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()]);
        } catch {}

        const allowanceContract = new ethers.Contract(tokenAddr, ERC20_ALLOWANCE_ABI, provider);

        await Promise.allSettled(
          spenders.map(async (sp) => {
            try {
              const allowance: bigint = await allowanceContract.allowance(address, sp.address);
              if (allowance === 0n) return;
              const unlimited = allowance >= (2n ** 128n);
              const humanAllowance = unlimited ? 'Unlimited' : ethers.formatUnits(allowance, decimals);
              approvals.push({
                token: tokenAddr,
                symbol,
                decimals,
                spender: sp.address,
                spenderName: sp.name,
                allowance: humanAllowance,
                unlimited,
              });
            } catch {}
          })
        );
      })
    );

    return NextResponse.json(approvals);
  } catch {
    return NextResponse.json([]);
  }
}
