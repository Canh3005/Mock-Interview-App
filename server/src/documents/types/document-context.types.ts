import type { CvJson, JdJson } from './document-ai.types';

export interface ActiveContext<T> {
  json: T | null;
  source: 'override' | 'db' | 'missing';
  recordId?: string;
}

export interface InterviewDocumentContext {
  cv: CvJson | null;
  jd: JdJson | null;
  missing: string[];
  sources: {
    cv: ActiveContext<CvJson>['source'];
    jd: ActiveContext<JdJson>['source'];
  };
}
