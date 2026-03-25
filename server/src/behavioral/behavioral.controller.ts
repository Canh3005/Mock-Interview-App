import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BehavioralSessionService } from './behavioral-session.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('behavioral')
export class BehavioralController {
  constructor(private readonly behavioralService: BehavioralSessionService) {}

  @Post('sessions/start')
  startSession(@Body() dto: StartSessionDto) {
    return this.behavioralService.startSession(dto);
  }

  @Post('sessions/:id/message')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Res() res: any,
  ) {
    await this.behavioralService.sendMessage(id, dto, res);
  }

  @Post('sessions/:id/next-stage')
  nextStage(@Param('id') id: string) {
    return this.behavioralService.nextStage(id);
  }

  @Post('sessions/:id/complete')
  @HttpCode(HttpStatus.OK)
  completeSession(@Param('id') id: string) {
    return this.behavioralService.completeSession(id);
  }

  @Get('sessions/:id/score')
  getScore(@Param('id') id: string) {
    return this.behavioralService.getScore(id);
  }

  @Post('sessions/:id/heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  heartbeat(@Param('id') id: string) {
    return this.behavioralService.heartbeat(id);
  }
}
