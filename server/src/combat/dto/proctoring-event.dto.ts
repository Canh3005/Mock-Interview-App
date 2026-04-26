export type ProctoringEventType =
  | 'TAB_HIDDEN'
  | 'TAB_VISIBLE'
  | 'WINDOW_BLUR'
  | 'WINDOW_FOCUS'
  | 'DEVTOOLS_OPEN'
  | 'FOCUS_LOST'
  | 'MULTIPLE_FACES'
  | 'NO_FACE'
  | 'SECOND_VOICE';

export type ProctoringEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export class ProctoringEventDto {
  clientEventId?: string;
  sessionId?: string;
  ts!: number;
  eventType?: ProctoringEventType;
  type!: ProctoringEventType;
  severity!: ProctoringEventSeverity;
  durationMs?: number;
  viewportRatio?: number;
  metadata?: Record<string, unknown>;
}
