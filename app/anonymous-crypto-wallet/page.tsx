import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Anonymous Crypto Wallet — No KYC, No Email, No Tracking',
  description: 'Cope Wallet is a fully anonymous crypto wallet. Zero KYC, no email, no personal data. Private keys never leave your browser. Use on Ethereum, BNB, Polygon & all EVM chains.',
  alternates: { canonical: `${BASE_URL}/anonymous-crypto-wallet` },
  openGraph: {
    title: 'Anonymous Crypto Wallet — No KYC, No Email, No Tracking',
    description: 'Fully anonymous crypto wallet. Zero KYC, no email, no personal data. Keys never leave your browser.',
    url: `${BASE_URL}/anonymous-crypto-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Anonymous Crypto Wallet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anonymous Crypto Wallet — Cope Wallet',
    description: 'No KYC, no email, no tracking. Fully anonymous EVM wallet.',
    images: [`${BASE_URL}/og-image.png`],
  },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/anonymous-crypto-wallet#webpage`,
      url: `${BASE_URL}/anonymous-crypto-wallet`,
      name: 'Anonymous Crypto Wallet — No KYC, No Email, No Tracking',
      description: 'Fully anonymous crypto wallet with zero KYC, no email, no personal data required.',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/anonymous-crypto-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/anonymous-crypto-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Anonymous Crypto Wallet', item: `${BASE_URL}/anonymous-crypto-wallet` },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/anonymous-crypto-wallet#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What makes Cope Wallet truly anonymous?',
          acceptedAnswer: { '@type': 'Answer', text: 'Cope Wallet collects zero personal information. There is no account creation, no email address, no phone number, no IP logging, no cookies, and no analytics. Private keys are generated locally in your browser using browser-native cryptography and never transmitted to any server. No entity — including Cope Wallet itself — knows who generated any given wallet address.' },
        },
        {
          '@type': 'Question',
          name: 'Can I use an anonymous crypto wallet legally?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Using a crypto wallet without KYC or personal data is legal in most countries. Blockchain wallets are software tools, and privacy is a fundamental right. Cope Wallet is designed for privacy-conscious users, developers, and anyone who values financial autonomy. It should not be used for illegal activity.' },
        },
        {
          '@type': 'Question',
          name: 'Does Cope Wallet log my IP address?',
          acceptedAnswer: { '@type': 'Answer', text: 'No. Cope Wallet does not log IP addresses, track users, or use analytics. The application runs in your browser. The only server-side requests are for blockchain RPC calls (to check balances / broadcast transactions) which are routed through a privacy-preserving proxy that strips identifying headers.' },
        },
        {
          '@type': 'Question',
          name: 'Is an anonymous wallet on a public blockchain actually private?',
          acceptedAnswer: { '@type': 'Answer', text: 'The wallet itself is private — no identity is linked to the address. However, all blockchain transactions are publicly visible. Your wallet address and its transactions are on-chain forever. For full on-chain privacy, use a fresh address for each purpose and avoid depositing from a KYC exchange directly into your anonymous wallet.' },
        },
        {
          '@type': 'Question',
          name: 'Does Cope Wallet use cookies or trackers?',
          acceptedAnswer: { '@type': 'Answer', text: 'No. Cope Wallet does not use cookies, analytics, advertising trackers, or fingerprinting scripts. The only browser storage used is optional (session data and vault backups, both encrypted and stored locally in your own browser).' },
        },
      ],
    },
  ],
};

export default function AnonymousCryptoWalletPage() {
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
            <span>Anonymous Crypto Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Anonymous Crypto Wallet —{' '}
            <span style={{ color: '#52ffac' }}>Zero Data Collected</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Cope Wallet is a fully anonymous crypto wallet. No account. No email. No KYC. No IP logging. No cookies. Your private keys are generated in your browser and never leave your device.
          </p>
          <Link
            href="/"
            style={{ display: 'inline-block', background: '#52ffac', color: '#000', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}
          >
            Open Anonymous Wallet →
          </Link>
        </section>

        {/* What anonymity actually means */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>What Does "Anonymous" Actually Mean?</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Most crypto wallets claim to be private but still collect data. MetaMask logs your IP and sends it to Infura. Centralized exchanges require government-issued ID. Even "self-custody" wallets often ping analytics servers on startup.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Cope Wallet is different. <strong style={{ color: '#fff' }}>No data ever leaves your browser</strong> — not your private key, not your IP address, not your transaction history. The wallet is generated locally using browser-native cryptography. If you close the tab, there is no server-side record that your wallet ever existed.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Blockchain transactions are still public (that is the nature of public blockchains), but the link between your real identity and the wallet address is severed at the source.
          </p>
        </section>

        {/* Privacy features */}
        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>Privacy Architecture</h2>
            <div style={{ display: 'grid', gap: 0 }}>
              {[
                {
                  feature: 'No account creation',
                  detail: 'Zero registration. No username, no email, no password. The wallet is your identity.',
                  status: 'zero-data',
                },
                {
                  feature: 'No KYC / identity verification',
                  detail: 'No government ID, no selfie, no address. Cope Wallet treats privacy as a default, not an option.',
                  status: 'zero-data',
                },
                {
                  feature: 'No IP address logging',
                  detail: 'Blockchain RPC calls are proxied through a server that strips identifying headers and does not log requests.',
                  status: 'zero-data',
                },
                {
                  feature: 'No cookies',
                  detail: 'Zero cookies — no session cookies, no tracking cookies, no advertising pixels.',
                  status: 'zero-data',
                },
                {
                  feature: 'No analytics scripts',
                  detail: 'No Google Analytics, no Plausible, no Mixpanel. No third-party JavaScript that phones home.',
                  status: 'zero-data',
                },
                {
                  feature: 'No fingerprinting',
                  detail: 'No canvas fingerprinting, no WebGL fingerprinting, no device ID collection.',
                  status: 'zero-data',
                },
                {
                  feature: 'Local key generation',
                  detail: 'Private keys are generated using window.crypto.getRandomValues() inside your browser — never on a server.',
                  status: 'local',
                },
                {
                  feature: 'Local key storage',
                  detail: 'Keys are held in-memory with AES-256 encryption and memory sharding. Never written to localStorage in plaintext.',
                  status: 'local',
                },
              ].map(({ feature, detail }) => (
                <div key={feature} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', borderBottom: '1px solid #1a1a1a', padding: '16px 0' }}>
                  <span style={{ color: '#52ffac', fontWeight: 700, fontSize: 18, lineHeight: 1, marginTop: 2 }}>✓</span>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>{feature}</div>
                    <div style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* On-chain vs off-chain privacy */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>On-Chain vs Off-Chain Privacy</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 20 }}>
            It is important to understand the distinction between application-level privacy (what Cope Wallet controls) and blockchain-level privacy (what the chain records):
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: '#0d1a0f', border: '1px solid #1a3320', borderRadius: 12, padding: 24 }}>
              <h3 style={{ color: '#52ffac', fontWeight: 700, marginBottom: 12, fontSize: 16 }}>What Cope Wallet keeps private</h3>
              <ul style={{ color: '#888', lineHeight: 1.8, padding: '0 0 0 16px', margin: 0, fontSize: 14 }}>
                <li>Your real identity</li>
                <li>Your email or phone</li>
                <li>Your IP address</li>
                <li>Your device fingerprint</li>
                <li>Your private key</li>
                <li>The fact you used Cope Wallet</li>
              </ul>
            </div>
            <div style={{ background: '#1a1000', border: '1px solid #332200', borderRadius: 12, padding: 24 }}>
              <h3 style={{ color: '#ffaa52', fontWeight: 700, marginBottom: 12, fontSize: 16 }}>What is public on-chain</h3>
              <ul style={{ color: '#888', lineHeight: 1.8, padding: '0 0 0 16px', margin: 0, fontSize: 14 }}>
                <li>Your wallet address</li>
                <li>Transaction amounts</li>
                <li>Transaction timestamps</li>
                <li>Counterparty addresses</li>
                <li>Token holdings</li>
                <li>Smart contract interactions</li>
              </ul>
            </div>
          </div>
          <p style={{ color: '#666', lineHeight: 1.8, marginTop: 20, fontSize: 14 }}>
            For maximum on-chain privacy, use a fresh address per activity and avoid depositing directly from a KYC exchange into your anonymous wallet address.
          </p>
        </section>

        {/* Who uses anonymous wallets */}
        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 32 }}>Who Uses Anonymous Crypto Wallets?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              {[
                { title: 'Privacy-conscious users', desc: 'People who believe financial privacy is a right, not a privilege.' },
                { title: 'Developers & researchers', desc: 'Testing contracts and protocols without exposing personal holdings.' },
                { title: 'Journalists & activists', desc: 'Receiving anonymous donations or payments in high-risk environments.' },
                { title: 'DeFi traders', desc: 'Separating trading activity from personal wallet history for privacy.' },
                { title: 'Airdrop hunters', desc: 'Claiming drops without exposing main wallet addresses to spam.' },
                { title: 'NFT collectors', desc: 'Participating in mints and markets without public attribution.' },
              ].map(({ title, desc }) => (
                <div key={title} style={{ background: '#1a1a1a', borderRadius: 12, padding: 20 }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>{title}</h3>
                  <p style={{ color: '#666', lineHeight: 1.6, fontSize: 14, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>Anonymous Wallet FAQ</h2>
          <div style={{ display: 'grid', gap: 20 }}>
            {[
              { q: 'What makes Cope Wallet truly anonymous?', a: 'No account, no email, no IP logging, no cookies, no analytics. Keys generated locally, never transmitted. No server knows your wallet exists.' },
              { q: 'Can I use an anonymous crypto wallet legally?', a: 'Yes. Using a crypto wallet without KYC is legal in most countries. Privacy is a fundamental right. Cope Wallet should not be used for illegal activity.' },
              { q: 'Does Cope Wallet log my IP address?', a: 'No. RPC calls are proxied through a server that strips identifying headers and does not log requests.' },
              { q: 'Is an anonymous wallet on a public blockchain private?', a: 'The wallet has no identity linked to it — but blockchain transactions are publicly visible. Use fresh addresses per activity for maximum on-chain privacy.' },
              { q: 'Does Cope Wallet use cookies or trackers?', a: 'No cookies, no analytics, no third-party tracking scripts of any kind.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ borderLeft: '2px solid #52ffac', paddingLeft: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{q}</h3>
                <p style={{ color: '#888', lineHeight: 1.7, margin: 0, fontSize: 15 }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: '#0d0d0d', padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>Start Using a Truly Anonymous Crypto Wallet</h2>
            <p style={{ color: '#888', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>No data collected. No account required. Open the site and your anonymous wallet is ready in under a second.</p>
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
              <Link href="/burner-wallet" style={{ color: '#52ffac' }}>Burner Wallet</Link>
              {' · '}
              <Link href="/no-kyc-crypto-wallet" style={{ color: '#52ffac' }}>No-KYC Wallet</Link>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
