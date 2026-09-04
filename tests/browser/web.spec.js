import { expect, test } from '@playwright/test';

test('captures the demo page and controls the melt effect', async ({ page }) => {
  await page.goto('/demo/index.html');
  await expect(page.getByRole('heading', { name: 'Hold still for one second.' })).toBeVisible();
  await expect(page.getByLabel('Effect')).toHaveValue('gameOfStrife');

  await page.waitForTimeout(1200);
  await expect(page.getByText('Game of Strife is running. Move the pointer to seed pixels.')).toBeVisible();
  await expect(page.locator('.swyzzle-overlay')).toHaveCSS('opacity', '1');

  await page.getByLabel('Effect').selectOption('fluid');
  await page.mouse.move(200, 250);
  await page.mouse.move(650, 420);
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.locator('.swyzzle-overlay')).toHaveCSS('opacity', '0');
});

test('accepts a canvas source and cleans up its overlay', async ({ page }) => {
  await page.goto('/demo/index.html');
  const result = await page.evaluate(async () => {
    const { Swyzzle } = await import('/dist/swyzzle.js');
    const source = document.createElement('canvas');
    source.width = 64;
    source.height = 64;
    const context = source.getContext('2d');
    context.fillStyle = '#35d07f';
    context.fillRect(0, 0, 64, 64);

    const effect = new Swyzzle({ effect: 'basic' });
    await effect.capture(source);
    const visible = effect.canvas.style.opacity;
    effect.reset().stop().start();
    effect.destroy();
    return {
      visible,
      remainingOverlays: document.querySelectorAll('.swyzzle-overlay').length,
    };
  });

  expect(result.visible).toBe('1');
  expect(result.remainingOverlays).toBe(1);
});
