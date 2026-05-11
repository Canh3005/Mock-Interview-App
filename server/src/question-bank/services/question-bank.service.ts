import { Injectable } from '@nestjs/common';
import {
  QUESTION_BANK_TAXONOMY,
  QuestionBankTaxonomy,
} from '../constants/question-bank-taxonomy.constants';
import { QuestionProbeValidationService } from './curation/question-probe-validation.service';
import { ProbeValidationResult } from '../types/question-probe-validation.types';

@Injectable()
export class QuestionBankService {
  constructor(
    private readonly validationService: QuestionProbeValidationService,
  ) {}

  getTaxonomy(): QuestionBankTaxonomy {
    return QUESTION_BANK_TAXONOMY;
  }

  validateProbe(input: unknown): ProbeValidationResult {
    return this.validationService.validate(input);
  }
}
