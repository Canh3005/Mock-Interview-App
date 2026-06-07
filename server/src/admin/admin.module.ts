import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { InterviewSession } from '../interview/entities/interview-session.entity';
import { LlmUsageLog } from '../ai/entities/llm-usage-log.entity';
import { LlmAnomalyAlert } from '../ai/entities/llm-anomaly-alert.entity';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAnalyticsController } from './admin-analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Wallet,
      WalletTransaction,
      InterviewSession,
      LlmUsageLog,
      LlmAnomalyAlert,
      QuestionProbe,
    ]),
  ],
  providers: [AdminUsersService, AdminAnalyticsService],
  controllers: [AdminUsersController, AdminAnalyticsController],
})
export class AdminModule {}
