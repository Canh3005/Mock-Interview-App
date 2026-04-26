import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SDProblem } from './entities/sd-problem.entity';
import { CreateSDProblemDto } from './dto/create-sd-problem.dto';

@Injectable()
export class SDProblemService {
  private readonly logger = new Logger(SDProblemService.name);

  constructor(
    @InjectRepository(SDProblem)
    private sdProblemRepository: Repository<SDProblem>,
  ) {}

  async create(dto: CreateSDProblemDto): Promise<SDProblem> {
    try {
      const entity: SDProblem = this.sdProblemRepository.create({
        ...dto,
        curveBallScenarios: dto.curveBallScenarios ?? [],
        tags: dto.tags ?? [],
      });
      const result: SDProblem = await this.sdProblemRepository.save(entity);
      this.logger.log(`SDProblem created: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to create SDProblem', error);
      throw error;
    }
  }

  async findAll({ page, limit }: { page: number; limit: number }): Promise<{
    data: SDProblem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total]: [SDProblem[], number] =
      await this.sdProblemRepository.findAndCount({
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<SDProblem> {
    const problem: SDProblem | null = await this.sdProblemRepository.findOne({
      where: { id },
    });
    if (!problem) throw new NotFoundException(`SDProblem #${id} not found`);
    return problem;
  }

  async update({
    id,
    dto,
  }: {
    id: string;
    dto: Partial<CreateSDProblemDto>;
  }): Promise<SDProblem> {
    const problem: SDProblem = await this.findOne(id);
    Object.assign(problem, dto);
    const result: SDProblem = await this.sdProblemRepository.save(problem);
    this.logger.log(`SDProblem updated: ${result.id}`);
    return result;
  }

  async remove(id: string): Promise<SDProblem> {
    const problem: SDProblem = await this.findOne(id);
    await this.sdProblemRepository.remove(problem);
    return problem;
  }

  async query({
    targetLevel,
    domain,
    limit,
  }: {
    targetLevel?: string;
    domain?: string;
    limit?: number;
  }): Promise<SDProblem[]> {
    const qb: SelectQueryBuilder<SDProblem> = this.sdProblemRepository
      .createQueryBuilder('p')
      .orderBy('RANDOM()');

    if (targetLevel) {
      qb.andWhere('p.targetLevel = :targetLevel', { targetLevel });
    }
    if (domain) {
      qb.andWhere('p.domain = :domain', { domain });
    }
    if (limit) {
      qb.take(limit);
    }

    return qb.getMany();
  }
}
