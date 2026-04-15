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

export async function generateMetadata(): Promise<Metadata> {
  const { favicon } = await fetchAssetUrls();
  return {
    title: 'Cope Wallet',
    description: 'by Aethilm',
    icons: favicon ? [{ url: favicon }] : [],
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
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
