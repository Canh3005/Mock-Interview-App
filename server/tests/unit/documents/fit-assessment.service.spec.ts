import { FitAssessmentService } from '../../../src/documents/fit-assessment.service';
import { CvJson, JdJson } from '../../../src/documents/documents.ai.service';
import { FitRubricEvaluation } from '../../../src/documents/types/fit-assessment.types';

describe('FitAssessmentService', () => {
  const service = new FitAssessmentService();

  const cvJson: CvJson = {
    skills: {
      languages: ['TypeScript'],
      frameworks: ['React'],
      tools: ['GraphQL'],
    },
    experiences: [
      {
        company: 'Acme',
        role: 'Frontend Engineer',
        duration: '2021 - 2024',
        responsibilities: ['Built React dashboards'],
      },
    ],
    education: [],
  };

  const jdJson: JdJson = {
    role: 'Senior Frontend Engineer',
    required_skills: ['React', 'TS'],
    nice_to_have_skills: ['Kafka'],
    minimum_experience_years: 5,
    key_responsibilities: ['Own end-to-end frontend features'],
    domain: 'B2B SaaS',
    seniority: 'senior',
  };

  it('normalizes JD requirements from skill, responsibility, experience and domain sources', () => {
    const requirements = service.buildNormalizedJdRequirements(jdJson);

    expect(requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'required_skill:react',
          source: 'required_skill',
          priority: 'must_have',
        }),
        expect.objectContaining({
          id: 'required_skill:typescript',
          text: 'TypeScript',
          source: 'required_skill',
        }),
        expect.objectContaining({
          id: 'nice_to_have_skill:kafka',
          source: 'nice_to_have_skill',
        }),
        expect.objectContaining({
          id: 'responsibility:0',
          source: 'responsibility',
        }),
        expect.objectContaining({
          id: 'experience:min_years',
          source: 'experience',
        }),
        expect.objectContaining({
          id: 'domain:b2bsaas',
          source: 'domain',
        }),
      ]),
    );
  });

  it('computes final score deterministically and clamps it to 0-100', () => {
    const rubric: FitRubricEvaluation = {
      confidence: 'medium',
      requirementSignals: [
        {
          requirementId: 'required_skill:react',
          requirement: 'React',
          source: 'required_skill',
          status: 'missing',
          evidenceStrength: 'none',
          cvEvidence: [],
          rationale: 'No evidence.',
        },
      ],
      gaps: [
        {
          category: 'missing_required_skill',
          label: 'React',
          severity: 'high',
          relatedRequirement: 'React',
          explanation: 'Missing required skill.',
        },
      ],
      riskFlags: Array.from({ length: 10 }, () => ({
        code: 'missing_core_stack',
        severity: 'high',
        explanation: 'Core stack is missing.',
      })),
      userSummary: {
        headline: 'Low fit',
        strengths: [],
        gapsToImprove: ['React'],
        transferableNotes: [],
      },
    };

    const assessment = service.buildFitAssessment({
      cvJson,
      jdJson,
      rubric,
      model: 'test-model',
    });

    expect(assessment.scoreBreakdown.riskPenalty).toBe(30);
    expect(assessment.finalScore).toBeGreaterThanOrEqual(0);
    expect(assessment.finalScore).toBeLessThanOrEqual(100);
    expect(assessment.scoringVersion).toBe('fit-assessment-v2.0.0');
  });

  it('derives legacy match report from V2 gaps only', () => {
    const assessment = service.buildFitAssessment({
      cvJson,
      jdJson,
      model: 'test-model',
      rubric: {
        confidence: 'high',
        requirementSignals: [],
        gaps: [
          {
            category: 'missing_required_skill',
            label: 'Kafka',
            severity: 'high',
            relatedRequirement: 'Kafka',
            explanation: 'No Kafka evidence.',
            practiceSuggestion: 'Prepare adjacent event-streaming examples.',
          },
          {
            category: 'weak_evidence',
            label: 'Ownership',
            severity: 'medium',
            relatedRequirement: 'Own features',
            explanation: 'Ownership evidence is weak.',
          },
        ],
        riskFlags: [],
        userSummary: {
          headline: 'Mixed fit',
          strengths: ['React'],
          gapsToImprove: ['Kafka'],
          transferableNotes: [],
        },
      },
    });

    expect(service.buildLegacyMatchReport(assessment)).toEqual({
      missing_skills: ['Kafka'],
      suggestions: [
        'Prepare adjacent event-streaming examples.',
        'Ownership evidence is weak.',
      ],
    });
  });
});
