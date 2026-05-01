import type { MetadataRoute } from 'next';

const BASE_URL = 'https://copewallet.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // Homepage
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },

    // Head-term landing pages
    {
      url: `${BASE_URL}/temp-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/burner-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/anonymous-crypto-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/no-kyc-crypto-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },

    // Per-chain pages
    {
      url: `${BASE_URL}/ethereum-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/bnb-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/polygon-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/arbitrum-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/base-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/optimism-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/avalanche-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/fantom-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // Comparison pages
    {
      url: `${BASE_URL}/vs/metamask`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/vs/trust-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/vs/rainbow`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/vs/coinbase-wallet`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
