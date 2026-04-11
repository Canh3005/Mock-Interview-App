import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TtsService } from './tts.service';

class SynthesizeDto {
  text: string;
  voice?: string;
  speed?: number;
  level?: string;
  language?: 'vi' | 'en' | 'ja';
}

@UseGuards(JwtAuthGuard)
@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post('synthesize')
  @HttpCode(HttpStatus.OK)
  async synthesize(@Body() dto: SynthesizeDto, @Res() res: Response) {
    const audio = await this.ttsService.synthesize(dto.text, {
      voice: dto.voice,
      speed: dto.speed,
      level: dto.level,
      language: dto.language,
    });
    if (!audio || audio.length === 0) {
      res.status(HttpStatus.NO_CONTENT).send();
      return;
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(audio);
  }
}
