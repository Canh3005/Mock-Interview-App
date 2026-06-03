export interface JudgeSubmissionResult {
  stdout: string | null; // user print statements (cout/print)
  output: string | null; // driver-formatted return value (from stderr)
  time: string;
  memory: number;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
}

export interface JudgeCreateSubmissionResponse {
  token: string;
}

export interface JudgeBatchResultResponse {
  submissions: JudgeSubmissionResult[];
}
