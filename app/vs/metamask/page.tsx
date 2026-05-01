import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://copewallet.com';

export const metadata: Metadata = {
  title: 'Cope Wallet vs MetaMask — Anonymous Wallet Without Extension',
  description: 'Cope Wallet vs MetaMask: no extension, no signup, no IP tracking. Compare anonymous browser-based wallet vs MetaMask for temp use, airdrops, and privacy-first DeFi.',
  alternates: { canonical: `${BASE_URL}/vs/metamask` },
  openGraph: {
    title: 'Cope Wallet vs MetaMask — Which Is Better for Privacy?',
    description: 'Compare Cope Wallet and MetaMask. No extension needed. Full anonymous EVM wallet vs MetaMask for one-time and privacy use.',
    url: `${BASE_URL}/vs/metamask`,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet vs MetaMask' }],
  },
  twitter: { card: 'summary_large_image', title: 'Cope Wallet vs MetaMask', description: 'Anonymous browser wallet vs MetaMask. No extension needed.', images: [`${BASE_URL}/og-image.png`] },
};

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/vs/metamask#webpage`,
      url: `${BASE_URL}/vs/metamask`,
      name: 'Cope Wallet vs MetaMask — Anonymous Wallet Without Extension',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      breadcrumb: { '@id': `${BASE_URL}/vs/metamask#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/vs/metamask#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${BASE_URL}/vs` },
        { '@type': 'ListItem', position: 3, name: 'vs MetaMask', item: `${BASE_URL}/vs/metamask` },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/vs/metamask#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the main difference between Cope Wallet and MetaMask?',
          acceptedAnswer: { '@type': 'Answer', text: 'MetaMask is a browser extension wallet designed for permanent use with accounts, seed phrases, and persistent storage. Cope Wallet is a session-based anonymous web wallet with no extension, no account, and no persistent data by default. Cope Wallet is designed for temporary, anonymous, or disposable wallet use cases where MetaMask is overkill or unwanted.' },
        },
        {
          '@type': 'Question',
          name: 'Does MetaMask track users?',
          acceptedAnswer: { '@type': 'Answer', text: 'MetaMask routes RPC calls through Infura by default, which logs IP addresses. MetaMask also collects usage metrics and sends crash reports. Cope Wallet collects zero data — no IP logging, no analytics, no crash reporting. All RPC calls are proxied through a privacy-preserving intermediary.' },
        },
        {
          '@type': 'Question',
          name: 'Can Cope Wallet replace MetaMask?',
          acceptedAnswer: { '@type': 'Answer', text: 'For one-time or anonymous use cases, yes. If you need a quick wallet for an airdrop, anonymous DeFi, or a test transaction, Cope Wallet is faster and more private. For long-term use with large holdings, MetaMask with a hardware wallet signer is the more appropriate tool.' },
        },
      ],
    },
  ],
};

const rows = [
  ['Browser extension required', '❌ No — open a website', '✓ Yes — install extension'],
  ['Account / seed phrase setup', 'None required', '12-word seed phrase required'],
  ['KYC / personal data', 'Zero', 'Zero (but Infura logs IP)'],
  ['IP address logging', 'No (proxied)', 'Yes (via Infura by default)'],
  ['Analytics / telemetry', 'None', 'Usage metrics collected'],
  ['Setup time', '< 1 second', '5–10 minutes'],
  ['Wallet persistence', 'Session (opt-in save)', 'Permanent'],
  ['WalletConnect support', '✓ v2', '✓ v2'],
  ['Multi-chain EVM', '✓ 26+ chains', '✓ Configurable'],
  ['Hardware wallet support', '✗', '✓ Ledger / Trezor'],
  ['Best for', 'Temp / anonymous use', 'Long-term holdings'],
];

export default function VsMetaMaskPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <nav style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            <Link href="/" style={{ color: '#52ffac', textDecoration: 'none' }}>Cope Wallet</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>vs MetaMask</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            <span style={{ color: '#52ffac' }}>Cope Wallet</span> vs MetaMask —{' '}
            Anonymous Wallet Without an Extension
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#aaa', lineHeight: 1.7, maxWidth: 640, marginBottom: 36 }}>
            MetaMask is great for permanent crypto use. But for temp wallets, airdrops, anonymous DeFi, or any situation where you do not want to install an extension or create an account, Cope Wallet is the better choice.
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
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#F6851B', fontWeight: 600 }}>MetaMask</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([feat, cope, meta]) => (
                    <tr key={feat} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: '12px 16px', color: '#888' }}>{feat}</td>
                      <td style={{ padding: '12px 16px', color: '#fff' }}>{cope}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{meta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>When to Use Cope Wallet Instead of MetaMask</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { title: 'You need a wallet right now', desc: 'No time to install an extension, write down a seed phrase, and set up MetaMask. Cope Wallet is ready in under a second.' },
              { title: 'You do not want to install a browser extension', desc: 'Extensions have persistent access to all browser tabs. Cope Wallet is a website — no permissions, no persistent access.' },
              { title: 'You want maximum privacy', desc: 'MetaMask sends RPC calls to Infura (which logs IPs) and collects usage analytics. Cope Wallet logs nothing.' },
              { title: 'You need a burner wallet for one-time use', desc: 'For an airdrop, a test transaction, or an anonymous DeFi interaction — Cope Wallet is purpose-built for this.' },
              { title: 'You are on a computer you do not own', desc: 'Installing MetaMask on a shared or work computer is a security risk. Cope Wallet leaves no trace when the tab is closed.' },
            ].map(({ title, desc }) => (
              <div key={title} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ color: '#52ffac', fontWeight: 700, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#666', fontSize: 14, lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#0d0d0d', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 36 }}>FAQ</h2>
            <div style={{ display: 'grid', gap: 20 }}>
              {[
                { q: 'What is the main difference between Cope Wallet and MetaMask?', a: 'Cope Wallet is session-based, anonymous, and requires no extension. MetaMask is a permanent extension wallet with an account and seed phrase. Different tools for different needs.' },
                { q: 'Does MetaMask track users?', a: 'MetaMask routes calls through Infura by default (IP logged) and collects usage metrics. Cope Wallet logs zero data.' },
                { q: 'Can Cope Wallet replace MetaMask?', a: 'For one-time/anonymous use: yes. For permanent large holdings: use MetaMask + hardware wallet.' },
              ].map(({ q, a }) => (
                <div key={q} style={{ borderLeft: '2px solid #52ffac', paddingLeft: 20 }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{q}</h3>
                  <p style={{ color: '#888', lineHeight: 1.7, margin: 0, fontSize: 15 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <Link href="/" style={{ display: 'inline-block', background: '#52ffac', color: '#000', fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, textDecoration: 'none' }}>
            Try Cope Wallet — No Extension Needed →
          </Link>
          <p style={{ marginTop: 20, color: '#444', fontSize: 13 }}>
            Also compare:{' '}
            {[['Trust Wallet', '/vs/trust-wallet'], ['Rainbow', '/vs/rainbow'], ['Coinbase Wallet', '/vs/coinbase-wallet']].map(([name, href], i) => (
              <span key={name}>{i > 0 && ' · '}<Link href={href} style={{ color: '#52ffac' }}>{name}</Link></span>
            ))}
          </p>
        </section>
      </main>
    </>
  );
}
