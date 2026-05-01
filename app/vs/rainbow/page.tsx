import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Cope Wallet vs Rainbow Wallet — Anonymous Temp Wallet vs Rainbow',
  description: 'Cope Wallet vs Rainbow Wallet: no extension, no account, no personal data. Compare anonymous browser temp wallet vs Rainbow for privacy-first Ethereum use.',
  alternates: { canonical: `${BASE_URL}/vs/rainbow` },
  openGraph: {
    title: 'Cope Wallet vs Rainbow Wallet — Anonymous vs Design-First',
    description: 'Compare Cope Wallet and Rainbow Wallet. No extension, no account. Anonymous EVM temp wallet vs Rainbow.',
    url: `${BASE_URL}/vs/rainbow`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet vs Rainbow' }],
  },
  twitter: { card: 'summary_large_image', title: 'Cope Wallet vs Rainbow Wallet', description: 'Anonymous temp wallet vs Rainbow design-first wallet.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/vs/rainbow#webpage`,
      url: `${BASE_URL}/vs/rainbow`,
      name: 'Cope Wallet vs Rainbow Wallet',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/vs/rainbow#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/vs/rainbow#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${BASE_URL}/vs` },
        { '@type': 'ListItem', position: 3, name: 'vs Rainbow', item: `${BASE_URL}/vs/rainbow` },
      ],
    },
  ],
};

const rows = [
  ['Platform', 'Web browser', 'Mobile app + Browser extension'],
  ['Setup time', '< 1 second', '5–10 minutes'],
  ['Account required', 'None', '12-word seed phrase'],
  ['Analytics', 'None', 'Usage analytics'],
  ['NFT gallery', '✗', '✓ (Rainbow speciality)'],
  ['DeFi focus', 'Neutral — any WC dApp', 'Ethereum mainnet focused'],
  ['Multi-chain', '✓ 26+ EVM chains', '✓ (Ethereum-focused)'],
  ['Temp / burner use', '✓ Purpose-built', '✗ Not designed for it'],
  ['Best for', 'Anonymous / temp use', 'NFT & DeFi power users'],
];

export default function VsRainbowPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>vs Rainbow</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            <span style={{ color: '#52ffac' }}>Cope Wallet</span> vs Rainbow Wallet —{' '}
            Anonymous Temp Use vs Design-First
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Rainbow is a beautiful Ethereum wallet known for its NFT display and UX. Cope Wallet is the opposite: minimal, anonymous, and session-based. Different tools for different jobs.
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
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#FF6B6B', fontWeight: 600 }}>Rainbow</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([feat, cope, rainbow]) => (
                    <tr key={feat} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: '12px 16px', color: '#888' }}>{feat}</td>
                      <td style={{ padding: '12px 16px', color: '#fff' }}>{cope}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{rainbow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>The Bottom Line</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#fff' }}>Rainbow</strong> is one of the most polished Ethereum wallets available — excellent for NFT collectors who want a beautiful gallery view, and DeFi users who want an opinionated, curated wallet experience. It has a great browser extension and mobile app.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#fff' }}>Cope Wallet</strong> is for a fundamentally different use case: anonymous, temporary, or zero-setup crypto access. You do not want to connect your Rainbow wallet to a sketchy airdrop site — that is what Cope Wallet is for.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Use Rainbow for your main Ethereum identity. Use Cope Wallet when you need a fresh, disposable address with no trail back to you.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#52ffac', color: '#000', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Try Cope Wallet Free →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also compare:{' '}
              {[['MetaMask', '/vs/metamask'], ['Trust Wallet', '/vs/trust-wallet'], ['Coinbase Wallet', '/vs/coinbase-wallet']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name}</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
