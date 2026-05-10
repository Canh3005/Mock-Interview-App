import { expect, test } from '@playwright/test';
import { createJwt, installAdminRefreshStub } from './helpers/jwt.js';
import { createInterviewSetPayload } from './helpers/question-bank-fixtures.js';

test('admin quản trị Bộ phỏng vấn bằng browser thật và backend thật', async ({ page, request }) => {
  await installAdminRefreshStub(page);

  const apiToken = createJwt({
    sub: 'e2e-admin-browser',
    email: 'e2e-admin-browser@example.com',
    role: 'admin',
  });
  const code = `e2e-browser-${Date.now()}`;
  const createApiResponse = await request.post('http://127.0.0.1:3001/admin/question-bank/interview-sets', {
    headers: { Authorization: `Bearer ${apiToken}` },
    data: createInterviewSetPayload(code, 'Browser Real Set'),
  });
  expect(createApiResponse.ok()).toBeTruthy();
  const created = await createApiResponse.json();

  await page.goto('/admin/question-bank');
  await page.getByRole('button', { name: /Bộ phỏng vấn|Interview Sets/i }).click();
  await page.getByLabel(/Tìm kiếm|Search/i).fill(code);
  await expect(page.getByText('Browser Real Set')).toBeVisible();

  await page.getByTitle(/Sửa|Edit/i).click();
  await page.getByLabel(/Tiêu đề bộ|Set title/i).fill('Browser Real Set Revised');
  await page.getByRole('button', { name: /^Lưu$|^Save$/i }).click();
  await expect(page.getByText('Browser Real Set Revised')).toBeVisible();

  await page.getByTitle(/Xuất bản bộ|Publish interview set|Publish Set/i).click();
  await expect(page.getByText('active')).toBeVisible();

  page.once('dialog', async (dialog) => {
    await dialog.accept('Browser real e2e cleanup');
  });
  await page.getByTitle(/Ngừng dùng bộ|Retire interview set|Retire Set/i).click();
  await expect(page.getByText('retired')).toBeVisible();

  const detailResponse = await request.get(
    `http://127.0.0.1:3001/admin/question-bank/interview-sets/${created.id}`,
    { headers: { Authorization: `Bearer ${apiToken}` } },
  );
  expect(detailResponse.ok()).toBeTruthy();
  const detail = await detailResponse.json();
  expect(detail).toMatchObject({
    id: created.id,
    code,
    title: 'Browser Real Set Revised',
    status: 'retired',
    lastTransitionReason: 'Browser real e2e cleanup',
  });
});
