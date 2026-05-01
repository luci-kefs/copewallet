import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Free Avalanche Wallet — Anonymous AVAX Wallet, No Signup',
  description: 'Create a free Avalanche (AVAX) wallet instantly. No signup, no KYC. Send AVAX and ERC-20 tokens on Avalanche C-Chain. Connect to Trader Joe, Pangolin and more.',
  alternates: { canonical: `${BASE_URL}/avalanche-wallet` },
  openGraph: {
    title: 'Free Avalanche Wallet — Anonymous AVAX Wallet',
    description: 'Instant free Avalanche wallet. No signup, no KYC. Fast finality, low fees.',
    url: `${BASE_URL}/avalanche-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Free Avalanche Wallet' }],
  },
  twitter: { card: 'summary_large_image', title: 'Free Avalanche Wallet — Cope Wallet', description: 'Instant anonymous AVAX wallet. No signup.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/avalanche-wallet#webpage`,
      url: `${BASE_URL}/avalanche-wallet`,
      name: 'Free Avalanche Wallet — Anonymous AVAX Wallet',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/avalanche-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/avalanche-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Avalanche Wallet', item: `${BASE_URL}/avalanche-wallet` },
      ],
    },
  ],
};

export default function AvalancheWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Avalanche Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Free Avalanche Wallet —{' '}
            <span style={{ color: '#E84142' }}>No Signup, Sub-Second Finality</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Create a free Avalanche (AVAX) wallet instantly. No signup, no KYC. Avalanche C-Chain is EVM-compatible with sub-second transaction finality and low gas fees.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#E84142', color: '#fff', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Create Avalanche Wallet Free →
          </Link>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>Avalanche C-Chain — EVM on a Fast L1</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Avalanche is a Layer 1 blockchain with a unique consensus mechanism (Avalanche consensus) that achieves sub-second finality — transactions are confirmed in under 1 second. The Avalanche C-Chain (Contract Chain, Chain ID 43114) is EVM-compatible, so your standard Ethereum wallet address also works on Avalanche.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Gas fees on Avalanche C-Chain are paid in AVAX and are typically $0.01–$0.30 per transaction. The ecosystem includes Trader Joe (DEX), Pangolin (DEX), AAVE (Avalanche), Benqi Finance, and more.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Switch to Avalanche C-Chain (Chain ID 43114) in Cope Wallet to see your AVAX balance, wrapped tokens (WAVAX), and ERC-20 equivalents on Avalanche.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Chain ID', value: '43114' },
                { label: 'Native Token', value: 'AVAX' },
                { label: 'Finality', value: '< 1 second' },
                { label: 'Avg Gas Fee', value: '$0.01–$0.30' },
                { label: 'Type', value: 'L1 (Avalanche Consensus)' },
                { label: 'EVM Compatible', value: 'Yes (C-Chain) ✓' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '16px 20px', borderTop: '2px solid #E84142' }}>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{label}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#E84142', color: '#fff', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Create Free Avalanche Wallet →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also:{' '}
              {[['Ethereum', '/ethereum-wallet'], ['Arbitrum', '/arbitrum-wallet'], ['Base', '/base-wallet'], ['Polygon', '/polygon-wallet'], ['Fantom', '/fantom-wallet']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name} Wallet</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
