import { QUESTION_PROBE_SEEDS } from '../../../src/question-bank/seeds/question-probe.seed';
import { QuestionProbeValidationService } from '../../../src/question-bank/services/curation/question-probe-validation.service';

describe('QUESTION_PROBE_SEEDS', () => {
  const validationService = new QuestionProbeValidationService();

  it('contains the v0 coverage target', () => {
    expect(QUESTION_PROBE_SEEDS).toHaveLength(84);
  });

  it('uses unique stable codes', () => {
    const codes = QUESTION_PROBE_SEEDS.map((seed) => seed.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it('passes the publish quality gate for every seed probe', () => {
    const invalid = QUESTION_PROBE_SEEDS.flatMap((seed) => {
      const result = validationService.validate(seed);
      if (result.valid) return [];
      return [{ code: seed.code, issues: result.issues }];
    });

    expect(invalid).toEqual([]);
  });

  it('contains distinct localized public content for en, vi, and ja', () => {
    QUESTION_PROBE_SEEDS.forEach((seed) => {
      const en = seed.localizedContent.en;
      const vi = seed.localizedContent.vi;
      const ja = seed.localizedContent.ja;

      expect(en).toBeDefined();
      expect(vi).toBeDefined();
      expect(ja).toBeDefined();
      expect(vi?.title).not.toBe(en?.title);
      expect(vi?.displayQuestion).not.toBe(en?.displayQuestion);
      expect(vi?.displayIntent).not.toBe(en?.displayIntent);
      expect(ja?.title).not.toBe(en?.title);
      expect(ja?.displayQuestion).not.toBe(en?.displayQuestion);
      expect(ja?.displayIntent).not.toBe(en?.displayIntent);
    });
  });

  it('covers each role family and probe type', () => {
    const roleFamilies = new Set(
      QUESTION_PROBE_SEEDS.flatMap((seed) => seed.roleFamilies),
    );
    const types = new Set(QUESTION_PROBE_SEEDS.map((seed) => seed.type));

    expect(roleFamilies).toEqual(
      new Set([
        'backend',
        'frontend',
        'fullstack',
        'devops',
        'data',
        'qa',
        'security',
      ]),
    );
    expect(types).toEqual(
      new Set([
        'behavioral',
        'technical_depth',
        'trade_off',
        'debugging',
        'cv_claim_verification',
        'situational',
      ]),
    );
  });
});
