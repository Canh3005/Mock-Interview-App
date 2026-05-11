export interface ProbeValidationIssue {
  field: string;
  message: string;
}

export interface ProbeValidationResult {
  valid: boolean;
  issues: ProbeValidationIssue[];
}
