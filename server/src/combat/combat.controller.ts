import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CombatMetricsService } from './combat-metrics.service';
import { IngestMetricsDto } from './dto/ingest-metrics.dto';

@UseGuards(JwtAuthGuard)
@Controller('combat')
export class CombatController {
  constructor(private readonly metricsService: CombatMetricsService) {}

  // Task 3.10 — Ingest multimodal metrics batch
  @Post('sessions/:id/metrics')
  @HttpCode(HttpStatus.NO_CONTENT)
  ingestMetrics(
    @Param('id') behavioralSessionId: string,
    @Body() dto: IngestMetricsDto,
  ) {
    return this.metricsService.ingest(behavioralSessionId, dto);
  }
}
