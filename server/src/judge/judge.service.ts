import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Interface mapping standard languages to Judge0 language IDs
 */
export const JUDGE0_LANGUAGE_MAP: Record<string, number> = {
  javascript: 93, // Node.js 18.15.0
  python: 71, // Python 3.11.2
  java: 91, // Java (JDK 17)
  cpp: 54, // C++ (GCC 9.2.0)
};

export interface JudgeSubmissionResult {
  stdout: string | null;
  time: string;
  memory: number;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
}

@Injectable()
export class JudgeService {
  private readonly logger = new Logger(JudgeService.name);
  private readonly judge0Url =
    process.env.JUDGE0_URL || 'http://localhost:2358';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Run code against a single testcase
   */
  async runSingleTest(
    language: string,
    sourceCode: string,
    input: string,
    expectedOutput: string,
    timeLimitMultiplier: number = 1.0,
  ): Promise<JudgeSubmissionResult> {
    const languageId = JUDGE0_LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    try {
      // 1. Create a submission
      const createRes = await firstValueFrom(
        this.httpService.post<any>(`${this.judge0Url}/submissions`, {
          source_code: sourceCode,
          language_id: languageId,
          stdin: input,
          expected_output: expectedOutput,
          cpu_time_limit: 2.0 * timeLimitMultiplier, // Base 2s timeout
          memory_limit: 128000, // 128MB
        }),
      );

      const token = createRes.data.token;

      // 2. Poll for the result
      return this.pollSubmissionResult(token);
    } catch (error) {
      this.logger.error(`Error running code on Judge0: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run code against multiple testcases (Batch Submission)
   * This is more efficient for Verify System
   */
  async runBatchTests(
    language: string,
    sourceCode: string,
    testCases: { input: string; expectedOutput: string }[],
    timeLimitMultiplier: number = 1.0,
  ): Promise<JudgeSubmissionResult[]> {
    const languageId = JUDGE0_LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const payload = {
      submissions: testCases.map((tc) => ({
        source_code: sourceCode,
        language_id: languageId,
        stdin: tc.input,
        expected_output: tc.expectedOutput,
        cpu_time_limit: 2.0 * timeLimitMultiplier,
      })),
    };
    try {
      // 1. Batch Create
      const createRes = await firstValueFrom(
        this.httpService.post<any>(
          `${this.judge0Url}/submissions/batch`,
          payload,
        ),
      );
      const tokens = createRes.data.map((item: any) => item.token);

      // 2. Poll Batch Result
      return this.pollBatchResults(tokens);
    } catch (error) {
      this.logger.error(`Error running batch code on Judge0: ${error.message}`);
      throw error;
    }
  }

  private async pollSubmissionResult(
    token: string,
    maxRetries = 20,
  ): Promise<JudgeSubmissionResult> {
    for (let i = 0; i < maxRetries; i++) {
      const res = await firstValueFrom(
        this.httpService.get<any>(
          `${this.judge0Url}/submissions/${token}?base64_encoded=false`,
        ),
      );

      if (res.data.status.id >= 3) {
        // Status ID >= 3 means it's finished processing (3=Accepted, 4=Wrong Answer, 5=Time Limit, 6=Compile Error etc.)
        return res.data;
      }

      // Wait for 500ms before repolling
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('Judge0 polling timed out');
  }

  private async pollBatchResults(
    tokens: string[],
    maxRetries = 30,
  ): Promise<JudgeSubmissionResult[]> {
    const tokensStr = tokens.join(',');

    for (let i = 0; i < maxRetries; i++) {
      const res = await firstValueFrom(
        this.httpService.get<any>(
          `${this.judge0Url}/submissions/batch?tokens=${tokensStr}&base64_encoded=false`,
        ),
      );

      const submissions = res.data.submissions;
      const isAllFinished = submissions.every((sub: any) => sub.status.id >= 3);

      if (isAllFinished) {
        return submissions;
      }

      // Batch takes longer, poll every 1s
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('Judge0 batch polling timed out');
  }
}
