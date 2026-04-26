import { chromium } from 'playwright';

const BASE = 'http://localhost:3002';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(3000);

// Check session section
console.log('=== Checking for session checkbox ===');
const checkboxes = await page.locator('input[type=checkbox]').all();
console.log('Checkbox count:', checkboxes.length);
for (const cb of checkboxes) {
  const vis = await cb.isVisible().catch(() => false);
  const box = await cb.boundingBox().catch(() => null);
  console.log(' - visible:', vis, 'box:', box);
}

// Check all elements at fixed position that might intercept
const fixedEls = await page.locator('[style*="position: fixed"], [style*="position:fixed"]').all();
console.log('\nFixed position elements:', fixedEls.length);
for (const el of fixedEls) {
  const style = await el.getAttribute('style') || '';
  const zIndex = style.match(/z-index:\s*(\d+)/)?.[1] || '?';
  const inset = style.includes('inset: 0') || style.includes('inset:0');
  console.log(' - z-index:', zIndex, 'inset0:', inset, style.slice(0,80));
}

// What's at position of send button
console.log('\n=== Send button situation ===');
const sendBtns = await page.locator('button:has-text("Send")').all();
console.log('Send buttons count:', sendBtns.length);
for (const b of sendBtns) {
  const box = await b.boundingBox().catch(() => null);
  const txt = (await b.textContent().catch(() => '')).trim().slice(0,50);
  const vis = await b.isVisible().catch(() => false);
  console.log(' -', JSON.stringify(txt), 'vis:', vis, 'box:', box);
}

// Check balance button
console.log('\n=== Balance buttons ===');
const balBtns = await page.locator('button:has-text("Balance")').all();
console.log('Balance buttons count:', balBtns.length);
for (const b of balBtns) {
  const box = await b.boundingBox().catch(() => null);
  const txt = (await b.textContent().catch(() => '')).trim().slice(0,50);
  console.log(' -', JSON.stringify(txt), 'box:', box);
  if (box) {
    const elAtPoint = await page.evaluateHandle(
      ({x, y}) => document.elementFromPoint(x, y),
      { x: box.x + 10, y: box.y + 10 }
    );
    const info = await page.evaluate(e => e?.tagName + ' z=' + getComputedStyle(e)?.zIndex, elAtPoint);
    console.log('   elementAtPoint:', info);
  }
}

await browser.close();
