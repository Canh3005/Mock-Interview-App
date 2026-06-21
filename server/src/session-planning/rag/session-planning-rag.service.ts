import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { GeminiService } from '../../ai/gemini.service';
import type { BehaviorCalibrationProfile } from '../../documents/entities/behavior-calibration-profile.entity';
import type { CandidateClaim } from '../../documents/entities/candidate-claim.entity';
import type { RiskHypothesis } from '../../documents/entities/risk-hypothesis.entity';
import {
  QuestionProbeLanguage,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeStage,
} from '../../question-bank/constants/question-bank-taxonomy.constants';
import type { QuestionProbe } from '../../question-bank/entities/question-probe.entity';
import { ORDERED_STAGES } from '../constants/probe-selector.constants';
import { ProbeEmbeddingTextService } from './probe-embedding-text.service';
import type {
  SessionPlanningRagQuerySource,
  SessionPlanningRagSignal,
} from './session-planning-rag.types';

interface RagSearchRow {
  question_probe_id: string;
  similarity: string | number;
}

@Injectable()
export class SessionPlanningRagService implements OnModuleInit {
  private readonly logger = new Logger(SessionPlanningRagService.name);
  private storageReady = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiService,
    private readonly textService: ProbeEmbeddingTextService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await this.bootstrapStorage();
    } catch (error) {
      this.logger.warn(
        `Session planning RAG storage is not ready; falling back to heuristic selection. ${this._errorMessage(error)}`,
      );
    }
  }

  isEnabled(): boolean {
    const raw = this.configService.get<string>('SESSION_PLANNING_RAG_ENABLED');
    if (raw === undefined || raw === '') return true;
    return !['false', '0', 'off', 'no'].includes(raw.toLowerCase());
  }

  async bootstrapStorage(): Promise<void> {
    if (this.storageReady) return;

    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS question_probe_embeddings (
        id uuid PRIMARY KEY,
        question_probe_id uuid NOT NULL REFERENCES question_probes(id) ON DELETE CASCADE,
        question_probe_revision integer NOT NULL,
        language varchar(10) NOT NULL,
        content_hash varchar(64) NOT NULL,
        canonical_text text NOT NULL,
        embedding vector(768) NOT NULL,
        embedding_model varchar(80) NOT NULL,
        embedding_dimensions integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_question_probe_embeddings_current
      ON question_probe_embeddings (
        question_probe_id,
        question_probe_revision,
        language,
        content_hash,
        embedding_model,
        embedding_dimensions
      )
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_question_probe_embeddings_probe_id
      ON question_probe_embeddings (question_probe_id)
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_question_probe_embeddings_lookup
      ON question_probe_embeddings (language, embedding_model, embedding_dimensions)
    `);

    try {
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_question_probe_embeddings_hnsw
        ON question_probe_embeddings
        USING hnsw (embedding vector_cosine_ops)
      `);
    } catch (error) {
      this.logger.warn(
        `Could not create pgvector HNSW index; exact vector search will still work. ${this._errorMessage(error)}`,
      );
    }

    this.storageReady = true;
  }

  async indexProbes({
    probes,
    languages,
  }: {
    probes: QuestionProbe[];
    languages?: QuestionProbeLanguage[];
  }): Promise<{ indexed: number; skipped: number }> {
    if (probes.length === 0) return { indexed: 0, skipped: 0 };
    await this.bootstrapStorage();

    let indexed = 0;
    let skipped = 0;

    for (const probe of probes) {
      const targetLanguages =
        languages ?? this.textService.languagesForProbe(probe);
      for (const language of targetLanguages) {
        const content = this.textService.build({ probe, language });
        if (!content) {
          skipped += 1;
          continue;
        }

        const exists = await this._hasCurrentEmbedding({
          probe,
          language,
          contentHash: content.contentHash,
        });
        if (exists) {
          skipped += 1;
          continue;
        }

        const embedding = await this._embedDocument(content.canonicalText);
        await this._deleteStaleEmbeddings({
          probe,
          language,
          contentHash: content.contentHash,
        });
        await this._upsertEmbedding({
          probe,
          language,
          contentHash: content.contentHash,
          canonicalText: content.canonicalText,
          embedding,
        });
        indexed += 1;
      }
    }

    return { indexed, skipped };
  }

  async buildRagSignals({
    probes,
    profile,
    claims,
    risks,
    language,
    roleFamily,
    targetLevel,
  }: {
    probes: QuestionProbe[];
    profile: BehaviorCalibrationProfile;
    claims: CandidateClaim[];
    risks: RiskHypothesis[];
    language: QuestionProbeLanguage;
    roleFamily: QuestionProbeRoleFamily;
    targetLevel: QuestionProbeLevel;
  }): Promise<Map<string, SessionPlanningRagSignal>> {
    if (!this.isEnabled()) return new Map();

    try {
      await this.bootstrapStorage();
      if (this._isLazyIndexEnabled()) {
        await this.indexProbes({ probes, languages: [language] });
      }
    } catch (error) {
      this.logger.warn(
        `Session planning RAG setup failed; using heuristic selection only. ${this._errorMessage(error)}`,
      );
      return new Map();
    }

    const sources = this._buildQuerySources({ profile, claims, risks });
    if (sources.length === 0) return new Map();

    const signals = new Map<string, SessionPlanningRagSignal>();
    for (const source of sources) {
      try {
        const embedding = await this._embedQuery(source.text);
        for (const stage of ORDERED_STAGES) {
          const rows = await this._search({
            embedding,
            language,
            roleFamily,
            targetLevel,
            stage,
          });
          for (const row of rows) {
            this._mergeSignal({
              signals,
              probeId: row.question_probe_id,
              similarity: Number(row.similarity),
              source,
            });
          }
        }
      } catch (error) {
        this.logger.warn(
          `Skipping RAG query source "${source.label}". ${this._errorMessage(error)}`,
        );
      }
    }

    return signals;
  }

  private async _hasCurrentEmbedding({
    probe,
    language,
    contentHash,
  }: {
    probe: QuestionProbe;
    language: QuestionProbeLanguage;
    contentHash: string;
  }): Promise<boolean> {
    const rows = await this._queryRows(
      `
        SELECT 1
        FROM question_probe_embeddings
        WHERE question_probe_id = $1
          AND question_probe_revision = $2
          AND language = $3
          AND content_hash = $4
          AND embedding_model = $5
          AND embedding_dimensions = $6
        LIMIT 1
      `,
      [
        probe.id,
        probe.revision,
        language,
        contentHash,
        this._embeddingModel(),
        this._embeddingDimensions(),
      ],
    );
    return rows.length > 0;
  }

  private async _deleteStaleEmbeddings({
    probe,
    language,
    contentHash,
  }: {
    probe: QuestionProbe;
    language: QuestionProbeLanguage;
    contentHash: string;
  }): Promise<void> {
    await this.dataSource.query(
      `
        DELETE FROM question_probe_embeddings
        WHERE question_probe_id = $1
          AND language = $2
          AND embedding_model = $3
          AND embedding_dimensions = $4
          AND NOT (
            question_probe_revision = $5
            AND content_hash = $6
          )
      `,
      [
        probe.id,
        language,
        this._embeddingModel(),
        this._embeddingDimensions(),
        probe.revision,
        contentHash,
      ],
    );
  }

  private async _upsertEmbedding({
    probe,
    language,
    contentHash,
    canonicalText,
    embedding,
  }: {
    probe: QuestionProbe;
    language: QuestionProbeLanguage;
    contentHash: string;
    canonicalText: string;
    embedding: number[];
  }): Promise<void> {
    await this.dataSource.query(
      `
        INSERT INTO question_probe_embeddings (
          id,
          question_probe_id,
          question_probe_revision,
          language,
          content_hash,
          canonical_text,
          embedding,
          embedding_model,
          embedding_dimensions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9)
        ON CONFLICT (
          question_probe_id,
          question_probe_revision,
          language,
          content_hash,
          embedding_model,
          embedding_dimensions
        )
        DO UPDATE SET
          canonical_text = EXCLUDED.canonical_text,
          embedding = EXCLUDED.embedding,
          updated_at = now()
      `,
      [
        randomUUID(),
        probe.id,
        probe.revision,
        language,
        contentHash,
        canonicalText,
        this._formatVector(embedding),
        this._embeddingModel(),
        this._embeddingDimensions(),
      ],
    );
  }

  private async _search({
    embedding,
    language,
    roleFamily,
    targetLevel,
    stage,
  }: {
    embedding: number[];
    language: QuestionProbeLanguage;
    roleFamily: QuestionProbeRoleFamily;
    targetLevel: QuestionProbeLevel;
    stage: QuestionProbeStage;
  }): Promise<RagSearchRow[]> {
    return await this.dataSource.query(
      `
        SELECT
          e.question_probe_id,
          1 - (e.embedding <=> $1::vector) AS similarity
        FROM question_probe_embeddings e
        JOIN question_probes p ON p.id = e.question_probe_id
        WHERE p.status = 'active'
          AND e.language = $2
          AND e.embedding_model = $7
          AND e.embedding_dimensions = $8
          AND e.question_probe_revision = p.revision
          AND jsonb_exists(p."localizedContent", $2)
          AND $3 = ANY(p.stages)
          AND (array_length(p."roleFamilies", 1) IS NULL OR $4 = ANY(p."roleFamilies"))
          AND (array_length(p.levels, 1) IS NULL OR $5 = ANY(p.levels))
        ORDER BY e.embedding <=> $1::vector
        LIMIT $6
      `,
      [
        this._formatVector(embedding),
        language,
        stage,
        roleFamily,
        targetLevel,
        this._topK(),
        this._embeddingModel(),
        this._embeddingDimensions(),
      ],
    );
  }

  private async _embedDocument(text: string): Promise<number[]> {
    return this._embed({
      text,
      taskType: 'RETRIEVAL_DOCUMENT',
    });
  }

  private async _embedQuery(text: string): Promise<number[]> {
    return this._embed({
      text,
      taskType: 'RETRIEVAL_QUERY',
    });
  }

  private async _embed({
    text,
    taskType,
  }: {
    text: string;
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';
  }): Promise<number[]> {
    const dimensions = this._embeddingDimensions();
    const vector = await this.geminiService.embedContent({
      model: this._embeddingModel(),
      contents: text,
      config: {
        taskType,
        outputDimensionality: dimensions,
      },
    });
    if (vector.length !== dimensions) {
      throw new Error(
        `Embedding dimension mismatch: expected ${dimensions}, got ${vector.length}`,
      );
    }
    return this._normalizeVector(vector);
  }

  private _buildQuerySources({
    profile,
    claims,
    risks,
  }: {
    profile: BehaviorCalibrationProfile;
    claims: CandidateClaim[];
    risks: RiskHypothesis[];
  }): SessionPlanningRagQuerySource[] {
    const sources: SessionPlanningRagQuerySource[] = [
      {
        source: 'profile_focus',
        label: 'profile_focus',
        text: this._compactLines([
          `Target role: ${profile.targetRole}`,
          `Target level: ${profile.targetLevel}`,
          `Role family: ${profile.roleFamily}`,
          this._listLine('Priority competencies', profile.priorityCompetencies),
          this._listLine('CV tech stack', profile.cvTechStack),
          this._listLine('JD tech requirements', profile.jdTechRequirements),
          this._listLine('Calibration notes', profile.calibrationNotes),
        ]),
      },
    ];

    const claimText = this._claimQueryText(claims);
    if (claimText) {
      sources.push({
        source: 'claim_verification',
        label: 'claim_verification',
        text: claimText,
      });
    }

    const riskText = this._riskQueryText(risks);
    if (riskText) {
      sources.push({
        source: 'risk_rejection',
        label: 'risk_rejection',
        text: riskText,
      });
    }

    return sources.filter((source) => source.text.trim().length > 0);
  }

  private _claimQueryText(claims: CandidateClaim[]): string | null {
    if (claims.length === 0) return null;
    const priority: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const rows = [...claims]
      .sort(
        (a, b) =>
          (priority[b.verificationPriority] ?? 1) -
          (priority[a.verificationPriority] ?? 1),
      )
      .slice(0, 8)
      .map((claim, index) =>
        this._compactLines([
          `Claim ${index + 1}: ${claim.claimText}`,
          `Priority: ${claim.verificationPriority}`,
          this._listLine('Implied competencies', claim.impliedCompetencies),
          this._listLine('Tech context', claim.techContext),
          this._listLine('Risk tags', claim.riskTags),
          this._listLine('Suggested questions', claim.suggestedQuestions),
        ]),
      );
    return this._compactLines([
      'Find interview probes that verify these candidate claims with concrete evidence.',
      ...rows,
    ]);
  }

  private _riskQueryText(risks: RiskHypothesis[]): string | null {
    if (risks.length === 0) return null;
    const severity: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const rows = [...risks]
      .sort((a, b) => (severity[b.severity] ?? 1) - (severity[a.severity] ?? 1))
      .slice(0, 8)
      .map((risk, index) =>
        this._compactLines([
          `Risk ${index + 1}: ${risk.rationale}`,
          `Severity: ${risk.severity}`,
          this._listLine('Related competencies', risk.relatedCompetencies),
          this._listLine('Suggested probe focus', risk.suggestedProbeFocus),
          this._listLine(
            'Evidence needed to reject',
            risk.evidenceNeededToReject,
          ),
        ]),
      );
    return this._compactLines([
      'Find interview probes that can reject or confirm these hiring risk hypotheses.',
      ...rows,
    ]);
  }

  private _mergeSignal({
    signals,
    probeId,
    similarity,
    source,
  }: {
    signals: Map<string, SessionPlanningRagSignal>;
    probeId: string;
    similarity: number;
    source: SessionPlanningRagQuerySource;
  }): void {
    const normalizedSimilarity = this._clamp01(similarity);
    const current = signals.get(probeId);
    if (current && current.similarity >= normalizedSimilarity) return;
    signals.set(probeId, {
      similarity: normalizedSimilarity,
      source: source.source,
      queryLabel: source.label,
      reason: `Semantic match from ${source.label}`,
    });
  }

  private _embeddingModel(): string {
    return (
      this.configService.get<string>('RAG_EMBEDDING_MODEL') ??
      'gemini-embedding-001'
    );
  }

  private _embeddingDimensions(): number {
    const dimensions = Number(
      this.configService.get<string>('RAG_EMBEDDING_DIMENSIONS') ?? 768,
    );
    return dimensions === 768 ? dimensions : 768;
  }

  private _topK(): number {
    return Number(
      this.configService.get<string>('SESSION_PLANNING_RAG_TOP_K') ?? 20,
    );
  }

  private _isLazyIndexEnabled(): boolean {
    const raw = this.configService.get<string>(
      'SESSION_PLANNING_RAG_LAZY_INDEX_ENABLED',
    );
    if (raw === undefined || raw === '') return true;
    return !['false', '0', 'off', 'no'].includes(raw.toLowerCase());
  }

  private _normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );
    if (!Number.isFinite(magnitude) || magnitude === 0) {
      throw new Error('Cannot normalize empty embedding vector');
    }
    return vector.map((value) => value / magnitude);
  }

  private _formatVector(vector: number[]): string {
    return `[${vector.map((value) => Number(value).toFixed(8)).join(',')}]`;
  }

  private async _queryRows(
    sql: string,
    parameters?: unknown[],
  ): Promise<unknown[]> {
    const result: unknown = await this.dataSource.query(sql, parameters);
    if (!Array.isArray(result)) return [];
    return result as unknown[];
  }

  private _listLine(label: string, values: string[]): string | null {
    if (!values || values.length === 0) return null;
    return `${label}: ${values.join(', ')}`;
  }

  private _compactLines(lines: Array<string | null>): string {
    return lines.filter((line): line is string => Boolean(line)).join('\n');
  }

  private _clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), 1);
  }

  private _errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
