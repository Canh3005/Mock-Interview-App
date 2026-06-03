import type { CvJson, JdJson } from '../../documents/types/document-ai.types';

export class UpdateContextDto {
  cv?: CvJson;
  jd?: JdJson;
}
