import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource, In, Repository } from 'typeorm';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

type QuestionProbeJsonSeed = Partial<QuestionProbe> & { code: string };

interface ProbeImportBatch {
  filePath: string;
  importSource: string;
  probes: QuestionProbeJsonSeed[];
}

interface ProbeImportSummary {
  filePath: string;
  created: number;
  updated: number;
}

interface CliOptions {
  dryRun: boolean;
  inputPaths: string[];
}

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

function parseCliOptions(): CliOptions {
  const args: string[] = process.argv.slice(2);
  const dryRun: boolean = args.includes('--dry-run');
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const inputPaths: string[] = args.filter(
    (arg: string): boolean => !arg.startsWith('--'),
  );

  return {
    dryRun,
    inputPaths: inputPaths.length > 0 ? inputPaths : ['data'],
  };
}

function printUsage(): void {
  console.log(`
Usage:
  npm run import:probes
  npm run import:probes -- data
  npm run import:probes -- data/file-a.json data/file-b.json
  npm run import:probes -- --dry-run data

Notes:
  - If no path is provided, the script imports all *.json files in ./data.
  - Paths may be files or directories. Directories are scanned recursively.
  - All files are imported using one database connection.
`);
}

function resolveJsonFiles(inputPaths: string[]): string[] {
  const filePaths: string[] = inputPaths.flatMap(
    (inputPath: string): string[] =>
      collectJsonFiles(resolveInputPath(inputPath)),
  );

  const uniquePaths: string[] = [
    ...new Set(filePaths.map((filePath: string) => path.resolve(filePath))),
  ];
  return uniquePaths.sort((a: string, b: string): number => a.localeCompare(b));
}

function resolveInputPath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) return inputPath;

  const cwdPath: string = path.resolve(process.cwd(), inputPath);
  if (fs.existsSync(cwdPath)) return cwdPath;

  const projectPath: string = path.resolve(__dirname, '../../', inputPath);
  if (fs.existsSync(projectPath)) return projectPath;

  throw new Error(`Input path not found: ${inputPath}`);
}

function collectJsonFiles(inputPath: string): string[] {
  const stat: fs.Stats = fs.statSync(inputPath);
  if (stat.isFile()) {
    if (path.extname(inputPath).toLowerCase() !== '.json') {
      throw new Error(`Probe import file must be JSON: ${inputPath}`);
    }
    return [inputPath];
  }

  if (!stat.isDirectory()) {
    throw new Error(
      `Probe import path must be a file or directory: ${inputPath}`,
    );
  }

  return fs
    .readdirSync(inputPath, { withFileTypes: true })
    .flatMap((entry: fs.Dirent): string[] => {
      const entryPath: string = path.join(inputPath, entry.name);
      if (entry.isDirectory()) return collectJsonFiles(entryPath);
      if (
        entry.isFile() &&
        path.extname(entry.name).toLowerCase() === '.json'
      ) {
        return [entryPath];
      }
      return [];
    });
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

function loadImportBatches(filePaths: string[]): ProbeImportBatch[] {
  if (filePaths.length === 0) {
    throw new Error('No probe JSON files found.');
  }

  const seenCodes = new Map<string, string>();
  return filePaths.map((filePath: string): ProbeImportBatch => {
    const probes: QuestionProbeJsonSeed[] = loadProbes(filePath);
    probes.forEach((probe: QuestionProbeJsonSeed, index: number): void => {
      const previousSource: string | undefined = seenCodes.get(probe.code);
      if (previousSource) {
        throw new Error(
          `Duplicate probe code "${probe.code}" in ${filePath} at index ${index}; first seen in ${previousSource}`,
        );
      }
      seenCodes.set(probe.code, filePath);
    });

    return {
      filePath,
      importSource: `json:${path.basename(filePath)}`,
      probes,
    };
  });
}

async function importBatches({
  batches,
  dryRun,
}: {
  batches: ProbeImportBatch[];
  dryRun: boolean;
}): Promise<ProbeImportSummary[]> {
  const repo: Repository<QuestionProbe> =
    dataSource.getRepository(QuestionProbe);
  const codes: string[] = batches.flatMap((batch: ProbeImportBatch): string[] =>
    batch.probes.map((probe: QuestionProbeJsonSeed): string => probe.code),
  );
  const existingProbes: QuestionProbe[] =
    codes.length > 0 ? await repo.find({ where: { code: In(codes) } }) : [];
  const existingByCode = new Map<string, QuestionProbe>(
    existingProbes
      .filter(
        (probe: QuestionProbe): probe is QuestionProbe & { code: string } =>
          typeof probe.code === 'string',
      )
      .map(
        (probe: QuestionProbe & { code: string }): [string, QuestionProbe] => [
          probe.code,
          probe,
        ],
      ),
  );

  const entities: QuestionProbe[] = [];
  const summaries: ProbeImportSummary[] = batches.map(
    (batch: ProbeImportBatch): ProbeImportSummary => {
      let created = 0;
      let updated = 0;

      batch.probes.forEach((probe: QuestionProbeJsonSeed): void => {
        const existing: QuestionProbe | undefined = existingByCode.get(
          probe.code,
        );
        if (existing) {
          entities.push(
            repo.create({
              ...existing,
              ...probe,
              updatedBy: batch.importSource,
            }),
          );
          updated += 1;
          return;
        }

        entities.push(
          repo.create({
            ...probe,
            status: probe.status ?? 'active',
            createdBy: batch.importSource,
            updatedBy: batch.importSource,
            reviewedBy: batch.importSource,
            publishedAt: new Date(),
            revision: 1,
          }),
        );
        created += 1;
      });

      return {
        filePath: batch.filePath,
        created,
        updated,
      };
    },
  );

  if (!dryRun && entities.length > 0) {
    for (let index = 0; index < entities.length; index += 100) {
      await repo.save(entities.slice(index, index + 100));
    }
  }

  return summaries;
}

function printSummary({
  summaries,
  dryRun,
}: {
  summaries: ProbeImportSummary[];
  dryRun: boolean;
}): void {
  const totalCreated: number = summaries.reduce(
    (sum: number, item: ProbeImportSummary): number => sum + item.created,
    0,
  );
  const totalUpdated: number = summaries.reduce(
    (sum: number, item: ProbeImportSummary): number => sum + item.updated,
    0,
  );
  const totalProbes: number = totalCreated + totalUpdated;
  const prefix = dryRun ? '[import:dry-run]' : '[import]';

  summaries.forEach((summary: ProbeImportSummary): void => {
    console.log(
      `${prefix} ${path.basename(summary.filePath)}: ${summary.created} created, ${summary.updated} updated.`,
    );
  });
  console.log(
    `${prefix} Total: ${summaries.length} files, ${totalProbes} probes, ${totalCreated} created, ${totalUpdated} updated.`,
  );
}

async function main(): Promise<void> {
  const options: CliOptions = parseCliOptions();
  const filePaths: string[] = resolveJsonFiles(options.inputPaths);
  const batches: ProbeImportBatch[] = loadImportBatches(filePaths);

  try {
    await dataSource.initialize();
    const summaries: ProbeImportSummary[] = await importBatches({
      batches,
      dryRun: options.dryRun,
    });
    printSummary({ summaries, dryRun: options.dryRun });
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
