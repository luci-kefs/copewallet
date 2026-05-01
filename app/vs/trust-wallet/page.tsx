import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Cope Wallet vs Trust Wallet — Anonymous Web Wallet vs Mobile App',
  description: 'Cope Wallet vs Trust Wallet: no app download, no account creation, no KYC. Compare anonymous browser-based temp wallet vs Trust Wallet for privacy-first crypto use.',
  alternates: { canonical: `${BASE_URL}/vs/trust-wallet` },
  openGraph: {
    title: 'Cope Wallet vs Trust Wallet — Which Is More Anonymous?',
    description: 'Compare Cope Wallet and Trust Wallet. No app needed. Fully anonymous EVM wallet vs Trust Wallet.',
    url: `${BASE_URL}/vs/trust-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet vs Trust Wallet' }],
  },
  twitter: { card: 'summary_large_image', title: 'Cope Wallet vs Trust Wallet', description: 'Anonymous browser wallet vs Trust Wallet mobile app.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/vs/trust-wallet#webpage`,
      url: `${BASE_URL}/vs/trust-wallet`,
      name: 'Cope Wallet vs Trust Wallet — Anonymous Web Wallet vs Mobile App',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/vs/trust-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/vs/trust-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${BASE_URL}/vs` },
        { '@type': 'ListItem', position: 3, name: 'vs Trust Wallet', item: `${BASE_URL}/vs/trust-wallet` },
      ],
    },
  ],
};

const rows = [
  ['Platform', 'Web browser (any device)', 'Mobile app (iOS / Android)'],
  ['App download required', 'No', 'Yes'],
  ['Account / seed phrase', 'None required', '12-word seed phrase'],
  ['KYC', 'Zero', 'Zero (but swap feature requires KYC)'],
  ['Analytics', 'None', 'Usage analytics collected'],
  ['Persistence', 'Session-based (opt-in)', 'Permanent'],
  ['WalletConnect', '✓ v2', '✓ v2 (initiator)'],
  ['Built-in swap', '✗', '✓ (KYC sometimes required)'],
  ['Hardware wallet', '✗', '✗'],
  ['Best for', 'Temp / anonymous web use', 'Everyday mobile wallet'],
];

export default function VsTrustWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>vs Trust Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            <span style={{ color: '#52ffac' }}>Cope Wallet</span> vs Trust Wallet —{' '}
            Browser Wallet vs Mobile App
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Trust Wallet is a great mobile wallet. But if you need a quick anonymous wallet on desktop or laptop without downloading an app, Cope Wallet is faster, more private, and requires nothing.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#52ffac', color: '#000', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Try Cope Wallet Free →
          </Link>
        </section>

        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 32 }}>Feature Comparison</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontWeight: 600 }}>Feature</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#52ffac', fontWeight: 600 }}>Cope Wallet</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#3375BB', fontWeight: 600 }}>Trust Wallet</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([feat, cope, trust]) => (
                    <tr key={feat} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: '12px 16px', color: '#888' }}>{feat}</td>
                      <td style={{ padding: '12px 16px', color: '#fff' }}>{cope}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{trust}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>Key Differences Explained</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#fff' }}>Trust Wallet</strong> is owned by Binance and is one of the most downloaded mobile wallets in the world. It supports hundreds of blockchains, has built-in NFT viewing, and offers in-app token swaps. It requires a 12-word seed phrase on setup and stores wallet data persistently on your phone.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#fff' }}>Cope Wallet</strong> is a web-based wallet — no app, no download, no seed phrase setup. It runs entirely in your browser and is designed for situations where Trust Wallet is unavailable or overkill: using a desktop, needing a quick temp wallet, or avoiding the Binance-owned ecosystem.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Trust Wallet&apos;s in-app swap feature has in some regions required identity verification for large amounts. Cope Wallet&apos;s swaps via connected dApps (WalletConnect) are governed by the dApp, not Cope Wallet itself — no KYC at the wallet level.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#52ffac', color: '#000', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Try Cope Wallet — No App Needed →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also compare:{' '}
              {[['MetaMask', '/vs/metamask'], ['Rainbow', '/vs/rainbow'], ['Coinbase Wallet', '/vs/coinbase-wallet']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name}</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
