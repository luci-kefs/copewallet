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
    const ownedNfts: any[] = data.ownedNfts ?? [];

    // Batch-fetch floor prices for unique contract addresses
    const uniqueContracts = [...new Set(ownedNfts.map((n: any) => n.contract?.address).filter(Boolean))] as string[];
    const floorMap: Record<string, { price: number | null; currency: string }> = {};
    await Promise.allSettled(
      uniqueContracts.map(async (addr) => {
        try {
          const r = await fetch(`${baseUrl}/getFloorPrice?contractAddress=${addr}`, { headers: { Accept: 'application/json' } });
          if (!r.ok) return;
          const fp: any = await r.json();
          // Alchemy returns floor prices from multiple marketplaces; pick lowest available
          const sources = [fp.openSea, fp.looksRare, fp.blur].filter(s => s && typeof s.floorPrice === 'number' && s.floorPrice > 0);
          if (sources.length === 0) return;
          const lowest = sources.reduce((a, b) => b.floorPrice < a.floorPrice ? b : a);
          floorMap[addr.toLowerCase()] = { price: lowest.floorPrice, currency: lowest.priceCurrency ?? 'ETH' };
        } catch {}
      })
    );

    const nfts = ownedNfts.map((nft: any) => {
      const contractAddr = (nft.contract?.address ?? '').toLowerCase();
      const fp = floorMap[contractAddr];
      return {
        contractAddress: nft.contract?.address ?? '',
        tokenId: nft.tokenId ?? '',
        name: nft.name ?? nft.contract?.name ?? 'Unnamed NFT',
        description: nft.description ?? '',
        imageUrl: nft.image?.cachedUrl ?? nft.image?.thumbnailUrl ?? nft.image?.originalUrl ?? null,
        collectionName: nft.contract?.name ?? '',
        chainId,
        floorPrice: fp?.price ?? null,
        floorPriceCurrency: fp?.currency ?? null,
      };
    });

    return NextResponse.json(nfts);
  } catch {
    return NextResponse.json([]);
  }
}
