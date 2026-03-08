import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { Problem, ProblemStatus } from './entities/problem.entity';
import { ProblemTemplate } from './entities/problem-template.entity';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { JudgeService } from '../judge/judge.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProblemsService {
  constructor(
    @InjectRepository(Problem) private problemRepository: Repository<Problem>,
    @InjectRepository(ProblemTemplate) private problemTemplateRepository: Repository<ProblemTemplate>,
    @InjectRepository(TestCase) private testCaseRepository: Repository<TestCase>,
    private judgeService: JudgeService,
  ) {}

  async create(createProblemDto: any) {
    const id = uuidv4();
    const title = createProblemDto.title || 'untitled';
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${id.substring(0, 8)}`;

    const templates = createProblemDto.templates?.map((t: any) => ({
      ...t, 
      id: t.id && String(t.id).length > 20 ? t.id : uuidv4()
    })) || [];
    
    // Strip temporary numeric UI IDs from testcases and assign valid UUIDs
    const testCases = createProblemDto.testCases?.map((tc: any) => {
      const { id: tcId, ...rest } = tc;
      return { ...rest, id: tcId && String(tcId).length > 20 ? tcId : uuidv4() };
    }) || [];

    const createdProblem = this.problemRepository.create({
      id,
      slug,
      ...createProblemDto,
      templates,
      testCases
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
          throw { index, error: error.message || 'Unknown error during creation' };
        }
      })
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
      errors
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
    // Process child entities to assign valid UUIDs to newly added items
    const templates = updateProblemDto.templates?.map((t: any) => ({
      ...t,
      id: t.id && String(t.id).length > 20 ? t.id : uuidv4()
    }));
    
    const testCases = updateProblemDto.testCases?.map((tc: any) => {
      const { id: tcId, ...rest } = tc;
      return { ...rest, id: tcId && String(tcId).length > 20 ? tcId : uuidv4() };
    });

    const updatePayload = {
      id,
      ...updateProblemDto,
      ...(templates && { templates }),
      ...(testCases && { testCases })
    };

    const problemToUpdate = await this.problemRepository.preload(updatePayload);

    if (!problemToUpdate) {
      throw new NotFoundException(`Problem #${id} not found`);
    }

    return this.problemRepository.save(problemToUpdate);
  }

  async remove(id: string) {
    const problem = await this.findOne(id);
    await this.problemRepository.remove(problem);
    return problem;
  }

  async verify(id: string) {
    const problem = await this.problemRepository.findOne({
      where: { id },
      relations: ['templates', 'testCases'],
    });

    if (!problem) {
      throw new NotFoundException(`Problem #${id} not found`);
    }

    if (!problem.templates || problem.templates.length === 0) {
      throw new BadRequestException('Problem has no language templates (enabled languages).');
    }

    if (!problem.testCases || problem.testCases.length === 0) {
      throw new BadRequestException('Problem has no test cases. Add test cases before verifying.');
    }

    const testCases = problem.testCases;
    let allLanguagesPassed = true;
    const resultObj: any = {
      languages: {},
      details: [],
    };

    // Verify code for each enabled language template
    for (const template of problem.templates) {
      const language = template.languageId;
      // solutionCode defines the Solution class/function.
      // driverCode is the runner that reads stdin, calls Solution, and prints output.
      // Therefore solutionCode MUST come first so that driverCode can reference it.
      const fullCode = template.driverCode
                        ? `${template.solutionCode}\n\n${template.driverCode}`
                        : template.solutionCode;
      try {
        const batchResults = await this.judgeService.runBatchTests(
          language,
          fullCode,
          testCases.map((tc) => ({ input: tc.inputData, expectedOutput: tc.expectedOutput })),
          problem.timeLimitMultiplier * (template.timeLimitMs / 1000.0) // Convert ms to s
        );

        let passed = 0;
        const total = testCases.length;
        
        for (let i = 0; i < batchResults.length; i++) {
          const res = batchResults[i];
          const tc = testCases[i];
          
          if (res.status.id === 3) {
            passed++;
          } else {
            // Push missing/failed details
            resultObj.details.push({
              language,
              testCaseId: tc.id,
              input: tc.inputData,
              expectedOutput: tc.expectedOutput,
              actualOutput: res.compile_output || res.stderr || res.stdout?.trim() || res.status.description,
              statusId: res.status.id,
              statusDescription: res.status.description,
            });
          }
        }

        resultObj.languages[language] = { passed, total };
        if (passed < total) {
          allLanguagesPassed = false;
        }

      } catch (err) {
        // Judge0 API error or timeout
        allLanguagesPassed = false;
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message;
        resultObj.languages[language] = { passed: 0, total: testCases.length, error: errorMessage };
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
      problem.status = ProblemStatus.VERIFIED;
      await this.problemRepository.save(problem);
      resultObj.verified = true;
    } else {
      resultObj.verified = false;
    }

    return resultObj;
  }
}
