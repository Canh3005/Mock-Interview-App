import { expect, test } from '@playwright/test';

test('app shell loads', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#root')).toBeVisible();
  await expect(page).toHaveTitle(/Mock Interview|Vite|React|Interview/i);
});
