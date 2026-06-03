import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { JUDGE0_LANGUAGE_MAP } from './constants/judge.constants';
import type {
  JudgeBatchResultResponse,
  JudgeCreateSubmissionResponse,
  JudgeSubmissionResult,
} from './types/judge.types';

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
        this.httpService.post<JudgeCreateSubmissionResponse>(
          `${this.judge0Url}/submissions`,
          {
            source_code: sourceCode,
            language_id: languageId,
            stdin: input,
            expected_output: expectedOutput,
            cpu_time_limit: 2.0 * timeLimitMultiplier, // Base 2s timeout
            memory_limit: 128000, // 128MB
          },
        ),
      );

      const token = createRes.data.token;

      // 2. Poll for the result
      return this.pollSubmissionResult(token);
    } catch (error: unknown) {
      this.logger.error(
        `Error running code on Judge0: ${this.formatErrorMessage(error)}`,
      );
      throw this.toError(error);
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
        this.httpService.post<JudgeCreateSubmissionResponse[]>(
          `${this.judge0Url}/submissions/batch`,
          payload,
        ),
      );
      const tokens = createRes.data.map((item) => item.token);

      // 2. Poll Batch Result
      return this.pollBatchResults(tokens);
    } catch (error: unknown) {
      this.logger.error(
        `Error running batch code on Judge0: ${this.formatErrorMessage(error)}`,
      );
      throw this.toError(error);
    }
  }

  private async pollSubmissionResult(
    token: string,
    maxRetries = 20,
  ): Promise<JudgeSubmissionResult> {
    for (let i = 0; i < maxRetries; i++) {
      const res = await firstValueFrom(
        this.httpService.get<JudgeSubmissionResult>(
          `${this.judge0Url}/submissions/${token}?base64_encoded=false`,
        ),
      );

      if (res.data.status.id >= 3) {
        const d = res.data;
        return { ...d, output: d.stderr ?? null, stdout: d.stdout ?? null };
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
        this.httpService.get<JudgeBatchResultResponse>(
          `${this.judge0Url}/submissions/batch?tokens=${tokensStr}&base64_encoded=false`,
        ),
      );

      const submissions = res.data.submissions;
      const isAllFinished = submissions.every((sub) => sub.status.id >= 3);

      if (isAllFinished) {
        console.log('Batch results received:', submissions);
        return submissions.map((d) => ({
          ...d,
          output: d.stderr ?? null,
          stdout: d.stdout ?? null,
        }));
      }

      // Batch takes longer, poll every 1s
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('Judge0 batch polling timed out');
  }

  private formatErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }
}
