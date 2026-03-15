import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewService } from './interview.service';
import { InitSessionDto } from './dto/init-session.dto';

@UseGuards(JwtAuthGuard)
@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Get('preflight')
  preflight(@Req() req: { user: { id: string } }) {
    return this.interviewService.preflight(req.user.id);
  }

  @Post('sessions/init')
  initSession(
    @Req() req: { user: { id: string } },
    @Body() dto: InitSessionDto,
  ) {
    return this.interviewService.initSession(req.user.id, dto);
  }
}
