import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PublicProbeListRequest,
  PublicQuestionProbeListResponse,
  QuestionBankService,
} from './question-bank.service';
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

  @Get('probes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active question probes for candidates' })
  listPublicProbes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('locale') locale?: string,
    @Query('language') language?: string,
    @Query('roleFamily') roleFamily?: string,
    @Query('level') level?: string,
    @Query('type') type?: string,
    @Query('competency') competency?: string,
    @Query('techTag') techTag?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ): Promise<PublicQuestionProbeListResponse> {
    const query: PublicProbeListRequest = {
      page,
      limit,
      locale,
      language,
      roleFamily,
      level,
      type,
      competency,
      techTag,
      difficulty,
      search,
      sort,
    };
    return this.questionBankService.listPublicProbes({ query });
  }
}
