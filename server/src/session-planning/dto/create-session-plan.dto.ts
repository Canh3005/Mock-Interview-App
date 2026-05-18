import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { InterviewDepth, PersonaTone } from '../types/session-plan.types';
import type { QuestionProbeLanguage } from '../../question-bank/constants/question-bank-taxonomy.constants';

export class CreateSessionPlanDto {
  @ApiProperty({
    required: false,
    description:
      'Interview session ID để liên kết plan với session (tự động khi tạo qua interview flow)',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({ description: 'ID của calibration profile từ F029' })
  @IsString()
  @IsNotEmpty()
  calibrationProfileId: string;

  @ApiProperty({
    enum: ['broad', 'deep'],
    description: 'broad: cover đủ 6 stage; deep: đào sâu tech',
  })
  @IsIn(['broad', 'deep'])
  depth: InterviewDepth;

  @ApiProperty({
    minimum: 30,
    maximum: 120,
    description: 'Tổng thời gian phỏng vấn (phút)',
  })
  @IsInt()
  @Min(30)
  @Max(120)
  durationMinutes: number;

  @ApiProperty({ enum: ['vi', 'en', 'ja'] })
  @IsIn(['vi', 'en', 'ja'])
  language: QuestionProbeLanguage;

  @ApiProperty({
    required: false,
    enum: ['friendly', 'neutral', 'skeptical', 'silent', 'detail_oriented'],
    description: 'Ghi đè tone mặc định theo level nếu có',
  })
  @IsOptional()
  @IsIn(['friendly', 'neutral', 'skeptical', 'silent', 'detail_oriented'])
  personaPreference?: PersonaTone;
}
