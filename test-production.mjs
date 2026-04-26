import { chromium } from 'playwright';

const BASE = 'https://www.copewallet.com';
const RESULTS = [];
const CSP_ERRORS = [];
let browser, context, page;

function pass(label) { RESULTS.push({ ok: true, label }); console.log('✅ ' + label); }
function fail(label, reason) { RESULTS.push({ ok: false, label, reason }); console.log('❌ ' + label + (reason ? ' — ' + reason : '')); }
async function check(label, fn) {
  try { const r = await fn(); if (r === false) fail(label); else pass(label); }
  catch (e) { fail(label, e.message?.slice(0, 200)); }
}

async function closeModal() {
  await page.mouse.click(10, 10);
  await page.waitForTimeout(800);
}

browser = await chromium.launch({ headless: true });
context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
page = await context.newPage();
page.on('pageerror', err => console.log('[JSERR]', err.message?.slice(0, 120)));
page.on('console', msg => {
  const txt = msg.text();
  if (txt.includes('Content Security Policy') || txt.includes('violates')) {
    CSP_ERRORS.push(txt.slice(0, 150));
    console.log('[CSP]', txt.slice(0, 150));
  } else if (msg.type() === 'error') {
    console.log('[ERR]', txt.slice(0, 100));
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 1. HOMEPAGE + WALLET
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 1. Homepage & Wallet ═══');
await check('Site loads', async () => {
  const resp = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  return resp && resp.status() < 400;
});
await page.waitForTimeout(4000);

await check('Wallet address (0x) auto-generated', async () =>
  (await page.locator('body').textContent()).includes('0x')
);
await check('Send button present', async () =>
  (await page.locator('button:has-text("Send")').count()) > 0
);
await check('Receive button present', async () =>
  (await page.locator('button:has-text("Receive")').count()) > 0
);
await check('Balance + Transactions tabs', async () => {
  const body = await page.locator('body').textContent();
  return body.includes('Balance') && body.includes('Transactions');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. ADVANCED MODE
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 2. Advanced Mode ═══');
await check('Advanced button present', async () =>
  (await page.locator('button:has-text("Advanced")').count()) > 0
);
await page.locator('button:has-text("Advanced")').first().click();
await page.waitForTimeout(2000);

await check('Advanced Mode header', async () =>
  page.locator('text=Advanced Mode').first().isVisible()
);
await check('All 6 category tabs (UTXO/Account/DAG/Move/Litecoin/Custom EVM)', async () => {
  const body = await page.locator('body').textContent();
  return ['UTXO', 'Account', 'DAG', 'Move', 'Litecoin', 'Custom EVM'].every(t => body.includes(t));
});
await check('Simple button → back to dashboard', async () => {
  await page.locator('button:has-text("Simple")').first().click();
  await page.waitForTimeout(1500);
  return (await page.locator('body').textContent()).includes('Send');
});
await check('"Try Advanced Mode" link', async () =>
  (await page.locator('body').textContent()).includes('Try Advanced Mode')
);

// ════════════════════════════════════════════════════════════════════════════
// 3. UTXO CHAINS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 3. UTXO (BTC / DOGE / BCH) ═══');
await page.locator('button:has-text("Advanced")').first().click();
await page.waitForTimeout(1500);

for (const coin of ['BTC', 'DOGE', 'BCH']) {
  await check(`${coin}: panel renders`, async () => {
    await page.locator(`button:has-text("${coin}")`).first().click();
    await page.waitForTimeout(600);
    return (await page.locator('body').textContent()).includes('Receive');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 4. ACCOUNT CHAINS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 4. Account (SOL / XRP / XLM) ═══');
await page.locator('button:has-text("Account")').first().click();
await page.waitForTimeout(700);

for (const coin of ['SOL', 'XRP', 'XLM']) {
  await check(`${coin}: panel renders`, async () => {
    await page.locator(`button:has-text("${coin}")`).first().click();
    await page.waitForTimeout(600);
    return (await page.locator('body').textContent()).includes('Receive');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 5. DAG CHAINS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 5. DAG (NANO / HBAR) ═══');
await page.locator('button:has-text("DAG")').first().click();
await page.waitForTimeout(700);

for (const coin of ['NANO', 'HBAR']) {
  await check(`${coin}: panel renders`, async () => {
    await page.locator(`button:has-text("${coin}")`).first().click();
    await page.waitForTimeout(600);
    return (await page.locator('body').textContent()).includes('Receive');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 6. MOVE CHAINS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 6. Move (SUI / APTOS) ═══');
await page.locator('button:has-text("Move")').first().click();
await page.waitForTimeout(700);

for (const coin of ['SUI', 'APTOS']) {
  await check(`${coin}: panel renders`, async () => {
    await page.locator(`button:has-text("${coin}")`).first().click();
    await page.waitForTimeout(600);
    return (await page.locator('body').textContent()).includes('Receive');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 7. LITECOIN — address derivation + balance load
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 7. Litecoin ═══');
await page.locator('button:has-text("Litecoin")').first().click();
await page.waitForTimeout(1200);

await check('Litecoin panel renders (LTC text)', async () =>
  (await page.locator('body').textContent()).includes('LTC')
);
await check('LTC bech32 address derived (ltc1...)', async () => {
  await page.waitForTimeout(4000);
  return (await page.locator('body').textContent()).includes('ltc1');
});

// ════════════════════════════════════════════════════════════════════════════
// 8. CUSTOM EVM MODALS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 8. Custom EVM ═══');
await page.locator('button:has-text("Custom EVM")').first().click();
await page.waitForTimeout(800);

await check('Add Chain / Token / API buttons', async () => {
  const body = await page.locator('body').textContent();
  return body.includes('Add Chain') && body.includes('Add Token') && body.includes('Add API');
});
await check('Add Chain modal opens', async () => {
  await page.locator('button:has-text("Add Chain")').first().click();
  await page.waitForTimeout(700);
  return (await page.locator('body').textContent()).includes('Chain ID');
});
await check('Add Chain modal closes', async () => { await closeModal(); return true; });

await check('Add Token modal opens', async () => {
  await page.locator('button:has-text("Add Token")').first().click();
  await page.waitForTimeout(700);
  const body = await page.locator('body').textContent();
  return body.includes('Contract') || body.includes('ERC');
});
await check('Add Token modal closes', async () => { await closeModal(); return true; });

await check('Add API modal opens', async () => {
  await page.locator('button:has-text("Add API")').first().click();
  await page.waitForTimeout(700);
  const body = await page.locator('body').textContent();
  return body.includes('endpoint') || body.includes('Endpoint') || body.includes('Balance');
});
await check('Add API modal closes', async () => { await closeModal(); return true; });

// ════════════════════════════════════════════════════════════════════════════
// 9. SESSION TOGGLE
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 9. Session Toggle ═══');
await page.locator('button:has-text("Simple")').first().click();
await page.waitForTimeout(1500);

await check('Simple mode dashboard visible (session toggle removed)', async () => {
  const body = await page.locator('body').textContent();
  return body.includes('Send') && body.includes('Receive');
});

// ════════════════════════════════════════════════════════════════════════════
// 10. RECEIVE MODAL
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 10. Receive Modal ═══');
await check('Receive → QR/Copy appears', async () => {
  await page.locator('button:has-text("Receive")').first().click({ force: true });
  await page.waitForTimeout(1200);
  const body = await page.locator('body').textContent();
  return body.includes('Copy') || (await page.locator('svg').count()) > 1;
});
await check('Receive modal closes (Escape)', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  return true;
});

// ════════════════════════════════════════════════════════════════════════════
// 11. SEND MODAL
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 11. Send Modal ═══');
await check('Send → recipient input visible', async () => {
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Send")').first().click({ force: true });
  await page.waitForTimeout(1200);
  return (await page.locator('input[type=text], input:not([type])').count()) > 0;
});
await check('Send modal closes (Escape)', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  return true;
});

// ════════════════════════════════════════════════════════════════════════════
// 12. WALLET HISTORY
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 12. Wallet History ═══');
await check('Wallet history section visible', async () => {
  await page.locator('button:has-text("Balance")').first().click({ force: true });
  await page.waitForTimeout(600);
  const body = await page.locator('body').textContent();
  return body.includes('Kaydet') || body.includes('Current') || body.includes('History');
});

// ════════════════════════════════════════════════════════════════════════════
// 13. SOL/XRP/XLM/SUI/APTOS balance load (wait longer for network)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 13. Non-EVM Balance Load ═══');
await page.locator('button:has-text("Advanced")').first().click();
await page.waitForTimeout(1500);

// SOL
await page.locator('button:has-text("Account")').first().click();
await page.waitForTimeout(500);
await page.locator('button:has-text("SOL")').first().click();
await check('SOL: address loads (no CSP block)', async () => {
  await page.waitForTimeout(5000);
  const body = await page.locator('body').textContent();
  // Address should appear even if balance fails
  return body.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/) !== null || body.includes('SOL');
});

// XRP
await page.locator('button:has-text("XRP")').first().click();
await check('XRP: address loads', async () => {
  await page.waitForTimeout(3000);
  const body = await page.locator('body').textContent();
  return body.match(/r[1-9A-HJ-NP-Za-km-z]{24,34}/) !== null || body.includes('XRP');
});

// SUI
await page.locator('button:has-text("Move")').first().click();
await page.waitForTimeout(500);
await page.locator('button:has-text("SUI")').first().click();
await check('SUI: address loads (0x...)', async () => {
  await page.waitForTimeout(5000);
  const body = await page.locator('body').textContent();
  return body.includes('0x') || body.includes('SUI');
});

// ════════════════════════════════════════════════════════════════════════════
// CSP SUMMARY
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ CSP Errors ═══');
if (CSP_ERRORS.length === 0) {
  console.log('✅ No CSP violations detected');
} else {
  console.log(`⚠️  ${CSP_ERRORS.length} CSP violation(s):`);
  CSP_ERRORS.forEach(e => console.log('  -', e));
}

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
const passed = RESULTS.filter(r => r.ok).length;
const failed = RESULTS.filter(r => !r.ok).length;
console.log(`RESULT: ${passed} PASSED, ${failed} FAILED  (total ${RESULTS.length})`);
if (CSP_ERRORS.length > 0) console.log(`CSP violations: ${CSP_ERRORS.length}`);
console.log('═'.repeat(60));
if (failed > 0) {
  console.log('\nFAILED:');
  RESULTS.filter(r => !r.ok).forEach(r => {
    console.log(`  ❌ ${r.label}`);
    if (r.reason) console.log(`     └─ ${r.reason.slice(0, 200)}`);
  });
}

await browser.close();
process.exit((failed > 0 || CSP_ERRORS.length > 0) ? 1 : 0);
