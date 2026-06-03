import type { QuestionProbe } from '../entities/question-probe.entity';

export interface ProbeListQuery {
  page: number;
  limit: number;
  status?: string;
  roleFamily?: string;
  level?: string;
  type?: string;
  competency?: string;
  search?: string;
}

export interface ImportQuestionProbesResult {
  successful: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
  data: QuestionProbe[];
}

export interface InterviewSetListQuery {
  page: number;
  limit: number;
  status?: string;
  roleFamily?: string;
  level?: string;
  search?: string;
}
