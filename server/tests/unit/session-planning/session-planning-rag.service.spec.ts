import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GeminiService } from '../../../src/ai/gemini.service';
import { BehaviorCalibrationProfile } from '../../../src/documents/entities/behavior-calibration-profile.entity';
import { CandidateClaim } from '../../../src/documents/entities/candidate-claim.entity';
import { RiskHypothesis } from '../../../src/documents/entities/risk-hypothesis.entity';
import { QuestionProbe } from '../../../src/question-bank/entities/question-probe.entity';
import { ProbeEmbeddingTextService } from '../../../src/session-planning/rag/probe-embedding-text.service';
import { SessionPlanningRagService } from '../../../src/session-planning/rag/session-planning-rag.service';

describe('SessionPlanningRagService', () => {
  it('searches pgvector with probe eligibility filters and keeps the best similarity', async () => {
    const query = jest.fn((sql: string): Promise<unknown[]> => {
      if (sql.includes('FROM question_probe_embeddings e')) {
        return Promise.resolve([
          {
            question_probe_id: 'probe-good',
            similarity: '0.82',
          },
        ]);
      }
      return Promise.resolve([]);
    });
    const dataSource = { query } as unknown as DataSource;
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          SESSION_PLANNING_RAG_ENABLED: 'true',
          SESSION_PLANNING_RAG_LAZY_INDEX_ENABLED: 'false',
          SESSION_PLANNING_RAG_TOP_K: '5',
          RAG_EMBEDDING_MODEL: 'gemini-embedding-001',
          RAG_EMBEDDING_DIMENSIONS: '768',
        };
        return values[key];
      }),
    } as unknown as ConfigService;
    const geminiService = {
      embedContent: jest.fn(() => Promise.resolve(_unitVector())),
    } as unknown as GeminiService;
    const service = new SessionPlanningRagService(
      dataSource,
      configService,
      geminiService,
      new ProbeEmbeddingTextService(),
    );

    const signals = await service.buildRagSignals({
      probes: [_createProbe()],
      profile: _createProfile(),
      claims: [_createClaim()],
      risks: [_createRisk()],
      language: 'en',
      roleFamily: 'backend',
      targetLevel: 'mid',
    });

    expect(signals.get('probe-good')).toMatchObject({
      similarity: 0.82,
      source: 'profile_focus',
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('jsonb_exists'),
      expect.arrayContaining([
        expect.any(String),
        'en',
        expect.any(String),
        'backend',
        'mid',
        5,
        'gemini-embedding-001',
        768,
      ]),
    );
  });
});

function _unitVector(): number[] {
  return Array.from({ length: 768 }, (_, index) => (index === 0 ? 1 : 0));
}

function _createProfile(): BehaviorCalibrationProfile {
  return {
    id: 'profile-1',
    userId: 'user-1',
    cvId: 'cv-1',
    jdAnalysisId: 'jd-1',
    status: 'ready',
    sourceCompleteness: {
      hasCv: true,
      hasJd: true,
      hasProfile: false,
      hasWeaknessHistory: false,
    },
    roleFamily: 'backend',
    targetRole: 'Backend Engineer',
    targetLevel: 'mid',
    profileLevel: 'mid',
    levelMismatch: false,
    levelExpectations: [],
    priorityCompetencies: ['technical_fundamentals'],
    competencyWeights: { technical_fundamentals: 1 },
    previousWeakCompetencies: [],
    evidenceStrictness: 'standard',
    calibrationNotes: ['Verify ownership.'],
    cvTechStack: ['nodejs'],
    jdTechRequirements: ['postgresql'],
    userFacingSummary: null,
    internalVersion: 'behavior-calibration-v1',
    claims: [],
    riskHypotheses: [],
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  };
}

function _createClaim(): CandidateClaim {
  return {
    id: 'claim-1',
    userId: 'user-1',
    calibrationProfileId: 'profile-1',
    calibrationProfile: _createProfile(),
    cvId: 'cv-1',
    jdAnalysisId: 'jd-1',
    sourceType: 'cv',
    sourceRef: { localId: 'exp-1', section: 'experience' },
    claimType: 'owned_feature',
    claimText: 'Built a NestJS payment API.',
    impliedCompetencies: ['technical_fundamentals'],
    verificationPriority: 'high',
    techContext: ['nestjs', 'postgresql'],
    riskTags: ['ownership'],
    suggestedQuestions: ['What did you own end to end?'],
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  };
}

function _createRisk(): RiskHypothesis {
  return {
    id: 'risk-1',
    userId: 'user-1',
    calibrationProfileId: 'profile-1',
    calibrationProfile: _createProfile(),
    candidateClaimId: 'claim-1',
    riskType: 'overstated_ownership',
    severity: 'high',
    rationale: 'Candidate may overstate implementation ownership.',
    relatedCompetencies: ['ownership'],
    suggestedProbeFocus: ['Ask for production debugging details.'],
    sourceRefs: null,
    probeSelectionHints: null,
    evidenceNeededToReject: ['Concrete metrics and trade-offs.'],
    source: 'cv',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  };
}

function _createProbe(): QuestionProbe {
  return {
    id: 'probe-good',
    code: 'backend-api-001',
    stages: ['stage_4_cv_deep_dive'],
    roleFamilies: ['backend'],
    levels: ['mid'],
    type: 'cv_claim_verification',
    conversationDepth: 'mid',
    competencies: ['technical_fundamentals'],
    techTags: ['nestjs', 'postgresql'],
    difficulty: 3,
    intent: 'Verify backend API ownership.',
    primaryQuestion: 'Tell me about your payment API.',
    expectedSignals: [],
    redFlags: [],
    scoringHints: [],
    followUps: [],
    localizedContent: {
      en: {
        title: 'Backend API ownership',
        displayQuestion: 'Tell me about your payment API.',
        displayIntent: 'Verify ownership.',
        guidance: [],
        commonMistakes: [],
        labels: {},
      },
    },
    sourceReferences: [],
    status: 'active',
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    reviewedBy: 'admin-1',
    revision: 1,
    lastTransitionReason: null,
    publishedAt: new Date('2026-05-10T00:00:00.000Z'),
    retiredAt: null,
    viewCount: 0,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-10T00:00:00.000Z'),
  };
}
