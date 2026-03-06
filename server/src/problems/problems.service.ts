import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { Problem, ProblemStatus } from './entities/problem.entity';
import { ProblemTemplate } from './entities/problem-template.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProblemsService {
  constructor(
    @InjectRepository(Problem) private problemRepository: Repository<Problem>,
    @InjectRepository(ProblemTemplate) private problemTemplateRepository: Repository<ProblemTemplate>,
  ) {}

  async create(createProblemDto: CreateProblemDto) {
    const createdProblem = this.problemRepository.create({
      id: uuidv4(),
      ...createProblemDto,
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

  async findOne(id: string) {
    const problem = await this.problemRepository.findOne({ where: { id } });
    if (!problem) {
      throw new NotFoundException(`Problem #${id} not found`);
    }
    return problem;
  }

  async update(id: string, updateProblemDto: UpdateProblemDto) {
    const problemToUpdate = await this.problemRepository.preload({
      id,
      ...updateProblemDto,
    });

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

  async verify(id: string, solutionCode: string) {
    // Placeholder for actual Engine Verification logic
    const problem = await this.findOne(id);
    // Assume verification passed for now
    problem.status = ProblemStatus.VERIFIED;
    return this.problemRepository.save(problem);
  }
}
