import { DocumentsAiService } from '../../../src/documents/documents.ai.service';
import type { GroqService } from '../../../src/ai/groq.service';

describe('DocumentsAiService', () => {
  function createService(response: string) {
    const generateJsonContent = jest.fn().mockResolvedValue(response);
    const groq = { generateJsonContent } as unknown as GroqService;

    return {
      service: new DocumentsAiService(groq),
      generateJsonContent,
    };
  }

  it('uses temperature 0 for semantic fit signal evaluation', async () => {
    const { service, generateJsonContent } = createService(
      '{"requirementSignals":[]}',
    );

    await service.evaluateFitSemanticSignals({
      cvFacts: {
        domains: [],
      },
      jdFacts: {
        role: 'Engineer',
      },
      requirements: [],
      cvEvidencePool: [],
    });

    expect(generateJsonContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ temperature: 0 }) as unknown as {
          temperature: number;
        },
      }),
    );
  });
});
