import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/context/WalletContext';
import { fetchAssetUrls } from '@/lib/supabase';

const inter = Inter({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400'],
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
      <body className="bg-black text-white antialiased font-[family-name:var(--font-inter)]">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
