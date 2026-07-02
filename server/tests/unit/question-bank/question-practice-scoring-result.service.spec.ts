import { QuestionPracticeScoringResultService } from '../../../src/question-bank/services/scoring/question-practice-scoring-result.service';
import type {
  CatalogItem,
  LlmScoringExtraction,
} from '../../../src/question-bank/types/question-practice-scoring.types';

describe('QuestionPracticeScoringResultService', () => {
  let service: QuestionPracticeScoringResultService;

  beforeEach(() => {
    service = new QuestionPracticeScoringResultService();
  });

  function _extraction(
    overrides: Partial<LlmScoringExtraction> = {},
  ): LlmScoringExtraction {
    return {
      candidateIntent: 'answer',
      signals: [],
      redFlags: [],
      cvClaims: [],
      confidence: 'high',
      ...overrides,
    };
  }

  function _catalog(
    overrides: Partial<CatalogItem> & { key?: string } = {},
  ): CatalogItem {
    return {
      key: 'signal_1',
      label: 'Mentions specific metric',
      relatedTrigger: null,
      ...overrides,
    };
  }

  // ─── Legacy path (no requirements) ─────────────────────────────────────────

  describe('legacy path (signal without requirements)', () => {
    it('maps covered status when LLM returns covered with valid quote', () => {
      const answer = 'We reduced latency by 30ms';
      const extraction = _extraction({
        signals: [
          {
            key: 'signal_1',
            label: 'Metric',
            status: 'covered',
            evidenceQuotes: ['reduced latency by 30ms'],
            feedback: 'Good evidence',
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [_catalog()],
        redFlagCatalog: [],
        answerText: answer,
        language: 'en',
      });
      expect(result.signalResults[0].status).toBe('covered');
      expect(result.signalResults[0].evidenceQuotes).toHaveLength(1);
    });

    it('preserves model status when quotes fail normalization (B2b)', () => {
      const extraction = _extraction({
        signals: [
          {
            key: 'signal_1',
            label: 'Metric',
            status: 'unclear',
            evidenceQuotes: ['quote that does not literally exist'],
            feedback: 'Model said unclear',
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [_catalog()],
        redFlagCatalog: [],
        answerText: 'completely different text',
        language: 'en',
      });
      expect(result.signalResults[0].status).toBe('unclear');
      expect(result.signalResults[0].feedback).toBe('Model said unclear');
      expect(result.signalResults[0].evidenceQuotes).toHaveLength(0);
    });

    it('returns missing when model omits a signal entirely (B3)', () => {
      const extraction = _extraction({ signals: [] });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [_catalog()],
        redFlagCatalog: [],
        answerText: 'some answer',
        language: 'en',
      });
      expect(result.signalResults[0].status).toBe('missing');
    });

    it('preserves relatedTrigger from catalog', () => {
      const extraction = _extraction({
        signals: [
          {
            key: 'signal_1',
            label: 'Metric',
            status: 'missing',
            evidenceQuotes: [],
            feedback: '',
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [_catalog({ relatedTrigger: 'missing_metric' })],
        redFlagCatalog: [],
        answerText: 'answer',
        language: 'en',
      });
      expect(result.signalResults[0].relatedTrigger).toBe('missing_metric');
    });
  });

  // ─── Requirement path (S3) ─────────────────────────────────────────────────

  describe('requirement path (S3)', () => {
    const catalogWithReqs: CatalogItem = {
      key: 'signal_1',
      label: 'Shows index trade-off awareness',
      relatedTrigger: 'missing_tradeoff',
      requirements: [
        {
          key: 'read_benefit',
          description: 'Mentions read performance improvement',
        },
        { key: 'write_overhead', description: 'Mentions write overhead' },
      ],
    };

    it('covered when all requirements supported', () => {
      const answer = 'Indexes speed up reads but slow down writes';
      const extraction = _extraction({
        signals: [
          {
            key: 'signal_1',
            label: 'Shows index trade-off awareness',
            evidenceQuotes: [],
            feedback: '',
            status: 'missing' as const,
            requirementResults: [
              {
                key: 'read_benefit',
                supported: true,
                evidenceQuotes: ['speed up reads'],
                feedback: 'good',
              },
              {
                key: 'write_overhead',
                supported: true,
                evidenceQuotes: ['slow down writes'],
                feedback: 'good',
              },
            ],
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [catalogWithReqs],
        redFlagCatalog: [],
        answerText: answer,
        language: 'en',
      });
      expect(result.signalResults[0].status).toBe('covered');
      expect(result.signalResults[0].requirementResults).toHaveLength(2);
    });

    it('unclear when some requirements supported', () => {
      const answer = 'Indexes speed up reads significantly';
      const extraction = _extraction({
        signals: [
          {
            key: 'signal_1',
            label: 'Shows index trade-off awareness',
            status: 'missing' as const,
            evidenceQuotes: [],
            feedback: '',
            requirementResults: [
              {
                key: 'read_benefit',
                supported: true,
                evidenceQuotes: ['speed up reads'],
                feedback: '',
              },
              {
                key: 'write_overhead',
                supported: false,
                evidenceQuotes: [],
                feedback: 'not mentioned',
              },
            ],
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [catalogWithReqs],
        redFlagCatalog: [],
        answerText: answer,
        language: 'en',
      });
      expect(result.signalResults[0].status).toBe('unclear');
    });

    it('missing when no requirements supported', () => {
      const extraction = _extraction({
        signals: [
          {
            key: 'signal_1',
            label: 'Shows index trade-off awareness',
            status: 'missing' as const,
            evidenceQuotes: [],
            feedback: '',
            requirementResults: [
              {
                key: 'read_benefit',
                supported: false,
                evidenceQuotes: [],
                feedback: '',
              },
              {
                key: 'write_overhead',
                supported: false,
                evidenceQuotes: [],
                feedback: '',
              },
            ],
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [catalogWithReqs],
        redFlagCatalog: [],
        answerText: 'unrelated answer',
        language: 'en',
      });
      expect(result.signalResults[0].status).toBe('missing');
    });

    it('supported: true without valid quote is treated as not supported', () => {
      const extraction = _extraction({
        signals: [
          {
            key: 'signal_1',
            label: 'Shows index trade-off awareness',
            status: 'missing' as const,
            evidenceQuotes: [],
            feedback: '',
            requirementResults: [
              {
                key: 'read_benefit',
                supported: true,
                evidenceQuotes: ['this quote does not exist in answer'],
                feedback: 'claimed',
              },
              {
                key: 'write_overhead',
                supported: false,
                evidenceQuotes: [],
                feedback: '',
              },
            ],
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [catalogWithReqs],
        redFlagCatalog: [],
        answerText: 'indexes help with queries',
        language: 'en',
      });
      expect(result.signalResults[0].status).toBe('missing');
      expect(result.signalResults[0].requirementResults?.[0].supported).toBe(
        false,
      );
    });

    it('unknown requirement key is ignored (not in catalog)', () => {
      const extraction = _extraction({
        signals: [
          {
            key: 'signal_1',
            label: 'Shows index trade-off awareness',
            status: 'missing' as const,
            evidenceQuotes: [],
            feedback: '',
            requirementResults: [
              {
                key: 'unknown_key',
                supported: true,
                evidenceQuotes: ['some quote'],
                feedback: '',
              },
              {
                key: 'write_overhead',
                supported: true,
                evidenceQuotes: ['slow down writes'],
                feedback: '',
              },
            ],
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [catalogWithReqs],
        redFlagCatalog: [],
        answerText: 'slow down writes in all cases',
        language: 'en',
      });
      // Only 2 requirements from catalog (read_benefit + write_overhead); unknown_key ignored
      // read_benefit: not in extraction → unsupported; write_overhead: supported
      expect(result.signalResults[0].requirementResults).toHaveLength(2);
      expect(result.signalResults[0].status).toBe('unclear');
    });

    it('model omits requirementResults → all unsupported → missing', () => {
      const extraction = _extraction({
        signals: [
          {
            key: 'signal_1',
            label: 'Shows index trade-off awareness',
            status: 'missing' as const,
            evidenceQuotes: [],
            feedback: '',
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [catalogWithReqs],
        redFlagCatalog: [],
        answerText: 'some answer',
        language: 'en',
      });
      expect(result.signalResults[0].status).toBe('missing');
    });
  });

  // ─── cvClaim hardening (S4) ────────────────────────────────────────────────

  describe('cvClaim hardening (S4)', () => {
    const catalog = [{ key: 'cv_claim_1', claim: 'Led PostgreSQL migration' }];

    it('verified with valid quote stays verified', () => {
      const extraction = _extraction({
        cvClaims: [
          {
            key: 'cv_claim_1',
            claim: 'Led PostgreSQL migration',
            verification: 'verified',
            evidenceQuotes: ['led the PostgreSQL migration'],
            feedback: 'confirmed',
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [],
        redFlagCatalog: [],
        answerText: 'I led the PostgreSQL migration',
        language: 'en',
        cvClaimCatalog: catalog,
      });
      expect(result.cvClaimResults?.[0].verification).toBe('verified');
    });

    it('verified without valid quote downgrades to not_verified', () => {
      const extraction = _extraction({
        cvClaims: [
          {
            key: 'cv_claim_1',
            claim: 'Led PostgreSQL migration',
            verification: 'verified',
            evidenceQuotes: ['quote not in answer'],
            feedback: '',
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [],
        redFlagCatalog: [],
        answerText: 'unrelated text',
        language: 'en',
        cvClaimCatalog: catalog,
      });
      expect(result.cvClaimResults?.[0].verification).toBe('not_verified');
    });

    it('inflated_risk without valid quote downgrades to not_verified', () => {
      const extraction = _extraction({
        cvClaims: [
          {
            key: 'cv_claim_1',
            claim: 'Led PostgreSQL migration',
            verification: 'inflated_risk',
            evidenceQuotes: ['nonexistent quote'],
            feedback: '',
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [],
        redFlagCatalog: [],
        answerText: 'other text',
        language: 'en',
        cvClaimCatalog: catalog,
      });
      expect(result.cvClaimResults?.[0].verification).toBe('not_verified');
    });

    it('inflated_risk with valid quote stays inflated_risk', () => {
      const extraction = _extraction({
        cvClaims: [
          {
            key: 'cv_claim_1',
            claim: 'Led PostgreSQL migration',
            verification: 'inflated_risk',
            evidenceQuotes: ['led the migration alone'],
            feedback: '',
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [],
        redFlagCatalog: [],
        answerText: 'I led the migration alone actually',
        language: 'en',
        cvClaimCatalog: catalog,
      });
      expect(result.cvClaimResults?.[0].verification).toBe('inflated_risk');
    });

    it('unknown cv claim key is dropped when catalog provided', () => {
      const extraction = _extraction({
        cvClaims: [
          {
            key: 'unknown_claim',
            claim: 'Some other claim',
            verification: 'verified',
            evidenceQuotes: [],
            feedback: '',
          },
        ],
      });
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: [],
        redFlagCatalog: [],
        answerText: 'text',
        language: 'en',
        cvClaimCatalog: catalog,
      });
      expect(result.cvClaimResults).toHaveLength(0);
    });
  });

  // ─── _overallBand floor (B4) ───────────────────────────────────────────────

  describe('_overallBand insufficient_evidence floor (B4)', () => {
    it('returns insufficient_evidence when ratio < 0.2', () => {
      const extraction = _extraction({
        signals: Array.from({ length: 6 }, (_, i) => ({
          key: `signal_${i + 1}`,
          label: `Signal ${i + 1}`,
          status: 'missing' as const,
          evidenceQuotes: [],
          feedback: '',
        })),
      });
      const catalog: CatalogItem[] = Array.from({ length: 6 }, (_, i) => ({
        key: `signal_${i + 1}`,
        label: `Signal ${i + 1}`,
        relatedTrigger: null,
      }));
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: catalog,
        redFlagCatalog: [],
        answerText: 'barely any content here',
        language: 'en',
      });
      expect(result.overallBand).toBe('insufficient_evidence');
    });

    it('returns needs_work when ratio is between 0.2 and 0.55', () => {
      const signals = [
        {
          key: 'signal_1',
          label: 'S1',
          status: 'covered' as const,
          evidenceQuotes: ['answer'],
          feedback: '',
        },
        {
          key: 'signal_2',
          label: 'S2',
          status: 'missing' as const,
          evidenceQuotes: [],
          feedback: '',
        },
        {
          key: 'signal_3',
          label: 'S3',
          status: 'missing' as const,
          evidenceQuotes: [],
          feedback: '',
        },
        {
          key: 'signal_4',
          label: 'S4',
          status: 'missing' as const,
          evidenceQuotes: [],
          feedback: '',
        },
      ];
      const extraction = _extraction({ signals });
      const catalog: CatalogItem[] = signals.map((s) => ({
        key: s.key,
        label: s.label,
        relatedTrigger: null,
      }));
      const result = service.buildResultFromRaw({
        extraction,
        signalCatalog: catalog,
        redFlagCatalog: [],
        answerText: 'some actual answer content here',
        language: 'en',
      });
      // ratio = 2/8 = 0.25 → needs_work
      expect(result.overallBand).toBe('needs_work');
    });
  });
});
