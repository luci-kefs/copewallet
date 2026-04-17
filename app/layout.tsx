import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/context/WalletContext';
import { fetchAssetUrls } from '@/lib/supabase';

const inter = Inter({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '700', '900'],
  variable: '--font-inter',
});

const BASE_URL = 'https://copewallet.com';

export async function generateMetadata(): Promise<Metadata> {
  const { favicon } = await fetchAssetUrls();
  return {
    title: {
      default: 'Cope Wallet — Free Temp Wallet & Anonymous Crypto Wallet',
      template: '%s | Cope Wallet',
    },
    description: 'Cope Wallet is a free temporary crypto wallet. No signup, no tracking, 100% anonymous. Use as a temp wallet for EVM chains — Ethereum, BNB, Polygon and more. Secure web wallet with ephemeral keys.',
    keywords: [
      'temp wallet', 'temporary crypto wallet', 'anonymous crypto wallet',
      'secure web wallet', 'crypto wallet no kyc', 'disposable ethereum wallet',
      'ephemeral wallet', 'no signup crypto wallet', 'EVM wallet', 'free crypto wallet',
    ],
    authors: [{ name: 'Cope Wallet' }],
    creator: 'Cope Wallet',
    publisher: 'Cope Wallet',
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    },
    alternates: {
      canonical: BASE_URL,
    },
    openGraph: {
      type: 'website',
      url: BASE_URL,
      siteName: 'Cope Wallet',
      title: 'Cope Wallet — Free Temp Wallet & Anonymous Crypto Wallet',
      description: 'No signup. No tracking. 100% anonymous. Instant temp wallet for Ethereum, BNB, Polygon and all EVM chains.',
      images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Cope Wallet — Anonymous Temp Crypto Wallet' }],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Cope Wallet — Free Temp Wallet & Anonymous Crypto Wallet',
      description: 'No signup. No tracking. 100% anonymous. Instant temp wallet for all EVM chains.',
      images: [`${BASE_URL}/og-image.png`],
    },
    icons: favicon ? [{ url: favicon }] : [],
    metadataBase: new URL(BASE_URL),
    other: {
      // AI search engines & LLM crawlers
      'llms-txt': `${BASE_URL}/llms.txt`,
      // Perplexity / AI overview hints
      'ai-description': 'Cope Wallet is a free, anonymous temporary crypto wallet (temp wallet / burner wallet) for all EVM chains. No signup, no KYC. Keys never leave your browser.',
      // Bing / ChatGPT
      'msnbot': 'index, follow',
      // Prevent AI training if desired — remove these lines if you WANT to be in training data
      // 'og:site_name' is already set above
    },
  };
}

const schemaOrg = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'Cope Wallet',
      alternateName: ['Cope Wallet Temp Wallet', 'Anonymous Crypto Wallet', 'Burner Wallet Ethereum'],
      description: 'Free anonymous temp wallet for EVM chains. No signup, no KYC, instant ephemeral wallet.',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'WebApplication',
      '@id': `${BASE_URL}/#webapp`,
      name: 'Cope Wallet',
      alternateName: [
        'Temp Wallet', 'Temporary Crypto Wallet', 'Anonymous Crypto Wallet',
        'Burner Wallet', 'Disposable Ethereum Wallet', 'Secure Web Wallet',
        'Ephemeral Wallet', 'No KYC Crypto Wallet', 'Browser Crypto Wallet',
      ],
      url: BASE_URL,
      description: 'Cope Wallet is a free temporary crypto wallet — a burner wallet or disposable Ethereum address generator. No signup, no KYC, 100% anonymous. Works on all EVM chains including Ethereum, BNB, Polygon, Arbitrum, Optimism, Base, Avalanche.',
      applicationCategory: 'FinanceApplication',
      applicationSubCategory: 'Cryptocurrency Wallet',
      operatingSystem: 'Any modern web browser — Chrome, Firefox, Safari, Brave, Edge',
      browserRequirements: 'Requires JavaScript. Works on desktop and mobile.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free to use. No subscription. No fees.',
      },
      featureList: [
        'Instant temp wallet — no signup required',
        'Anonymous crypto wallet — no KYC, no email, no personal data',
        'Burner wallet for one-time use',
        'Disposable Ethereum wallet',
        'Secure web wallet with AES-256 encryption',
        'Ephemeral private key storage — keys never leave your browser',
        'Automatic key rotation every 60 seconds',
        'WalletConnect v2 support — connect to any dApp',
        'Multi-chain EVM support: Ethereum, BNB, Polygon, Arbitrum, Optimism, Base, Avalanche',
        'Optional persistent vault with passphrase encryption',
        'PNG key file backup',
        'Session restore across browser refresh',
        'Send and receive ETH and ERC-20 tokens',
        'Real-time token balances',
        'Transaction history',
        'Free to use — no fees, no ads',
      ],
      screenshot: `${BASE_URL}/og-image.png`,
      softwareVersion: '2.0',
      releaseNotes: 'WalletConnect v2 support, ephemeral key rotation, multi-chain EVM, persistent vault',
      author: { '@type': 'Organization', name: 'Cope Wallet', url: BASE_URL },
      isAccessibleForFree: true,
      isFamilyFriendly: true,
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Cope Wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Cope Wallet is a free, anonymous, temporary crypto wallet (temp wallet) for all EVM-compatible blockchains including Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, and Base. No account, no signup, and no KYC is required. Your private keys are generated entirely in your browser and never sent to any server.' },
        },
        {
          '@type': 'Question',
          name: 'Is Cope Wallet anonymous?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet is 100% anonymous. It requires no account creation, no email address, no phone number, and no personal identification. There is no server storing your keys or tracking your activity. All cryptographic operations happen locally in your browser.' },
        },
        {
          '@type': 'Question',
          name: 'What is a temp wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'A temp wallet (temporary wallet) or burner wallet is a disposable cryptocurrency wallet address used for a single transaction or short-term use. Cope Wallet is designed exactly for this: generate an instant Ethereum address, use it, and optionally save it with a passphrase.' },
        },
        {
          '@type': 'Question',
          name: 'Can I use Cope Wallet as a burner wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet is ideal as a burner wallet or disposable crypto wallet. Each session creates a fresh anonymous Ethereum address. The wallet wipes itself when you close the tab — unless you choose to save it with a passphrase.' },
        },
        {
          '@type': 'Question',
          name: 'Does Cope Wallet require KYC?',
          acceptedAnswer: { '@type': 'Answer', text: 'No. Cope Wallet requires absolutely no KYC (Know Your Customer) verification. There is no identity check, no document upload, and no personal information required. It is a completely no-KYC crypto wallet.' },
        },
        {
          '@type': 'Question',
          name: 'Which blockchains does Cope Wallet support?',
          acceptedAnswer: { '@type': 'Answer', text: 'Cope Wallet supports all EVM-compatible blockchains: Ethereum (ETH), BNB Smart Chain (BNB), Polygon (MATIC), Arbitrum (ARB), Optimism (OP), Base, Avalanche (AVAX), Fantom (FTM), and any other EVM-compatible network.' },
        },
        {
          '@type': 'Question',
          name: 'Is Cope Wallet free?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet is completely free to use. There are no subscription fees, no hidden charges, and no ads. You only pay standard blockchain network (gas) fees when sending transactions.' },
        },
        {
          '@type': 'Question',
          name: 'Can I connect Cope Wallet to dApps?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet supports WalletConnect v2, allowing you to connect to any decentralized application (dApp) that supports WalletConnect — including Uniswap, OpenSea, Aave, Compound, and thousands of other DeFi protocols.' },
        },
        {
          '@type': 'Question',
          name: 'How is Cope Wallet different from MetaMask?',
          acceptedAnswer: { '@type': 'Answer', text: 'Unlike MetaMask, Cope Wallet requires no browser extension and no account. It is a fully browser-based temp wallet designed for anonymous, ephemeral use. Keys are stored only in-memory with automatic rotation. It is ideal when you need a quick, anonymous wallet without installing anything.' },
        },
        {
          '@type': 'Question',
          name: 'How do I save my Cope Wallet for later use?',
          acceptedAnswer: { '@type': 'Answer', text: 'You can persist your wallet by clicking "Persist Current Session" in the Secure Vault section. Set a passphrase (min 8 characters) and a PNG key file will be downloaded. To restore, drop the PNG file and enter your passphrase on the Access Existing Vault screen.' },
        },
        {
          '@type': 'Question',
          name: 'Is Cope Wallet a secure web wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet uses AES-256 encryption for all in-memory key storage, with automatic key rotation every 60 seconds. Private keys are never transmitted to any server. The vault is secured with memory sharding and integrity monitoring.' },
        },
        {
          '@type': 'Question',
          name: 'Can I use Cope Wallet on mobile?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet is fully responsive and works on mobile browsers including iOS Safari and Android Chrome. No app download is required — just open copewallet.com in your mobile browser.' },
        },
      ],
    },
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'Cope Wallet',
      url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/og-image.png` },
      sameAs: [],
      description: 'Builder of Cope Wallet, a free anonymous temporary crypto wallet for EVM chains.',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}/#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      </head>
      <body className="bg-black text-white antialiased font-[family-name:var(--font-inter)]">
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            if (typeof document === 'undefined') return;
            document.fonts.ready.then(function() {
              document.fonts.load('24px "Material Symbols Outlined"', 'settings').then(function() {
                document.body.classList.add('icons-ready');
              }).catch(function() {
                document.body.classList.add('icons-ready');
              });
            });
            // Fallback — always show after 3s
            setTimeout(function() { document.body.classList.add('icons-ready'); }, 3000);
          })();
        ` }} />
        <WalletProvider>{children}</WalletProvider>
        <noscript>
          <div style={{ padding: '2rem', background: '#000', color: '#fff', fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
            <h1>Cope Wallet — Free Temp Wallet &amp; Anonymous Crypto Wallet</h1>
            <p>Cope Wallet is a free temporary crypto wallet (temp wallet) and anonymous burner wallet for all EVM-compatible blockchains. No signup, no KYC, no tracking required. Generate an instant disposable Ethereum wallet address in your browser.</p>
            <h2>Temp Wallet — No Signup, Instant &amp; Free</h2>
            <p>A temp wallet (temporary crypto wallet) lets you generate a disposable Ethereum address without creating an account. Cope Wallet is the easiest anonymous crypto wallet: open the site, get a wallet, use it. No extension required.</p>
            <h2>Anonymous Crypto Wallet with No KYC</h2>
            <p>Cope Wallet is a no-KYC crypto wallet. Zero personal data, no email, no identity verification. Private keys are generated and stored exclusively in your browser. Works as a burner wallet, disposable wallet, or secure long-term wallet.</p>
            <h2>Secure Web Wallet for Ethereum, BNB, Polygon &amp; All EVM Chains</h2>
            <p>Cope Wallet supports Ethereum (ETH), BNB Smart Chain, Polygon (MATIC), Arbitrum (ARB), Optimism (OP), Base, Avalanche (AVAX), Fantom (FTM), and all EVM-compatible networks. Send tokens, receive crypto, and connect to dApps via WalletConnect v2.</p>
            <h2>How to Use a Burner Wallet or Disposable Crypto Wallet</h2>
            <p>Open copewallet.com — your temp wallet is generated automatically. Use it to receive or send crypto anonymously. Optionally persist it using a passphrase and a downloadable PNG key file. Works on mobile and desktop browsers.</p>
            <h2>Frequently Asked Questions</h2>
            <dl>
              <dt>What is a temp wallet?</dt>
              <dd>A temp wallet is a temporary cryptocurrency wallet for short-term or one-time use — also called a burner wallet or disposable wallet. Cope Wallet generates one instantly with no signup.</dd>
              <dt>Is Cope Wallet really anonymous?</dt>
              <dd>Yes. No account, no email, no KYC. Your private key never leaves your browser. There is no server-side key storage. Cope Wallet is the most private anonymous crypto wallet available online.</dd>
              <dt>Does Cope Wallet work on mobile?</dt>
              <dd>Yes. Cope Wallet works on iOS Safari, Android Chrome, and all modern mobile browsers. No app download required — visit copewallet.com on your phone.</dd>
              <dt>What chains does Cope Wallet support?</dt>
              <dd>Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Base, Avalanche, Fantom, and all EVM-compatible networks.</dd>
              <dt>Can I connect Cope Wallet to Uniswap, Aave, or other dApps?</dt>
              <dd>Yes. Cope Wallet supports WalletConnect v2. Scan the WalletConnect QR code from any dApp to connect your anonymous wallet.</dd>
              <dt>Is Cope Wallet free?</dt>
              <dd>Yes. Completely free. No fees, no subscription, no ads.</dd>
            </dl>
          </div>
        </noscript>
      </body>
    </html>
  );
}
