// NFT API — Alchemy NFT API v3
import { NextRequest, NextResponse } from 'next/server';
import { CHAINS } from '@/lib/chains';

function getAlchemyUrl(chainId: number): string {
  const chain = CHAINS.find(c => c.id === chainId);
  if (!chain) return '';
  const rpc = process.env[chain.rpcEnvKey] ?? '';
  // Convert RPC URL to NFT API URL: replace /v2/ with /nft/v3/
  return rpc.replace('/v2/', '/nft/v3/');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { address, chainId } = await req.json();
  if (!address || !chainId) return NextResponse.json([]);

  const baseUrl = getAlchemyUrl(chainId);
  if (!baseUrl || !baseUrl.includes('alchemy.com')) return NextResponse.json([]);

  try {
    const url = `${baseUrl}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=20`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const nfts = (data.ownedNfts ?? []).map((nft: any) => ({
      contractAddress: nft.contract?.address ?? '',
      tokenId: nft.tokenId ?? '',
      name: nft.name ?? nft.contract?.name ?? 'Unnamed NFT',
      description: nft.description ?? '',
      imageUrl: nft.image?.cachedUrl ?? nft.image?.thumbnailUrl ?? nft.image?.originalUrl ?? null,
      collectionName: nft.contract?.name ?? '',
      chainId,
    }));

    return NextResponse.json(nfts);
  } catch {
    return NextResponse.json([]);
  }
}
