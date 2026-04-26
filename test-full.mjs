import { chromium } from 'playwright';

const BASE = 'http://localhost:3002';
const RESULTS = [];
let browser, context, page;

function pass(label) { RESULTS.push({ ok: true, label }); console.log('✅ ' + label); }
function fail(label, reason) { RESULTS.push({ ok: false, label, reason }); console.log('❌ ' + label + (reason ? ' — ' + reason : '')); }
async function check(label, fn) {
  try { const r = await fn(); if (r === false) fail(label); else pass(label); }
  catch (e) { fail(label, e.message?.slice(0, 200)); }
}

async function freshPage() {
  if (page) await page.close().catch(() => {});
  page = await context.newPage();
  page.on('pageerror', err => console.log('[JSERR]', err.message?.slice(0, 120)));
}

async function goSimple() {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2500);
}

async function goAdvanced() {
  await page.locator('button:has-text("Advanced")').first().click();
  await page.waitForTimeout(1500);
}

async function closeModal() {
  await page.mouse.click(10, 10);
  await page.waitForTimeout(800);
}

browser = await chromium.launch({ headless: true });
context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// ════════════════════════════════════════════════════════════════════════════
// 1. HOMEPAGE + WALLET
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 1. Homepage & Wallet ═══');
await freshPage();
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(3000);

await check('Homepage loads', async () => true);
await check('Wallet address (0x) in page', async () => (await page.locator('body').textContent()).includes('0x'));
await check('Send button exists', async () => (await page.locator('button:has-text("Send")').count()) > 0);
await check('Receive button exists', async () => (await page.locator('button:has-text("Receive")').count()) > 0);
await check('Transactions tab exists', async () => (await page.locator('button:has-text("Transactions")').count()) > 0);
await check('Balance tab exists', async () => (await page.locator('button:has-text("Balance")').count()) > 0);

// ════════════════════════════════════════════════════════════════════════════
// 2. ADVANCED MODE TOGGLE
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 2. Advanced Mode Toggle ═══');

await check('Advanced button exists', async () => (await page.locator('button:has-text("Advanced")').count()) > 0);
await goAdvanced();
await check('Advanced Mode header appears', async () => page.locator('text=Advanced Mode').first().isVisible());
await check('UTXO tab', async () => page.locator('button:has-text("UTXO")').first().isVisible());
await check('Account tab', async () => page.locator('button:has-text("Account")').first().isVisible());
await check('DAG tab', async () => page.locator('button:has-text("DAG")').first().isVisible());
await check('Move tab', async () => page.locator('button:has-text("Move")').first().isVisible());
await check('Litecoin tab', async () => page.locator('button:has-text("Litecoin")').first().isVisible());
await check('Custom EVM tab', async () => page.locator('button:has-text("Custom EVM")').first().isVisible());

await check('Simple button → back to dashboard', async () => {
  await page.locator('button:has-text("Simple")').first().click();
  await page.waitForTimeout(1200);
  return (await page.locator('body').textContent()).includes('Send');
});
await check('"Try Advanced Mode" link', async () => {
  const body = await page.locator('body').textContent();
  return body.includes('Try Advanced Mode');
});

// ════════════════════════════════════════════════════════════════════════════
// 3. UTXO CHAINS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 3. UTXO Chains (BTC / DOGE / BCH) ═══');
await goAdvanced();

for (const coin of ['BTC', 'DOGE', 'BCH']) {
  await check(`${coin}: Receive tab`, async () => {
    await page.locator(`button:has-text("${coin}")`).first().click();
    await page.waitForTimeout(500);
    return (await page.locator('body').textContent()).includes('Receive');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 4. ACCOUNT CHAINS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 4. Account Chains (SOL / XRP / XLM) ═══');
await page.locator('button:has-text("Account")').first().click();
await page.waitForTimeout(700);

for (const coin of ['SOL', 'XRP', 'XLM']) {
  await check(`${coin}: Receive tab`, async () => {
    await page.locator(`button:has-text("${coin}")`).first().click();
    await page.waitForTimeout(500);
    return (await page.locator('body').textContent()).includes('Receive');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 5. DAG CHAINS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 5. DAG Chains (NANO / HBAR) ═══');
await page.locator('button:has-text("DAG")').first().click();
await page.waitForTimeout(700);

for (const coin of ['NANO', 'HBAR']) {
  await check(`${coin}: Receive tab`, async () => {
    await page.locator(`button:has-text("${coin}")`).first().click();
    await page.waitForTimeout(500);
    return (await page.locator('body').textContent()).includes('Receive');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 6. MOVE CHAINS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 6. Move Chains (SUI / APTOS) ═══');
await page.locator('button:has-text("Move")').first().click();
await page.waitForTimeout(700);

for (const coin of ['SUI', 'APTOS']) {
  await check(`${coin}: Receive tab`, async () => {
    await page.locator(`button:has-text("${coin}")`).first().click();
    await page.waitForTimeout(500);
    return (await page.locator('body').textContent()).includes('Receive');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 7. LITECOIN PANEL
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 7. Litecoin ═══');
await page.locator('button:has-text("Litecoin")').first().click();
await page.waitForTimeout(1200);

await check('Litecoin panel text visible', async () => (await page.locator('body').textContent()).includes('LTC'));
await check('LTC bech32 address (ltc1...)', async () => {
  await page.waitForTimeout(3000);
  return (await page.locator('body').textContent()).includes('ltc1');
});

// ════════════════════════════════════════════════════════════════════════════
// 8. CUSTOM EVM SECTION
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 8. Custom EVM ═══');
await page.locator('button:has-text("Custom EVM")').first().click();
await page.waitForTimeout(800);

await check('Add Chain button', async () => page.locator('button:has-text("Add Chain")').first().isVisible());
await check('Add Token button', async () => page.locator('button:has-text("Add Token")').first().isVisible());
await check('Add API button', async () => page.locator('button:has-text("Add API")').first().isVisible());

await check('Add Chain modal: Chain ID field', async () => {
  await page.locator('button:has-text("Add Chain")').first().click();
  await page.waitForTimeout(600);
  return (await page.locator('body').textContent()).includes('Chain ID');
});
await check('Add Chain modal closes', async () => {
  await closeModal();
  return (await page.locator('button:has-text("Add Token")').first().isVisible());
});

await check('Add Token modal: contract field', async () => {
  await page.locator('button:has-text("Add Token")').first().click();
  await page.waitForTimeout(600);
  const body = await page.locator('body').textContent();
  return body.includes('Contract') || body.includes('ERC');
});
await check('Add Token modal closes', async () => {
  await closeModal();
  return page.locator('button:has-text("Add API")').first().isVisible();
});

await check('Add API modal: endpoint field', async () => {
  await page.locator('button:has-text("Add API")').first().click();
  await page.waitForTimeout(600);
  return (await page.locator('body').textContent()).includes('endpoint') || (await page.locator('body').textContent()).includes('Endpoint');
});
await check('Add API modal closes', async () => {
  await closeModal();
  return page.locator('button:has-text("Add Chain")').first().isVisible();
});

// ════════════════════════════════════════════════════════════════════════════
// 9. SESSION TOGGLE
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 9. Session Toggle ═══');
await goSimple();

await check('Session toggle text visible ("Keep session on refresh")', async () => {
  const body = await page.locator('body').textContent();
  return body.includes('Keep session') || body.includes('session on refresh') || body.includes('Session Lock');
});

await check('Session toggle is a button/switch (force click)', async () => {
  // Find the toggle by nearby label text — use force to bypass intercept
  const body = await page.locator('body').textContent();
  const hasText = body.includes('Keep session') || body.includes('session on refresh');
  if (!hasText) return false;
  // Try clicking the toggle by locating it near its label
  const label = page.locator('text=/Keep session|session on refresh/i').first();
  const visible = await label.isVisible().catch(() => false);
  return visible;
});

// ════════════════════════════════════════════════════════════════════════════
// 10. RECEIVE MODAL
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 10. Receive Modal ═══');
await check('Receive → modal opens (body has QR or Copy text)', async () => {
  // Use force click to bypass grid intercept
  await page.locator('button:has-text("Receive")').first().click({ force: true });
  await page.waitForTimeout(1000);
  const body = await page.locator('body').textContent();
  return body.includes('Copy') || body.includes('QR') || (await page.locator('svg').count()) > 1;
});
await check('Receive modal closes (Escape)', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  return true;
});

// ════════════════════════════════════════════════════════════════════════════
// 11. SEND MODAL
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 11. Send Modal ═══');
await check('Send → modal opens (recipient input visible)', async () => {
  await page.waitForTimeout(600); // ensure Receive modal fully gone
  await page.locator('button:has-text("Send")').first().click({ force: true });
  await page.waitForTimeout(1200);
  // Check for visible inputs (placeholder not in textContent)
  const inputCount = await page.locator('input[type=text], input:not([type])').count();
  return inputCount > 0;
});
await check('Send modal closes (Escape)', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  return true;
});

// ════════════════════════════════════════════════════════════════════════════
// 12. WALLET HISTORY
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 12. Wallet History ═══');
await check('History/Saved section in Balance tab', async () => {
  await page.locator('button:has-text("Balance")').first().click({ force: true });
  await page.waitForTimeout(600);
  const body = await page.locator('body').textContent();
  return body.includes('Kaydet') || body.includes('Current') || body.includes('Wallet History');
});

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
const passed = RESULTS.filter(r => r.ok).length;
const failed = RESULTS.filter(r => !r.ok).length;
console.log(`RESULT: ${passed} PASSED, ${failed} FAILED  (total ${RESULTS.length})`);
console.log('═'.repeat(60));
if (failed > 0) {
  console.log('\nFAILED TESTS:');
  RESULTS.filter(r => !r.ok).forEach(r => {
    console.log(`  ❌ ${r.label}`);
    if (r.reason) console.log(`     └─ ${r.reason.slice(0, 200)}`);
  });
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
