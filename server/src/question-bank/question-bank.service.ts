import { Injectable } from '@nestjs/common';
import {
  QUESTION_BANK_TAXONOMY,
  QuestionBankTaxonomy,
} from './constants/question-bank-taxonomy.constants';
import { ProbeValidationResult } from './question-probe-validation.types';
import { QuestionProbeValidationService } from './question-probe-validation.service';

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
