import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'No-KYC Crypto Wallet — Use Crypto Without Identity Verification',
  description: 'Cope Wallet is a no-KYC crypto wallet. No ID, no selfie, no personal data — ever. Send and receive on Ethereum, BNB, Polygon & all EVM chains completely anonymously.',
  alternates: { canonical: `${BASE_URL}/no-kyc-crypto-wallet` },
  openGraph: {
    title: 'No-KYC Crypto Wallet — No ID Required',
    description: 'Use crypto without identity verification. No KYC, no ID, no personal data. Works on all EVM chains.',
    url: `${BASE_URL}/no-kyc-crypto-wallet`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — No KYC Crypto Wallet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'No-KYC Crypto Wallet — Cope Wallet',
    description: 'No KYC, no ID, no personal data. Free EVM wallet.',
    images: [`${BASE_URL}/og-image.png`],
  },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/no-kyc-crypto-wallet#webpage`,
      url: `${BASE_URL}/no-kyc-crypto-wallet`,
      name: 'No-KYC Crypto Wallet — Use Crypto Without Identity Verification',
      description: 'No-KYC crypto wallet for anonymous EVM transactions. Zero personal data required.',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/no-kyc-crypto-wallet#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/no-kyc-crypto-wallet#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'No-KYC Crypto Wallet', item: `${BASE_URL}/no-kyc-crypto-wallet` },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/no-kyc-crypto-wallet#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is a no-KYC crypto wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'A no-KYC crypto wallet is a cryptocurrency wallet that requires no identity verification (Know Your Customer). You do not submit a government ID, passport, selfie, address, or any personal information. Cope Wallet is a no-KYC wallet by design: open the website, and a wallet is generated instantly with no registration of any kind.' },
        },
        {
          '@type': 'Question',
          name: 'Is it legal to use a no-KYC crypto wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Self-custody crypto wallets — including no-KYC wallets — are legal in most countries. KYC requirements typically apply to centralized exchanges and financial institutions, not to self-custody wallet software. Cope Wallet is wallet software that runs in your browser and is not a regulated financial service. Always comply with the laws of your jurisdiction.' },
        },
        {
          '@type': 'Question',
          name: 'Why avoid KYC for a crypto wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'KYC processes collect sensitive personal data (passport scans, selfies, addresses) that can be leaked, hacked, or sold. High-profile KYC data breaches at exchanges have exposed millions of users to phishing, identity theft, and physical threats. A no-KYC wallet eliminates this risk entirely by collecting no personal data in the first place.' },
        },
        {
          '@type': 'Question',
          name: 'Can I receive crypto into a no-KYC wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. A no-KYC wallet address is identical to any other Ethereum address — it can receive ETH, BNB, MATIC, and any ERC-20 token or NFT. The address itself does not know or care whether KYC was performed. Cope Wallet generates a valid, usable EVM address instantly.' },
        },
        {
          '@type': 'Question',
          name: 'What is the difference between KYC and non-KYC wallets?',
          acceptedAnswer: { '@type': 'Answer', text: 'KYC wallets (typically centralized exchanges like Coinbase or Binance) require government ID verification before you can transact. Non-KYC wallets (like Cope Wallet, MetaMask, and all self-custody wallets) generate a blockchain address without any identity check. The technical security of the wallet is the same — the difference is whether your identity is tied to the address.' },
        },
      ],
    },
  ],
};

export default function NoKYCWalletPage() {
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
            <span>No-KYC Crypto Wallet</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            No-KYC Crypto Wallet —{' '}
            <span style={{ color: '#52ffac' }}>No ID Required</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            Cope Wallet requires absolutely zero KYC. No government ID, no passport scan, no selfie, no address — nothing. Open the site and your Ethereum-compatible wallet is ready in under a second.
          </p>
          <Link
            href="/"
            style={{ display: 'inline-block', background: '#52ffac', color: '#000', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}
          >
            Get No-KYC Wallet →
          </Link>
        </section>

        {/* What is KYC */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>What Is KYC — and Why Avoid It?</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#fff' }}>KYC (Know Your Customer)</strong> is a regulatory process where financial institutions verify the identity of their users. In crypto, this means centralized exchanges like Coinbase, Binance, and Kraken require you to submit a government-issued ID, a selfie, and sometimes proof of address before you can trade.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            KYC was designed for regulated financial institutions — not for self-custody wallets. When a wallet requires KYC, it is typically because it is operating as a financial intermediary, not because the underlying blockchain demands it. The blockchain itself does not care who you are.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            The problem with KYC data collection is the data itself. Passport scans, facial images, and home addresses stored on centralized servers are high-value targets for hackers. Multiple major exchanges have suffered KYC data breaches, exposing millions of users to phishing attacks, sim-swapping, and in some cases physical threats.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Cope Wallet eliminates this risk entirely: it collects <strong style={{ color: '#fff' }}>zero personal data</strong>. There is nothing to breach.
          </p>
        </section>

        {/* KYC vs no-KYC comparison */}
        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 32 }}>KYC Wallet vs No-KYC Wallet</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontWeight: 600 }}>Comparison</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#52ffac', fontWeight: 600 }}>No-KYC (Cope Wallet)</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontWeight: 600 }}>KYC Exchange Wallet</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Setup time', '< 1 second', '1–3 business days'],
                    ['Documents required', 'None', 'Gov. ID + selfie + address proof'],
                    ['Data stored about you', 'Zero', 'Full identity profile'],
                    ['Breach risk', 'None (no data)', 'High (centralized database)'],
                    ['Account needed', 'No', 'Yes (email + password)'],
                    ['Access restrictions', 'None', 'Geo-blocked in some countries'],
                    ['Self-custody', 'Yes (you control keys)', 'No (exchange holds keys)'],
                    ['Anonymous use', 'Yes', 'No'],
                  ].map(([feat, nokyc, kyc]) => (
                    <tr key={feat} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: '12px 16px', color: '#888' }}>{feat}</td>
                      <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 500 }}>{nokyc}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{kyc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Legality */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>Is Using a No-KYC Wallet Legal?</h2>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            In most countries, <strong style={{ color: '#fff' }}>yes</strong>. Self-custody crypto wallets are not subject to KYC regulations in most jurisdictions — those requirements apply to regulated financial intermediaries (exchanges, brokers, custodians), not to software that generates and manages cryptographic keys.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8, marginBottom: 16 }}>
            Wallets like MetaMask, Ledger, Trezor, and Cope Wallet have no KYC requirement because they are software tools, not financial institutions. They do not hold your funds on your behalf — they give you the keys so you hold your own funds.
          </p>
          <p style={{ color: '#ccc', lineHeight: 1.8 }}>
            Always comply with the laws of your jurisdiction. Using crypto for illegal activity is never acceptable regardless of which wallet you use.
          </p>
        </section>

        {/* Why KYC data is dangerous */}
        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 24 }}>The Hidden Risks of KYC Data Collection</h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {[
                { title: 'Data breaches', desc: 'Ledger, Celsius, FTX, Binance — major crypto companies have leaked millions of KYC records including full names, home addresses, phone numbers, and passport scans.' },
                { title: 'Phishing & social engineering', desc: 'Leaked KYC data enables highly targeted phishing attacks. Criminals use your real name and partial account details to impersonate support staff.' },
                { title: 'SIM swapping', desc: 'Attackers who obtain your phone number from a KYC leak can transfer your number to their SIM and bypass 2FA on your accounts.' },
                { title: 'Physical threats', desc: 'In extreme cases, knowing someone holds significant crypto + their home address creates serious personal safety risks.' },
                { title: 'Government surveillance', desc: 'KYC data can be subpoenaed or shared with government agencies, creating permanent financial surveillance records.' },
                { title: 'Third-party data sales', desc: 'KYC data collected by crypto services has been sold to data brokers in documented cases, despite privacy policy promises.' },
              ].map(({ title, desc }) => (
                <div key={title} style={{ background: '#1a0000', border: '1px solid #330000', borderRadius: 10, padding: '18px 20px' }}>
                  <span style={{ color: '#ff6b6b', fontWeight: 700 }}>⚠ {title}: </span>
                  <span style={{ color: '#888' }}>{desc}</span>
                </div>
              ))}
            </div>
            <p style={{ color: '#52ffac', marginTop: 24, fontWeight: 600 }}>
              Cope Wallet stores zero personal data — there is nothing to breach, leak, or sell.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>No-KYC Wallet FAQ</h2>
          <div style={{ display: 'grid', gap: 20 }}>
            {[
              { q: 'What is a no-KYC crypto wallet?', a: 'A wallet that requires no identity verification — no ID, no selfie, no personal data. Cope Wallet generates an EVM wallet instantly with zero registration.' },
              { q: 'Is it legal to use a no-KYC crypto wallet?', a: 'Yes in most countries. KYC requirements apply to financial institutions, not self-custody wallet software. Always comply with your local laws.' },
              { q: 'Why avoid KYC for a crypto wallet?', a: 'KYC data is a breach magnet. Multiple exchanges have leaked millions of identity records. Cope Wallet eliminates this risk by collecting nothing.' },
              { q: 'Can I receive crypto into a no-KYC wallet?', a: 'Yes. The wallet address works like any other EVM address — receive ETH, BNB, MATIC, ERC-20 tokens, and NFTs with no restrictions.' },
              { q: 'What is the difference between KYC and non-KYC wallets?', a: 'KYC wallets (exchanges) require identity verification and hold your data. Non-KYC wallets (self-custody like Cope Wallet) generate keys without any identity check.' },
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
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>Use Crypto Without KYC — Free, Instant, Private</h2>
            <p style={{ color: '#888', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>No ID. No selfie. No personal data. Cope Wallet gives you a real EVM wallet address in under a second.</p>
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
              <Link href="/anonymous-crypto-wallet" style={{ color: '#52ffac' }}>Anonymous Wallet</Link>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
