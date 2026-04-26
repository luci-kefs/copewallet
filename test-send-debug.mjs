import { chromium } from 'playwright';

const BASE = 'http://localhost:3002';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('pageerror', e => console.log('[JSERR]', e.message.slice(0,100)));

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(3000);

// Open Receive (force)
console.log('=== Opening Receive modal ===');
await page.locator('button:has-text("Receive")').first().click({ force: true });
await page.waitForTimeout(1000);
const afterReceive = await page.locator('body').textContent();
console.log('Has Copy:', afterReceive.includes('Copy'));

// Close Receive
await page.keyboard.press('Escape');
await page.waitForTimeout(1000);

// Check for fixed overlays
const fixed = await page.locator('[style*="position: fixed"]').all();
console.log('\nFixed elements after Escape:', fixed.length);
for (const el of fixed) {
  const s = await el.getAttribute('style') || '';
  if (s.includes('inset') || s.includes('z-index: 4')) console.log(' -', s.slice(0,100));
}

// Open Send
console.log('\n=== Opening Send modal ===');
await page.locator('button:has-text("Send")').first().click({ force: true });
await page.waitForTimeout(1200);

const afterSend = await page.locator('body').textContent();
console.log('Body includes Recipient:', afterSend.includes('Recipient'));
console.log('Body includes 0x...:', afterSend.includes('0x...'));
console.log('Body includes Send:', afterSend.includes('Send Transaction') || afterSend.includes('SEND'));

// Check any fixed overlays now
const fixed2 = await page.locator('[style*="position: fixed"]').all();
console.log('\nFixed elements after Send click:', fixed2.length);
for (const el of fixed2) {
  const s = await el.getAttribute('style') || '';
  if (s.includes('inset') || (s.includes('z-index') && !s.includes('pointer-events: none'))) {
    console.log(' -', s.slice(0,100));
  }
}

// Check all inputs now visible
const inputs = await page.locator('input[type=text], input[placeholder]').all();
console.log('\nText inputs visible:', inputs.length);
for (const inp of inputs) {
  const ph = await inp.getAttribute('placeholder') || '';
  const vis = await inp.isVisible().catch(() => false);
  if (vis) console.log(' - placeholder:', ph.slice(0,50));
}

await browser.close();
