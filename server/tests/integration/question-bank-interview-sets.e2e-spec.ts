import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../../src/users/entities/user.entity';
import {
  cleanupQuestionBankE2eData,
  createQuestionBankE2eContext,
  QuestionBankE2eContext,
  signRoleToken,
} from './helpers/question-bank-e2e-app';
import {
  createInterviewSetPayload,
  createQuestionProbeEntity,
} from './helpers/question-bank-test-data';

describe('Question Bank Interview Sets (e2e)', () => {
  let context: QuestionBankE2eContext;
  let app: INestApplication;
  let interviewSetRepository: QuestionBankE2eContext['interviewSetRepository'];
  let probeRepository: QuestionBankE2eContext['probeRepository'];
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    context = await createQuestionBankE2eContext();
    app = context.app;
    interviewSetRepository = context.interviewSetRepository;
    probeRepository = context.probeRepository;
    adminToken = signRoleToken({
      jwtService: context.jwtService,
      role: Role.ADMIN,
      id: 'e2e-admin',
      email: 'e2e-admin@example.com',
    });
    userToken = signRoleToken({
      jwtService: context.jwtService,
      role: Role.USER,
      id: 'e2e-user',
      email: 'e2e-user@example.com',
    });
  });

  beforeEach(async () => {
    await cleanupQuestionBankE2eData(context);
  });

  afterAll(async () => {
    await cleanupQuestionBankE2eData(context);
    await app.close();
  });

  it('blocks unauthenticated and non-admin access', async () => {
    await request(app.getHttpServer())
      .get('/admin/question-bank/interview-sets')
      .expect(401);

    await request(app.getHttpServer())
      .get('/admin/question-bank/interview-sets')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('creates, updates, lists, publishes, and retires an interview set with persisted data', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/admin/question-bank/interview-sets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createInterviewSetPayload({ code: 'e2e-backend-mid' }))
      .expect(201);

    expect(createResponse.body).toMatchObject({
      code: 'e2e-backend-mid',
      title: 'E2E Backend Mid Set',
      status: 'draft',
      roleFamily: 'backend',
      level: 'mid',
    });

    const setId = createResponse.body.id as string;
    const persistedDraft = await interviewSetRepository.findOneByOrFail({
      id: setId,
    });
    expect(persistedDraft.status).toBe('draft');
    expect(persistedDraft.createdBy).toBe('e2e-admin');

    const updateResponse = await request(app.getHttpServer())
      .patch(`/admin/question-bank/interview-sets/${setId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        createInterviewSetPayload({
          code: 'e2e-backend-mid',
          title: 'E2E Backend Mid Revised',
        }),
      )
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      id: setId,
      title: 'E2E Backend Mid Revised',
      revision: 2,
    });

    const listResponse = await request(app.getHttpServer())
      .get('/admin/question-bank/interview-sets')
      .query({
        status: 'draft',
        roleFamily: 'backend',
        level: 'mid',
        search: 'Revised',
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listResponse.body).toMatchObject({
      total: 1,
      page: 1,
      limit: 10,
    });
    expect(listResponse.body.data[0]).toMatchObject({
      id: setId,
      title: 'E2E Backend Mid Revised',
    });

    const publishResponse = await request(app.getHttpServer())
      .post(`/admin/question-bank/interview-sets/${setId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Ready for e2e' })
      .expect(201);

    expect(publishResponse.body).toMatchObject({
      id: setId,
      status: 'active',
      lastTransitionReason: 'Ready for e2e',
      revision: 3,
    });

    await request(app.getHttpServer())
      .patch(`/admin/question-bank/interview-sets/${setId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createInterviewSetPayload({ code: 'e2e-backend-mid' }))
      .expect(400);

    await request(app.getHttpServer())
      .post(`/admin/question-bank/interview-sets/${setId}/retire`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);

    const retireResponse = await request(app.getHttpServer())
      .post(`/admin/question-bank/interview-sets/${setId}/retire`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'No longer suitable' })
      .expect(201);

    expect(retireResponse.body).toMatchObject({
      id: setId,
      status: 'retired',
      lastTransitionReason: 'No longer suitable',
      revision: 4,
    });
  });

  it('rejects publish when referenced probes are not active, then accepts active probes', async () => {
    const inactiveProbe = await probeRepository.save(
      probeRepository.create(
        createQuestionProbeEntity({
          code: 'e2e-inactive-probe',
        }),
      ),
    );

    const createResponse = await request(app.getHttpServer())
      .post('/admin/question-bank/interview-sets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        createInterviewSetPayload({
          code: 'e2e-probe-ref-set',
          probeIds: [inactiveProbe.id],
          slotRules: [],
        }),
      )
      .expect(201);

    await request(app.getHttpServer())
      .post(`/admin/question-bank/interview-sets/${createResponse.body.id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);

    inactiveProbe.status = 'active';
    await probeRepository.save(inactiveProbe);

    await request(app.getHttpServer())
      .post(`/admin/question-bank/interview-sets/${createResponse.body.id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe('active');
      });
  });
});
