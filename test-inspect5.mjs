import { chromium } from 'playwright';

const BASE = 'http://localhost:3002';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(3000);

// Check ALL inputs
const inputs = await page.locator('input').all();
console.log('=== All inputs ===', inputs.length);
for (const inp of inputs) {
  const type = await inp.getAttribute('type');
  const id = await inp.getAttribute('id') || '';
  const style = await inp.getAttribute('style') || '';
  const vis = await inp.isVisible().catch(() => false);
  console.log(' -', type, id, vis ? 'VISIBLE' : 'hidden', style.slice(0,60));
}

// Check session toggle - look for it by context
console.log('\n=== Session section text ===');
const bodyText = await page.locator('body').textContent();
const idx = bodyText.indexOf('Session');
console.log('Session text found at:', idx);
if (idx > -1) console.log('Context:', bodyText.slice(idx-20, idx+100));
const idx2 = bodyText.indexOf('Keep Session');
console.log('Keep Session at:', idx2, idx2 > -1 ? bodyText.slice(idx2, idx2+80) : '');

// What's the send button situation on this page
console.log('\n=== Send/Receive/Balance buttons in fresh simple mode ===');
const btns = await page.locator('button').all();
for (const b of btns) {
  const txt = (await b.textContent().catch(()=>'')).trim().replace(/\s+/g,' ').slice(0,50);
  const box = await b.boundingBox().catch(()=>null);
  if (!txt) continue;
  if (['Send','Receive','Balance','Transactions'].some(k => txt.includes(k))) {
    console.log(' |', JSON.stringify(txt), box ? `y:${box.y.toFixed(0)} h:${box.height.toFixed(0)}` : 'no-box');
    if (box) {
      const el = await page.evaluateHandle(
        ({x,y}) => document.elementFromPoint(x+10, y+5),
        box
      );
      const info = await page.evaluate(e => e ? e.tagName+'.'+[...e.classList].join('.').slice(0,50) : 'null', el).catch(()=>'err');
      console.log('    elementAtPoint:', info);
    }
  }
}

await browser.close();
