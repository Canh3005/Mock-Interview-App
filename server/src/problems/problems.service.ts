import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { VerifyProblemDto } from './dto/verify-problem.dto';
import {
  Problem,
  ProblemDifficulty,
  ProblemStatus,
} from './entities/problem.entity';
import { ProblemTemplate } from './entities/problem-template.entity';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { JudgeService } from '../judge/judge.service';
import { v4 as uuidv4 } from 'uuid';
import type {
  ImportBulkError,
  ImportBulkItemResult,
  ProblemVerificationResult,
} from './types/problem-verification.types';
import type { JudgeSubmissionResult } from '../judge/types/judge.types';

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

  async create(createProblemDto: CreateProblemDto) {
    const id = uuidv4();
    const title = createProblemDto.title || 'untitled';
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${id.substring(0, 8)}`;

    const templates = (createProblemDto.templates ?? []).map((template) =>
      this.withStableId(template),
    );

    // Strip temporary numeric UI IDs from testcases and assign valid UUIDs
    const testCases = (createProblemDto.testCases ?? []).map((testCase) =>
      this.withStableId(testCase),
    );

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
    const where: FindOptionsWhere<Problem> = {};
    if (search) {
      where.title = ILike(`%${search}%`);
    }
    if (this.isProblemDifficulty(difficulty)) {
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

  async importBulk(items: CreateProblemDto[]) {
    let successful = 0;
    let failed = 0;
    const errors: ImportBulkError[] = [];

    // Process each item independently
    const results = await Promise.all(
      items.map(async (item, index): Promise<ImportBulkItemResult> => {
        try {
          // Force status to DRAFT regardless of input for safety
          const createDto: CreateProblemDto = {
            ...item,
            status: ProblemStatus.DRAFT,
            // Default to empty array if testCases is missing to prevent validation crash
            testCases: Array.isArray(item.testCases) ? item.testCases : [],
          };

          await this.create(createDto);
          return { ok: true };
        } catch (error: unknown) {
          return {
            ok: false,
            error: {
              index,
              error: this.formatErrorMessage(error),
            },
          };
        }
      }),
    );

    // Analyze results
    results.forEach((result) => {
      if (result.ok) {
        successful++;
      } else {
        failed++;
        errors.push(
          result.error ?? {
            index: -1,
            error: 'Unknown error during creation',
          },
        );
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

  async update(id: string, updateProblemDto: UpdateProblemDto) {
    const problem = await this.problemRepository.findOne({
      where: { id },
      relations: ['templates', 'testCases'],
    });
    if (!problem) throw new NotFoundException(`Problem #${id} not found`);

    const rawTemplates = Array.isArray(updateProblemDto.templates)
      ? updateProblemDto.templates
      : undefined;
    const rawTestCases = Array.isArray(updateProblemDto.testCases)
      ? updateProblemDto.testCases
      : undefined;
    const scalarFields = this.toProblemScalarFields(updateProblemDto);
    Object.assign(problem, scalarFields);

    // Explicit upsert — bypasses preload cascade unreliability with @PrimaryColumn relations
    if (rawTemplates) {
      const existingByLang = new Map(
        problem.templates.map((t) => [t.languageId, t]),
      );
      const incoming = rawTemplates.map((t) => {
        const existingId = t.id;
        const langId = t.languageId;
        const resolvedId =
          existingId && existingId.length > 20
            ? existingId
            : (existingByLang.get(langId)?.id ?? uuidv4());
        return { ...t, id: resolvedId, problemId: id } as ProblemTemplate;
      });
      await this.problemTemplateRepository.upsert(incoming, ['id']);
      const incomingIds = new Set(incoming.map((t) => t.id));
      const toDelete = problem.templates.filter((t) => !incomingIds.has(t.id));
      if (toDelete.length)
        await this.problemTemplateRepository.remove(toDelete);
    }

    if (rawTestCases) {
      const incoming = rawTestCases.map((tc) => {
        const existingId = tc.id;
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
    const resultObj: ProblemVerificationResult = {
      languages: {},
      details: [],
    };

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
      } catch (err: unknown) {
        allLanguagesPassed = false;
        const errorMessage = this.extractServiceErrorMessage(err);
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

      await this.problemRepository.update(id, {
        status: ProblemStatus.VERIFIED,
      });
      resultObj.verified = true;
    } else {
      resultObj.verified = false;
    }

    return resultObj;
  }

  private withStableId<T extends { id?: string }>(
    value: T,
  ): T & { id: string } {
    return {
      ...value,
      id: value.id && value.id.length > 20 ? value.id : uuidv4(),
    };
  }

  private isProblemDifficulty(value: string): value is ProblemDifficulty {
    return Object.values(ProblemDifficulty).includes(
      value as ProblemDifficulty,
    );
  }

  private toProblemScalarFields(
    dto: UpdateProblemDto,
  ): Partial<Omit<Problem, 'templates' | 'testCases'>> {
    const fields: Partial<Omit<Problem, 'templates' | 'testCases'>> = {};

    if (dto.title !== undefined) fields.title = dto.title;
    if (dto.difficulty !== undefined) fields.difficulty = dto.difficulty;
    if (dto.description !== undefined) fields.description = dto.description;
    if (dto.constraints !== undefined) fields.constraints = dto.constraints;
    if (dto.timeLimitMultiplier !== undefined) {
      fields.timeLimitMultiplier = dto.timeLimitMultiplier;
    }
    if (dto.status !== undefined) fields.status = dto.status;
    if (dto.tags !== undefined) fields.tags = dto.tags;
    if (dto.hints !== undefined) fields.hints = dto.hints;
    if (dto.optimalTimeComplexity !== undefined) {
      fields.optimalTimeComplexity = dto.optimalTimeComplexity;
    }
    if (dto.optimalSpaceComplexity !== undefined) {
      fields.optimalSpaceComplexity = dto.optimalSpaceComplexity;
    }

    return fields;
  }

  private extractServiceErrorMessage(error: unknown): string {
    if (this.isRecord(error)) {
      const response = error['response'];
      if (this.isRecord(response)) {
        const data = response['data'];
        if (this.isRecord(data)) {
          const message = data['message'];
          if (typeof message === 'string') return message;
          const responseError = data['error'];
          if (typeof responseError === 'string') return responseError;
        }
      }
    }

    return this.formatErrorMessage(error);
  }

  private formatErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
