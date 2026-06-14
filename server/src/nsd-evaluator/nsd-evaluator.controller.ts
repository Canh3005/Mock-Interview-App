import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NSDEvaluatorService } from './nsd-evaluator.service';

@ApiTags('nsd-evaluator')
@Controller('nsd-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NSDEvaluatorController {
  constructor(private readonly service: NSDEvaluatorService) {}

  @Post(':id/evaluate')
  @ApiOperation({ summary: 'Manually enqueue NSD session evaluation' })
  async enqueue(@Param('id') sessionId: string): Promise<{ queued: boolean }> {
    return this.service.enqueueEvaluation(sessionId);
  }

  @Get(':id/evaluate/status')
  @ApiOperation({ summary: 'Get NSD evaluation status and result' })
  async status(@Param('id') sessionId: string) {
    return this.service.getStatus(sessionId);
  }
}
