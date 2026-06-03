import type { CreateTestCaseDto } from '../dto/create-test-case.dto';

export type CreateTestCaseWithProblemId = CreateTestCaseDto & {
  problemId: string;
};
