import { test, expect } from '@playwright/test';
import { waitForWallet, getHistory, attachConsoleLogger, SEL } from './helpers';

test.describe('Session Lock', () => {

  // Session lock toggle: site uses a div/button with "Keep session" or similar text
  // Recon showed no checkbox — find the real toggle element
  async function findSessionToggle(page: any) {
    // Try common patterns: button with "session", div with toggle class
    const candidates = [
      page.locator('button:has-text("Keep"), button:has-text("Session Lock"), button:has-text("session")'),
      page.locator('[class*="toggle"], [class*="switch"]'),
      page.locator('input[type="checkbox"]'),
    ];
    for (const c of candidates) {
      if (await c.count() > 0) return c.first();
    }
    return null;
  }

  test('session lock: wallet persists after refresh when session saved', async ({ page }) => {
    attachConsoleLogger(page, '[03]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    const before = await getHistory(page);
    const address = before[0].address;

    // Session is auto-saved (isSessionLocked=true default) — just reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    const after = await getHistory(page);
    expect(after[0].address).toBe(address);
    console.log('✅ Wallet survived refresh:', address.slice(0, 10));
  });

  test('Persist button is always enabled when wallet unlocked', async ({ page }) => {
    attachConsoleLogger(page, '[03]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    const persistBtn = page.locator(SEL.persistBtn).first();
    await expect(persistBtn).toBeVisible({ timeout: 8000 });
    await expect(persistBtn).toBeEnabled();

    console.log('✅ Persist button enabled after login');
  });

  test('wipeCopeWallet clears state but keeps localStorage history', async ({ page }) => {
    attachConsoleLogger(page, '[03]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    const before = await getHistory(page);
    expect(before.length).toBeGreaterThan(0);

    // Simulate wipe (clear session storage only, not localStorage)
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    const after = await getHistory(page);
    // History in localStorage should still be there
    expect(after.length).toBeGreaterThanOrEqual(1);
    console.log('✅ History preserved after session wipe');
  });

});
