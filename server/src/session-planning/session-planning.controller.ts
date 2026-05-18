import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SessionPlanningService } from './session-planning.service';
import { CreateSessionPlanDto } from './dto/create-session-plan.dto';
import { JwtAuthRequest } from '../auth/types/auth-request.types';

@ApiTags('session-planning')
@Controller('session-planning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionPlanningController {
  constructor(
    private readonly sessionPlanningService: SessionPlanningService,
  ) {}

  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo SessionPlan từ calibration profile — Stage 1' })
  createPlan(@Body() dto: CreateSessionPlanDto, @Req() req: JwtAuthRequest) {
    return this.sessionPlanningService.createPlan({ dto, userId: req.user.id });
  }

  @Get('plans/latest')
  @ApiOperation({ summary: 'Lấy SessionPlan gần nhất của user' })
  getLatestPlan(@Req() req: JwtAuthRequest) {
    return this.sessionPlanningService.getLatestPlan({ userId: req.user.id });
  }
}
