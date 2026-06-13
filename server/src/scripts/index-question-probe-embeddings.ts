import * as dotenv from 'dotenv';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GeminiService } from '../ai/gemini.service';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import { QuestionProbeEmbedding } from '../session-planning/rag/question-probe-embedding.entity';
import { ProbeEmbeddingTextService } from '../session-planning/rag/probe-embedding-text.service';
import { SessionPlanningRagService } from '../session-planning/rag/session-planning-rag.service';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'mock_interview_db',
  entities: [QuestionProbe, QuestionProbeEmbedding],
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run(): Promise<void> {
  await dataSource.initialize();

  const probes = await dataSource.getRepository(QuestionProbe).find({
    where: { status: 'active' },
  });
  const configService = new ConfigService();
  const geminiService = new GeminiService(configService);
  const textService = new ProbeEmbeddingTextService();
  const ragService = new SessionPlanningRagService(
    dataSource,
    configService,
    geminiService,
    textService,
  );

  await ragService.bootstrapStorage();
  const result = await ragService.indexProbes({ probes });
  console.log(
    `Indexed question probe embeddings. indexed=${result.indexed} skipped=${result.skipped}`,
  );

  await dataSource.destroy();
}

run().catch(async (err: unknown) => {
  console.error(err);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
