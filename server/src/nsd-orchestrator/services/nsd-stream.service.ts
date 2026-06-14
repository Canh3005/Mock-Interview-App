import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { NSDRenderService } from './nsd-render.service';
import type { NSDSSEMeta } from '../types/nsd.types';
import type { NSDSession } from '../../nsd-session/entities/nsd-session.entity';
import type { InterviewLanguage } from '../../interview/entities/interview-session.entity';

/**
 * SSE lifecycle + text streaming, shared by the facade and every phase service.
 * Does not mutate session state — read-only (`getLanguage`) and I/O only.
 */
@Injectable()
export class NSDStreamService {
  constructor(private readonly render: NSDRenderService) {}

  startSSE(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  endSSE(res: Response): void {
    res.end();
  }

  /**
   * Streams `text` to the client as fake-streamed word chunks.
   * Unless `skipRender` is set, runs `text` through NSDRenderService first to
   * naturalize phrasing and translate it into the candidate's interview language.
   */
  async streamText(
    res: Response,
    text: string,
    meta: NSDSSEMeta | null,
    language: InterviewLanguage,
    opts?: { skipRender?: boolean },
  ): Promise<void> {
    const finalText = opts?.skipRender
      ? text
      : await this.render.render(text, language);
    const flush = (res as Response & { flush?: () => void }).flush?.bind(res);
    const chunks = finalText.split(' ');
    for (const chunk of chunks) {
      res.write(
        `data: ${JSON.stringify({ token: chunk + ' ', done: false })}\n\n`,
      );
      flush?.();
    }
    res.write(`data: ${JSON.stringify({ done: true, meta: meta ?? {} })}\n\n`);
    flush?.();
  }

  /** Resolve the candidate's interview language for a session, defaulting to Vietnamese. */
  getLanguage(session: NSDSession): InterviewLanguage {
    return session.interviewSession?.language ?? 'vi';
  }
}
