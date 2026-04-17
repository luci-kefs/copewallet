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
  };
}

const schemaOrg = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${BASE_URL}/#webapp`,
      name: 'Cope Wallet',
      url: BASE_URL,
      description: 'Free temporary and anonymous crypto wallet for EVM chains. No signup, no KYC, no tracking.',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Temp Wallet',
        'Anonymous Crypto Wallet',
        'No KYC',
        'EVM Compatible',
        'WalletConnect Support',
        'Secure ephemeral key storage',
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE_URL}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Cope Wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Cope Wallet is a free, anonymous temporary crypto wallet for EVM-compatible blockchains. No signup or KYC required.' },
        },
        {
          '@type': 'Question',
          name: 'Is Cope Wallet anonymous?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet requires no account, no email, and no personal information. Your keys never leave your browser.' },
        },
        {
          '@type': 'Question',
          name: 'Can I use Cope Wallet as a temp wallet?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cope Wallet is designed as a temporary crypto wallet — generate an instant wallet, use it, and optionally persist it with a passphrase.' },
        },
        {
          '@type': 'Question',
          name: 'Which blockchains does Cope Wallet support?',
          acceptedAnswer: { '@type': 'Answer', text: 'Cope Wallet supports all EVM-compatible chains including Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Base, and more.' },
        },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'Cope Wallet',
      description: 'Free anonymous temp wallet for EVM chains',
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
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
      </body>
    </html>
  );
}
