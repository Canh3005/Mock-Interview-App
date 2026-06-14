import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NSDProblem } from './entities/nsd-problem.entity';
import { CreateNSDProblemDto } from './dto/create-nsd-problem.dto';

@Injectable()
export class NSDProblemService {
  private readonly logger = new Logger(NSDProblemService.name);

  constructor(
    @InjectRepository(NSDProblem)
    private repo: Repository<NSDProblem>,
  ) {}

  async create(dto: CreateNSDProblemDto): Promise<NSDProblem> {
    const entity = this.repo.create({ ...dto, tags: dto.tags ?? [] });
    const result = await this.repo.save(entity);
    this.logger.log(`NSDProblem created: ${result.id}`);
    return result;
  }

  async findAll({ page, limit }: { page: number; limit: number }): Promise<{
    data: NSDProblem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<NSDProblem> {
    const problem = await this.repo.findOne({ where: { id } });
    if (!problem) throw new NotFoundException(`NSDProblem #${id} not found`);
    return problem;
  }

  async update(
    id: string,
    dto: Partial<CreateNSDProblemDto>,
  ): Promise<NSDProblem> {
    const problem = await this.findOne(id);
    Object.assign(problem, dto);
    const result = await this.repo.save(problem);
    this.logger.log(`NSDProblem updated: ${result.id}`);
    return result;
  }

  async remove(id: string): Promise<NSDProblem> {
    const problem = await this.findOne(id);
    await this.repo.remove(problem);
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
  }): Promise<NSDProblem[]> {
    const qb: SelectQueryBuilder<NSDProblem> = this.repo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .orderBy('RANDOM()');

    if (targetLevel)
      qb.andWhere('p.targetLevel = :targetLevel', { targetLevel });
    if (domain) qb.andWhere('p.domain = :domain', { domain });
    if (limit) qb.take(limit);

    return qb.getMany();
  }

  async selectRandom(targetLevel?: string): Promise<NSDProblem | null> {
    const results = await this.query({ targetLevel: 'senior', limit: 1 });
    return results[0] ?? null;
  }
}
