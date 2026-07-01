import * as fs from 'fs';
import * as path from 'path';
import {
  QUESTION_PROBE_FOLLOW_UP_TRIGGERS,
  type QuestionProbeFollowUpTrigger,
} from '../question-bank/constants/question-bank-taxonomy.constants';

type UnknownRecord = Record<string, unknown>;
type IssueSeverity = 'error' | 'warning';

interface CliOptions {
  strict: boolean;
  json: boolean;
  maxIssues: number;
  inputPaths: string[];
}

interface AuditIssue {
  file: string;
  probeCode: string;
  probeIndex: number;
  field: string;
  code: string;
  severity: IssueSeverity;
  message: string;
}

interface AuditStats {
  fileCount: number;
  skippedFileCount: number;
  probeCount: number;
  signalCount: number;
  requirementCount: number;
  followUpCount: number;
  nullRelatedTriggerCount: number;
  missingRequirementCount: number;
  missingFollowUpCount: number;
  duplicateFollowUpTriggerCount: number;
  errorCount: number;
  warningCount: number;
  issueCount: number;
}

interface FileAudit {
  file: string;
  skipped: boolean;
  stats: AuditStats;
  issues: AuditIssue[];
}

interface AuditReport {
  mode: 'report' | 'strict';
  files: FileAudit[];
  totals: AuditStats;
  issues: AuditIssue[];
}

interface IssueSource {
  file: string;
  probeCode: string;
  probeIndex: number;
}

const DATA_DIR = path.resolve(__dirname, '../../data');
const REQUIREMENT_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const VALID_FOLLOW_UP_TRIGGERS = new Set<string>(
  QUESTION_PROBE_FOLLOW_UP_TRIGGERS,
);

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    strict: false,
    json: false,
    maxIssues: 40,
    inputPaths: [],
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--max-issues') {
      const next = argv[index + 1];
      if (!next) throw new Error('--max-issues requires a number');
      options.maxIssues = parsePositiveInteger(next, '--max-issues');
      index += 1;
      continue;
    }
    if (arg.startsWith('--max-issues=')) {
      options.maxIssues = parsePositiveInteger(
        arg.slice('--max-issues='.length),
        '--max-issues',
      );
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    options.inputPaths.push(arg);
  }

  return options;
}

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function printUsage(): void {
  console.log(`
Usage:
  npm run audit:probe-enrichment
  npm run audit:probe-enrichment -- --strict
  npm run audit:probe-enrichment -- --json
  npm run audit:probe-enrichment -- data/postgresql-probe-seeds.json

Options:
  --strict          Exit with code 1 when any enrichment issue exists.
  --json            Print the full machine-readable report.
  --max-issues N    Limit text issue output. Default: 40.
`);
}

function resolveInputFiles(inputPaths: string[]): string[] {
  const targets = inputPaths.length > 0 ? inputPaths : [DATA_DIR];
  const files: string[] = [];

  targets.forEach((target: string): void => {
    const resolved = path.isAbsolute(target)
      ? target
      : path.resolve(process.cwd(), target);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Input path does not exist: ${resolved}`);
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      fs.readdirSync(resolved)
        .filter((name: string): boolean => name.endsWith('.json'))
        .sort((left: string, right: string): number =>
          left.localeCompare(right),
        )
        .forEach((name: string): void => {
          files.push(path.join(resolved, name));
        });
      return;
    }
    if (stat.isFile() && resolved.endsWith('.json')) {
      files.push(resolved);
      return;
    }
    throw new Error(`Input path must be a JSON file or directory: ${resolved}`);
  });

  return Array.from(new Set(files)).sort(
    (left: string, right: string): number => left.localeCompare(right),
  );
}

function auditFiles(filePaths: string[], strict: boolean): AuditReport {
  const files = filePaths.map(auditFile);
  const totals = files.reduce(
    (acc: AuditStats, file: FileAudit): AuditStats =>
      mergeStats(acc, file.stats),
    emptyStats(),
  );
  const issues = files.flatMap((file: FileAudit): AuditIssue[] => file.issues);

  return {
    mode: strict ? 'strict' : 'report',
    files,
    totals,
    issues,
  };
}

function auditFile(filePath: string): FileAudit {
  const file = displayPath(filePath);
  const stats = emptyStats();
  const issues: AuditIssue[] = [];

  stats.fileCount = 1;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch (err: unknown) {
    addIssue({
      issues,
      stats,
      source: { file, probeCode: '<file>', probeIndex: -1 },
      field: 'root',
      code: 'invalid_json',
      message: err instanceof Error ? err.message : 'Invalid JSON',
    });
    return { file, skipped: false, stats, issues };
  }

  if (!isProbeSeedArray(parsed)) {
    stats.skippedFileCount = 1;
    return { file, skipped: true, stats, issues };
  }

  stats.probeCount = parsed.length;
  parsed.forEach((probe: UnknownRecord, probeIndex: number): void => {
    auditProbe({ file, probe, probeIndex, issues, stats });
  });

  return { file, skipped: false, stats, issues };
}

function isProbeSeedArray(value: unknown): value is UnknownRecord[] {
  return (
    Array.isArray(value) &&
    value.some(
      (item: unknown): boolean =>
        isRecord(item) &&
        Array.isArray(item.expectedSignals) &&
        Array.isArray(item.followUps),
    )
  );
}

function auditProbe({
  file,
  probe,
  probeIndex,
  issues,
  stats,
}: {
  file: string;
  probe: UnknownRecord;
  probeIndex: number;
  issues: AuditIssue[];
  stats: AuditStats;
}): void {
  const source: IssueSource = {
    file,
    probeCode: typeof probe.code === 'string' ? probe.code : `#${probeIndex}`,
    probeIndex,
  };
  const followUpTriggers = auditFollowUps({ probe, source, issues, stats });
  auditExpectedSignals({ probe, source, followUpTriggers, issues, stats });
}

function auditFollowUps({
  probe,
  source,
  issues,
  stats,
}: {
  probe: UnknownRecord;
  source: IssueSource;
  issues: AuditIssue[];
  stats: AuditStats;
}): Set<QuestionProbeFollowUpTrigger> {
  const triggers = new Set<QuestionProbeFollowUpTrigger>();
  const seen = new Set<QuestionProbeFollowUpTrigger>();

  if (!Array.isArray(probe.followUps) || probe.followUps.length === 0) {
    addIssue({
      issues,
      stats,
      source,
      field: 'followUps',
      code: 'missing_follow_ups',
      message: 'followUps must be a non-empty array',
    });
    return triggers;
  }

  stats.followUpCount += probe.followUps.length;

  probe.followUps.forEach((item: unknown, index: number): void => {
    const field = `followUps.${index}`;
    if (!isRecord(item)) {
      addIssue({
        issues,
        stats,
        source,
        field,
        code: 'invalid_follow_up',
        message: 'followUp must be an object',
      });
      return;
    }

    if (!isValidFollowUpTrigger(item.trigger)) {
      addIssue({
        issues,
        stats,
        source,
        field: `${field}.trigger`,
        code: 'invalid_follow_up_trigger',
        message: 'followUp trigger must be a valid taxonomy value',
      });
    } else {
      triggers.add(item.trigger);
      if (seen.has(item.trigger)) {
        stats.duplicateFollowUpTriggerCount += 1;
        addIssue({
          issues,
          stats,
          source,
          field: `${field}.trigger`,
          code: 'duplicate_follow_up_trigger',
          message: `Duplicate followUp trigger "${item.trigger}" in the same probe`,
          severity: 'warning',
        });
      }
      seen.add(item.trigger);
    }

    validateNonEmptyText({
      value: item.question,
      field: `${field}.question`,
      code: 'missing_follow_up_question',
      message: 'followUp question must be a non-empty string',
      source,
      issues,
      stats,
    });
    validateNonEmptyText({
      value: item.purpose,
      field: `${field}.purpose`,
      code: 'missing_follow_up_purpose',
      message: 'followUp purpose must be a non-empty string',
      source,
      issues,
      stats,
    });
  });

  return triggers;
}

function auditExpectedSignals({
  probe,
  source,
  followUpTriggers,
  issues,
  stats,
}: {
  probe: UnknownRecord;
  source: IssueSource;
  followUpTriggers: Set<QuestionProbeFollowUpTrigger>;
  issues: AuditIssue[];
  stats: AuditStats;
}): void {
  if (
    !Array.isArray(probe.expectedSignals) ||
    probe.expectedSignals.length === 0
  ) {
    addIssue({
      issues,
      stats,
      source,
      field: 'expectedSignals',
      code: 'missing_expected_signals',
      message: 'expectedSignals must be a non-empty array',
    });
    return;
  }

  stats.signalCount += probe.expectedSignals.length;
  const usedTriggers = new Set<QuestionProbeFollowUpTrigger>();

  probe.expectedSignals.forEach((item: unknown, index: number): void => {
    const field = `expectedSignals.${index}`;
    if (!isRecord(item)) {
      addIssue({
        issues,
        stats,
        source,
        field,
        code: 'invalid_expected_signal',
        message: 'expectedSignal must be an object',
      });
      return;
    }

    validateNonEmptyText({
      value: item.label,
      field: `${field}.label`,
      code: 'missing_signal_label',
      message: 'expectedSignal label must be a non-empty string',
      source,
      issues,
      stats,
    });

    if (!isValidFollowUpTrigger(item.relatedTrigger)) {
      stats.nullRelatedTriggerCount +=
        item.relatedTrigger === null || item.relatedTrigger === undefined
          ? 1
          : 0;
      addIssue({
        issues,
        stats,
        source,
        field: `${field}.relatedTrigger`,
        code:
          item.relatedTrigger === null || item.relatedTrigger === undefined
            ? 'missing_related_trigger'
            : 'invalid_related_trigger',
        message:
          item.relatedTrigger === null || item.relatedTrigger === undefined
            ? 'relatedTrigger is required for enriched expectedSignals'
            : 'relatedTrigger must be a valid follow-up trigger',
      });
    } else {
      usedTriggers.add(item.relatedTrigger);
    }

    auditRequirements({ signal: item, field, source, issues, stats });
  });

  usedTriggers.forEach((trigger: QuestionProbeFollowUpTrigger): void => {
    if (followUpTriggers.has(trigger)) return;
    stats.missingFollowUpCount += 1;
    addIssue({
      issues,
      stats,
      source,
      field: 'followUps',
      code: 'missing_follow_up_for_related_trigger',
      message: `Missing followUp for relatedTrigger "${trigger}"`,
    });
  });
}

function auditRequirements({
  signal,
  field,
  source,
  issues,
  stats,
}: {
  signal: UnknownRecord;
  field: string;
  source: IssueSource;
  issues: AuditIssue[];
  stats: AuditStats;
}): void {
  if (!Array.isArray(signal.requirements) || signal.requirements.length === 0) {
    stats.missingRequirementCount += 1;
    addIssue({
      issues,
      stats,
      source,
      field: `${field}.requirements`,
      code: 'missing_signal_requirements',
      message: 'requirements must be a non-empty array',
    });
    return;
  }

  stats.requirementCount += signal.requirements.length;
  if (signal.requirements.length < 2 || signal.requirements.length > 4) {
    addIssue({
      issues,
      stats,
      source,
      field: `${field}.requirements`,
      code: 'requirement_count_outside_recommended_range',
      message: 'requirements should contain 2-4 items for scoring quality',
      severity: 'warning',
    });
  }

  const seenKeys = new Set<string>();
  signal.requirements.forEach((requirement: unknown, index: number): void => {
    const reqField = `${field}.requirements.${index}`;
    if (!isRecord(requirement)) {
      addIssue({
        issues,
        stats,
        source,
        field: reqField,
        code: 'invalid_requirement',
        message: 'requirement must be an object',
      });
      return;
    }

    if (typeof requirement.key !== 'string' || requirement.key.trim() === '') {
      addIssue({
        issues,
        stats,
        source,
        field: `${reqField}.key`,
        code: 'missing_requirement_key',
        message: 'requirement key must be a non-empty string',
      });
    } else {
      const key = requirement.key.trim();
      if (!REQUIREMENT_KEY_PATTERN.test(key)) {
        addIssue({
          issues,
          stats,
          source,
          field: `${reqField}.key`,
          code: 'invalid_requirement_key',
          message:
            'requirement key must be stable ASCII snake_case, e.g. mentions_tradeoff',
        });
      }
      if (seenKeys.has(key)) {
        addIssue({
          issues,
          stats,
          source,
          field: `${reqField}.key`,
          code: 'duplicate_requirement_key',
          message: `Duplicate requirement key "${key}" within the same signal`,
        });
      }
      seenKeys.add(key);
    }

    validateNonEmptyText({
      value: requirement.description,
      field: `${reqField}.description`,
      code: 'missing_requirement_description',
      message: 'requirement description must be a non-empty string',
      source,
      issues,
      stats,
    });
  });
}

function validateNonEmptyText({
  value,
  field,
  code,
  message,
  source,
  issues,
  stats,
}: {
  value: unknown;
  field: string;
  code: string;
  message: string;
  source: IssueSource;
  issues: AuditIssue[];
  stats: AuditStats;
}): void {
  if (typeof value === 'string' && value.trim().length > 0) return;
  addIssue({ issues, stats, source, field, code, message });
}

function addIssue({
  issues,
  stats,
  source,
  field,
  code,
  message,
  severity = 'error',
}: {
  issues: AuditIssue[];
  stats: AuditStats;
  source: IssueSource;
  field: string;
  code: string;
  message: string;
  severity?: IssueSeverity;
}): void {
  issues.push({
    file: source.file,
    probeCode: source.probeCode,
    probeIndex: source.probeIndex,
    field,
    code,
    severity,
    message,
  });
  if (severity === 'error') stats.errorCount += 1;
  else stats.warningCount += 1;
  stats.issueCount += 1;
}

function isValidFollowUpTrigger(
  value: unknown,
): value is QuestionProbeFollowUpTrigger {
  return typeof value === 'string' && VALID_FOLLOW_UP_TRIGGERS.has(value);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function emptyStats(): AuditStats {
  return {
    fileCount: 0,
    skippedFileCount: 0,
    probeCount: 0,
    signalCount: 0,
    requirementCount: 0,
    followUpCount: 0,
    nullRelatedTriggerCount: 0,
    missingRequirementCount: 0,
    missingFollowUpCount: 0,
    duplicateFollowUpTriggerCount: 0,
    errorCount: 0,
    warningCount: 0,
    issueCount: 0,
  };
}

function mergeStats(left: AuditStats, right: AuditStats): AuditStats {
  return {
    fileCount: left.fileCount + right.fileCount,
    skippedFileCount: left.skippedFileCount + right.skippedFileCount,
    probeCount: left.probeCount + right.probeCount,
    signalCount: left.signalCount + right.signalCount,
    requirementCount: left.requirementCount + right.requirementCount,
    followUpCount: left.followUpCount + right.followUpCount,
    nullRelatedTriggerCount:
      left.nullRelatedTriggerCount + right.nullRelatedTriggerCount,
    missingRequirementCount:
      left.missingRequirementCount + right.missingRequirementCount,
    missingFollowUpCount:
      left.missingFollowUpCount + right.missingFollowUpCount,
    duplicateFollowUpTriggerCount:
      left.duplicateFollowUpTriggerCount + right.duplicateFollowUpTriggerCount,
    errorCount: left.errorCount + right.errorCount,
    warningCount: left.warningCount + right.warningCount,
    issueCount: left.issueCount + right.issueCount,
  };
}

function printTextReport(report: AuditReport, maxIssues: number): void {
  console.log(
    `[probe-enrichment] mode=${report.mode} files=${report.totals.fileCount} skipped=${report.totals.skippedFileCount}`,
  );
  printFileTable(
    report.files.filter((file: FileAudit): boolean => !file.skipped),
  );

  console.log('');
  console.log(
    [
      `Totals: probes=${report.totals.probeCount}`,
      `signals=${report.totals.signalCount}`,
      `requirements=${report.totals.requirementCount}`,
      `followUps=${report.totals.followUpCount}`,
      `errors=${report.totals.errorCount}`,
      `warnings=${report.totals.warningCount}`,
    ].join('  '),
  );
  console.log(
    [
      `Missing requirements=${report.totals.missingRequirementCount}`,
      `null relatedTrigger=${report.totals.nullRelatedTriggerCount}`,
      `missing followUp coverage=${report.totals.missingFollowUpCount}`,
      `duplicate followUp trigger=${report.totals.duplicateFollowUpTriggerCount}`,
    ].join('  '),
  );

  if (report.issues.length === 0) {
    console.log('No enrichment issues found.');
    return;
  }

  const visibleIssues = report.issues.slice(0, maxIssues);
  console.log('');
  console.log(
    `Issues (${visibleIssues.length}/${report.issues.length} shown):`,
  );
  visibleIssues.forEach((issue: AuditIssue): void => {
    console.log(
      `- [${issue.severity}] ${issue.file} ${issue.probeCode} ${issue.field}: ${issue.message}`,
    );
  });
  if (report.issues.length > visibleIssues.length) {
    console.log(
      `... ${report.issues.length - visibleIssues.length} more issues.`,
    );
    console.log('Use --json for the full machine-readable issue list.');
  }
  if (report.mode === 'report') {
    console.log('Report mode exits 0. Add --strict to fail when issues exist.');
  }
}

function printFileTable(files: FileAudit[]): void {
  const rows = files.map((file: FileAudit): string[] => [
    file.file,
    String(file.stats.probeCount),
    String(file.stats.signalCount),
    String(file.stats.requirementCount),
    String(file.stats.followUpCount),
    String(file.stats.missingRequirementCount),
    String(file.stats.nullRelatedTriggerCount),
    String(file.stats.missingFollowUpCount),
    String(file.stats.duplicateFollowUpTriggerCount),
    String(file.stats.issueCount),
  ]);
  const header = [
    'File',
    'Probes',
    'Signals',
    'Reqs',
    'FUs',
    'NoReq',
    'NullTrig',
    'NoFU',
    'DupFU',
    'Issues',
  ];
  const widths = header.map((label: string, index: number): number =>
    Math.max(
      label.length,
      ...rows.map((row: string[]): number => row[index].length),
    ),
  );

  console.log(formatRow(header, widths));
  console.log(
    formatRow(
      widths.map((width: number): string => '-'.repeat(width)),
      widths,
    ),
  );
  rows.forEach((row: string[]): void => console.log(formatRow(row, widths)));
}

function formatRow(row: string[], widths: number[]): string {
  return row
    .map((value: string, index: number): string =>
      index === 0 ? value.padEnd(widths[index]) : value.padStart(widths[index]),
    )
    .join('  ');
}

function displayPath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
}

function main(): void {
  const options = parseCliOptions(process.argv);
  const files = resolveInputFiles(options.inputPaths);
  const report = auditFiles(files, options.strict);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report, options.maxIssues);
  }

  if (options.strict && report.totals.issueCount > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (err: unknown) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
