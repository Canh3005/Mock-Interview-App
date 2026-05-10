import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtStrategy } from '../../../src/auth/strategies/jwt.strategy';
import { InterviewSet } from '../../../src/question-bank/entities/interview-set.entity';
import { QuestionPracticeAttempt } from '../../../src/question-bank/entities/question-practice-attempt.entity';
import { QuestionProbeAuditLog } from '../../../src/question-bank/entities/question-probe-audit-log.entity';
import { QuestionProbe } from '../../../src/question-bank/entities/question-probe.entity';
import { QuestionBankModule } from '../../../src/question-bank/question-bank.module';
import { Role } from '../../../src/users/entities/user.entity';

export interface QuestionBankE2eContext {
  app: INestApplication;
  dataSource: DataSource;
  jwtService: JwtService;
  interviewSetRepository: Repository<InterviewSet>;
  probeRepository: Repository<QuestionProbe>;
}

export async function createQuestionBankE2eContext(): Promise<QuestionBankE2eContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      PassportModule,
      JwtModule.register({
        secret: process.env.JWT_SECRET || 'super-secret-access-key',
        signOptions: { expiresIn: '15m' },
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.POSTGRES_HOST || '127.0.0.1',
        port: Number(process.env.POSTGRES_PORT) || 5432,
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: process.env.POSTGRES_DB || 'mock_interview_db',
        entities: [
          QuestionProbe,
          QuestionPracticeAttempt,
          QuestionProbeAuditLog,
          InterviewSet,
        ],
        synchronize: true,
        ssl:
          process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
      QuestionBankModule,
    ],
    providers: [JwtStrategy],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  const dataSource = app.get(DataSource);
  const jwtService = app.get(JwtService);

  return {
    app,
    dataSource,
    jwtService,
    interviewSetRepository: dataSource.getRepository(InterviewSet),
    probeRepository: dataSource.getRepository(QuestionProbe),
  };
}

export function signRoleToken({
  jwtService,
  role,
  id,
  email,
}: {
  jwtService: JwtService;
  role: Role;
  id: string;
  email: string;
}): string {
  return jwtService.sign({ sub: id, email, role });
}

export async function cleanupQuestionBankE2eData({
  interviewSetRepository,
  probeRepository,
  prefix = 'e2e-%',
}: Pick<
  QuestionBankE2eContext,
  'interviewSetRepository' | 'probeRepository'
> & {
  prefix?: string;
}): Promise<void> {
  await interviewSetRepository
    .createQueryBuilder()
    .delete()
    .where('code LIKE :prefix', { prefix })
    .execute();
  await probeRepository
    .createQueryBuilder()
    .delete()
    .where('code LIKE :prefix', { prefix })
    .execute();
}
