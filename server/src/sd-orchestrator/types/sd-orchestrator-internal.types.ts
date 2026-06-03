import type { SUPPORTED_SD_LANGUAGES } from '../constants/sd-orchestrator.constants';
import type { CLARIFICATION_CRITERIA } from '../constants/sd-clarification.constants';

export type SDLanguage = (typeof SUPPORTED_SD_LANGUAGES)[number];

export type SDTargetLevel = keyof typeof CLARIFICATION_CRITERIA;
