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
  requiredCompetencies?: string[];
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
- skills: flat list of ALL technical skills. Use full names: "JavaScript" not "JS", "TypeScript" not "TS", "Node.js" not "Node", "PostgreSQL" not "PG".
- experience[].achievements: ONLY specific outcomes with metrics or impact (e.g. "Reduced API latency by 40%"). Skip vague statements like "improved performance".
- experience[].techStack: only technologies used in that specific role.
- totalYearsExperience: estimate from dates across all roles or infer from context.
- seniority: infer from job titles and scope of responsibilities.
- Return ONLY the JSON object. No explanation text.

Example 1 — CV with clear achievements:
Input: "Senior Engineer at Acme (2020-2023). Led backend team of 5. Reduced DB query time by 60% via indexing. Stack: Node.js, PostgreSQL, Redis."
Output excerpt:
{
  "currentTitle": "Senior Engineer",
  "seniority": "senior",
  "skills": ["Node.js", "PostgreSQL", "Redis"],
  "experience": [{
    "company": "Acme", "title": "Senior Engineer",
    "startDate": "2020", "endDate": "2023",
    "responsibilities": ["Led backend team of 5"],
    "achievements": ["Reduced DB query time by 60% via indexing"],
    "techStack": ["Node.js", "PostgreSQL", "Redis"]
  }]
}

Example 2 — CV with only responsibilities (no metrics):
Input: "Engineer at Beta Corp. Worked on API development. Used React and TypeScript."
Output excerpt:
{
  "seniority": "unknown",
  "skills": ["React", "TypeScript"],
  "experience": [{
    "company": "Beta Corp", "title": "Engineer",
    "responsibilities": ["Worked on API development"],
    "achievements": [],
    "techStack": ["React", "TypeScript"]
  }]
}`;

const JD_SYSTEM_INSTRUCTION = `You are a job description parser. Extract structured data from the provided JD text and return ONLY valid JSON matching this exact structure:
{
  "role": string,
  "required_skills": string[],
  "nice_to_have_skills": string[],
  "minimum_experience_years": number | null,
  "key_responsibilities": string[],
  "domain": string | null,
  "seniority": "intern" | "junior" | "mid" | "senior" | "lead" | "staff" | "manager" | "unknown",
  "requiredCompetencies": string[]
}
Rules:
- Use full skill names: "JavaScript" not "JS", "TypeScript" not "TS", "Node.js" not "Node", "PostgreSQL" not "Postgres".
- required_skills: only hard technical requirements. Do NOT include soft skills, benefits, or company info.
- nice_to_have_skills: only optional/bonus skills explicitly mentioned as nice-to-have or preferred.
- Skills embedded in responsibilities (e.g. "build APIs using Go") must be extracted into required_skills.
- minimum_experience_years: extract numeric value only. If a range is given (3-5 years), use the minimum.
- requiredCompetencies: list ONLY values from this fixed taxonomy that the JD explicitly or implicitly requires.
  Allowed values: ownership, conflict_handling, learning_agility, technical_fundamentals, trade_off_analysis, system_thinking, problem_solving, communication, collaboration, impact_measurement.
  Rules: include "ownership" if JD expects leading, driving, or being accountable for outcomes.
  Include "collaboration" if JD mentions cross-functional work, stakeholder management, or teamwork.
  Include "communication" if JD requires writing docs, presenting, or explaining to non-technical audiences.
  Include "system_thinking" if JD requires architecture, scalability, or platform-level thinking.
  Include "trade_off_analysis" if JD requires technical decision-making, prioritization, or evaluating options.
  Include "impact_measurement" if JD mentions metrics, KPIs, business outcomes, or data-driven decisions.
  Include "learning_agility" if JD mentions fast-paced environment, new tech adoption, or mentoring others.
  Include "technical_fundamentals" if JD requires hands-on engineering, coding, or debugging.
  Include "problem_solving" if JD expects troubleshooting, debugging, or root-cause analysis.
  Include "conflict_handling" if JD mentions negotiation, alignment, or resolving disagreements.
  Return an empty array if none clearly apply.
- Return ONLY the JSON object. No explanation text.

Example 1 — bullet-point JD:
Input: "We need a Senior Frontend Engineer. Requirements: React (required), TypeScript (required), GraphQL (nice to have). 5+ years exp. Responsibilities: own end-to-end features, mentor junior devs."
Output:
{
  "role": "Senior Frontend Engineer",
  "required_skills": ["React", "TypeScript"],
  "nice_to_have_skills": ["GraphQL"],
  "minimum_experience_years": 5,
  "key_responsibilities": ["Own end-to-end features", "Mentor junior developers"],
  "domain": null,
  "seniority": "senior",
  "requiredCompetencies": ["ownership", "technical_fundamentals", "learning_agility", "collaboration"]
}

Example 2 — narrative JD (no bullet points):
Input: "Looking for an engineer who can build scalable backend services using Go and PostgreSQL. Experience with Kubernetes is a plus. At least 3 years in backend development in a fintech environment."
Output:
{
  "role": "Backend Engineer",
  "required_skills": ["Go", "PostgreSQL"],
  "nice_to_have_skills": ["Kubernetes"],
  "minimum_experience_years": 3,
  "key_responsibilities": ["Build scalable backend services"],
  "domain": "fintech",
  "seniority": "unknown",
  "requiredCompetencies": ["technical_fundamentals", "system_thinking", "problem_solving"]
}`;

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
- Return ONLY the JSON object. No explanation text.

Example 1 — requirement clearly met with strong evidence:
requirementId: "required_skill:typescript"
→ { "status": "met", "evidenceStrength": "strong", "cvEvidence": ["3 years TypeScript at Acme, built 20+ React components"], "rationale": "Candidate has direct TypeScript experience with specific project context." }

Example 2 — requirement only partially covered (keyword only, no project):
requirementId: "required_skill:graphql"
→ { "status": "partial", "evidenceStrength": "weak", "cvEvidence": ["Listed GraphQL in skills"], "rationale": "Skill mentioned but no project or scope evidence found." }

Example 3 — requirement completely absent:
requirementId: "required_skill:kubernetes"
→ { "status": "missing", "evidenceStrength": "none", "cvEvidence": [], "rationale": "No mention of Kubernetes in CV skills or experience." }`;

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
