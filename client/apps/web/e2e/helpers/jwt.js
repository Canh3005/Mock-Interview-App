import crypto from 'node:crypto';

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function createJwt(payload) {
  const secret = process.env.JWT_SECRET || 'super-secret-access-key-mock-interview-app-2026';
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    iat: now,
    exp: now + 15 * 60,
    ...payload,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(body))}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(unsigned)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${unsigned}.${signature}`;
}

export async function installAdminRefreshStub(page, overrides = {}) {
  const user = {
    id: 'e2e-admin-browser',
    email: 'e2e-admin-browser@example.com',
    name: 'E2E Admin',
    avatarUrl: null,
    role: 'admin',
    linkedProviders: [],
    ...overrides,
  };
  const accessToken = createJwt({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  await page.route('**/auth/refresh', async (route) => {
    await route.fulfill({
      json: {
        accessToken,
        user,
      },
    });
  });

  return { accessToken, user };
}
