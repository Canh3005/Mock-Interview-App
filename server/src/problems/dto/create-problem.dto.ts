import { ProblemDifficulty, ProblemStatus } from '../entities/problem.entity';

export class ProblemTemplateInputDto {
  id?: string;
  languageId!: string;
  starterCode!: string;
  solutionCode!: string;
  driverCode!: string;
  timeLimitMs!: number;
  memoryLimitKb!: number;
  isEnabled!: boolean;
}

export class ProblemTestCaseInputDto {
  id?: string;
  inputData!: string;
  expectedOutput!: string;
  isHidden?: boolean;
  weight?: number;
}

export class CreateProblemDto {
  title?: string;
  difficulty?: ProblemDifficulty;
  description?: string;
  constraints?: string[];
  timeLimitMultiplier?: number;
  status?: ProblemStatus;
  tags?: string[];
  hints?: string[];
  optimalTimeComplexity?: string | null;
  optimalSpaceComplexity?: string | null;
  templates?: ProblemTemplateInputDto[];
  testCases?: ProblemTestCaseInputDto[];
}
