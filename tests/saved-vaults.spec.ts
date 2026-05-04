import { test, expect } from '@playwright/test';
import { waitForWallet, saveFirstUnsavedWallet, goToIdlePanel, persistSession, ensureDownloadsDir, SEL } from './helpers';

test.beforeAll(() => ensureDownloadsDir());

test('saved vaults bundled into PNG', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await waitForWallet(page);

  await saveFirstUnsavedWallet(page);
  await goToIdlePanel(page);
  await page.locator(SEL.newVaultBtn).first().click();
  await page.waitForTimeout(2500);
  await waitForWallet(page);
  await saveFirstUnsavedWallet(page);
  await goToIdlePanel(page);

  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('__cw_wallet_history__') ?? '[]').filter((s: any) => s.isSaved).length
  );
  expect(saved).toBe(2);

  const pngPath = await persistSession(page);
  console.log('PNG:', pngPath);
  console.log('✅ Test passed');
});
