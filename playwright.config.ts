import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import os from 'os';

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['line']],
  outputDir: 'test-results',

  use: {
    baseURL: 'https://copewallet.com',
    headless: false,
    viewport: null,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    launchOptions: {
      headless: false,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-web-security',        // allow cross-origin file reads in tests
        '--allow-file-access-from-files',
      ],
      // Full desktop control: mouse + keyboard
      slowMo: 0,
    },

    // Capture ALL console messages
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'copewallet',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
