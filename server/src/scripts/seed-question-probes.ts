import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { QuestionProbeAuditLog } from '../question-bank/entities/question-probe-audit-log.entity';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import { seedQuestionProbes } from '../question-bank/question-probe.seed';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'mock_interview_db',
  entities: [QuestionProbe, QuestionProbeAuditLog],
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run(): Promise<void> {
  await dataSource.initialize();
  await seedQuestionProbes(dataSource);
  await dataSource.destroy();
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
