import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Cope Wallet vs Coinbase Wallet — Anonymous Wallet vs Coinbase',
  description: 'Cope Wallet vs Coinbase Wallet: no Coinbase account needed, no personal data, no KYC at the wallet level. Compare anonymous browser temp wallet vs Coinbase Wallet.',
  alternates: { canonical: `${BASE_URL}/vs/coinbase-wallet` },
  openGraph: {
    title: 'Cope Wallet vs Coinbase Wallet — Anonymous vs Coinbase-Linked',
    description: 'Compare Cope Wallet and Coinbase Wallet. No Coinbase account needed. Fully anonymous EVM temp wallet.',
    url: `${BASE_URL}/vs/coinbase-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet vs Coinbase Wallet' }],
  },
  twitter: { card: 'summary_large_image', title: 'Cope Wallet vs Coinbase Wallet', description: 'Anonymous temp wallet vs Coinbase Wallet.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/vs/coinbase-wallet#webpage`,
      url: `${BASE_URL}/vs/coinbase-wallet`,
      name: 'Cope Wallet vs Coinbase Wallet',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/vs/coinbase-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/vs/coinbase-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${BASE_URL}/vs` },
        { '@type': 'ListItem', position: 3, name: 'vs Coinbase Wallet', item: `${BASE_URL}/vs/coinbase-wallet` },
      ],
    },
  ],
};

const rows = [
  ['Account required', 'None', 'Optional (Coinbase account for some features)'],
  ['KYC', 'Zero', 'Zero for self-custody; full KYC for Coinbase exchange'],
  ['Analytics', 'None', 'Analytics collected'],
  ['Extension required', 'No', 'Yes (browser extension)'],
  ['Coinbase account linkage', 'None', 'Optional (encourages linking)'],
  ['Base L2 support', '✓ (Chain ID 8453)', '✓ (Coinbase built Base)'],
  ['Session-based (temp use)', '✓ Purpose-built', '✗ Permanent wallet only'],
  ['Privacy level', 'Maximum (zero data)', 'Medium (Coinbase ecosystem)'],
  ['Best for', 'Temp / anonymous use', 'Coinbase ecosystem users'],
];

export default function VsCoinbaseWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>vs Coinbase Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            <span style={{ color: '#52ffac' }}>Cope Wallet</span> vs Coinbase Wallet —{' '}
            Anonymous vs Coinbase Ecosystem
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Coinbase Wallet is a self-custody wallet deeply integrated with the Coinbase ecosystem. Cope Wallet is fully independent — no Coinbase account, no extension, no corporate data collection.
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
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#0052FF', fontWeight: 600 }}>Coinbase Wallet</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([feat, cope, cb]) => (
                    <tr key={feat} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: '12px 16px', color: '#888' }}>{feat}</td>
                      <td style={{ padding: '12px 16px', color: '#fff' }}>{cope}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{cb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>The Privacy Difference</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#fff' }}>Coinbase Wallet</strong> is technically self-custody — Coinbase does not hold your keys. But it is deeply integrated with the Coinbase ecosystem and actively encourages you to link a Coinbase account. The app collects usage analytics and its parent company, Coinbase, is a US-regulated entity required to comply with government subpoenas.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#fff' }}>Cope Wallet</strong> has zero corporate integration, zero analytics, and zero data linkage. It is a stateless web application that generates keys locally and forgets everything on tab close. There is no company to subpoena for your wallet activity because the data simply does not exist.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            For users who want to stay in the Coinbase ecosystem (easy on-ramp, Coinbase to Coinbase Wallet transfer), Coinbase Wallet is a reasonable choice. For anyone who wants maximum privacy and anonymity, Cope Wallet is better.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#52ffac', color: '#000', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Try Cope Wallet — No Coinbase Account →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also compare:{' '}
              {[['MetaMask', '/vs/metamask'], ['Trust Wallet', '/vs/trust-wallet'], ['Rainbow', '/vs/rainbow']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name}</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
