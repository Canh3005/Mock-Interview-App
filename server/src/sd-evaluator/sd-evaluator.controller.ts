import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SDEvaluatorService } from './sd-evaluator.service';

@ApiTags('sd-evaluator')
@Controller('sd-sessions')
export class SDEvaluatorController {
  constructor(private readonly sdEvaluatorService: SDEvaluatorService) {}

  @Post(':id/evaluate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enqueue SD session evaluation after COMPLETED' })
  async enqueue(@Param('id') sessionId: string): Promise<{ queued: boolean }> {
    return this.sdEvaluatorService.enqueueEvaluation(sessionId);
  }

  @Get(':id/evaluate/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get evaluation status and progress' })
  async status(@Param('id') sessionId: string) {
    return this.sdEvaluatorService.getStatus(sessionId);
  }
}
