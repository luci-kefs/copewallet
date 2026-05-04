import { Page, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const PASSPHRASE = 'TestPass999!';
export const DOWNLOADS_DIR = path.join(process.cwd(), 'test-downloads');

export function ensureDownloadsDir() {
  if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

function uniquePngPath(): string {
  return path.join(DOWNLOADS_DIR, `copewallet-${crypto.randomBytes(6).toString('hex')}.png`);
}

// ── Selectors (discovered from live DOM recon) ────────────────────────────────
// Buttons use material icons prefix + uppercase text, e.g. "verified_user\nPERSIST CURRENT SESSION"
export const SEL = {
  persistBtn:     'button:has-text("PERSIST CURRENT SESSION")',
  newVaultBtn:    'button:has-text("INITIALIZE NEW VAULT")',
  accessVaultBtn: 'button:has-text("ACCESS EXISTING VAULT")',
  saveBtn:        'button:has-text("SAVE")',
  forgeBtn:       'button:has-text("Forge Vault")',
  backBtn:        'button:has-text("Back")',
  // Advanced: first button with "ADVANCED" (not the hint link)
  advancedBtn:    'button:has-text("ADVANCED"):not(:has-text("find"))',
  simpleBtn:      'button:has-text("Simple")',
  hintLink:       "button:has-text(\"Didn't find\")",
  addChainBtn:    'button:has-text("Add Chain")',
  networkBtn:     'button:has-text("NETWORK")',
  vaultSecured:   'text=VAULT SECURED',
  walletUnlocked: 'text=Wallet Unlocked',
  wrongPass:      'text=Wrong passphrase',
  secureVault:    'text=SECURE VAULT',
  advancedMode:   'text=Advanced Mode',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function waitForWallet(page: Page, timeout = 12000) {
  await page.waitForFunction(
    () => {
      const raw = localStorage.getItem('__cw_wallet_history__');
      const h = raw ? JSON.parse(raw) : [];
      return h.length > 0 && h[0].address;
    },
    { timeout }
  );
}

export async function getHistory(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('__cw_wallet_history__');
    return raw ? JSON.parse(raw) : [];
  });
}

export async function getVaultKeys(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(localStorage).filter(k => k.startsWith('__cw_vault_'))
  );
}

export function attachConsoleLogger(page: Page, label = '') {
  const logs: string[] = [];
  page.on('console', msg => {
    const line = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    logs.push(line);
    if (msg.type() === 'error') console.error(`${label} ${line}`);
  });
  page.on('pageerror', err => {
    const line = `[PAGE ERROR] ${err.message}`;
    logs.push(line);
    console.error(`${label} ${line}`);
  });
  return logs;
}

export async function saveFirstUnsavedWallet(page: Page) {
  const btn = page.locator(SEL.saveBtn).first();
  await expect(btn).toBeVisible({ timeout: 8000 });
  await btn.click();
  await page.waitForTimeout(800);
}

export async function goToIdlePanel(page: Page) {
  const back = page.locator(SEL.backBtn).first();
  if (await back.isVisible({ timeout: 2000 }).catch(() => false)) {
    await back.click();
    await page.waitForTimeout(400);
  }
}

export async function persistSession(page: Page, passphrase = PASSPHRASE): Promise<string> {
  const btn = page.locator(SEL.persistBtn).first();
  await expect(btn).toBeVisible({ timeout: 10000 });
  // Button may be disabled on live site for non-initial flow — force via dispatchEvent
  await btn.dispatchEvent('click');
  await page.waitForTimeout(400);

  const inputs = page.locator('input[type="password"]');
  await inputs.nth(0).fill(passphrase);
  await inputs.nth(1).fill(passphrase);

  const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
  await page.locator(SEL.forgeBtn).click();

  const download = await downloadPromise;
  const savePath = uniquePngPath();
  await download.saveAs(savePath);

  // Success screen
  await expect(page.locator('text=VAULT SECURED').or(page.locator('text=Vault Secured')).first()).toBeVisible({ timeout: 15000 });
  return savePath;
}

export async function dropPNG(page: Page, pngPath: string, passphrase = PASSPHRASE) {
  await page.locator(SEL.accessVaultBtn).first().click();
  await page.waitForTimeout(400);

  await page.locator('input[type="password"]').fill(passphrase);

  const base64 = fs.readFileSync(pngPath).toString('base64');
  const filename = path.basename(pngPath);

  await page.evaluate(async ({ base64, filename }) => {
    // atob — no fetch, no CORS
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/png' });
    const file = new File([blob], filename, { type: 'image/png' });

    const dt = new DataTransfer();
    dt.items.add(file);

    const dropZone = document.querySelector('[class*="border-dashed"]') as HTMLElement
      ?? document.querySelector('[class*="Upload"]') as HTMLElement;
    if (!dropZone) throw new Error('Drop zone not found');

    dropZone.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true }));
    dropZone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }));
  }, { base64, filename });

  await page.waitForTimeout(4000);
}

export async function decodePNGPayload(page: Page, pngPath: string): Promise<string> {
  const base64 = fs.readFileSync(pngPath).toString('base64');

  return page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('img load failed'));
      img.src = `data:image/png;base64,${b64}`;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const pixelData = ctx.getImageData(0, 0, img.width, img.height).data;
    const totalPixels = img.width * img.height;

    // Extract R-channel LSBs from all pixels
    const allBits: number[] = new Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) allBits[i] = pixelData[i * 4] & 1;

    // Decode header bytes (8 bytes: 4 magic + 4 length little-endian)
    const HEADER_BYTES = 8;
    const headerBytes = new Uint8Array(HEADER_BYTES);
    for (let i = 0; i < HEADER_BYTES; i++) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | (allBits[i * 8 + j] ?? 0);
      headerBytes[i] = byte;
    }

    // Verify magic: AE 71 1A 4D
    const MAGIC = [0xAE, 0x71, 0x1A, 0x4D];
    for (let i = 0; i < 4; i++) {
      if (headerBytes[i] !== MAGIC[i]) throw new Error(`Bad magic byte ${i}: 0x${headerBytes[i].toString(16)}`);
    }

    // Little-endian uint32 length
    const byteLen = new DataView(headerBytes.buffer).getUint32(4, true);
    if (byteLen <= 0 || byteLen > totalPixels - HEADER_BYTES) throw new Error(`Invalid payload length: ${byteLen}`);

    // Decode payload bytes
    const payloadBytes = new Uint8Array(byteLen);
    for (let i = 0; i < byteLen; i++) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | (allBits[HEADER_BYTES * 8 + i * 8 + j] ?? 0);
      payloadBytes[i] = byte;
    }

    const raw = new TextDecoder().decode(payloadBytes);
    const outer = JSON.parse(raw);
    return outer.v === 1 ? outer.d : raw;
  }, base64);
}
