export interface ImportBulkError {
  index: number;
  error: string;
}

export interface ImportBulkItemResult {
  ok: boolean;
  error?: ImportBulkError;
}

export interface VerificationLanguageResult {
  passed: number;
  total: number;
  error?: string;
}

export interface VerificationDetail {
  language: string;
  testCaseId: string | null;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  statusId: number;
  statusDescription: string;
}

export interface ProblemVerificationResult {
  languages: Record<string, VerificationLanguageResult>;
  details: VerificationDetail[];
  verified?: boolean;
}
