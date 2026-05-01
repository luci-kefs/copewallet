import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Free Arbitrum Wallet — Anonymous ARB Wallet, No Signup',
  description: 'Create a free Arbitrum wallet instantly. No signup, no KYC. Send ETH and ARB tokens on Arbitrum One with low fees. Connect to GMX, Uniswap Arbitrum and more.',
  alternates: { canonical: `${BASE_URL}/arbitrum-wallet` },
  openGraph: {
    title: 'Free Arbitrum Wallet — Anonymous ARB Wallet',
    description: 'Instant free Arbitrum wallet. No signup, no KYC. Low fees on Ethereum Layer 2.',
    url: `${BASE_URL}/arbitrum-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Free Arbitrum Wallet' }],
  },
  twitter: { card: 'summary_large_image', title: 'Free Arbitrum Wallet — Cope Wallet', description: 'Instant anonymous Arbitrum wallet. No signup.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/arbitrum-wallet#webpage`,
      url: `${BASE_URL}/arbitrum-wallet`,
      name: 'Free Arbitrum Wallet — Anonymous ARB Wallet',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/arbitrum-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/arbitrum-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Arbitrum Wallet', item: `${BASE_URL}/arbitrum-wallet` },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/arbitrum-wallet#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Arbitrum?',
          acceptedAnswer: { '@type': 'Answer', text: 'Arbitrum is an Ethereum Layer 2 rollup that reduces transaction costs by batching transactions off-chain and posting proofs to Ethereum mainnet. Arbitrum One (Chain ID 42161) is the main network and one of the largest DeFi ecosystems by TVL, hosting GMX, Uniswap, Camelot, Radiant Capital, and many others.' },
        },
        {
          '@type': 'Question',
          name: 'Can I use Cope Wallet on Arbitrum?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Switch to Arbitrum One (Chain ID 42161) in Cope Wallet. Your wallet address is the same as on Ethereum — Arbitrum is EVM-compatible. Your ETH (bridged) balance, ARB token, and all other Arbitrum assets will display.' },
        },
        {
          '@type': 'Question',
          name: 'What makes Arbitrum different from Polygon?',
          acceptedAnswer: { '@type': 'Answer', text: 'Arbitrum is an Optimistic Rollup that inherits Ethereum mainnet security more directly than Polygon (which is a sidechain). Arbitrum has stronger security guarantees but slightly higher fees than Polygon. It is preferred by many DeFi power users who want low fees but maximum Ethereum security.' },
        },
      ],
    },
  ],
};

export default function ArbitrumWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Arbitrum Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Free Arbitrum Wallet —{' '}
            <span style={{ color: '#12AAFF' }}>Ethereum L2, Low Fees</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Create a free Arbitrum wallet instantly. No signup, no KYC. Access Arbitrum One&apos;s massive DeFi ecosystem — GMX, Uniswap, Camelot — at a fraction of Ethereum mainnet fees.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#12AAFF', color: '#000', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Create Arbitrum Wallet Free →
          </Link>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>Arbitrum — The Leading Ethereum L2</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Arbitrum One is consistently one of the top Ethereum Layer 2 networks by Total Value Locked (TVL). As an Optimistic Rollup, it executes transactions off Ethereum mainnet but posts fraud proofs to L1, giving it stronger security guarantees than most alternative L1 blockchains.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Gas fees on Arbitrum are 10–100× lower than Ethereum mainnet, making it viable for smaller DeFi positions and frequent trading. The native ARB token is used for governance of the Arbitrum DAO.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            With Cope Wallet, you can access all Arbitrum dApps via WalletConnect — GMX for perpetuals, Uniswap for swaps, Radiant Capital for lending, and dozens more — all with your anonymous, no-KYC wallet.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 32 }}>Arbitrum Network Facts</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Chain ID', value: '42161' },
                { label: 'Native Token', value: 'ETH (bridged)' },
                { label: 'Block Time', value: '~0.25 seconds' },
                { label: 'Avg Gas Fee', value: '$0.05–$0.50' },
                { label: 'Type', value: 'Optimistic Rollup' },
                { label: 'EVM Compatible', value: 'Yes ✓' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '16px 20px', borderTop: '2px solid #12AAFF' }}>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{label}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ display: 'grid', gap: 20 }}>
            {[
              { q: 'What is Arbitrum?', a: 'An Ethereum Optimistic Rollup (Chain ID 42161) with 10–100× lower fees than mainnet. One of the largest DeFi ecosystems by TVL.' },
              { q: 'Can I use Cope Wallet on Arbitrum?', a: 'Yes. Switch to Arbitrum One in Cope Wallet. Same address as Ethereum. View ETH, ARB, and all Arbitrum tokens.' },
              { q: 'What makes Arbitrum different from Polygon?', a: 'Arbitrum is a rollup — stronger Ethereum security guarantees. Polygon is a sidechain. Arbitrum fees are slightly higher but security model is more robust.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ borderLeft: '2px solid #12AAFF', paddingLeft: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{q}</h3>
                <p style={{ color: '#888', lineHeight: 1.7, margin: 0, fontSize: 15 }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#12AAFF', color: '#000', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Create Free Arbitrum Wallet →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also:{' '}
              {[['Ethereum', '/ethereum-wallet'], ['BNB', '/bnb-wallet'], ['Polygon', '/polygon-wallet'], ['Base', '/base-wallet'], ['Optimism', '/optimism-wallet']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name} Wallet</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
