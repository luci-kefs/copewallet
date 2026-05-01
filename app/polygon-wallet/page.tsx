import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Free Polygon Wallet — Anonymous MATIC Wallet, No Signup',
  description: 'Create a free Polygon (MATIC) wallet instantly. No signup, no KYC. Send MATIC and POL tokens, connect to QuickSwap and all Polygon dApps anonymously.',
  alternates: { canonical: `${BASE_URL}/polygon-wallet` },
  openGraph: {
    title: 'Free Polygon Wallet — Anonymous MATIC Wallet',
    description: 'Instant free Polygon wallet. No signup, no KYC. Low fees, fast transactions.',
    url: `${BASE_URL}/polygon-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Free Polygon Wallet' }],
  },
  twitter: { card: 'summary_large_image', title: 'Free Polygon Wallet — Cope Wallet', description: 'Instant anonymous Polygon/MATIC wallet.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/polygon-wallet#webpage`,
      url: `${BASE_URL}/polygon-wallet`,
      name: 'Free Polygon Wallet — Anonymous MATIC Wallet',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/polygon-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/polygon-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Polygon Wallet', item: `${BASE_URL}/polygon-wallet` },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/polygon-wallet#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Polygon (MATIC)?',
          acceptedAnswer: { '@type': 'Answer', text: 'Polygon (formerly Matic Network) is an EVM-compatible Layer 2 scaling solution for Ethereum. It offers very low transaction fees (fractions of a cent) and fast block times (~2 seconds). The native token is now POL (previously MATIC). Polygon has one of the largest DeFi and NFT ecosystems outside Ethereum mainnet.' },
        },
        {
          '@type': 'Question',
          name: 'Can I use Cope Wallet on Polygon?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Switch to Polygon (Chain ID 137) in Cope Wallet to see your MATIC/POL balance and all ERC-20/Polygon tokens. Your wallet address is the same as your Ethereum address — Polygon is EVM-compatible.' },
        },
        {
          '@type': 'Question',
          name: 'What are the gas fees on Polygon?',
          acceptedAnswer: { '@type': 'Answer', text: 'Polygon gas fees are extremely low — typically $0.001 to $0.01 per transaction, compared to $1–$20 on Ethereum mainnet. This makes Polygon ideal for high-frequency DeFi activities, NFT minting, and micro-transactions.' },
        },
        {
          '@type': 'Question',
          name: 'What dApps can I use with a Polygon wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'QuickSwap, Aave (on Polygon), Curve Finance, Balancer, OpenSea (Polygon), Lens Protocol, and hundreds more. Use WalletConnect v2 in Cope Wallet to connect to any Polygon-compatible dApp.' },
        },
      ],
    },
  ],
};

export default function PolygonWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Polygon Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Free Polygon Wallet —{' '}
            <span style={{ color: '#8247E5' }}>Low Fees, Instant Setup</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Create a free Polygon (MATIC/POL) wallet instantly. No signup, no KYC. Transact for fractions of a cent on Polygon&apos;s fast, low-cost network — all anonymously.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#8247E5', color: '#fff', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Create Polygon Wallet Free →
          </Link>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>Polygon — Ethereum&apos;s Low-Cost Sidechain</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Polygon is one of the most widely used Ethereum scaling solutions, with millions of daily active users and deep liquidity across DeFi. Its key advantage is cost: where a simple Ethereum token swap might cost $5–$15 in gas fees, the same swap on Polygon typically costs less than a cent.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Because Polygon is EVM-compatible, the same wallet address you use on Ethereum works on Polygon. Your Cope Wallet address is already a valid Polygon address — just switch the network in the app to see your Polygon balances and activity.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Polygon is popular for NFT minting (many OpenSea collections are on Polygon), gaming (on-chain game assets), DeFi yield farming, and bridging assets between Ethereum and lower-cost environments.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 32 }}>Polygon Network Facts</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Chain ID', value: '137' },
                { label: 'Native Token', value: 'POL (MATIC)' },
                { label: 'Block Time', value: '~2 seconds' },
                { label: 'Avg Gas Fee', value: '$0.001–$0.01' },
                { label: 'Token Standard', value: 'ERC-20 (Polygon)' },
                { label: 'EVM Compatible', value: 'Yes ✓' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '16px 20px', borderTop: '2px solid #8247E5' }}>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{label}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>Polygon Wallet FAQ</h2>
          <div style={{ display: 'grid', gap: 20 }}>
            {[
              { q: 'What is Polygon (MATIC)?', a: 'An EVM-compatible Layer 2 for Ethereum with extremely low fees (<$0.01 per tx) and fast blocks (~2 sec). Native token is now POL (previously MATIC).' },
              { q: 'Can I use Cope Wallet on Polygon?', a: 'Yes. Switch to Polygon (Chain ID 137). Your Ethereum address is your Polygon address — Polygon is EVM-compatible.' },
              { q: 'What are the gas fees on Polygon?', a: 'Extremely low — $0.001 to $0.01 per transaction. Much cheaper than Ethereum mainnet.' },
              { q: 'What dApps can I use?', a: 'QuickSwap, Aave, Curve, Balancer, OpenSea (Polygon), Lens Protocol, and hundreds more via WalletConnect v2.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ borderLeft: '2px solid #8247E5', paddingLeft: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{q}</h3>
                <p style={{ color: '#888', lineHeight: 1.7, margin: 0, fontSize: 15 }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#8247E5', color: '#fff', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Create Free Polygon Wallet →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also:{' '}
              {[['Ethereum', '/ethereum-wallet'], ['BNB', '/bnb-wallet'], ['Arbitrum', '/arbitrum-wallet'], ['Base', '/base-wallet'], ['Optimism', '/optimism-wallet']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name} Wallet</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
