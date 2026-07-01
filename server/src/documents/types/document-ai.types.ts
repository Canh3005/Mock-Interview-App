import { DocumentUploadType } from '../enums/document-upload-type.enum.js';
import type {
  FitRubricEvaluation,
  NormalizedJdRequirement,
} from './fit-assessment.types';

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
  type?: 'job' | 'project';
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
