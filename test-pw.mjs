import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
// Fresh isolated context — no shared sessionStorage from previous runs
const context = await browser.newContext();
await context.clearCookies();
const page = await context.newPage();

const consoleErrors = [];
const networkErrors = [];
const jsErrors = [];
const allRequests = [];

page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push('[ERROR] ' + msg.text());
  if (msg.type() === 'warn') consoleErrors.push('[WARN] ' + msg.text());
});
page.on('pageerror', err => jsErrors.push(err.message));
page.on('requestfailed', req => {
  networkErrors.push(req.method() + ' ' + req.url() + ' -> ' + (req.failure()?.errorText ?? 'unknown'));
});
page.on('request', req => {
  const url = req.url();
  if (!url.startsWith('http://localhost') && !url.startsWith('data:') && !url.startsWith('blob:')) {
    allRequests.push(req.method() + ' ' + url);
  }
});

console.log('=== Loading homepage ===');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(4000);

console.log('\n--- Console Errors/Warns ---');
if (consoleErrors.length === 0) console.log('None');
else consoleErrors.forEach(e => console.log(e));

console.log('\n--- JS Errors ---');
if (jsErrors.length === 0) console.log('None');
else jsErrors.forEach(e => console.log(e));

console.log('\n--- Network Failures ---');
if (networkErrors.length === 0) console.log('None');
else networkErrors.forEach(e => console.log(e));

console.log('\n--- External Requests (non-localhost) ---');
if (allRequests.length === 0) console.log('None');
else allRequests.slice(0, 30).forEach(e => console.log(e));

const addressEl = await page.locator('text=0x').first().textContent().catch(() => 'NOT FOUND');
console.log('\n--- Wallet Address ---', addressEl);

console.log('\n=== Testing Advanced button ===');
const advBtn = page.locator('text=Advanced').first();
const advVisible = await advBtn.isVisible().catch(() => false);
if (advVisible) {
  await advBtn.click();
  await page.waitForTimeout(2000);
  console.log('Advanced clicked OK');
  const litecoinVisible = await page.locator('text=Litecoin').first().isVisible().catch(() => false);
  console.log('Litecoin panel visible:', litecoinVisible);
  const simpleVisible = await page.locator('text=Simple').first().isVisible().catch(() => false);
  if (simpleVisible) {
    await page.locator('text=Simple').first().click();
    await page.waitForTimeout(1000);
    console.log('Back to Simple OK');
  }
} else {
  console.log('Advanced button NOT FOUND');
}

console.log('\n=== Testing Session Toggle ===');
const toggle = page.locator('input[type=checkbox]').first();
const isChecked = await toggle.isChecked().catch(() => 'N/A');
console.log('Session toggle state:', isChecked);

// Test send flow
console.log('\n=== Testing Send Flow ===');
const sendBtn = page.locator('button:has-text("Send")').first();
const sendVisible = await sendBtn.isVisible().catch(() => false);
console.log('Send button visible:', sendVisible);

// Test receive / QR
const receiveBtn = page.locator('button:has-text("Receive")').first();
const receiveVisible = await receiveBtn.isVisible().catch(() => false);
console.log('Receive button visible:', receiveVisible);

console.log('\n--- Final error count ---');
console.log('Console errors:', consoleErrors.length);
console.log('JS errors:', jsErrors.length);
console.log('Network failures:', networkErrors.length);
console.log('External requests:', allRequests.length);

console.log('\n=== DONE ===');
await context.close();
await browser.close();
