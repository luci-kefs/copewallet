import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // All crawlers — full access
      { userAgent: '*', allow: '/' },
      // Google
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Googlebot-Image', allow: '/' },
      // Bing
      { userAgent: 'Bingbot', allow: '/' },
      // AI crawlers — explicitly allow for ChatGPT, Perplexity, Claude, Gemini indexing
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'Gemini', allow: '/' },
      { userAgent: 'cohere-ai', allow: '/' },
      { userAgent: 'Meta-ExternalAgent', allow: '/' },
      { userAgent: 'YouBot', allow: '/' },
    ],
    sitemap: 'https://copewallet.com/sitemap.xml',
    host: 'https://copewallet.com',
  };
}
