import { Injectable } from '@nestjs/common';

export interface MultimodalContext {
  dominantExpression: 'stressed' | 'confident' | 'neutral' | 'uncertain';
  expressionConfidence: number;
  gazeOnScreenPercent: number;
  fillerRate: number;
  speakingPaceWpm: number;
  turnDurationMs: number;
}

@Injectable()
export class MultimodalHintService {
  buildHint(ctx: MultimodalContext | undefined | null): string | null {
    if (!ctx) return null;

    const hints: string[] = [];

    if (
      ctx.dominantExpression === 'stressed' &&
      ctx.expressionConfidence > 0.7
    ) {
      hints.push(
        'Candidate appears tense. Use a warmer, encouraging tone. Give more time to think.',
      );
    }
    if (ctx.gazeOnScreenPercent < 40) {
      hints.push(
        'Candidate frequently looks away from the camera. They might be reading notes or feeling uncomfortable.',
      );
    }
    if (ctx.speakingPaceWpm > 180 && ctx.fillerRate > 0.15) {
      hints.push(
        'Candidate is speaking very quickly with many filler words — likely nervous. Slow down your own pace and use reassuring language.',
      );
    }
    if (ctx.turnDurationMs < 10_000 && ctx.fillerRate < 0.03) {
      hints.push(
        'Candidate gave a very brief, clean answer. Consider probing deeper.',
      );
    }

    return hints.length > 0
      ? `\n[Interviewer observation: ${hints.join(' ')}]`
      : null;
  }
}
