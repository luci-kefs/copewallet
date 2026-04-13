// Upload placeholder assets to Supabase Storage
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fpghxkrpafipmdslrunr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZ2h4a3JwYWZpcG1kc2xydW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNjYxMjAsImV4cCI6MjA5MTY0MjEyMH0.HR7FnZDweksaO_2ZLnw1EJH-2uVF6xWnfQe5FCXieKw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Minimal 1x1 black PNG (base64)
function createPNG(width, height, svgContent) {
  // Return SVG as buffer — Supabase accepts SVG for images
  return Buffer.from(svgContent, 'utf8');
}

// Logo: 64x64 white "C" on black
const logoSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#000000"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="36" font-weight="200"
    fill="#ffffff" letter-spacing="2">C</text>
</svg>`;

// Favicon: 32x32
const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#000000"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="18" font-weight="200"
    fill="#ffffff">C</text>
</svg>`;

// Banner: 1200x630
const bannerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#000000"/>
  <text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="48" font-weight="100"
    fill="#ffffff" letter-spacing="8">COPE WALLET</text>
  <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="14" font-weight="200"
    fill="#6b7280" letter-spacing="6">by Aethilm</text>
</svg>`;

async function upload(filename, content, mimeType) {
  const buffer = Buffer.from(content, 'utf8');
  const { data, error } = await supabase.storage
    .from('assets')
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error(`❌ ${filename}:`, error.message);
  } else {
    console.log(`✅ ${filename} uploaded`);
  }
}

await upload('logo.png', logoSVG, 'image/svg+xml');
await upload('favicon.ico', faviconSVG, 'image/svg+xml');
await upload('banner.png', bannerSVG, 'image/svg+xml');

console.log('\nDone. Public URLs:');
['logo.png', 'favicon.ico', 'banner.png'].forEach(f => {
  console.log(`  ${SUPABASE_URL}/storage/v1/object/public/assets/${f}`);
});
