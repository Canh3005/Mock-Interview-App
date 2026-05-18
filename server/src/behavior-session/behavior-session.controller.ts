import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtAuthRequest } from '../auth/types/auth-request.types';
import { BehaviorSessionService } from './behavior-session.service';
import { CreateBehaviorSessionDto } from './dto/create-behavior-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@ApiTags('behavior-sessions')
@Controller('api/behavior-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BehaviorSessionController {
  constructor(
    private readonly behaviorSessionService: BehaviorSessionService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Tạo probe-based behavioral session mới và pre-render tất cả probe questions',
  })
  async create(
    @Body() dto: CreateBehaviorSessionDto,
    @Req() req: JwtAuthRequest,
  ) {
    return this.behaviorSessionService.create({ dto, userId: req.user.id });
  }

  @Post(':id/answer')
  @ApiOperation({
    summary:
      'Submit candidate answer — trả về SSE stream với evaluating → chunks → turn_complete',
  })
  async submitAnswer(
    @Param('id') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req: JwtAuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.behaviorSessionService.submitAnswer({
      sessionId,
      dto,
      userId: req.user.id,
      res,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy trạng thái session: state, turnHistory, stageProgress',
  })
  async getSession(@Param('id') sessionId: string, @Req() req: JwtAuthRequest) {
    return this.behaviorSessionService.getSession({
      sessionId,
      userId: req.user.id,
    });
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Đánh dấu session hoàn tất và kick off Stage 5 synthesis',
  })
  async complete(@Param('id') sessionId: string, @Req() req: JwtAuthRequest) {
    return this.behaviorSessionService.complete({
      sessionId,
      userId: req.user.id,
    });
  }
}
