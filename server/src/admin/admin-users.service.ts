import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { InterviewSession } from '../interview/entities/interview-session.entity';
import { LlmAnomalyAlert } from '../ai/entities/llm-anomaly-alert.entity';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(InterviewSession)
    private readonly sessionRepo: Repository<InterviewSession>,
    @InjectRepository(LlmAnomalyAlert)
    private readonly anomalyRepo: Repository<LlmAnomalyAlert>,
  ) {}

  async listUsers(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: string;
  }) {
    const where: Record<string, unknown>[] = [];
    const baseWhere: Record<string, unknown> = {};

    if (params.isActive !== undefined && params.isActive !== '') {
      baseWhere['isActive'] = params.isActive === 'true';
    }

    if (params.search) {
      where.push(
        { ...baseWhere, email: ILike(`%${params.search}%`) },
        { ...baseWhere, name: ILike(`%${params.search}%`) },
      );
    } else {
      where.push(baseWhere);
    }

    const [users, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: [
        'id',
        'name',
        'email',
        'role',
        'isActive',
        'avatarUrl',
        'createdAt',
      ],
    });

    return { data: users, total, page: params.page, limit: params.limit };
  }

  async getUserDetail(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: [
        'id',
        'name',
        'email',
        'role',
        'isActive',
        'avatarUrl',
        'createdAt',
        'updatedAt',
      ],
    });
    if (!user) throw new NotFoundException('User not found');

    const wallet = await this.walletRepo.findOne({ where: { userId: id } });
    const sessionCount = await this.sessionRepo.count({
      where: { userId: id },
    });
    const anomalies = await this.anomalyRepo.find({
      where: { userId: id },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      ...user,
      walletBalance: wallet?.balance ?? 0,
      sessionCount,
      anomalies,
    };
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.update(id, { isActive });
  }
}
