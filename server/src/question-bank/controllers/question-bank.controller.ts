import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthRequest } from '../../auth/types/auth-request.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PublicProbeDetailRequest,
  PublicProbeListRequest,
  PublicQuestionProbeDetail,
  PublicQuestionProbeListResponse,
  SubmitQuestionPracticeAttemptRequest,
  SubmitQuestionPracticeAttemptResponse,
  QuestionPracticeAttemptFeedbackResponse,
} from '../types/question-bank-public.types';
import { QuestionBankService } from '../services/question-bank.service';
import { QuestionPracticeAttemptService } from '../services/practice/question-practice-attempt.service';
import { QuestionPracticeFeedbackService } from '../services/practice/question-practice-feedback.service';
import { QuestionBankDetailService } from '../services/public/question-bank-detail.service';
import { QuestionBankPublicBrowseService } from '../services/public/question-bank-public-browse.service';
import { QuestionBankTaxonomy } from '../constants/question-bank-taxonomy.constants';
import { ValidateQuestionProbeDto } from '../dto/validate-question-probe.dto';
import { ProbeValidationResult } from '../types/question-probe-validation.types';

@ApiTags('question-bank')
@Controller('question-bank')
export class QuestionBankController {
  constructor(
    private readonly questionBankService: QuestionBankService,
    private readonly publicBrowseService: QuestionBankPublicBrowseService,
    private readonly detailService: QuestionBankDetailService,
    private readonly practiceAttemptService: QuestionPracticeAttemptService,
    private readonly practiceFeedbackService: QuestionPracticeFeedbackService,
  ) {}

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
    return this.publicBrowseService.listPublicProbes({ query });
  }

  @Get('probes/:probeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active question probe detail for candidates' })
  getPublicProbeDetail(
    @Param('probeId') probeId: string,
    @Query('locale') locale?: string,
    @Query('relatedLimit') relatedLimit?: string,
  ): Promise<PublicQuestionProbeDetail> {
    const query: PublicProbeDetailRequest = { locale, relatedLimit };
    return this.detailService.getPublicProbeDetail({ probeId, query });
  }

  @Post('probes/:probeId/practice-attempts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a single-question practice attempt' })
  submitPracticeAttempt(
    @Req() req: JwtAuthRequest,
    @Param('probeId') probeId: string,
    @Body() request: SubmitQuestionPracticeAttemptRequest,
  ): Promise<SubmitQuestionPracticeAttemptResponse> {
    return this.practiceAttemptService.submitPracticeAttempt({
      candidateId: req.user.id,
      probeId,
      request,
    });
  }

  @Get('practice-attempts/:attemptId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single-question practice feedback status' })
  getPracticeAttemptFeedback(
    @Req() req: JwtAuthRequest,
    @Param('attemptId') attemptId: string,
  ): Promise<QuestionPracticeAttemptFeedbackResponse> {
    return this.practiceFeedbackService.getAttemptFeedback({
      candidateId: req.user.id,
      attemptId,
    });
  }

  @Post('practice-attempts/:attemptId/retry-feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry single-question practice feedback scoring' })
  retryPracticeAttemptFeedback(
    @Req() req: JwtAuthRequest,
    @Param('attemptId') attemptId: string,
  ): Promise<QuestionPracticeAttemptFeedbackResponse> {
    return this.practiceFeedbackService.retryFeedback({
      candidateId: req.user.id,
      attemptId,
    });
  }
}
