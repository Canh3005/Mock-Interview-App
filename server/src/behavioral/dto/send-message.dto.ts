import type { MultimodalContext } from '../../combat/multimodal-hint.service';

export class SendMessageDto {
  content: string;
  inputType: 'text' | 'voice';
  voiceTranscript?: string;
  // Combat mode only
  multimodalContext?: MultimodalContext;
  // Combat mode timing (ms since stage start)
  stageElapsedMs?: number;
  totalElapsedMs?: number;
  turnsInStage?: number;
  totalBudgetMs?: number;
}
