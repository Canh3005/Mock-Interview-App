export class VerifyTemplateDto {
  languageId!: string;
  starterCode!: string;
  solutionCode!: string;
  driverCode!: string;
  timeLimitMs!: number;
  memoryLimitKb!: number;
  isEnabled!: boolean;
}

export class VerifyTestCaseDto {
  id?: string;
  inputData!: string;
  expectedOutput!: string;
  isHidden?: boolean;
}

export class VerifyProblemDto {
  templates!: VerifyTemplateDto[];
  testCases!: VerifyTestCaseDto[];
}
