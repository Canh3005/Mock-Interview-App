import { expect, test } from '@playwright/test';
import { mockAdminQuestionBankApi } from './helpers/question-bank-api-mock.js';
import { createInterviewSetFixture } from './helpers/question-bank-fixtures.js';

test('admin can validate and create interview sets through structured form controls', async ({ page }) => {
  const state = { sets: [], savedPayloads: [], transitions: [] };
  await mockAdminQuestionBankApi(page, state);

  await page.goto('/admin/question-bank');
  await page.getByRole('button', { name: /Bộ phỏng vấn|Interview Sets/i }).click();
  await expect(page.getByText(/Không có bộ phỏng vấn phù hợp\.|No interview sets found\./i)).toBeVisible();

  await page.getByRole('button', { name: /Tạo bộ phỏng vấn|Create interview set/i }).click();
  await expect(page.getByText(/Phân loại bộ phỏng vấn|Set metadata|Interview set targeting/i)).toBeVisible();
  await expect(page.getByText('Quy tắc slot', { exact: true }).or(page.getByText('Slot rules', { exact: true }))).toBeVisible();

  await page.getByRole('button', { name: /^Lưu$|^Save$/i }).click();
  await expect(page.getByText(/Nhập tiêu đề bộ phỏng vấn\.|Set title is required\./i)).toBeVisible();
  await expect(page.getByText(/Điền tiêu đề bản địa hóa cho vi\.|Localized title is required for vi\./i)).toBeVisible();

  await page.getByLabel(/Mã|Code/i).fill('backend-mid-standard');
  await page.getByLabel(/Tiêu đề bộ|Set title/i).fill('Backend Mid Standard');
  await page.getByLabel(/Thời lượng phút|Duration/i).fill('45');
  await page.getByLabel(/Số câu|Question count|Questions/i).fill('3');
  await page.getByLabel(/Tiêu đề bản địa hóa|Localized title/i).fill('Backend Mid VI');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByLabel(/Tiêu đề bản địa hóa|Localized title/i).fill('Backend Mid EN');
  await page.getByRole('button', { name: 'JA', exact: true }).click();
  await page.getByLabel(/Tiêu đề bản địa hóa|Localized title/i).fill('Backend Mid JA');

  await page.getByRole('button', { name: /^Lưu$|^Save$/i }).click();

  await expect.poll(() => state.savedPayloads.length).toBe(1);
  expect(state.savedPayloads[0]).toMatchObject({
    code: 'backend-mid-standard',
    title: 'Backend Mid Standard',
    roleFamily: 'backend',
    level: 'mid',
    durationMinutes: 45,
    questionCount: 3,
    slotRules: [{ stage: 'stage_1_culture_fit', count: 1 }],
  });
});

test('admin can update a draft interview set from structured form controls', async ({ page }) => {
  const state = { sets: [createInterviewSetFixture()], savedPayloads: [], updatedPayloads: [], transitions: [] };
  await mockAdminQuestionBankApi(page, state);

  await page.goto('/admin/question-bank');
  await page.getByRole('button', { name: /Bộ phỏng vấn|Interview Sets/i }).click();
  await page.getByTitle(/Sửa|Edit/i).click();
  await page.getByLabel(/Tiêu đề bộ|Set title/i).fill('Backend Mid Revised');
  await page.getByRole('button', { name: /^Lưu$|^Save$/i }).click();

  await expect.poll(() => state.updatedPayloads.length).toBe(1);
  expect(state.updatedPayloads[0]).toMatchObject({
    title: 'Backend Mid Revised',
    roleFamily: 'backend',
    level: 'mid',
    questionCount: 3,
  });
});

test('admin can publish and retire interview sets from the table', async ({ page }) => {
  const state = { sets: [createInterviewSetFixture()], savedPayloads: [], updatedPayloads: [], transitions: [] };
  await mockAdminQuestionBankApi(page, state);

  await page.goto('/admin/question-bank');
  await page.getByRole('button', { name: /Bộ phỏng vấn|Interview Sets/i }).click();
  await expect(page.getByText('Backend Mid Standard')).toBeVisible();

  await page.getByTitle(/Xuất bản bộ|Publish interview set|Publish Set/i).click();

  await expect.poll(() => state.transitions.length).toBe(1);
  expect(state.transitions[0]).toEqual({ type: 'publish', body: {} });

  await expect(page.getByText('active')).toBeVisible();
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toMatch(/Lý do chuyển trạng thái|Reason for this transition/i);
    await dialog.accept('No longer fits the target interview');
  });
  await page.getByTitle(/Ngừng dùng bộ|Retire interview set|Retire Set/i).click();

  await expect.poll(() => state.transitions.length).toBe(2);
  expect(state.transitions[1]).toEqual({
    type: 'retire',
    body: { reason: 'No longer fits the target interview' },
  });
});
