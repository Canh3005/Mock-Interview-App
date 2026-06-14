import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClsContextInterceptor } from './common/cls-context.interceptor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProblemsModule } from './problems/problems.module';
import { TestCasesModule } from './test-cases/test-cases.module';
import { JudgeModule } from './judge/judge.module';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from './ai/ai.module';
import { DocumentsModule } from './documents/documents.module';
import { JobsModule } from './jobs/jobs.module';
import { InterviewModule } from './interview/interview.module';
import { CombatModule } from './combat/combat.module';
import { TtsModule } from './tts/tts.module';
import { LiveCodingModule } from './live-coding/live-coding.module';
import { PracticeDSAModule } from './practice-dsa/practice-dsa.module';
import { SDProblemModule } from './sd-problem/sd-problem.module';
import { SDSessionModule } from './sd-session/sd-session.module';
import { SDInterviewerModule } from './sd-interviewer/sd-interviewer.module';
import { SDEvaluatorModule } from './sd-evaluator/sd-evaluator.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { QuestionBankModule } from './question-bank/question-bank.module';
import { SessionPlanningModule } from './session-planning/session-planning.module';
import { BehaviorSessionModule } from './behavior-session/behavior-session.module';
import { SDOrchestratorModule } from './sd-orchestrator/sd-orchestrator.module';
import { NSDProblemModule } from './nsd-problem/nsd-problem.module';
import { NSDSessionModule } from './nsd-session/nsd-session.module';
import { NSDInterviewerModule } from './nsd-interviewer/nsd-interviewer.module';
import { NSDEvaluatorModule } from './nsd-evaluator/nsd-evaluator.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true, generateId: true },
    }),
    RedisModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST') || '127.0.0.1',
        port: configService.get<number>('POSTGRES_PORT') || 5432,
        username: configService.get<string>('POSTGRES_USER') || 'postgres',
        password: configService.get<string>('POSTGRES_PASSWORD') || 'postgres',
        database:
          configService.get<string>('POSTGRES_DB') || 'mock_interview_db',
        autoLoadEntities: true,
        synchronize: true, // TODO: Set to false in production and use migrations
        ssl:
          configService.get('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        timezone: 'UTC',
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST') || '127.0.0.1',
          port: configService.get('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    AiModule,
    UsersModule,
    AuthModule,
    ProblemsModule,
    TestCasesModule,
    JudgeModule,
    DocumentsModule,
    JobsModule,
    InterviewModule,
    CombatModule,
    TtsModule,
    LiveCodingModule,
    PracticeDSAModule,
    SDProblemModule,
    SDSessionModule,
    SDInterviewerModule,
    SDEvaluatorModule,
    WalletModule,
    PaymentModule,
    QuestionBankModule,
    SessionPlanningModule,
    BehaviorSessionModule,
    SDOrchestratorModule,
    NSDProblemModule,
    NSDSessionModule,
    NSDInterviewerModule,
    NSDEvaluatorModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ClsContextInterceptor },
  ],
})
export class AppModule {}
