import { _electron as electron, expect, test } from '@playwright/test';
import path from 'node:path';

test('desktop app exposes isolated capture IPC and preserved controls', async () => {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const electronApp = await electron.launch({
    args: [path.resolve('electron/main.js')],
    env,
  });

  try {
    const window = await electronApp.firstWindow();
    await expect(window).toHaveTitle('Swyzzle');
    await expect(window.getByRole('button', { name: 'Capture Screen' })).toBeVisible();
    await expect(window.getByRole('button', { name: 'Reset Effect' })).toBeVisible();
    await expect(window.getByLabel('Effect')).toHaveValue('swyzzle');
    await expect.poll(
      () => window.evaluate(() => typeof window.swyzzleDesktop?.captureScreen),
    ).toBe('function');
    await expect.poll(
      () => window.evaluate(() => typeof window.require),
    ).toBe('undefined');
  } finally {
    await electronApp.close();
  }
});
