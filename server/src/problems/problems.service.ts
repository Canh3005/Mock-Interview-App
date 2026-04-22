import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { VerifyProblemDto } from './dto/verify-problem.dto';
import { Problem, ProblemStatus } from './entities/problem.entity';
import { ProblemTemplate } from './entities/problem-template.entity';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { JudgeService, JudgeSubmissionResult } from '../judge/judge.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProblemsService {
  constructor(
    @InjectRepository(Problem) private problemRepository: Repository<Problem>,
    @InjectRepository(ProblemTemplate)
    private problemTemplateRepository: Repository<ProblemTemplate>,
    @InjectRepository(TestCase)
    private testCaseRepository: Repository<TestCase>,
    private judgeService: JudgeService,
  ) {}

  async create(createProblemDto: any) {
    const id = uuidv4();
    const title = createProblemDto.title || 'untitled';
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${id.substring(0, 8)}`;

    const templates =
      createProblemDto.templates?.map((t: any) => ({
        ...t,
        id: t.id && String(t.id).length > 20 ? t.id : uuidv4(),
      })) || [];

    // Strip temporary numeric UI IDs from testcases and assign valid UUIDs
    const testCases =
      createProblemDto.testCases?.map((tc: any) => {
        const { id: tcId, ...rest } = tc;
        return {
          ...rest,
          id: tcId && String(tcId).length > 20 ? tcId : uuidv4(),
        };
      }) || [];

    const createdProblem = this.problemRepository.create({
      id,
      slug,
      ...createProblemDto,
      templates,
      testCases,
    });
    return this.problemRepository.save(createdProblem);
  }

  async findAll(page = 1, limit = 10, search = '', difficulty = '') {
    const where: any = {};
    if (search) {
      where.title = ILike(`%${search}%`);
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }

    const [problems, total] = await this.problemRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }, // Assuming we want the latest first
    });

    return { total, page, limit, data: problems };
  }

  async findPublic(
    page = 1,
    limit = 20,
    search = '',
    difficulty = '',
    tag = '',
  ) {
    const qb = this.problemRepository
      .createQueryBuilder('p')
      .where('p.status IN (:...statuses)', {
        statuses: [ProblemStatus.VERIFIED, ProblemStatus.PUBLISHED],
      })
      .leftJoinAndSelect('p.templates', 'templates')
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('p.title ILIKE :search', { search: `%${search}%` });
    }
    if (difficulty) {
      qb.andWhere('p.difficulty = :difficulty', { difficulty });
    }
    if (tag) {
      qb.andWhere(':tag = ANY(p.tags)', { tag });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async importBulk(items: any[]) {
    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    // Process each item independently
    const results = await Promise.allSettled(
      items.map(async (item, index) => {
        try {
          // Force status to DRAFT regardless of input for safety
          const createDto: CreateProblemDto = {
            ...item,
            status: 'DRAFT',
            // Default to empty array if testCases is missing to prevent validation crash
            testCases: Array.isArray(item.testCases) ? item.testCases : [],
          };

          await this.create(createDto);
          return index;
        } catch (error) {
          throw {
            index,
            error: error.message || 'Unknown error during creation',
          };
        }
      }),
    );

    // Analyze results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        successful++;
      } else {
        failed++;
        errors.push(result.reason);
      }
    });

    return {
      successful,
      failed,
      errors,
    };
  }

  async findOne(id: string) {
    const problem = await this.problemRepository.findOne({
      where: { id },
      relations: ['templates', 'testCases'],
    });
    if (!problem) {
      throw new NotFoundException(`Problem #${id} not found`);
    }
    return problem;
  }

  async update(id: string, updateProblemDto: any) {
    const problem = await this.problemRepository.findOne({
      where: { id },
      relations: ['templates', 'testCases'],
    });
    if (!problem) throw new NotFoundException(`Problem #${id} not found`);

    const dto = updateProblemDto as Record<string, unknown>;
    const rawTemplates = dto['templates'] as
      | Record<string, unknown>[]
      | undefined;
    const rawTestCases = dto['testCases'] as
      | Record<string, unknown>[]
      | undefined;
    const { templates: _t, testCases: _tc, ...scalarFields } = dto;
    void _t;
    void _tc;
    Object.assign(problem, scalarFields);

    // Explicit upsert — bypasses preload cascade unreliability with @PrimaryColumn relations
    if (rawTemplates) {
      const existingByLang = new Map(
        problem.templates.map((t) => [t.languageId, t]),
      );
      const incoming = rawTemplates.map((t) => {
        const existingId = t['id'] as string | undefined;
        const langId = t['languageId'] as string;
        const resolvedId =
          existingId && existingId.length > 20
            ? existingId
            : (existingByLang.get(langId)?.id ?? uuidv4());
        return { ...t, id: resolvedId, problemId: id } as ProblemTemplate;
      });
      await this.problemTemplateRepository.upsert(incoming, ['id']);
      const incomingIds = new Set(incoming.map((t) => t.id));
      const toDelete = problem.templates.filter((t) => !incomingIds.has(t.id));
      if (toDelete.length) await this.problemTemplateRepository.remove(toDelete);
    }

    if (rawTestCases) {
      const incoming = rawTestCases.map((tc) => {
        const existingId = tc['id'] as string | undefined;
        const { id: _, ...rest } = tc;
        void _;
        return {
          ...rest,
          id: existingId && existingId.length > 20 ? existingId : uuidv4(),
          problemId: id,
        } as TestCase;
      });
      await this.testCaseRepository.upsert(incoming, ['id']);
      const incomingIds = new Set(incoming.map((tc) => tc.id));
      const toDelete = problem.testCases.filter(
        (tc) => !incomingIds.has(tc.id),
      );
      if (toDelete.length) await this.testCaseRepository.remove(toDelete);
    }

    await this.problemRepository
      .createQueryBuilder()
      .update()
      .set(scalarFields)
      .where('id = :id', { id })
      .execute();
    return this.problemRepository.findOne({
      where: { id },
      relations: ['templates', 'testCases'],
    });
  }

  async remove(id: string) {
    const problem = await this.findOne(id);
    await this.problemRepository.remove(problem);
    return problem;
  }

  async verify(id: string, dto: VerifyProblemDto) {
    const problem = await this.problemRepository.findOne({
      where: { id },
      relations: ['templates', 'testCases'],
    });

    if (!problem) {
      throw new NotFoundException(`Problem #${id} not found`);
    }

    if (!dto.templates || dto.templates.length === 0) {
      throw new BadRequestException(
        'Problem has no language templates (enabled languages).',
      );
    }

    if (!dto.testCases || dto.testCases.length === 0) {
      throw new BadRequestException(
        'Problem has no test cases. Add test cases before verifying.',
      );
    }

    let allLanguagesPassed = true;
    const resultObj: any = { languages: {}, details: [] };

    for (const template of dto.templates.filter((t) => t.isEnabled)) {
      const language = template.languageId;
      const fullCode = template.driverCode
        ? template.driverCode.replace('{{USER_CODE}}', template.solutionCode)
        : template.solutionCode;

      try {
        const batchResults: JudgeSubmissionResult[] =
          await this.judgeService.runBatchTests(
            language,
            fullCode,
            dto.testCases.map((tc) => ({
              input: tc.inputData,
              expectedOutput: tc.expectedOutput,
            })),
            problem.timeLimitMultiplier * (template.timeLimitMs / 1000.0),
          );

        let passed = 0;
        const total = dto.testCases.length;

        for (let i = 0; i < batchResults.length; i++) {
          const res = batchResults[i];
          const tc = dto.testCases[i];
          const statusId = res.status.id;
          const isAc = statusId === 3;

          if (isAc) {
            passed++;
          } else {
            const driverOutput = res.stdout ?? '';
            resultObj.details.push({
              language,
              testCaseId: tc.id ?? null,
              input: tc.inputData,
              expectedOutput: tc.expectedOutput,
              actualOutput:
                res.compile_output ||
                res.stderr ||
                driverOutput ||
                res.status.description,
              statusId,
              statusDescription: res.status.description,
            });
          }
        }

        resultObj.languages[language] = { passed, total };
        if (passed < total) allLanguagesPassed = false;
      } catch (err) {
        allLanguagesPassed = false;
        const errorMessage =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message;
        resultObj.languages[language] = {
          passed: 0,
          total: dto.testCases.length,
          error: errorMessage,
        };
        resultObj.details.push({
          language,
          testCaseId: 'API_ERROR',
          input: 'N/A',
          expectedOutput: 'N/A',
          actualOutput: `Lỗi kết nối Judge0 hoặc Backend: ${errorMessage}`,
          statusId: 0,
          statusDescription: 'System Error',
        });
      }
    }

    if (allLanguagesPassed) {
      // save() is reliable with @PrimaryColumn — upsert() can silently skip updates
      for (const t of dto.templates) {
        const existing = problem.templates?.find(
          (e) => e.languageId === t.languageId,
        );
        const entity = existing ?? this.problemTemplateRepository.create();
        entity.id = existing?.id ?? uuidv4();
        entity.problemId = id;
        entity.languageId = t.languageId;
        entity.starterCode = String(t.starterCode ?? '');
        entity.solutionCode = String(t.solutionCode ?? '');
        entity.driverCode = String(t.driverCode ?? '');
        entity.timeLimitMs = t.timeLimitMs;
        entity.memoryLimitKb = t.memoryLimitKb;
        entity.isEnabled = Boolean(t.isEnabled);
        await this.problemTemplateRepository.save(entity);
      }

      // Save test cases from payload to DB — plain objects, no entity spread
      const incomingTestCases = dto.testCases.map((tc) => {
        const existingId = tc.id && tc.id.length > 20 ? tc.id : undefined;
        return {
          id: existingId ?? uuidv4(),
          problemId: id,
          inputData: tc.inputData,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden ?? false,
        };
      });
      await this.testCaseRepository.upsert(incomingTestCases, ['id']);

      // Remove test cases no longer in payload (test cases are always sent in full)
      const incomingTcIds = new Set(incomingTestCases.map((tc) => tc.id));
      const toDeleteTc = (problem.testCases ?? []).filter(
        (tc) => !incomingTcIds.has(tc.id),
      );
      if (toDeleteTc.length) {
        await this.testCaseRepository.remove(toDeleteTc);
      }

      problem.status = ProblemStatus.VERIFIED;
      await this.problemRepository.save(problem);
      resultObj.verified = true;
    } else {
      resultObj.verified = false;
    }

    return resultObj;
  }
}
