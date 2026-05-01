import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Free Base Wallet — Anonymous Base Chain Wallet by Coinbase',
  description: 'Create a free Base wallet instantly. No signup, no KYC. Base is Coinbase\'s L2 on Ethereum — low fees, high speed. Connect to Aerodrome, Uniswap Base and more.',
  alternates: { canonical: `${BASE_URL}/base-wallet` },
  openGraph: {
    title: 'Free Base Wallet — Anonymous Base Chain Wallet',
    description: 'Instant free Base wallet. No signup, no KYC. Coinbase\'s Ethereum L2.',
    url: `${BASE_URL}/base-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Free Base Wallet' }],
  },
  twitter: { card: 'summary_large_image', title: 'Free Base Wallet — Cope Wallet', description: 'Instant anonymous Base chain wallet.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/base-wallet#webpage`,
      url: `${BASE_URL}/base-wallet`,
      name: 'Free Base Wallet — Anonymous Base Chain Wallet',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/base-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/base-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Base Wallet', item: `${BASE_URL}/base-wallet` },
      ],
    },
  ],
};

export default function BaseWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Base Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Free Base Wallet —{' '}
            <span style={{ color: '#0052FF' }}>Coinbase L2, No Signup</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Create a free Base wallet instantly. Base is Coinbase&apos;s Ethereum L2 — fast, cheap, and backed by one of the most recognized names in crypto. No signup, no KYC required.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#0052FF', color: '#fff', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Create Base Wallet Free →
          </Link>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>What Is Base?</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Base is an Ethereum Layer 2 network built by Coinbase on the OP Stack (same technology as Optimism). Launched in 2023, Base has rapidly grown to become one of the most active Ethereum L2 networks, with particularly strong traction in consumer apps, social protocols (Farcaster), and DeFi.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Base does not have its own native token — ETH is used for gas fees. Transaction costs are very low, typically $0.01–$0.10. Being built on the OP Stack means Base benefits from Optimism&apos;s security model and is part of the Superchain ecosystem.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Cope Wallet supports Base (Chain ID 8453). Switch to Base in the network selector to see your ETH balance and all tokens on Base. Use WalletConnect to connect to Aerodrome Finance, Uniswap on Base, friend.tech, and other Base-native dApps.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 32 }}>Base Network Facts</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Chain ID', value: '8453' },
                { label: 'Native Token', value: 'ETH' },
                { label: 'Block Time', value: '~2 seconds' },
                { label: 'Avg Gas Fee', value: '$0.01–$0.10' },
                { label: 'Type', value: 'OP Stack Rollup' },
                { label: 'EVM Compatible', value: 'Yes ✓' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '16px 20px', borderTop: '2px solid #0052FF' }}>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{label}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#0052FF', color: '#fff', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Create Free Base Wallet →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also:{' '}
              {[['Ethereum', '/ethereum-wallet'], ['Arbitrum', '/arbitrum-wallet'], ['Optimism', '/optimism-wallet'], ['Polygon', '/polygon-wallet'], ['BNB', '/bnb-wallet']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name} Wallet</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
