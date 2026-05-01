import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Free Optimism Wallet — Anonymous OP Wallet, No Signup',
  description: 'Create a free Optimism wallet instantly. No signup, no KYC. Send ETH and OP tokens on Optimism\'s low-fee Ethereum L2. Connect to Velodrome, Synthetix and more.',
  alternates: { canonical: `${BASE_URL}/optimism-wallet` },
  openGraph: {
    title: 'Free Optimism Wallet — Anonymous OP Wallet',
    description: 'Instant free Optimism wallet. No signup, no KYC. Ethereum L2 with low fees.',
    url: `${BASE_URL}/optimism-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Free Optimism Wallet' }],
  },
  twitter: { card: 'summary_large_image', title: 'Free Optimism Wallet — Cope Wallet', description: 'Instant anonymous Optimism wallet. No signup.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/optimism-wallet#webpage`,
      url: `${BASE_URL}/optimism-wallet`,
      name: 'Free Optimism Wallet — Anonymous OP Wallet',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/optimism-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/optimism-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Optimism Wallet', item: `${BASE_URL}/optimism-wallet` },
      ],
    },
  ],
};

export default function OptimismWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Optimism Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Free Optimism Wallet —{' '}
            <span style={{ color: '#FF0420' }}>Ethereum L2, No KYC</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Create a free Optimism wallet instantly. No signup, no KYC. Optimism is an Ethereum Optimistic Rollup — fast, cheap, and fully EVM-compatible. Access Velodrome, Synthetix, and more.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#FF0420', color: '#fff', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Create Optimism Wallet Free →
          </Link>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>What Is Optimism?</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Optimism (OP Mainnet, Chain ID 10) is one of the original Ethereum Optimistic Rollups and the creator of the OP Stack — the infrastructure that also powers Base, Mode, and other L2s in the Superchain. It settles transactions on Ethereum mainnet for finality while keeping costs low.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            The native OP token is used for governance. Gas on Optimism is paid in ETH and typically costs $0.05–$0.30 per transaction — far below Ethereum mainnet. Optimism is home to major protocols like Velodrome Finance (the dominant DEX), Synthetix (derivatives), and a growing DeFi ecosystem.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Cope Wallet supports Optimism (Chain ID 10). Switch to OP Mainnet to see your bridged ETH, OP tokens, and all other assets on Optimism.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Chain ID', value: '10' },
                { label: 'Native Token', value: 'ETH (+ OP)' },
                { label: 'Block Time', value: '~2 seconds' },
                { label: 'Avg Gas Fee', value: '$0.05–$0.30' },
                { label: 'Type', value: 'Optimistic Rollup' },
                { label: 'EVM Compatible', value: 'Yes ✓' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '16px 20px', borderTop: '2px solid #FF0420' }}>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{label}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#FF0420', color: '#fff', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Create Free Optimism Wallet →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also:{' '}
              {[['Ethereum', '/ethereum-wallet'], ['Arbitrum', '/arbitrum-wallet'], ['Base', '/base-wallet'], ['Polygon', '/polygon-wallet'], ['BNB', '/bnb-wallet']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name} Wallet</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
