import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Free Burner Wallet — Disposable Crypto Wallet for Ethereum & EVM',
  description: 'Create a free burner wallet instantly. No signup, no KYC. Use it for anonymous DeFi, airdrops, or one-time transactions on Ethereum, BNB, Polygon & all EVM chains. Dispose and forget.',
  alternates: { canonical: `${BASE_URL}/burner-wallet` },
  openGraph: {
    title: 'Free Burner Wallet — Disposable Crypto Wallet',
    description: 'Create a free burner wallet instantly. No signup, no KYC. Works on all EVM chains.',
    url: `${BASE_URL}/burner-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Free Burner Wallet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Burner Wallet — Cope Wallet',
    description: 'Disposable crypto wallet. No signup, no KYC. Free.',
    images: [`${BASE_URL}/og-image.png`],
  },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/burner-wallet#webpage`,
      url: `${BASE_URL}/burner-wallet`,
      name: 'Free Burner Wallet — Disposable Crypto Wallet',
      description: 'Create a free burner wallet instantly for anonymous DeFi, airdrops, and one-time transactions.',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/burner-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/burner-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Burner Wallet', item: `${BASE_URL}/burner-wallet` },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/burner-wallet#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is a burner wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'A burner wallet is a disposable cryptocurrency wallet intended for short-term or one-time use — similar to a burner phone. You create it, use it for a specific purpose (airdrop, anonymous DeFi, test transaction), and then dispose of it. Cope Wallet is built for exactly this: instant anonymous burner wallets with no signup.' },
        },
        {
          '@type': 'Question',
          name: 'Why use a burner wallet instead of your main wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Your main wallet accumulates years of transaction history that can be analyzed on-chain to identify you. A burner wallet keeps new activities separate, protecting your financial privacy. Use a burner for airdrops, NFT mints, DeFi farming, or any interaction you do not want linked to your primary address.' },
        },
        {
          '@type': 'Question',
          name: 'Is a burner wallet legal?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Using a burner wallet is completely legal in most jurisdictions. It is simply a new Ethereum address with no transaction history — identical technically to any other wallet address. Financial privacy is a legitimate use case protected in many regions.' },
        },
        {
          '@type': 'Question',
          name: 'Can a burner wallet hold real crypto?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. A burner wallet is a fully functional Ethereum-compatible address. It can hold ETH, ERC-20 tokens, NFTs, and any on-chain asset. The only difference from a "permanent" wallet is the intent to dispose of it after use — the cryptographic security is identical.' },
        },
        {
          '@type': 'Question',
          name: 'How is Cope Wallet different from other burner wallets?',
          acceptedAnswer: { '@type': 'Answer', text: 'Cope Wallet runs entirely in your browser — no extension to install, no account to create. The private key is generated locally with browser-native cryptography, never transmitted to any server, and automatically wiped when you close the tab. It also supports WalletConnect v2 so you can connect your burner wallet directly to any dApp.' },
        },
      ],
    },
  ],
};

export default function BurnerWalletPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        {/* Hero */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Burner Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Free Burner Wallet —{' '}
            <span style={{ color: '#52ffac' }}>Use It & Forget It</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            A burner wallet is a disposable Ethereum address you use once and throw away. Cope Wallet generates one in under a second — no extension, no signup, no KYC. Perfect for airdrops, anonymous DeFi, and test transactions.
          </p>
          <Link
            href="/"
            style={{ display: 'inline-block', background: '#52ffac', color: '#000', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}
          >
            Create Your Burner Wallet →
          </Link>
        </section>

        {/* What is a burner wallet */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>What Is a Burner Wallet?</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            A <strong style={{ color: '#fff' }}>burner wallet</strong> — named after the concept of a burner phone — is a disposable cryptocurrency wallet address used for a specific, short-term purpose. The idea is simple: generate a fresh address, use it, then abandon it (or burn it). Nothing about the address connects back to your main identity.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            On-chain privacy matters. Every wallet address on Ethereum and other public blockchains has a permanent, publicly visible transaction history. Any interaction your main wallet makes — from NFT purchases to DeFi swaps to token approvals — is visible to anyone with a blockchain explorer. A burner wallet breaks this trail.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Cope Wallet makes burner wallets effortless. Open the site, copy the address, use it, and either close the tab (wallet deleted) or save it to a PNG key file. No MetaMask, no browser extension, no Google account required.
          </p>
        </section>

        {/* Why use a burner wallet */}
        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>Why Use a Burner Wallet?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              {[
                {
                  icon: '🔒',
                  title: 'Protect Your Main Wallet',
                  desc: 'Keep your primary holdings isolated from experimental or risky interactions. If a dApp is malicious, only the burner wallet is at risk.',
                },
                {
                  icon: '🪂',
                  title: 'Airdrop Farming',
                  desc: 'Claim airdrops with fresh addresses to avoid spam tokens, phishing approvals, and on-chain linkage to your main portfolio.',
                },
                {
                  icon: '🔬',
                  title: 'Smart Contract Testing',
                  desc: 'Test your own or third-party contracts with real mainnet conditions using a throwaway address. No risk to permanent holdings.',
                },
                {
                  icon: '🕵️',
                  title: 'Anonymous DeFi',
                  desc: 'Swap, lend, or farm on DeFi protocols without connecting those transactions to your main wallet address history.',
                },
                {
                  icon: '🎮',
                  title: 'NFT Mints & Games',
                  desc: 'Mint NFTs or participate in on-chain games with a burner address — even if the contract has a bug, your main wallet is safe.',
                },
                {
                  icon: '💸',
                  title: 'One-time Payments',
                  desc: 'Receive a payment from someone new without sharing your main wallet address or its transaction history.',
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ background: '#1a1a1a', borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                  <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{title}</h3>
                  <p style={{ color: '#777', lineHeight: 1.7, fontSize: 14, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>How Cope Wallet Protects Your Burner Keys</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 20 }}>
            Even though a burner wallet is disposable, the private key must stay secure while you are using it. Cope Wallet applies several layers of protection:
          </p>
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { label: 'Browser-native key generation', desc: 'Keys are generated using window.crypto.getRandomValues() — the same source used by hardware wallets.' },
              { label: 'AES-256 in-memory encryption', desc: 'The private key is encrypted before being held in memory. Even a memory dump reveals no plaintext key.' },
              { label: 'Memory sharding', desc: 'The key is split across multiple memory locations using a scattered-store technique, making heap inspection ineffective.' },
              { label: 'Automatic key rotation', desc: 'Every 60 seconds the in-memory key is re-encrypted with a new ephemeral key, limiting the window of exposure.' },
              { label: 'Zero server transmission', desc: 'Your private key never leaves your browser. There are no API calls that include the key or mnemonic.' },
              { label: 'Tab-close wipe', desc: 'On tab close, all key material is wiped from memory. The burner wallet ceases to exist unless you saved it.' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', borderBottom: '1px solid #1a1a1a', paddingBottom: 16 }}>
                <span style={{ color: '#52ffac', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 8 }}>✓</span>
                <div>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{label}</span>
                  <span style={{ color: '#666', marginLeft: 8 }}>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>Burner Wallet FAQ</h2>
            <div style={{ display: 'grid', gap: 20 }}>
              {[
                { q: 'What is a burner wallet?', a: 'A burner wallet is a disposable crypto address used for short-term or one-time purposes — named like a burner phone. Cope Wallet generates one instantly with no signup.' },
                { q: 'Why use a burner wallet instead of your main wallet?', a: 'To protect your main wallet\'s privacy and security. Your main address has a public on-chain history. A burner keeps new activities off that record.' },
                { q: 'Is a burner wallet legal?', a: 'Yes. A burner wallet is simply a new blockchain address. Financial privacy is a legitimate, legal use case in most jurisdictions.' },
                { q: 'Can a burner wallet hold real crypto?', a: 'Yes. It\'s a fully functional Ethereum-compatible address that can hold ETH, ERC-20 tokens, and NFTs. The difference is intent, not security.' },
                { q: 'How is Cope Wallet different from other burner wallets?', a: 'No extension to install, no account to create. Keys are generated locally, never sent to a server, and automatically wiped on tab close. WalletConnect v2 lets you connect directly to any dApp.' },
              ].map(({ q, a }) => (
                <div key={q} style={{ borderLeft: '2px solid #52ffac', paddingLeft: 20 }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{q}</h3>
                  <p style={{ color: '#888', lineHeight: 1.7, margin: 0, fontSize: 15 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>Create a Free Burner Wallet Now</h2>
          <p style={{ color: '#888', marginBottom: 32 }}>No signup. No download. No KYC. Just open the site and your burner wallet is ready.</p>
          <Link
            href="/"
            style={{ display: 'inline-block', background: '#52ffac', color: '#000', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}
          >
            Open Cope Wallet Free →
          </Link>
          <p style={{ marginTop: 24, color: '#444', fontSize: 13 }}>
            Also see:{' '}
            <Link href="/temp-wallet" style={{ color: '#52ffac' }}>Temp Wallet</Link>
            {' · '}
            <Link href="/anonymous-crypto-wallet" style={{ color: '#52ffac' }}>Anonymous Wallet</Link>
            {' · '}
            <Link href="/no-kyc-crypto-wallet" style={{ color: '#52ffac' }}>No-KYC Wallet</Link>
          </p>
        </section>
      </main>
    </>
  );
}
