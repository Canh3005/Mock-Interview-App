import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtAuthRequest } from '../../auth/types/auth-request.types';
import { Role } from '../../users/entities/user.entity';
import {
  InterviewSetDraftDto,
  TransitionInterviewSetDto,
} from '../dto/interview-set-curation.dto';
import {
  ImportQuestionProbesDto,
  QuestionProbeDraftDto,
  TransitionQuestionProbeDto,
} from '../dto/question-probe-curation.dto';
import { InterviewSet } from '../entities/interview-set.entity';
import { QuestionProbeAuditLog } from '../entities/question-probe-audit-log.entity';
import { QuestionProbe } from '../entities/question-probe.entity';
import { QuestionProbeCurationService } from '../services/curation/question-probe-curation.service';
import type {
  ImportQuestionProbesResult,
  ProbeListQuery,
} from '../types/question-bank-curation.types';
import { InterviewSetCurationService } from '../services/curation/interview-set-curation.service';
import type { InterviewSetListQuery } from '../types/question-bank-curation.types';

@ApiTags('admin/question-bank')
@Controller('admin/question-bank')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class QuestionBankAdminController {
  constructor(
    private readonly probeCurationService: QuestionProbeCurationService,
    private readonly interviewSetCurationService: InterviewSetCurationService,
  ) {}

  @Post('probes')
  @ApiOperation({ summary: 'Create a draft question probe' })
  createProbe(
    @Body() dto: QuestionProbeDraftDto,
    @Req() req: JwtAuthRequest,
  ): Promise<QuestionProbe> {
    return this.probeCurationService.createDraft({
      dto,
      actorId: req.user.id,
    });
  }

  @Post('probes/import')
  @ApiOperation({ summary: 'Import draft question probes for review' })
  importProbes(
    @Body() dto: ImportQuestionProbesDto,
    @Req() req: JwtAuthRequest,
  ): Promise<ImportQuestionProbesResult> {
    return this.probeCurationService.importDrafts({
      dto,
      actorId: req.user.id,
    });
  }

  @Get('probes')
  @ApiOperation({ summary: 'List question probes for admin curation' })
  listProbes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('roleFamily') roleFamily?: string,
    @Query('level') level?: string,
    @Query('type') type?: string,
    @Query('competency') competency?: string,
    @Query('search') search?: string,
  ): Promise<{
    data: QuestionProbe[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: ProbeListQuery = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      roleFamily,
      level,
      type,
      competency,
      search,
    };
    return this.probeCurationService.findAll({ query });
  }

  @Get('probes/export')
  @ApiOperation({ summary: 'Export question probes for bulk review' })
  exportProbes(
    @Query('status') status?: string,
    @Query('roleFamily') roleFamily?: string,
    @Query('level') level?: string,
    @Query('type') type?: string,
    @Query('competency') competency?: string,
    @Query('search') search?: string,
  ): Promise<QuestionProbe[]> {
    return this.probeCurationService.exportAll({
      query: { status, roleFamily, level, type, competency, search },
    });
  }

  @Get('probes/:id')
  @ApiOperation({ summary: 'Get question probe detail for admin' })
  getProbe(@Param('id') id: string): Promise<QuestionProbe> {
    return this.probeCurationService.findOne(id);
  }

  @Patch('probes/:id')
  @ApiOperation({ summary: 'Update a draft or needs-revision question probe' })
  updateProbe(
    @Param('id') id: string,
    @Body() dto: QuestionProbeDraftDto,
    @Req() req: JwtAuthRequest,
  ): Promise<QuestionProbe> {
    return this.probeCurationService.update({
      id,
      dto,
      actorId: req.user.id,
    });
  }

  @Post('probes/:id/submit-review')
  @ApiOperation({ summary: 'Submit a question probe for review' })
  submitProbeReview(
    @Param('id') id: string,
    @Body() dto: TransitionQuestionProbeDto,
    @Req() req: JwtAuthRequest,
  ): Promise<QuestionProbe> {
    return this.probeCurationService.submitReview({
      id,
      actorId: req.user.id,
      reason: dto.reason,
    });
  }

  @Post('probes/:id/reopen-draft')
  @ApiOperation({ summary: 'Move a needs-revision probe back to draft' })
  reopenProbeDraft(
    @Param('id') id: string,
    @Body() dto: TransitionQuestionProbeDto,
    @Req() req: JwtAuthRequest,
  ): Promise<QuestionProbe> {
    return this.probeCurationService.reopenDraft({
      id,
      actorId: req.user.id,
      reason: dto.reason,
    });
  }

  @Post('probes/:id/publish')
  @ApiOperation({ summary: 'Publish a reviewed question probe' })
  publishProbe(
    @Param('id') id: string,
    @Body() dto: TransitionQuestionProbeDto,
    @Req() req: JwtAuthRequest,
  ): Promise<QuestionProbe> {
    return this.probeCurationService.publish({
      id,
      actorId: req.user.id,
      reason: dto.reason,
    });
  }

  @Post('probes/:id/needs-revision')
  @ApiOperation({ summary: 'Move a question probe to needs revision' })
  markProbeNeedsRevision(
    @Param('id') id: string,
    @Body() dto: TransitionQuestionProbeDto,
    @Req() req: JwtAuthRequest,
  ): Promise<QuestionProbe> {
    return this.probeCurationService.markNeedsRevision({
      id,
      actorId: req.user.id,
      reason: dto.reason,
    });
  }

  @Post('probes/:id/retire')
  @ApiOperation({ summary: 'Retire a question probe' })
  retireProbe(
    @Param('id') id: string,
    @Body() dto: TransitionQuestionProbeDto,
    @Req() req: JwtAuthRequest,
  ): Promise<QuestionProbe> {
    return this.probeCurationService.retire({
      id,
      actorId: req.user.id,
      reason: dto.reason,
    });
  }

  @Get('probes/:id/audit')
  @ApiOperation({ summary: 'Get question probe audit trail' })
  getProbeAudit(@Param('id') id: string): Promise<QuestionProbeAuditLog[]> {
    return this.probeCurationService.findAudit(id);
  }

  @Post('interview-sets')
  @ApiOperation({ summary: 'Create an interview set draft' })
  createInterviewSet(
    @Body() dto: InterviewSetDraftDto,
    @Req() req: JwtAuthRequest,
  ): Promise<InterviewSet> {
    return this.interviewSetCurationService.create({
      dto,
      actorId: req.user.id,
    });
  }

  @Get('interview-sets')
  @ApiOperation({ summary: 'List interview sets for admin curation' })
  listInterviewSets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('roleFamily') roleFamily?: string,
    @Query('level') level?: string,
    @Query('search') search?: string,
  ): Promise<{
    data: InterviewSet[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: InterviewSetListQuery = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      roleFamily,
      level,
      search,
    };
    return this.interviewSetCurationService.findAll({ query });
  }

  @Get('interview-sets/:id')
  @ApiOperation({ summary: 'Get interview set detail for admin' })
  getInterviewSet(@Param('id') id: string): Promise<InterviewSet> {
    return this.interviewSetCurationService.findOne(id);
  }

  @Patch('interview-sets/:id')
  @ApiOperation({ summary: 'Update an interview set draft' })
  updateInterviewSet(
    @Param('id') id: string,
    @Body() dto: InterviewSetDraftDto,
    @Req() req: JwtAuthRequest,
  ): Promise<InterviewSet> {
    return this.interviewSetCurationService.update({
      id,
      dto,
      actorId: req.user.id,
    });
  }

  @Post('interview-sets/:id/publish')
  @ApiOperation({ summary: 'Publish an interview set' })
  publishInterviewSet(
    @Param('id') id: string,
    @Body() dto: TransitionInterviewSetDto,
    @Req() req: JwtAuthRequest,
  ): Promise<InterviewSet> {
    return this.interviewSetCurationService.publish({
      id,
      actorId: req.user.id,
      reason: dto.reason,
    });
  }

  @Post('interview-sets/:id/retire')
  @ApiOperation({ summary: 'Retire an interview set' })
  retireInterviewSet(
    @Param('id') id: string,
    @Body() dto: TransitionInterviewSetDto,
    @Req() req: JwtAuthRequest,
  ): Promise<InterviewSet> {
    return this.interviewSetCurationService.retire({
      id,
      actorId: req.user.id,
      reason: dto.reason,
    });
  }
}
