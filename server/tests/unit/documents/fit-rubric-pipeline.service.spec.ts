import { FitAssessmentService } from '../../../src/documents/fit-assessment.service';
import { FitRubricPipelineService } from '../../../src/documents/fit-rubric-pipeline.service';
import type { DocumentsAiService } from '../../../src/documents/documents.ai.service';
import type { GeminiService } from '../../../src/ai/gemini.service';
import type {
  CvJson,
  JdJson,
} from '../../../src/documents/types/document-ai.types';

describe('FitRubricPipelineService', () => {
  const fitAssessmentService = new FitAssessmentService();

  function createService(
    overrides?: Partial<DocumentsAiService>,
    geminiOverrides?: Partial<GeminiService>,
  ) {
    const aiService = {
      evaluateFitSemanticSignals: jest.fn().mockResolvedValue({
        requirementSignals: [],
      }),
      ...overrides,
    } as unknown as DocumentsAiService;

    const geminiService = {
      embedContents: jest
        .fn()
        .mockRejectedValue(
          new Error('embedContents should not be called in this test'),
        ),
      ...geminiOverrides,
    } as unknown as GeminiService;

    return {
      service: new FitRubricPipelineService(aiService, geminiService),
      aiService,
      geminiService,
    };
  }

  it('keeps aliased required skills present in the CV from being marked missing', async () => {
    const { service } = createService();
    const cvJson: CvJson = {
      skills: ['TS', 'React.js'],
      experience: [],
    };
    const jdJson: JdJson = {
      role: 'Frontend Engineer',
      required_skills: ['TypeScript', 'React'],
      key_responsibilities: [],
    };

    const rubric = await service.assessFitRubric({
      cvJson,
      jdJson,
      requirements: fitAssessmentService.buildNormalizedJdRequirements(jdJson),
    });

    expect(
      rubric.requirementSignals.filter(
        (signal) =>
          signal.source === 'required_skill' && signal.status === 'missing',
      ),
    ).toHaveLength(0);
    expect(
      rubric.gaps.filter((gap) => gap.category === 'missing_required_skill'),
    ).toHaveLength(0);
  });

  it('scores role tech stack evidence stronger than global skill-list evidence', async () => {
    const { service } = createService();
    const cvJson: CvJson = {
      skills: ['React'],
      experience: [
        {
          company: 'Acme',
          title: 'Backend Engineer',
          responsibilities: [],
          techStack: ['PostgreSQL'],
        },
      ],
    };
    const jdJson: JdJson = {
      role: 'Fullstack Engineer',
      required_skills: ['React', 'PostgreSQL'],
      key_responsibilities: [],
    };

    const rubric = await service.assessFitRubric({
      cvJson,
      jdJson,
      requirements: fitAssessmentService.buildNormalizedJdRequirements(jdJson),
    });

    expect(rubric.requirementSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementId: 'required_skill:react',
          status: 'partial',
          evidenceStrength: 'weak',
        }),
        expect.objectContaining({
          requirementId: 'required_skill:postgresql',
          status: 'met',
          evidenceStrength: 'strong',
        }),
      ]),
    );
  });

  it('does not let semantic output downgrade a responsibility with skill evidence to missing', async () => {
    const cvJson: CvJson = {
      skills: ['React'],
      experience: [],
    };
    const jdJson: JdJson = {
      role: 'Frontend Engineer',
      required_skills: [],
      key_responsibilities: ['Develop web UI using React.js'],
    };
    const requirements =
      fitAssessmentService.buildNormalizedJdRequirements(jdJson);
    const { service } = createService({
      evaluateFitSemanticSignals: jest.fn().mockResolvedValue({
        requirementSignals: [
          {
            requirementId: 'responsibility:0',
            requirement: 'Develop web UI using React.js',
            source: 'responsibility',
            status: 'missing',
            evidenceStrength: 'none',
            cvEvidence: [],
            rationale: 'No evidence.',
          },
        ],
      }),
    });

    const rubric = await service.assessFitRubric({
      cvJson,
      jdJson,
      requirements,
    });

    expect(rubric.requirementSignals).toEqual([
      expect.objectContaining({
        requirementId: 'responsibility:0',
        status: 'partial',
        evidenceStrength: 'weak',
      }),
    ]);
  });

  it('falls back to deterministic rubric and summary when semantic generation fails', async () => {
    const cvJson: CvJson = {
      skills: ['TypeScript'],
      experience: [],
    };
    const jdJson: JdJson = {
      role: 'Backend Engineer',
      required_skills: ['TypeScript'],
      key_responsibilities: ['Own backend API design'],
    };
    const requirements =
      fitAssessmentService.buildNormalizedJdRequirements(jdJson);
    const { service } = createService({
      evaluateFitSemanticSignals: jest
        .fn()
        .mockRejectedValue(new Error('bad json')),
    });

    const rubric = await service.assessFitRubric({
      cvJson,
      jdJson,
      requirements,
    });

    expect(rubric.confidence).toBe('low');
    expect(rubric.requirementSignals).toHaveLength(requirements.length);
    expect(rubric.userSummary.headline).toContain('Mixed fit');
  });

  it('creates level mismatch gap and seniority risk from deterministic experience rules', async () => {
    const { service } = createService();
    const cvJson: CvJson = {
      skills: [],
      experience: [],
      totalYearsExperience: 2,
      seniority: 'junior',
    };
    const jdJson: JdJson = {
      role: 'Senior Engineer',
      required_skills: [],
      minimum_experience_years: 5,
      key_responsibilities: [],
      seniority: 'senior',
    };

    const rubric = await service.assessFitRubric({
      cvJson,
      jdJson,
      requirements: fitAssessmentService.buildNormalizedJdRequirements(jdJson),
    });

    expect(rubric.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'level_mismatch',
          relatedRequirement: '5+ years experience',
        }),
      ]),
    );
    expect(rubric.riskFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'seniority_mismatch',
        }),
      ]),
    );
  });

  it('finds responsibility evidence via embedding similarity when no keyword overlaps', async () => {
    const cvJson: CvJson = {
      skills: [],
      experience: [
        {
          company: 'Acme',
          title: 'Senior Engineer',
          responsibilities: [],
          achievements: [
            'Coached three junior developers on system design fundamentals',
            'Reduced AWS cloud cost by 18% through rightsizing',
          ],
        },
      ],
    };
    const jdJson: JdJson = {
      role: 'Engineering Lead',
      required_skills: [],
      key_responsibilities: ['Guide less experienced teammates'],
    };
    const requirements =
      fitAssessmentService.buildNormalizedJdRequirements(jdJson);

    const embedContents = jest
      .fn()
      .mockImplementation(
        ({
          contents,
          config,
        }: {
          contents: string[];
          config?: { taskType?: string };
        }) => {
          if (config?.taskType === 'RETRIEVAL_QUERY') {
            return Promise.resolve(contents.map(() => [1, 0]));
          }
          return Promise.resolve(
            contents.map((text) =>
              text.includes('Coached three junior developers')
                ? [1, 0]
                : [0, 1],
            ),
          );
        },
      );
    const { service } = createService({}, { embedContents });

    const rubric = await service.assessFitRubric({
      cvJson,
      jdJson,
      requirements,
    });

    expect(rubric.requirementSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementId: 'responsibility:0',
          status: 'partial',
          evidenceStrength: 'weak',
          cvEvidence: [
            expect.stringContaining('Coached three junior developers'),
          ],
        }),
      ]),
    );
  });

  it('falls back to keyword matching when embedding lookup fails for responsibilities', async () => {
    const cvJson: CvJson = {
      skills: [],
      experience: [
        {
          company: 'Acme',
          title: 'Senior Engineer',
          responsibilities: [],
          achievements: [
            'Coached three junior developers on system design fundamentals',
          ],
        },
      ],
    };
    const jdJson: JdJson = {
      role: 'Engineering Lead',
      required_skills: [],
      key_responsibilities: ['Guide less experienced teammates'],
    };
    const requirements =
      fitAssessmentService.buildNormalizedJdRequirements(jdJson);

    const embedContents = jest
      .fn()
      .mockRejectedValue(new Error('embedding service unavailable'));
    const { service } = createService({}, { embedContents });

    const rubric = await service.assessFitRubric({
      cvJson,
      jdJson,
      requirements,
    });

    expect(rubric.requirementSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementId: 'responsibility:0',
          status: 'missing',
        }),
      ]),
    );
  });

  it('keeps semantic evidence drawn from the full cvEvidencePool, not just per-requirement matches', async () => {
    const cvJson: CvJson = {
      skills: [],
      experience: [
        {
          company: 'Acme',
          title: 'Engineer',
          responsibilities: [],
          achievements: [
            'Optimized rendering performance for a dashboard with code-splitting and memoization',
          ],
        },
      ],
    };
    const jdJson: JdJson = {
      role: 'Frontend Engineer',
      required_skills: [],
      key_responsibilities: [
        'Research and propose UI improvements to raise rendering performance',
      ],
    };
    const requirements =
      fitAssessmentService.buildNormalizedJdRequirements(jdJson);

    const embedContents = jest
      .fn()
      .mockRejectedValue(new Error('embedding service unavailable'));
    const evaluateFitSemanticSignals = jest.fn().mockResolvedValue({
      requirementSignals: [
        {
          requirementId: 'responsibility:0',
          requirement: requirements[0].text,
          source: 'responsibility',
          status: 'met',
          evidenceStrength: 'strong',
          cvEvidence: [
            'Engineer at Acme: Optimized rendering performance for a dashboard with code-splitting and memoization',
          ],
          rationale: 'Found in cvEvidencePool.',
        },
      ],
    });
    const { service } = createService(
      { evaluateFitSemanticSignals },
      { embedContents },
    );

    const rubric = await service.assessFitRubric({
      cvJson,
      jdJson,
      requirements,
    });

    expect(rubric.requirementSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementId: 'responsibility:0',
          status: 'met',
          cvEvidence: [
            'Engineer at Acme: Optimized rendering performance for a dashboard with code-splitting and memoization',
          ],
        }),
      ]),
    );
  });
});
