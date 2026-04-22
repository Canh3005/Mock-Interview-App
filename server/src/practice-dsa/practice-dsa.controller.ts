import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PracticeDSAService } from './practice-dsa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('practice')
@UseGuards(JwtAuthGuard)
export class PracticeDSAController {
  constructor(private readonly practiceDSAService: PracticeDSAService) {}

  @Get('problems/:id')
  getProblem(@Param('id') id: string) {
    return this.practiceDSAService.getProblem(id);
  }

  @Post('run')
  runCode(@Body() body: { problemId: string; code: string; language: string }) {
    return this.practiceDSAService.runCode(
      body.problemId,
      body.code,
      body.language,
    );
  }

  @Post('submit')
  submitProblem(
    @Request() req: any,
    @Body()
    body: {
      problemId: string;
      code: string;
      language: string;
      unlockedHints?: number[];
    },
  ) {
    return this.practiceDSAService.submitAndCreate(
      req.user.id,
      body.problemId,
      body.code,
      body.language,
      body.unlockedHints ?? [],
    );
  }

  @Post('solved')
  markSolved(@Request() req: any, @Body() body: { problemId: string }) {
    return this.practiceDSAService.markSolved(req.user.id, body.problemId);
  }

  @Get('solved')
  getSolvedProblemIds(@Request() req: any) {
    return this.practiceDSAService.getSolvedProblemIds(req.user.id);
  }
}
