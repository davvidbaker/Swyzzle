import { _electron as electron, expect, test } from '@playwright/test';
import path from 'node:path';

test('desktop app lives in the menu bar with isolated capture IPC', async () => {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const electronApp = await electron.launch({
    args: [path.resolve('electron/main.js')],
    env,
  });

  try {
    const window = await electronApp.firstWindow();
    await expect(window).toHaveTitle('Swyzzle');
    await expect(window.locator('#glCanvas')).toBeAttached();
    await expect(window.getByRole('button')).toHaveCount(0);
    await expect.poll(
      () => electronApp.evaluate(() => globalThis.__SWYZZLE__?.hasTray),
    ).toBe(true);
    await expect.poll(
      () => window.evaluate(() => typeof window.swyzzleDesktop?.onCommand),
    ).toBe('function');
    await expect.poll(
      () => window.evaluate(() => typeof window.require),
    ).toBe('undefined');
  } finally {
    await electronApp.close();
  }
});
