import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewService } from './interview.service';
import { InitSessionDto } from './dto/init-session.dto';
import { UpdateContextDto } from './dto/update-context.dto';

@UseGuards(JwtAuthGuard)
@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Get('preflight')
  preflight(@Req() req: { user: { id: string } }) {
    return this.interviewService.preflight(req.user.id);
  }

  @Put('context')
  updateContext(
    @Req() req: { user: { id: string } },
    @Body() dto: UpdateContextDto,
  ) {
    return this.interviewService.updateContext(req.user.id, dto);
  }

  @Post('sessions/init')
  initSession(
    @Req() req: { user: { id: string } },
    @Body() dto: InitSessionDto,
  ) {
    return this.interviewService.initSession(req.user.id, dto);
  }
}
