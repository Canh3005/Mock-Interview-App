import {
  createInterviewSetFixture,
  questionBankTaxonomy,
} from './question-bank-fixtures.js';

export async function mockAdminQuestionBankApi(page, state) {
  await page.route('**/auth/refresh', async (route) => {
    await route.fulfill({
      json: {
        accessToken: 'e2e-admin-token',
        user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
      },
    });
  });
  await page.route('**/question-bank/taxonomy', async (route) => {
    await route.fulfill({ json: questionBankTaxonomy });
  });
  await page.route('**/admin/question-bank/probes**', async (route) => {
    await route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } });
  });
  await page.route('**/admin/question-bank/interview-sets**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET') {
      await route.fulfill({
        json: {
          data: state.sets,
          total: state.sets.length,
          page: Number(url.searchParams.get('page') ?? 1),
          limit: 10,
        },
      });
      return;
    }

    if (request.method() === 'POST' && url.pathname.endsWith('/publish')) {
      state.transitions.push({ type: 'publish', body: request.postDataJSON() });
      state.sets = state.sets.map((set) =>
        set.id === 'set-1'
          ? createInterviewSetFixture({ ...set, status: 'active', revision: set.revision + 1 })
          : set,
      );
      await route.fulfill({ json: state.sets[0] });
      return;
    }

    if (request.method() === 'POST' && url.pathname.endsWith('/retire')) {
      state.transitions.push({ type: 'retire', body: request.postDataJSON() });
      state.sets = state.sets.map((set) =>
        set.id === 'set-1'
          ? createInterviewSetFixture({ ...set, status: 'retired', revision: set.revision + 1 })
          : set,
      );
      await route.fulfill({ json: state.sets[0] });
      return;
    }

    if (request.method() === 'POST') {
      state.savedPayloads.push(request.postDataJSON());
      state.sets = [
        createInterviewSetFixture({
          ...request.postDataJSON(),
          id: 'set-2',
          status: 'draft',
          revision: 1,
        }),
      ];
      await route.fulfill({ json: state.sets[0] });
      return;
    }

    if (request.method() === 'PATCH') {
      state.updatedPayloads.push(request.postDataJSON());
      state.sets = state.sets.map((set) =>
        set.id === 'set-1'
          ? createInterviewSetFixture({ ...set, ...request.postDataJSON(), revision: set.revision + 1 })
          : set,
      );
      await route.fulfill({ json: state.sets[0] });
      return;
    }

    await route.fallback();
  });
}
