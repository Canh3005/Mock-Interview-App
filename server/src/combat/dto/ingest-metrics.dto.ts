export class EyeFrameDto {
  gaze: 'screen' | 'away';
  timestamp: number;
}

export class FillerWordsDto {
  fillerRate: number;
  detectedFillers: string[];
}

export class ExpressionFrameDto {
  expression: string;
  confidence: number;
  timestamp: number;
}

export class IngestMetricsDto {
  batchStartTs: number;
  eyeTracking?: EyeFrameDto[];
  fillerWords?: FillerWordsDto;
  expressions?: ExpressionFrameDto[];
}
