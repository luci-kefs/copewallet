import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Free Temp Wallet — Instant Temporary Crypto Wallet, No Signup',
  description: 'Need a temp wallet fast? Cope Wallet generates a free temporary crypto wallet in seconds. No account, no email, no KYC. Works on Ethereum, BNB, Polygon & all EVM chains.',
  alternates: { canonical: `${BASE_URL}/temp-wallet` },
  openGraph: {
    title: 'Free Temp Wallet — Instant Temporary Crypto Wallet',
    description: 'Generate a free temporary crypto wallet in seconds. No signup, no KYC, 100% anonymous. Works on all EVM chains.',
    url: `${BASE_URL}/temp-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Free Temp Wallet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Temp Wallet — Cope Wallet',
    description: 'Instant temporary crypto wallet. No signup, no KYC. Free.',
    images: [`${BASE_URL}/og-image.png`],
  },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/temp-wallet#webpage`,
      url: `${BASE_URL}/temp-wallet`,
      name: 'Free Temp Wallet — Instant Temporary Crypto Wallet',
      description: 'Generate a free temporary crypto wallet instantly. No signup, no KYC, 100% anonymous.',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/temp-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/temp-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Temp Wallet', item: `${BASE_URL}/temp-wallet` },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/temp-wallet#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is a temp wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'A temp wallet (temporary wallet) is a disposable crypto wallet address created for short-term or single-use purposes. It lets you receive or send cryptocurrency without linking transactions to a permanent identity or account. Cope Wallet generates one instantly in your browser — no registration needed.' },
        },
        {
          '@type': 'Question',
          name: 'How long does a temp wallet last?',
          acceptedAnswer: { '@type': 'Answer', text: 'By default, Cope Wallet is session-based: it exists as long as your browser tab is open. When you close the tab the wallet wipes itself. If you need it longer, you can persist it using a passphrase — the encrypted wallet is downloaded as a PNG key file you can restore later.' },
        },
        {
          '@type': 'Question',
          name: 'Is a temp wallet safe for receiving crypto?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. A temp wallet is a valid Ethereum-compatible address that can receive any ERC-20 token or native coin (ETH, BNB, MATIC, etc.). The address is cryptographically generated in your browser, so funds sent to it are real and retrievable as long as you have the private key.' },
        },
        {
          '@type': 'Question',
          name: 'Can I use a temp wallet for airdrops?',
          acceptedAnswer: { '@type': 'Answer', text: 'Absolutely. Temp wallets are ideal for airdrop claims because they keep your main wallet address separate from airdrop activity, reducing spam and privacy exposure. Cope Wallet generates a fresh temp wallet address instantly — paste it into the airdrop form and you are done.' },
        },
        {
          '@type': 'Question',
          name: 'What chains does the temp wallet support?',
          acceptedAnswer: { '@type': 'Answer', text: 'Cope Wallet temp wallets work on all EVM-compatible chains: Ethereum, BNB Smart Chain, Polygon, Arbitrum, Optimism, Base, Avalanche, Fantom, and any other EVM network. The same address works on every chain — just switch networks to see balances per chain.' },
        },
      ],
    },
  ],
};

export default function TempWalletPage() {
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
            <span>Temp Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Free Temp Wallet —{' '}
            <span style={{ color: '#52ffac' }}>Instant & Anonymous</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            A temp wallet (temporary crypto wallet) lets you receive and send cryptocurrency without creating an account. Cope Wallet generates one in your browser in under a second — no signup, no email, no KYC required.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              background: '#52ffac',
              color: '#000',
              fontWeight: 700,
              fontSize: 16,
              padding: '14px 32px',
              borderRadius: 10,
              textDecoration: 'none',
            }}
          >
            Get Your Free Temp Wallet →
          </Link>
        </section>

        {/* What is a temp wallet */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>What Is a Temp Wallet?</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            A <strong style={{ color: '#fff' }}>temp wallet</strong> — short for temporary wallet — is a disposable cryptocurrency address designed for short-term or one-time use. Unlike a conventional wallet app that stores your identity and transaction history permanently, a temp wallet exists only for as long as you need it.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            People use temp wallets to receive airdrops without exposing their main address, test smart contracts on mainnet with real (but small) funds, participate in DeFi anonymously, or simply accept a one-time payment from someone. The key property of a good temp wallet is that it is <em>disposable by design</em>: you create it, use it, and discard it.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Cope Wallet is built from the ground up as a temp wallet. Every session creates a brand new Ethereum-compatible address generated entirely inside your browser. The private key never leaves your device, and when you close the tab the wallet is gone — unless you choose to save it.
          </p>
        </section>

        {/* How it works */}
        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 40 }}>How a Temp Wallet Works</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
              {[
                { step: '1', title: 'Open the site', desc: 'Visit copewallet.com. A unique Ethereum address is generated instantly inside your browser using cryptographically secure entropy.' },
                { step: '2', title: 'Share your address', desc: 'Copy your temp wallet address and use it — paste it into an airdrop form, send it to a friend, or connect to a dApp via WalletConnect.' },
                { step: '3', title: 'Send or receive', desc: 'The address works on every EVM chain. Receive ETH, BNB, MATIC, or any ERC-20 token. Send funds out when you are ready.' },
                { step: '4', title: 'Save or discard', desc: 'Close the tab to wipe the wallet permanently, or use Secure Vault to encrypt and save it as a PNG key file for future access.' },
              ].map(({ step, title, desc }) => (
                <div key={step} style={{ background: '#1a1a1a', borderRadius: 12, padding: 24 }}>
                  <div style={{ width: 36, height: 36, background: '#52ffac', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', marginBottom: 14, fontSize: 18 }}>{step}</div>
                  <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 17 }}>{title}</h3>
                  <p style={{ color: '#888', lineHeight: 1.7, fontSize: 14 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 24 }}>When to Use a Temp Wallet</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 16 }}>
            {[
              { title: 'Airdrops & Token Claims', desc: 'Claim airdrops with a disposable address to avoid spam and keep your main wallet private.' },
              { title: 'Smart Contract Testing', desc: 'Test your own or third-party contracts on mainnet without touching your primary holdings.' },
              { title: 'Anonymous DeFi', desc: 'Interact with Uniswap, Aave, or Curve without linking the transaction to your identity.' },
              { title: 'One-time Payments', desc: 'Accept a single payment anonymously — share the address, receive funds, done.' },
              { title: 'Privacy-Sensitive Transactions', desc: 'Donate to a cause, fund a wallet, or move assets without an on-chain trail back to your main address.' },
              { title: 'Bridge Testing', desc: 'Test cross-chain bridges with small amounts before risking your main holdings.' },
            ].map(({ title, desc }) => (
              <li key={title} style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: '18px 20px' }}>
                <span style={{ color: '#52ffac', fontWeight: 700 }}>{title}</span>
                <span style={{ color: '#888', marginLeft: 8 }}>{desc}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Comparison */}
        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 24 }}>Temp Wallet vs Permanent Wallet</h2>
            <p style={{ color: '#aaa', lineHeight: 1.8, marginBottom: 32 }}>
              A permanent wallet (MetaMask, Ledger, Trust Wallet) is your long-term crypto identity. A temp wallet is intentionally throwaway. Here is how they differ:
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontWeight: 600 }}>Feature</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#52ffac', fontWeight: 600 }}>Temp Wallet (Cope)</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontWeight: 600 }}>Permanent Wallet</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Setup time', 'Instant (< 1 sec)', '5–15 minutes'],
                    ['Account required', 'None', 'Email / seed backup'],
                    ['KYC / identity', 'Zero', 'Sometimes required'],
                    ['Privacy', 'Maximum', 'Linked to address history'],
                    ['Persistence', 'Session (optional)', 'Permanent'],
                    ['Extension required', 'No', 'Usually yes'],
                    ['Best for', 'One-time / anonymous use', 'Long-term holdings'],
                  ].map(([feat, temp, perm]) => (
                    <tr key={feat} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: '12px 16px', color: '#888' }}>{feat}</td>
                      <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 500 }}>{temp}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{perm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Security */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>Is a Temp Wallet Secure?</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            A temp wallet is as secure as the private key generation behind it. Cope Wallet uses the <strong style={{ color: '#fff' }}>ethers.js</strong> library with browser-native <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: 4 }}>crypto.getRandomValues()</code> to generate keys — the same entropy source used by professional hardware wallets.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            In-memory keys are protected with <strong style={{ color: '#fff' }}>AES-256 encryption</strong> and scattered across multiple memory locations using a sharding technique that makes it harder for browser-based attacks to reconstruct the key from a single read. The key rotates automatically every 60 seconds.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            The biggest risk with any temp wallet is losing the private key before moving funds out. Always save your wallet to a PNG key file if you plan to store value in it for more than a session.
          </p>
        </section>

        {/* FAQ */}
        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>Frequently Asked Questions</h2>
            <div style={{ display: 'grid', gap: 20 }}>
              {[
                {
                  q: 'What is a temp wallet?',
                  a: 'A temp wallet (temporary wallet) is a disposable crypto address for short-term use. It lets you receive or send cryptocurrency anonymously without a permanent account. Cope Wallet generates one instantly in your browser.',
                },
                {
                  q: 'How long does a temp wallet last?',
                  a: 'By default it lasts as long as your browser tab is open. Close the tab and the wallet is gone. Use the Secure Vault feature to persist it with a passphrase and PNG key file.',
                },
                {
                  q: 'Is a temp wallet safe for receiving crypto?',
                  a: 'Yes — a temp wallet is a real Ethereum-compatible address. Funds sent to it are real and spendable as long as you hold the private key.',
                },
                {
                  q: 'Can I use a temp wallet for airdrops?',
                  a: 'Absolutely. Paste the Cope Wallet address into any airdrop form. Keep your main wallet private and claim airdrops with a fresh disposable address.',
                },
                {
                  q: 'What chains does the temp wallet support?',
                  a: 'All EVM chains: Ethereum, BNB Smart Chain, Polygon, Arbitrum, Optimism, Base, Avalanche, Fantom, and any other EVM network.',
                },
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
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>Ready to Create Your Temp Wallet?</h2>
          <p style={{ color: '#888', marginBottom: 32 }}>No signup. No tracking. No KYC. Just a free, instant, anonymous temp wallet.</p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              background: '#52ffac',
              color: '#000',
              fontWeight: 700,
              fontSize: 18,
              padding: '16px 40px',
              borderRadius: 12,
              textDecoration: 'none',
            }}
          >
            Open Cope Wallet Free →
          </Link>
          <p style={{ marginTop: 24, color: '#444', fontSize: 13 }}>
            Also see:{' '}
            <Link href="/burner-wallet" style={{ color: '#52ffac' }}>Burner Wallet</Link>
            {' · '}
            <Link href="/anonymous-crypto-wallet" style={{ color: '#52ffac' }}>Anonymous Crypto Wallet</Link>
            {' · '}
            <Link href="/no-kyc-crypto-wallet" style={{ color: '#52ffac' }}>No-KYC Wallet</Link>
          </p>
        </section>
      </main>
    </>
  );
}
