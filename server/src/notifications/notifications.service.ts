import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { UserNotification } from './entities/user-notification.entity';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(UserNotification)
    private readonly notifRepo: Repository<UserNotification>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async send(
    userId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.notifRepo.save(this.notifRepo.create({ userId, type, payload }));
    await this.redis.publish(
      `notify:${userId}`,
      JSON.stringify({ type, payload }),
    );
  }

  async getUnread(userId: string): Promise<UserNotification[]> {
    return this.notifRepo.find({
      where: { userId, readAt: null as unknown as Date },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id, userId }, { readAt: new Date() });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('userId = :userId AND "readAt" IS NULL', { userId })
      .execute();
  }
}
