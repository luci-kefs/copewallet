import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Free Fantom Wallet — Anonymous FTM Wallet, No Signup',
  description: 'Create a free Fantom (FTM) wallet instantly. No signup, no KYC. Send FTM and ERC-20 tokens on Fantom Opera. Connect to SpookySwap, Beethoven X and more.',
  alternates: { canonical: `${BASE_URL}/fantom-wallet` },
  openGraph: {
    title: 'Free Fantom Wallet — Anonymous FTM Wallet',
    description: 'Instant free Fantom wallet. No signup, no KYC. Low fees, fast DAG-based consensus.',
    url: `${BASE_URL}/fantom-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Free Fantom Wallet' }],
  },
  twitter: { card: 'summary_large_image', title: 'Free Fantom Wallet — Cope Wallet', description: 'Instant anonymous FTM wallet. No signup.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/fantom-wallet#webpage`,
      url: `${BASE_URL}/fantom-wallet`,
      name: 'Free Fantom Wallet — Anonymous FTM Wallet',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/fantom-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/fantom-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Fantom Wallet', item: `${BASE_URL}/fantom-wallet` },
      ],
    },
  ],
};

export default function FantomWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Fantom Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Free Fantom Wallet —{' '}
            <span style={{ color: '#1969FF' }}>No Signup, Ultra-Low Fees</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Create a free Fantom Opera (FTM) wallet instantly. No signup, no KYC. Fantom is an EVM-compatible DAG-based L1 with extremely fast and cheap transactions — often less than $0.01.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#1969FF', color: '#fff', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Create Fantom Wallet Free →
          </Link>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>Fantom Opera — DAG-Based EVM Chain</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Fantom Opera (Chain ID 250) is an EVM-compatible smart contract platform that uses a Directed Acyclic Graph (DAG) consensus mechanism called Lachesis. This allows Fantom to achieve sub-second finality with very low gas fees — often under $0.01 per transaction.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Because Fantom is EVM-compatible, your Cope Wallet Ethereum address is also your Fantom address. Switch to Fantom Opera in the network selector to see your FTM balance and all FRC-20 tokens. Fantom&apos;s DeFi ecosystem includes SpookySwap, Beethoven X (Balancer fork), Geist Finance, and more.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Note: Fantom is transitioning to Sonic (a new high-performance chain). FTM is being migrated to S tokens. Cope Wallet will support the Sonic network as it launches.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Chain ID', value: '250' },
                { label: 'Native Token', value: 'FTM' },
                { label: 'Finality', value: '< 1 second' },
                { label: 'Avg Gas Fee', value: '< $0.01' },
                { label: 'Type', value: 'DAG-based L1' },
                { label: 'EVM Compatible', value: 'Yes ✓' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '16px 20px', borderTop: '2px solid #1969FF' }}>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{label}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#1969FF', color: '#fff', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Create Free Fantom Wallet →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also:{' '}
              {[['Ethereum', '/ethereum-wallet'], ['Avalanche', '/avalanche-wallet'], ['Arbitrum', '/arbitrum-wallet'], ['Base', '/base-wallet'], ['Polygon', '/polygon-wallet']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name} Wallet</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
