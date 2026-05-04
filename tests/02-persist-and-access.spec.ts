import { test, expect } from '@playwright/test';
import {
  waitForWallet, getHistory, attachConsoleLogger,
  saveFirstUnsavedWallet, goToIdlePanel, persistSession, dropPNG,
  decodePNGPayload, ensureDownloadsDir, PASSPHRASE, SEL,
} from './helpers';

test.describe('Persist & Access Vault', () => {

  test.beforeAll(() => ensureDownloadsDir());

  test('PNG downloaded and contains 1 encrypted mnemonic (single wallet)', async ({ page }) => {
    attachConsoleLogger(page, '[02]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    await saveFirstUnsavedWallet(page);
    await goToIdlePanel(page);

    const pngPath = await persistSession(page);
    const payload = await decodePNGPayload(page, pngPath);
    const arr = JSON.parse(payload);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(1);

    await page.screenshot({ path: 'test-results/02-single-persist.png', fullPage: true });
    console.log(`✅ PNG: ${arr.length} mnemonic`);
  });

  test('PNG contains 2 mnemonics for 2 saved vaults', async ({ page }) => {
    attachConsoleLogger(page, '[02]');
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

    const pngPath = await persistSession(page);
    const payload = await decodePNGPayload(page, pngPath);
    const arr = JSON.parse(payload);
    expect(arr.length).toBe(2);

    await page.screenshot({ path: 'test-results/02-multi-persist.png', fullPage: true });
    console.log(`✅ PNG: ${arr.length} mnemonics`);
  });

  test('Access Vault restores primary wallet', async ({ page }) => {
    attachConsoleLogger(page, '[02]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    await saveFirstUnsavedWallet(page);
    await goToIdlePanel(page);
    const pngPath = await persistSession(page);

    const persistedAddress = await page.evaluate(() => {
      const h = JSON.parse(localStorage.getItem('__cw_wallet_history__') ?? '[]');
      return h.find((s: any) => s.isSaved)?.address ?? null;
    });

    await goToIdlePanel(page);
    await page.evaluate(() => Object.keys(localStorage).forEach(k => localStorage.removeItem(k)));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await dropPNG(page, pngPath);
    await expect(page.locator('text=Wallet Unlocked').or(page.locator('text=WALLET UNLOCKED')).first()).toBeVisible({ timeout: 15000 });

    const restored = await getHistory(page);
    expect(restored.some((s: any) => s.address === persistedAddress)).toBe(true);

    await page.screenshot({ path: 'test-results/02-access-success.png', fullPage: true });
    console.log('✅ Wallet restored:', persistedAddress?.slice(0, 10));
  });

  test('Access Vault restores ALL saved vaults into history', async ({ page }) => {
    attachConsoleLogger(page, '[02]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    await saveFirstUnsavedWallet(page);
    const histA = await getHistory(page);
    const addressA = histA[0].address;

    await page.locator(SEL.newVaultBtn).first().click();
    await page.waitForTimeout(2500);
    await waitForWallet(page);
    await saveFirstUnsavedWallet(page);
    const histB = await getHistory(page);
    const addressB = histB[0].address;

    await goToIdlePanel(page);
    const pngPath = await persistSession(page);

    await page.evaluate(() => Object.keys(localStorage).forEach(k => localStorage.removeItem(k)));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await dropPNG(page, pngPath);
    await expect(page.locator('text=Wallet Unlocked').or(page.locator('text=WALLET UNLOCKED')).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    const restored = await getHistory(page);
    expect(restored.some((s: any) => s.address === addressA)).toBe(true);
    expect(restored.some((s: any) => s.address === addressB)).toBe(true);

    await page.screenshot({ path: 'test-results/02-restore-all.png', fullPage: true });
    console.log('✅ Both vaults restored:', addressA.slice(0,10), addressB.slice(0,10));
  });

  test('Wrong passphrase shows error, wallet not unlocked', async ({ page }) => {
    attachConsoleLogger(page, '[02]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    await saveFirstUnsavedWallet(page);
    await goToIdlePanel(page);
    const pngPath = await persistSession(page);
    await goToIdlePanel(page);

    await page.evaluate(() => Object.keys(localStorage).forEach(k => localStorage.removeItem(k)));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await dropPNG(page, pngPath, 'WRONG_PASSPHRASE_XYZ');

    await expect(
      page.locator('text=Wrong passphrase').or(page.locator('text=wrong passphrase')).or(page.locator('text=invalid')).or(page.locator('text=Invalid')).first()
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Wallet Unlocked')).not.toBeVisible();

    await page.screenshot({ path: 'test-results/02-wrong-pass.png', fullPage: true });
    console.log('✅ Wrong passphrase rejected');
  });

});
