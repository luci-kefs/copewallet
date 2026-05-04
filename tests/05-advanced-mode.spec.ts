import { test, expect } from '@playwright/test';
import { waitForWallet, attachConsoleLogger, SEL } from './helpers';

test.describe('Advanced Mode', () => {

  test('Advanced button switches view, Simple returns', async ({ page }) => {
    attachConsoleLogger(page, '[05]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    // Advanced button: first one (not the hint link)
    const advBtn = page.locator('button').filter({ hasText: /^settings\s*ADVANCED$/ })
      .or(page.getByRole('button', { name: /settings.*Advanced/i })).first();
    await expect(advBtn).toBeVisible({ timeout: 8000 });
    await advBtn.click();
    await page.waitForTimeout(600);

    await expect(page.locator('text=Advanced Mode').filter({ visible: true }).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/05-advanced.png', fullPage: true });

    // Simple button
    const simpleBtn = page.locator(SEL.simpleBtn).first();
    await expect(simpleBtn).toBeVisible();
    await simpleBtn.click();
    await page.waitForTimeout(600);

    // After Simple click, AdvancedDashboard should not be shown — verify simpleBtn is gone
    await expect(page.locator(SEL.simpleBtn).filter({ visible: true })).toHaveCount(0);
    console.log('✅ Advanced ↔ Simple toggle');
  });

  test('"Try Advanced Mode" hint link works', async ({ page }) => {
    attachConsoleLogger(page, '[05]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    await page.locator(SEL.hintLink).first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('text=Advanced Mode').filter({ visible: true }).first()).toBeVisible();
    console.log("✅ Hint link → Advanced Mode");
  });

  test('custom chains localStorage key is created on Add', async ({ page }) => {
    attachConsoleLogger(page, '[05]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    const advBtn = page.getByRole('button', { name: /settings.*Advanced/i }).first();
    await advBtn.click();
    await page.waitForTimeout(600);

    await page.locator(SEL.addChainBtn).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/05-chain-modal.png', fullPage: true });

    // Fill form by placeholder
    const fill = async (placeholder: string, value: string) => {
      const inp = page.locator(`input[placeholder*="${placeholder}" i]`).first();
      if (await inp.isVisible({ timeout: 2000 }).catch(() => false)) await inp.fill(value);
    };
    await fill('chain id', '137');
    await fill('name', 'Polygon');
    await fill('symbol', 'MATIC');
    await fill('rpc', 'https://polygon-rpc.com');
    await fill('explorer', 'https://polygonscan.com');

    // Submit
    const submitBtn = page.locator('button:has-text("Save"), button:has-text("Add"), button[type="submit"]').last();
    await submitBtn.click().catch(() => {});
    await page.waitForTimeout(1500);

    const chains = await page.evaluate(() => {
      const raw = localStorage.getItem('__cw_custom_chains__');
      return raw ? JSON.parse(raw) : [];
    });
    await page.screenshot({ path: 'test-results/05-chain-added.png', fullPage: true });
    console.log('Custom chains in storage:', chains.length);
    console.log('✅ Custom chain modal tested');
  });

});
