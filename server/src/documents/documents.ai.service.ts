import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import { DocumentUploadType } from './enums/document-upload-type.enum.js';
import type {
  FitRubricEvaluation,
  NormalizedJdRequirement,
} from './types/fit-assessment.types';
import {
  DOCUMENT_FIT_ASSESSMENT_MODEL,
  DOCUMENT_VALIDATION_MODEL,
} from './constants/document-ai.constants';
import {
  CV_SYSTEM_INSTRUCTION,
  FIT_SEMANTIC_SIGNALS_SYSTEM_INSTRUCTION,
  FIT_RUBRIC_SYSTEM_INSTRUCTION,
  JD_SYSTEM_INSTRUCTION,
  VALIDATION_SYSTEM_INSTRUCTION,
} from './prompts/document-ai.prompts';
import type {
  FitSemanticEvaluationInput,
  FitSemanticEvaluationResult,
} from './types/fit-rubric-pipeline.types';
import type {
  CvJson,
  DocumentValidationResult,
  IAiProvider,
  JdJson,
} from './types/document-ai.types';

@Injectable()
export class DocumentsAiService implements IAiProvider {
  private readonly logger = new Logger(DocumentsAiService.name);

  constructor(private groq: GroqService) {}

  async extractCvJson(content: string | object): Promise<CvJson> {
    this.logger.log('Extracting CV JSON via Groq...');

    const text =
      typeof content === 'string' ? content : JSON.stringify(content);

    const result = await this.groq.generateJsonContent({
      model: DOCUMENT_FIT_ASSESSMENT_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Extract CV data from the following document:\n\n${text}` },
          ],
        },
      ],
      config: {
        systemInstruction: CV_SYSTEM_INSTRUCTION,
        maxOutputTokens: 4096,
      },
    });

    return JSON.parse(result || '{}') as CvJson;
  }

  async extractJdJson(content: string | object): Promise<JdJson> {
    this.logger.log('Extracting JD JSON via Groq...');

    const text =
      typeof content === 'string' ? content : JSON.stringify(content);

    const result = await this.groq.generateJsonContent({
      model: DOCUMENT_FIT_ASSESSMENT_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Extract job description data from the following document:\n\n${text}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: JD_SYSTEM_INSTRUCTION,
        maxOutputTokens: 2048,
      },
    });

    return JSON.parse(result || '{}') as JdJson;
  }

  async assessFitRubric(
    cvJson: CvJson,
    jdJson: JdJson,
    requirements: NormalizedJdRequirement[],
  ): Promise<FitRubricEvaluation> {
    this.logger.log('Assessing fit rubric evidence via Groq...');

    const userMessage = `CV:
${JSON.stringify(cvJson, null, 2)}

Parsed Job Description (JD):
${JSON.stringify(jdJson, null, 2)}

Normalized JD requirements to evaluate:
${JSON.stringify(requirements, null, 2)}`;

    const result = await this.groq.generateJsonContent({
      model: DOCUMENT_FIT_ASSESSMENT_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      config: {
        systemInstruction: FIT_RUBRIC_SYSTEM_INSTRUCTION,
        maxOutputTokens: 8192,
        temperature: 0,
      },
    });

    return JSON.parse(result || '{}') as FitRubricEvaluation;
  }

  async evaluateFitSemanticSignals(
    input: FitSemanticEvaluationInput,
  ): Promise<FitSemanticEvaluationResult> {
    this.logger.log('Evaluating semantic fit signals via Groq...');

    const result = await this.groq.generateJsonContent({
      model: DOCUMENT_FIT_ASSESSMENT_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Semantic fit evaluation input:\n${JSON.stringify(
                input,
                null,
                2,
              )}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: FIT_SEMANTIC_SIGNALS_SYSTEM_INSTRUCTION,
        maxOutputTokens: 4096,
        temperature: 0,
      },
      feature: 'documents.fit.semantic_signals',
    });

    return JSON.parse(result || '{}') as FitSemanticEvaluationResult;
  }

  async validateDocumentType(
    content: string | object,
    expectedType: DocumentUploadType,
  ): Promise<DocumentValidationResult> {
    this.logger.log(
      `Validating uploaded document against expected type ${expectedType}...`,
    );

    const text =
      typeof content === 'string' ? content : JSON.stringify(content);

    const result = await this.groq.generateJsonContent({
      model: DOCUMENT_VALIDATION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Expected type: ${expectedType}\n\nDocument text:\n${text}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: VALIDATION_SYSTEM_INSTRUCTION,
        maxOutputTokens: 512,
      },
    });

    const parsed = JSON.parse(
      result || '{}',
    ) as Partial<DocumentValidationResult>;
    const normalizedType =
      parsed.detectedType === DocumentUploadType.CV ||
      parsed.detectedType === DocumentUploadType.JD
        ? parsed.detectedType
        : 'OTHER';

    return {
      isRelevant: Boolean(parsed.isRelevant),
      detectedType: normalizedType,
      confidence: Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(100, Number(parsed.confidence)))
        : 0,
      reason:
        parsed.reason?.trim() ||
        'The document content does not match the expected format.',
    };
  }
}
