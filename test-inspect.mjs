import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(3000);

const buttons = await page.locator('button').all();
console.log('=== ALL BUTTONS (homepage) ===');
for (const b of buttons) {
  const txt = (await b.textContent().catch(() => '')).trim().replace(/\s+/g, ' ').slice(0, 80);
  if (txt) console.log('  |', txt);
}

console.log('\n=== Clicking Advanced ===');
await page.getByRole('button', { name: /Advanced/i }).first().click();
await page.waitForTimeout(2000);

const buttons2 = await page.locator('button').all();
console.log('\n=== ALL BUTTONS (Advanced mode) ===');
for (const b of buttons2) {
  const txt = (await b.textContent().catch(() => '')).trim().replace(/\s+/g, ' ').slice(0, 80);
  if (txt) console.log('  |', txt);
}

await browser.close();
