import { test, expect } from '@playwright/test';
import { waitForWallet, getHistory, getVaultKeys, attachConsoleLogger, saveFirstUnsavedWallet, SEL } from './helpers';

test.describe('Wallet Lifecycle', () => {

  test('auto-creates wallet on first load', async ({ page }) => {
    attachConsoleLogger(page, '[01]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    const history = await getHistory(page);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(await getVaultKeys(page)).toHaveLength(1);

    await page.screenshot({ path: 'test-results/01-auto-create.png', fullPage: true });
    console.log('✅ Wallet auto-created:', history[0].address.slice(0, 10));
  });

  test('SAVE button marks wallet as isSaved with correct blob', async ({ page }) => {
    attachConsoleLogger(page, '[01]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    const before = await getHistory(page);
    expect(before[0].isSaved).toBe(false);
    const targetId = before[0].id;

    await saveFirstUnsavedWallet(page);

    const after = await getHistory(page);
    const saved = after.find((s: any) => s.id === targetId);
    expect(saved?.isSaved).toBe(true);
    expect(await page.evaluate((id) => !!localStorage.getItem(`__cw_vault_${id}__`), targetId)).toBe(true);

    console.log('✅ Save correct:', before[0].address.slice(0, 10));
  });

  test('INITIALIZE NEW VAULT creates fresh wallet, old stays in history', async ({ page }) => {
    attachConsoleLogger(page, '[01]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    const before = await getHistory(page);
    const oldAddress = before[0].address;

    await page.locator(SEL.newVaultBtn).first().click();
    await page.waitForTimeout(2500);
    await waitForWallet(page);

    const after = await getHistory(page);
    expect(after[0].address).not.toBe(oldAddress);
    expect(after.some((s: any) => s.address === oldAddress)).toBe(true);

    await page.screenshot({ path: 'test-results/01-new-vault.png', fullPage: true });
    console.log('✅ New vault:', after[0].address.slice(0, 10), '| Old preserved');
  });

  test('two wallets saved — each has own distinct blob', async ({ page }) => {
    attachConsoleLogger(page, '[01]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    await saveFirstUnsavedWallet(page);

    await page.locator(SEL.newVaultBtn).first().click();
    await page.waitForTimeout(2500);
    await waitForWallet(page);
    await saveFirstUnsavedWallet(page);

    const history = await getHistory(page);
    const saved = history.filter((s: any) => s.isSaved);
    expect(saved.length).toBe(2);

    const blobs = await Promise.all(saved.map((s: any) =>
      page.evaluate((id) => localStorage.getItem(`__cw_vault_${id}__`), s.id)
    ));
    expect(blobs[0]).toBeTruthy();
    expect(blobs[1]).toBeTruthy();
    expect(blobs[0]).not.toBe(blobs[1]);

    await page.screenshot({ path: 'test-results/01-two-saved.png', fullPage: true });
    console.log('✅ Two distinct blobs confirmed');
  });

});
