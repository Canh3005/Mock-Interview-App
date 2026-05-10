import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuestionBankService } from './question-bank.service';
import { QuestionBankTaxonomy } from './constants/question-bank-taxonomy.constants';
import { ValidateQuestionProbeDto } from './dto/validate-question-probe.dto';
import { ProbeValidationResult } from './question-probe-validation.types';

@ApiTags('question-bank')
@Controller('question-bank')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Get('taxonomy')
  @ApiOperation({ summary: 'Get canonical question bank taxonomy' })
  getTaxonomy(): QuestionBankTaxonomy {
    return this.questionBankService.getTaxonomy();
  }

  @Post('probes/validate')
  @ApiOperation({ summary: 'Validate a QuestionProbe foundation payload' })
  validateProbe(@Body() dto: ValidateQuestionProbeDto): ProbeValidationResult {
    return this.questionBankService.validateProbe(dto);
  }
}
