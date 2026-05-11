import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource, Repository } from 'typeorm';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

type QuestionProbeJsonSeed = Partial<QuestionProbe> & { code: string };

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'mock_interview_db',
  entities: [QuestionProbe],
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

function resolveJsonPath(): string {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error(
      'Usage: ts-node src/scripts/import-question-probes-json.ts <path-to-json>',
    );
  }
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);
}

function loadProbes(filePath: string): QuestionProbeJsonSeed[] {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Probe JSON must be an array');
  }

  return parsed.map((item: unknown, index: number) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('code' in item) ||
      typeof item.code !== 'string' ||
      item.code.trim().length === 0
    ) {
      throw new Error(`Probe at index ${index} must include a non-empty code`);
    }
    return item as QuestionProbeJsonSeed;
  });
}

async function importProbes(filePath: string): Promise<void> {
  const repo: Repository<QuestionProbe> = dataSource.getRepository(QuestionProbe);
  const probes = loadProbes(filePath);
  const importSource = `json:${path.basename(filePath)}`;
  let created = 0;
  let updated = 0;

  for (const probe of probes) {
    const existing = await repo.findOne({ where: { code: probe.code } });
    if (existing) {
      await repo.save(
        repo.create({
          ...existing,
          ...probe,
          updatedBy: importSource,
        }),
      );
      updated += 1;
      continue;
    }

    await repo.save(
      repo.create({
        ...probe,
        status: probe.status ?? 'active',
        createdBy: importSource,
        updatedBy: importSource,
        reviewedBy: importSource,
        publishedAt: new Date(),
        revision: 1,
      }),
    );
    created += 1;
  }

  console.log(
    `[import] Question probes from ${filePath}: ${created} created, ${updated} updated.`,
  );
}

async function main(): Promise<void> {
  const filePath = resolveJsonPath();
  try {
    await dataSource.initialize();
    await importProbes(filePath);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
