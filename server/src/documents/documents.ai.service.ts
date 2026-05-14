import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import { DocumentUploadType } from './enums/document-upload-type.enum.js';
import {
  FitRubricEvaluation,
  NormalizedJdRequirement,
} from './types/fit-assessment.types';

export const DOCUMENT_FIT_ASSESSMENT_MODEL = 'llama-3.3-70b-versatile';

export type Seniority =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'staff'
  | 'manager'
  | 'unknown';

export interface CvExperience {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  responsibilities: string[];
  achievements?: string[];
  techStack?: string[];
}

export interface CvEducation {
  institution: string;
  degree?: string;
  field?: string;
  graduationYear?: number;
  gpa?: string;
}

export interface CvLanguage {
  language: string;
  proficiency: string;
}

export interface CvJson {
  name?: string;
  currentTitle?: string;
  totalYearsExperience?: number;
  skills: string[];
  experience: CvExperience[];
  education?: CvEducation[];
  certifications?: string[];
  domain?: string[];
  seniority?: Seniority;
  languages?: CvLanguage[];
}

export interface JdJson {
  role: string;
  required_skills: string[];
  nice_to_have_skills?: string[];
  minimum_experience_years?: number;
  key_responsibilities: string[];
  domain?: string;
  seniority?: Seniority;
}

export interface DocumentValidationResult {
  isRelevant: boolean;
  detectedType: DocumentUploadType | 'OTHER';
  confidence: number;
  reason: string;
}

export interface IAiProvider {
  extractCvJson(content: string | object): Promise<CvJson>;
  extractJdJson(content: string | object): Promise<JdJson>;
  assessFitRubric(
    cvJson: CvJson,
    jdJson: JdJson,
    requirements: NormalizedJdRequirement[],
  ): Promise<FitRubricEvaluation>;
  validateDocumentType(
    content: string | object,
    expectedType: DocumentUploadType,
  ): Promise<DocumentValidationResult>;
}

const CV_SYSTEM_INSTRUCTION = `You are a CV parsing assistant. Extract structured data from the provided CV/resume text and return ONLY valid JSON matching this exact structure:
{
  "name": string | null,
  "currentTitle": string | null,
  "totalYearsExperience": number | null,
  "skills": string[],
  "experience": [
    {
      "company": string,
      "title": string,
      "startDate": string | null,
      "endDate": string | null,
      "responsibilities": string[],
      "achievements": string[],
      "techStack": string[]
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string | null,
      "field": string | null,
      "graduationYear": number | null,
      "gpa": string | null
    }
  ],
  "languages": [{ "language": string, "proficiency": string }],
  "certifications": string[],
  "domain": string[],
  "seniority": "intern" | "junior" | "mid" | "senior" | "lead" | "staff" | "manager" | "unknown"
}
Rules:
- skills: flat list of ALL technical skills. Use full names: "JavaScript" not "JS", "TypeScript" not "TS", "Node.js" not "Node".
- experience[].achievements: ONLY specific outcomes with metrics or impact (e.g. "Reduced API latency by 40%"). Skip vague statements.
- experience[].techStack: only technologies used in that specific role.
- totalYearsExperience: estimate from dates across all roles or infer from context.
- seniority: infer from job titles and scope of responsibilities.
- Return ONLY the JSON object. No explanation text.`;

const JD_SYSTEM_INSTRUCTION = `You are a job description parser. Extract structured data from the provided JD text and return ONLY valid JSON matching this exact structure:
{
  "role": string,
  "required_skills": string[],
  "nice_to_have_skills": string[],
  "minimum_experience_years": number | null,
  "key_responsibilities": string[],
  "domain": string | null,
  "seniority": "intern" | "junior" | "mid" | "senior" | "lead" | "staff" | "manager" | "unknown"
}
Return ONLY the JSON object. No explanation text.`;

const FIT_RUBRIC_SYSTEM_INSTRUCTION = `You are an expert technical recruiter. Evaluate a candidate CV against a Job Description and return ONLY valid JSON matching this exact structure:
{
  "confidence": "high" | "medium" | "low",
  "requirementSignals": [
    {
      "requirementId": string,
      "requirement": string,
      "source": "required_skill" | "nice_to_have_skill" | "responsibility" | "experience" | "domain",
      "status": "met" | "partial" | "missing" | "unclear",
      "evidenceStrength": "strong" | "weak" | "none",
      "cvEvidence": string[],
      "rationale": string
    }
  ],
  "gaps": [
    {
      "category": "missing_required_skill" | "weak_evidence" | "level_mismatch" | "transferable_not_direct",
      "label": string,
      "severity": "high" | "medium" | "low",
      "relatedRequirement": string,
      "explanation": string,
      "practiceSuggestion": string | null
    }
  ],
  "riskFlags": [
    {
      "code": "insufficient_cv_detail" | "seniority_mismatch" | "missing_core_stack" | "domain_gap" | "ambiguous_timeline",
      "severity": "high" | "medium" | "low",
      "explanation": string
    }
  ],
  "userSummary": {
    "headline": string,
    "strengths": string[],
    "gapsToImprove": string[],
    "transferableNotes": string[]
  }
}
Rules:
- Evaluate every normalized JD requirement exactly once when possible.
- Quote or summarize only short CV evidence snippets from the provided CV JSON.
- Do not invent CV evidence. If absent, use an empty cvEvidence array.
- riskFlags: raise ONLY when the specific condition is clearly met. When in doubt, omit.
  - insufficient_cv_detail: ONLY when a required field is explicitly asked by JD AND truly absent from CV.
  - seniority_mismatch: ONLY when candidate seniority is LOWER than JD requirement (under-qualified).
  - missing_core_stack: ONLY when a required technology is completely absent from skills AND experience.
  - domain_gap: ONLY when candidate domain is clearly unrelated to JD domain. Software-to-software transitions are NOT domain gaps.
  - ambiguous_timeline: ONLY when experience dates are contradictory or unreadable.
- Fit score is computed by backend. Do not return any numeric score.
- Return ONLY the JSON object. No explanation text.`;

const VALIDATION_SYSTEM_INSTRUCTION = `You are a document classifier for a hiring platform. Classify the uploaded document and return ONLY valid JSON matching this exact structure:
{
  "isRelevant": boolean,
  "detectedType": "CV" | "JD" | "OTHER",
  "confidence": number (0-100),
  "reason": string
}
Rules:
- CV: candidate resume/profile with personal career history, skills, experience, education, projects, certifications, contact details, or achievements.
- JD: hiring document with role overview, responsibilities, required skills, qualifications, benefits, company intro, or candidate requirements.
- If the text is unrelated, mostly blank, corrupted, or not clearly a CV/JD, use detectedType OTHER and isRelevant false.
- If detectedType does not match expected type, set isRelevant false.
- Keep reason short and concrete.
- Return ONLY the JSON object.`;

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
      },
    });

    return JSON.parse(result || '{}') as FitRubricEvaluation;
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
      model: DOCUMENT_FIT_ASSESSMENT_MODEL,
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
