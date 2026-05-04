// NFT fetching via Alchemy NFT API

export interface NFTItem {
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  collectionName?: string;
  chainId: number;
  floorPrice?: number | null;    // ETH
  floorPriceCurrency?: string;   // e.g. "ETH"
}

export async function fetchNFTs(address: string, chainId: number): Promise<NFTItem[]> {
  try {
    const res = await fetch('/api/nfts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, chainId }),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
