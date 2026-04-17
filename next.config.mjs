/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_EXTERNAL_LINK: process.env.NEXT_PUBLIC_EXTERNAL_LINK,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_WC_PROJECT_ID: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fpghxkrpafipmdslrunr.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "connect-src 'self' https://fpghxkrpafipmdslrunr.supabase.co https://api.coingecko.com wss://relay.walletconnect.org wss://relay.walletconnect.com https://relay.walletconnect.org https://relay.walletconnect.com https://pulse.walletconnect.org https://pulse.walletconnect.com https://rpc.walletconnect.org https://rpc.walletconnect.com https://keys.walletconnect.org https://verify.walletconnect.org",
              "img-src 'self' https: data: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Robots-Tag', value: 'index, follow' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'X-Aethilm-Status', value: 'Sovereign' },
        ],
      },
      // Static assets — long cache for performance (Core Web Vitals)
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
