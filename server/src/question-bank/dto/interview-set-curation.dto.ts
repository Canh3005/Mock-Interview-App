import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  QUESTION_PROBE_COMPETENCIES,
  QUESTION_PROBE_LEVELS,
  QUESTION_PROBE_ROLE_FAMILIES,
  QUESTION_PROBE_STAGES,
  QuestionProbeCompetency,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeStage,
} from '../constants/question-bank-taxonomy.constants';
import { QuestionProbeLocalizedContentDto } from './validate-question-probe.dto';

export class InterviewSetSlotRuleDto {
  @ApiProperty({ enum: QUESTION_PROBE_STAGES })
  @IsIn(QUESTION_PROBE_STAGES)
  stage!: QuestionProbeStage;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, enum: QUESTION_PROBE_COMPETENCIES })
  @IsOptional()
  @IsIn(QUESTION_PROBE_COMPETENCIES)
  competency?: QuestionProbeCompetency;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  count!: number;
}

export class InterviewSetDraftDto {
  @ApiProperty({ required: false, example: 'backend-mid-standard' })
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiProperty({ example: 'Backend Developer - Mid Level' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  localizedContent?: Record<string, QuestionProbeLocalizedContentDto>;

  @ApiProperty({ enum: QUESTION_PROBE_ROLE_FAMILIES })
  @IsIn(QUESTION_PROBE_ROLE_FAMILIES)
  roleFamily!: QuestionProbeRoleFamily;

  @ApiProperty({ enum: QUESTION_PROBE_LEVELS })
  @IsIn(QUESTION_PROBE_LEVELS)
  level!: QuestionProbeLevel;

  @ApiProperty({ example: 45 })
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiProperty({ minimum: 1, maximum: 5, example: 3 })
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty!: number;

  @ApiProperty({ enum: QUESTION_PROBE_STAGES, isArray: true })
  @IsArray()
  @IsIn(QUESTION_PROBE_STAGES, { each: true })
  stages!: QuestionProbeStage[];

  @ApiProperty({ enum: QUESTION_PROBE_COMPETENCIES, isArray: true })
  @IsArray()
  @IsIn(QUESTION_PROBE_COMPETENCIES, { each: true })
  competencies!: QuestionProbeCompetency[];

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  questionCount!: number;

  @ApiProperty({ required: false, example: ['uuid-1', 'uuid-2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  probeIds?: string[];

  @ApiProperty({ required: false, type: [InterviewSetSlotRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewSetSlotRuleDto)
  slotRules?: InterviewSetSlotRuleDto[];
}

export class TransitionInterviewSetDto {
  @ApiProperty({ required: false, example: 'Ready for candidate sessions.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
