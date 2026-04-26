import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { SDProblem } from '../sd-problem/entities/sd-problem.entity';
import { seedSDProblems } from '../sd-problem/sd-problem.seed';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'mock_interview_db',
  entities: [SDProblem],
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run() {
  await dataSource.initialize();
  await seedSDProblems(dataSource);
  await dataSource.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
