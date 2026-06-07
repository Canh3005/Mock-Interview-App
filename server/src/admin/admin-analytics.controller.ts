import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { AdminAnalyticsService } from './admin-analytics.service';

@ApiTags('admin/analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('revenue')
  @ApiOperation({
    summary: 'Credit revenue stats (purchase vs bonus) by period',
  })
  getRevenue(@Query('period') period = '30d') {
    return this.analyticsService.getRevenue(period);
  }

  @Get('llm-cost')
  @ApiOperation({ summary: 'LLM API cost by model and period' })
  getLlmCost(@Query('period') period = '30d') {
    return this.analyticsService.getLlmCost(period);
  }

  @Get('question-usage')
  @ApiOperation({ summary: 'Top question probes by view count' })
  getQuestionUsage(@Query('limit') limit?: string) {
    return this.analyticsService.getQuestionUsage(
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('exam-mode-usage')
  @ApiOperation({
    summary: 'Interview session breakdown by mode and round type',
  })
  getExamModeUsage(@Query('period') period = '30d') {
    return this.analyticsService.getExamModeUsage(period);
  }

  @Get('revenue/transactions')
  @ApiOperation({ summary: 'Individual transactions for a specific date' })
  getRevenueDayTransactions(
    @Query('date') date: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getRevenueDayTransactions(
      date,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'LLM anomaly alerts list' })
  getAnomalies(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.analyticsService.getAnomalies(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
