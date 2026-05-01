import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Free Ethereum Wallet — Anonymous ETH Wallet, No Signup',
  description: 'Create a free Ethereum wallet instantly. No signup, no KYC. Send and receive ETH and ERC-20 tokens anonymously. Full WalletConnect support for Ethereum dApps.',
  alternates: { canonical: `${BASE_URL}/ethereum-wallet` },
  openGraph: {
    title: 'Free Ethereum Wallet — Anonymous, No Signup',
    description: 'Instant free Ethereum wallet. No signup, no KYC. Send ETH and ERC-20 tokens anonymously.',
    url: `${BASE_URL}/ethereum-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Free Ethereum Wallet' }],
  },
  twitter: { card: 'summary_large_image', title: 'Free Ethereum Wallet — Cope Wallet', description: 'Instant anonymous ETH wallet. No signup.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/ethereum-wallet#webpage`,
      url: `${BASE_URL}/ethereum-wallet`,
      name: 'Free Ethereum Wallet — Anonymous ETH Wallet',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/ethereum-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/ethereum-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Ethereum Wallet', item: `${BASE_URL}/ethereum-wallet` },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/ethereum-wallet#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I create a free Ethereum wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Open copewallet.com and your Ethereum wallet is generated instantly — no signup, no download, no KYC. The wallet is created entirely in your browser using ethers.js and browser-native cryptography. Your private key never leaves your device.' },
        },
        {
          '@type': 'Question',
          name: 'What tokens can I hold in a Cope Wallet Ethereum wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Any ERC-20 token on the Ethereum mainnet — USDC, USDT, WETH, DAI, LINK, UNI, AAVE, and thousands of others. You can also hold native ETH. Cope Wallet displays token balances automatically.' },
        },
        {
          '@type': 'Question',
          name: 'Can I connect my Ethereum wallet to Uniswap or other dApps?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet supports WalletConnect v2. Open Uniswap (or any dApp that supports WalletConnect), click "Connect Wallet", select WalletConnect, and scan the QR code from Cope Wallet. Your anonymous Ethereum wallet is now connected.' },
        },
        {
          '@type': 'Question',
          name: 'Is Cope Wallet safe for Ethereum?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet generates Ethereum wallets using the industry-standard BIP39/BIP44 derivation path (m/44\'/60\'/0\'/0/0). Private keys are AES-256 encrypted in memory, memory-sharded, and rotated every 60 seconds. Keys never leave your browser.' },
        },
      ],
    },
  ],
};

export default function EthereumWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Ethereum Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Free Ethereum Wallet —{' '}
            <span style={{ color: '#627EEA' }}>Anonymous & Instant</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Create a free Ethereum wallet in under a second. No signup, no KYC, no extension required. Send ETH, hold ERC-20 tokens, and connect to any Ethereum dApp via WalletConnect.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#627EEA', color: '#fff', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Create Ethereum Wallet Free →
          </Link>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>Ethereum Wallet — What You Need to Know</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            An Ethereum wallet is a cryptographic key pair that lets you send and receive ETH and ERC-20 tokens on the Ethereum network. Every Ethereum wallet has a public address (like a bank account number) and a private key (like the PIN — never share this).
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Cope Wallet generates Ethereum wallets using the BIP44 standard derivation path (<code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: 4 }}>m/44&apos;/60&apos;/0&apos;/0/0</code>) and the ethers.js library — the same library used by MetaMask, Uniswap, and most major Ethereum applications. The resulting address is fully compatible with the entire Ethereum ecosystem.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Because Ethereum is the largest smart contract platform, your Cope Wallet address gives you access to thousands of dApps — DeFi protocols, NFT marketplaces, on-chain games, DAOs, and more — all without creating an account.
          </p>
        </section>

        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>What You Can Do with Your Ethereum Wallet</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {[
                { title: 'Send & Receive ETH', desc: 'Transfer Ethereum between addresses. Real-time balance updates. Full mainnet support.' },
                { title: 'Hold ERC-20 Tokens', desc: 'USDC, USDT, DAI, LINK, UNI, AAVE, and thousands of tokens auto-detected.' },
                { title: 'Connect to dApps', desc: 'WalletConnect v2 support. Connect to Uniswap, OpenSea, Aave, Compound, Curve, and more.' },
                { title: 'View Transaction History', desc: 'See all incoming and outgoing transactions for your Ethereum address.' },
                { title: 'Anonymous DeFi', desc: 'Interact with DeFi protocols on Ethereum without linking to your main wallet.' },
                { title: 'NFT Receiving', desc: 'Your address can receive NFTs. Use it for anonymous NFT airdrops and mints.' },
              ].map(({ title, desc }) => (
                <div key={title} style={{ background: '#1a1a1a', borderRadius: 12, padding: 24, borderTop: '2px solid #627EEA' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{title}</h3>
                  <p style={{ color: '#666', lineHeight: 1.7, fontSize: 14, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>Ethereum Wallet FAQ</h2>
          <div style={{ display: 'grid', gap: 20 }}>
            {[
              { q: 'How do I create a free Ethereum wallet?', a: 'Open copewallet.com — your Ethereum wallet is generated instantly in your browser. No signup, no download, no KYC.' },
              { q: 'What tokens can I hold?', a: 'Any ERC-20 token on Ethereum mainnet: USDC, USDT, WETH, DAI, LINK, UNI, AAVE, and thousands more, plus native ETH.' },
              { q: 'Can I connect to Uniswap or other dApps?', a: 'Yes. Cope Wallet supports WalletConnect v2. Select WalletConnect in any dApp and scan the QR code.' },
              { q: 'Is Cope Wallet safe for Ethereum?', a: 'Yes. Keys generated with BIP44 standard, AES-256 encrypted in memory, never transmitted to any server.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ borderLeft: '2px solid #627EEA', paddingLeft: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{q}</h3>
                <p style={{ color: '#888', lineHeight: 1.7, margin: 0, fontSize: 15 }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#0d0d0d', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#627EEA', color: '#fff', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
              Create Free Ethereum Wallet →
            </Link>
            <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
              Also:{' '}
              {[['BNB', '/bnb-wallet'], ['Polygon', '/polygon-wallet'], ['Arbitrum', '/arbitrum-wallet'], ['Base', '/base-wallet'], ['Optimism', '/optimism-wallet']].map(([name, href], i) => (
                <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name} Wallet</Link></span>
              ))}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
