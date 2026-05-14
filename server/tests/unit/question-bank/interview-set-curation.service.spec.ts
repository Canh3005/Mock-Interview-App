import { BadRequestException, ConflictException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InterviewSet } from '../../../src/question-bank/entities/interview-set.entity';
import { QuestionProbe } from '../../../src/question-bank/entities/question-probe.entity';
import { InterviewSetCurationService } from '../../../src/question-bank/services/curation/interview-set-curation.service';
import {
  createInterviewSetPayload,
  createMockInterviewSet,
} from './helpers/question-bank-test-data';

describe('InterviewSetCurationService', () => {
  let service: InterviewSetCurationService;
  let interviewSetRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let probeRepository: {
    find: jest.Mock;
  };

  beforeEach(() => {
    interviewSetRepository = {
      create: jest.fn((input: Partial<InterviewSet>) =>
        createMockInterviewSet(input),
      ),
      save: jest.fn(async (input: InterviewSet) => input),
      findOne: jest.fn(),
    };
    probeRepository = {
      find: jest.fn(),
    };
    service = new InterviewSetCurationService(
      interviewSetRepository as unknown as Repository<InterviewSet>,
      probeRepository as unknown as Repository<QuestionProbe>,
    );
  });

  it('creates interview sets as draft without publishing them', async () => {
    interviewSetRepository.findOne.mockResolvedValue(null);

    const result = await service.create({
      dto: createInterviewSetPayload({
        code: 'backend-mid-standard',
        title: 'Backend Mid Standard',
      }),
      actorId: 'admin-1',
    });

    expect(result.status).toBe('draft');
    expect(result.createdBy).toBe('admin-1');
    expect(result.updatedBy).toBe('admin-1');
    expect(result.title).toBe('Backend Mid Standard');
    expect(result.questionCount).toBe(3);
    expect(interviewSetRepository.save).toHaveBeenCalledWith(result);
  });

  it('rejects duplicate interview set code on create', async () => {
    interviewSetRepository.findOne.mockResolvedValue(
      createMockInterviewSet({ id: 'existing-set' }),
    );

    await expect(
      service.create({ dto: createInterviewSetPayload(), actorId: 'admin-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects editing active or retired interview sets', async () => {
    interviewSetRepository.findOne.mockResolvedValue(
      createMockInterviewSet({ status: 'active' }),
    );

    await expect(
      service.update({
        id: 'set-1',
        dto: createInterviewSetPayload({ title: 'Updated title' }),
        actorId: 'admin-2',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes a set with valid slot rules', async () => {
    const interviewSet = createMockInterviewSet({
      status: 'draft',
      revision: 1,
    });
    interviewSetRepository.findOne.mockResolvedValue(interviewSet);

    const result = await service.publish({
      id: 'set-1',
      actorId: 'admin-2',
      reason: 'Ready for sessions',
    });

    expect(result.status).toBe('active');
    expect(result.updatedBy).toBe('admin-2');
    expect(result.lastTransitionReason).toBe('Ready for sessions');
    expect(result.revision).toBe(2);
    expect(result.publishedAt).toBeInstanceOf(Date);
    expect(probeRepository.find).not.toHaveBeenCalled();
  });

  it('rejects publish when neither probe IDs nor slot rules are configured', async () => {
    interviewSetRepository.findOne.mockResolvedValue(
      createMockInterviewSet({ probeIds: [], slotRules: [] }),
    );

    await expect(
      service.publish({ id: 'set-1', actorId: 'admin-2' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects publish when referenced probes are not all active', async () => {
    interviewSetRepository.findOne.mockResolvedValue(
      createMockInterviewSet({
        probeIds: ['probe-1', 'probe-2'],
        slotRules: [],
      }),
    );
    probeRepository.find.mockResolvedValue([{ id: 'probe-1' }]);

    await expect(
      service.publish({ id: 'set-1', actorId: 'admin-2' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(probeRepository.find).toHaveBeenCalledWith({
      where: { id: In(['probe-1', 'probe-2']), status: 'active' },
    });
  });

  it('retires active sets only when a reason is provided', async () => {
    await expect(
      service.retire({ id: 'set-1', actorId: 'admin-2', reason: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const interviewSet = createMockInterviewSet({
      status: 'active',
      revision: 2,
    });
    interviewSetRepository.findOne.mockResolvedValue(interviewSet);

    const result = await service.retire({
      id: 'set-1',
      actorId: 'admin-2',
      reason: 'Outdated set',
    });

    expect(result.status).toBe('retired');
    expect(result.updatedBy).toBe('admin-2');
    expect(result.lastTransitionReason).toBe('Outdated set');
    expect(result.revision).toBe(3);
    expect(result.retiredAt).toBeInstanceOf(Date);
  });
});
