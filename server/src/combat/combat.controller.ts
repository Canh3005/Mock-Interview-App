import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CombatMetricsService } from './combat-metrics.service';
import { IngestMetricsDto } from './dto/ingest-metrics.dto';
import { ProctoringEventDto } from './dto/proctoring-event.dto';
import { ProctoringEventBatchDto } from './dto/proctoring-event-batch.dto';
import { IntegrityCalculatorService } from './integrity-calculator.service';

@UseGuards(JwtAuthGuard)
@Controller('combat')
export class CombatController {
  constructor(
    private readonly metricsService: CombatMetricsService,
    private readonly integrityService: IntegrityCalculatorService,
  ) {}

  @Post('sessions/:id/metrics')
  @HttpCode(HttpStatus.NO_CONTENT)
  ingestMetrics(
    @Param('id') interviewSessionId: string,
    @Body() dto: IngestMetricsDto,
  ) {
    return this.metricsService.ingest(interviewSessionId, dto);
  }

  @Post('sessions/:id/proctoring-event')
  @HttpCode(HttpStatus.NO_CONTENT)
  ingestProctoringEvent(
    @Param('id') interviewSessionId: string,
    @Body() dto: ProctoringEventDto,
  ) {
    return this.metricsService.ingestProctoringEvent(interviewSessionId, dto);
  }

  @Post('sessions/:id/proctoring-event/batch')
  @HttpCode(HttpStatus.NO_CONTENT)
  ingestProctoringEventBatch(
    @Param('id') interviewSessionId: string,
    @Body() dto: ProctoringEventBatchDto,
  ) {
    return this.metricsService.ingestProctoringEventBatch(
      interviewSessionId,
      dto.events ?? [],
    );
  }

  @Get('sessions/:id/integrity')
  getIntegrity(@Param('id') interviewSessionId: string) {
    return this.integrityService.getIntegrity(interviewSessionId);
  }
}
