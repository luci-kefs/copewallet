import { chromium } from 'playwright';

const BASE = 'http://localhost:3002';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// Replicate exactly what test does up to section 9
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(3000);

// Go advanced
await page.locator('button:has-text("Advanced")').first().click();
await page.waitForTimeout(1500);

// Navigate through all categories
await page.locator('button:has-text("BTC")').first().click(); await page.waitForTimeout(500);
await page.locator('button:has-text("DOGE")').first().click(); await page.waitForTimeout(500);
await page.locator('button:has-text("BCH")').first().click(); await page.waitForTimeout(500);
await page.locator('button:has-text("Account")').first().click(); await page.waitForTimeout(700);
await page.locator('button:has-text("SOL")').first().click(); await page.waitForTimeout(500);
await page.locator('button:has-text("XRP")').first().click(); await page.waitForTimeout(500);
await page.locator('button:has-text("XLM")').first().click(); await page.waitForTimeout(500);
await page.locator('button:has-text("DAG")').first().click(); await page.waitForTimeout(700);
await page.locator('button:has-text("NANO")').first().click(); await page.waitForTimeout(500);
await page.locator('button:has-text("HBAR")').first().click(); await page.waitForTimeout(500);
await page.locator('button:has-text("Move")').first().click(); await page.waitForTimeout(700);
await page.locator('button:has-text("SUI")').first().click(); await page.waitForTimeout(500);
await page.locator('button:has-text("APTOS")').first().click(); await page.waitForTimeout(500);
await page.locator('button:has-text("Litecoin")').first().click(); await page.waitForTimeout(4000);
await page.locator('button:has-text("Custom EVM")').first().click(); await page.waitForTimeout(800);

// Open and close modals
await page.locator('button:has-text("Add Chain")').first().click(); await page.waitForTimeout(600);
await page.mouse.click(10, 10); await page.waitForTimeout(800);
await page.locator('button:has-text("Add Token")').first().click(); await page.waitForTimeout(600);
await page.mouse.click(10, 10); await page.waitForTimeout(800);
await page.locator('button:has-text("Add API")').first().click(); await page.waitForTimeout(600);
await page.mouse.click(10, 10); await page.waitForTimeout(800);

console.log('=== After closing all modals in Advanced ===');
const fixedEls = await page.locator('[style*="position: fixed"]').all();
console.log('Fixed elements:', fixedEls.length);
for (const el of fixedEls) {
  const style = await el.getAttribute('style') || '';
  const inset = style.includes('inset: 0') || style.includes('inset:0');
  if (inset || style.includes('z-index')) {
    console.log(' -', style.slice(0, 100));
  }
}

console.log('\n=== Now goSimple (page.goto) ===');
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2500);
await page.evaluate(() => window.scrollTo(0, 0));

const fixedEls2 = await page.locator('[style*="position: fixed"]').all();
console.log('Fixed elements after goSimple:', fixedEls2.length);
for (const el of fixedEls2) {
  const style = await el.getAttribute('style') || '';
  const inset = style.includes('inset: 0') || style.includes('inset:0');
  if (inset || (style.includes('z-index') && !style.includes('pointer-events: none'))) {
    console.log(' -', style.slice(0, 100));
  }
}

console.log('\n=== Checkbox count ===');
const cbs = await page.locator('input[type=checkbox]').count();
console.log('count:', cbs);

// Try clicking send
console.log('\n=== Try clicking Send ===');
const sendBtn = page.locator('button:has-text("Send")').first();
const sendBox = await sendBtn.boundingBox();
console.log('Send box:', sendBox);
if (sendBox) {
  const el = await page.evaluateHandle(
    ({x, y}) => document.elementFromPoint(x+5, y+5),
    sendBox
  );
  const tag = await page.evaluate(e => e ? e.tagName + ' ' + (e.className||'').slice(0,50) : 'null', el).catch(() => 'err');
  console.log('Element at Send pos:', tag);
}

await browser.close();
