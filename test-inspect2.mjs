import { chromium } from 'playwright';

const BASE = 'http://localhost:3002';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(3000);

// Check what intercepts
console.log('=== Go Advanced ===');
await page.locator('button:has-text("Advanced")').first().click();
await page.waitForTimeout(1500);
await page.locator('button:has-text("Custom EVM")').first().click();
await page.waitForTimeout(800);

console.log('=== Open Add Chain modal ===');
await page.locator('button:has-text("Add Chain")').first().click();
await page.waitForTimeout(600);

console.log('=== Press Escape ===');
await page.keyboard.press('Escape');
await page.waitForTimeout(1000);

// What's in fixed position overlay now?
const fixedEls = await page.locator('[style*="position: fixed"], [style*="position:fixed"]').all();
console.log('Fixed elements after Escape:', fixedEls.length);
for (const el of fixedEls) {
  const tag = await el.evaluate(e => e.tagName);
  const style = await el.getAttribute('style') || '';
  const cls = await el.getAttribute('class') || '';
  console.log(' -', tag, style.slice(0, 80), cls.slice(0, 40));
}

// Check if Add Token button is now clickable
console.log('\n=== Attempt Add Token click ===');
const addTokenBtn = page.locator('button:has-text("Add Token")').first();
const box = await addTokenBtn.boundingBox();
console.log('Add Token bounding box:', box);

// Check what element is at that position
if (box) {
  const el = await page.evaluateHandle(
    ({x, y}) => document.elementFromPoint(x, y),
    { x: box.x + box.width/2, y: box.y + box.height/2 }
  );
  const tag = await page.evaluate(e => e?.tagName + ' | ' + e?.className?.slice(0,60), el);
  console.log('Element at Add Token position:', tag);
}

// Try clicking anyway with force
console.log('\n=== Force click Add Token ===');
await addTokenBtn.click({ force: true }).catch(e => console.log('Force click failed:', e.message.slice(0, 100)));
await page.waitForTimeout(600);
const body = await page.locator('body').textContent();
console.log('Body includes Contract:', body.includes('Contract'));
console.log('Body includes Token:', body.includes('Token'));

await browser.close();
