import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Free BNB Wallet — Anonymous BNB Smart Chain Wallet, No Signup',
  description: 'Create a free BNB wallet for BNB Smart Chain instantly. No signup, no KYC. Send BNB, hold BEP-20 tokens, and connect to PancakeSwap and BSC dApps anonymously.',
  alternates: { canonical: `${BASE_URL}/bnb-wallet` },
  openGraph: {
    title: 'Free BNB Wallet — Anonymous BSC Wallet',
    description: 'Instant free BNB Smart Chain wallet. No signup, no KYC. Send BNB and BEP-20 tokens anonymously.',
    url: `${BASE_URL}/bnb-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Free BNB Wallet' }],
  },
  twitter: { card: 'summary_large_image', title: 'Free BNB Wallet — Cope Wallet', description: 'Instant anonymous BNB wallet. No signup.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/bnb-wallet#webpage`,
      url: `${BASE_URL}/bnb-wallet`,
      name: 'Free BNB Wallet — Anonymous BNB Smart Chain Wallet',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/bnb-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/bnb-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'BNB Wallet', item: `${BASE_URL}/bnb-wallet` },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/bnb-wallet#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is BNB Smart Chain?',
          acceptedAnswer: { '@type': 'Answer', text: 'BNB Smart Chain (BSC) is an EVM-compatible blockchain built by Binance that offers fast, low-cost transactions. It supports BEP-20 tokens and has a large ecosystem of DeFi applications including PancakeSwap. Because it is EVM-compatible, your Cope Wallet Ethereum address also works on BSC — just switch the network.' },
        },
        {
          '@type': 'Question',
          name: 'Can I use Cope Wallet on BNB Smart Chain?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet supports BNB Smart Chain (Chain ID 56). Switch to the BSC network in the Cope Wallet interface to see your BNB balance, BEP-20 token holdings, and transaction history on BSC. Your wallet address is the same across all EVM chains.' },
        },
        {
          '@type': 'Question',
          name: 'What tokens does the BNB wallet support?',
          acceptedAnswer: { '@type': 'Answer', text: 'All BEP-20 tokens on BNB Smart Chain — CAKE, BUSD, USDT, BTCB, ETH (bridged), and thousands of other BEP-20 tokens. Native BNB is also supported.' },
        },
        {
          '@type': 'Question',
          name: 'Can I connect to PancakeSwap with Cope Wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Use WalletConnect v2 to connect Cope Wallet to PancakeSwap. Open PancakeSwap, click "Connect Wallet", select WalletConnect, and scan the QR code from Cope Wallet with your phone or paste the link in the desktop app.' },
        },
      ],
    },
  ],
};

export default function BNBWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>BNB Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Free BNB Wallet —{' '}
            <span style={{ color: '#F3BA2F' }}>No Signup, No KYC</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Create a free BNB Smart Chain wallet in seconds. No signup, no KYC. Send BNB, hold BEP-20 tokens, and connect to PancakeSwap and other BSC dApps — completely anonymously.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#F3BA2F', color: '#000', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Create BNB Wallet Free →
          </Link>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>Why Use Cope Wallet on BNB Smart Chain?</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#fff' }}>BNB Smart Chain (BSC)</strong> is one of the most popular EVM-compatible blockchains, known for low gas fees (typically $0.01–$0.20 per transaction) and a large DeFi ecosystem centered around PancakeSwap. BSC is fully EVM-compatible, which means your Cope Wallet Ethereum address also works on BSC — no new wallet needed.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            To use Cope Wallet on BSC, simply switch the network in the app. Your balance, tokens, and transaction history will update to reflect the BSC network. You can interact with PancakeSwap, Venus, Alpaca Finance, and hundreds of other BSC protocols via WalletConnect.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            BSC is ideal for users who want low-cost transactions without paying Ethereum mainnet gas fees. For activities like small DeFi trades, token swaps, or testing protocols, BSC offers significantly cheaper execution.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 32 }}>BNB Smart Chain Facts</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Chain ID', value: '56' },
                { label: 'Native Token', value: 'BNB' },
                { label: 'Block Time', value: '~3 seconds' },
                { label: 'Avg Gas Fee', value: '$0.01–$0.20' },
                { label: 'Token Standard', value: 'BEP-20' },
                { label: 'EVM Compatible', value: 'Yes ✓' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '16px 20px', borderTop: '2px solid #F3BA2F' }}>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{label}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>BNB Wallet FAQ</h2>
          <div style={{ display: 'grid', gap: 20 }}>
            {[
              { q: 'What is BNB Smart Chain?', a: 'An EVM-compatible blockchain by Binance with low fees and fast blocks. Your Cope Wallet address works on BSC — just switch networks.' },
              { q: 'Can I use Cope Wallet on BSC?', a: 'Yes. Switch to BSC (Chain ID 56) in Cope Wallet to see your BNB and BEP-20 token balances.' },
              { q: 'What tokens does the BNB wallet support?', a: 'CAKE, BUSD, USDT, BTCB, ETH (bridged), and all BEP-20 tokens. Plus native BNB.' },
              { q: 'Can I connect to PancakeSwap?', a: 'Yes. Use WalletConnect v2 — select WalletConnect in PancakeSwap and scan the Cope Wallet QR code.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ borderLeft: '2px solid #F3BA2F', paddingLeft: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{q}</h3>
                <p style={{ color: '#888', lineHeight: 1.7, margin: 0, fontSize: 15 }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#F3BA2F', color: '#000', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Create Free BNB Wallet →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also:{' '}
              {[['Ethereum', '/ethereum-wallet'], ['Polygon', '/polygon-wallet'], ['Arbitrum', '/arbitrum-wallet'], ['Base', '/base-wallet'], ['Optimism', '/optimism-wallet']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name} Wallet</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
