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
  QUESTION_PROBE_FOLLOW_UP_TRIGGERS,
  QUESTION_PROBE_LEVELS,
  QUESTION_PROBE_ROLE_FAMILIES,
  QUESTION_PROBE_STAGES,
  QUESTION_PROBE_TOPIC_TAGS,
  QUESTION_PROBE_TYPES,
  QuestionProbeCompetency,
  QuestionProbeFollowUpTrigger,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeStage,
  QuestionProbeTopicTag,
  QuestionProbeType,
} from '../constants/question-bank-taxonomy.constants';
import { QuestionProbeLocalizedContentDto } from './validate-question-probe.dto';

export class QuestionProbeFollowUpInputDto {
  @ApiProperty({ enum: QUESTION_PROBE_FOLLOW_UP_TRIGGERS })
  @IsIn(QUESTION_PROBE_FOLLOW_UP_TRIGGERS)
  trigger!: QuestionProbeFollowUpTrigger;

  @ApiProperty({ example: 'What metric changed after your decision?' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ example: 'Clarify impact measurement.' })
  @IsString()
  @IsNotEmpty()
  purpose!: string;
}

export class QuestionProbeSignalRequirementInputDto {
  @ApiProperty({ example: 'read_benefit' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ example: 'Mentions that indexes improve read performance.' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class QuestionProbeExpectedSignalInputDto {
  @ApiProperty({ example: 'Names a concrete metric or baseline.' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({
    enum: QUESTION_PROBE_FOLLOW_UP_TRIGGERS,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsIn(QUESTION_PROBE_FOLLOW_UP_TRIGGERS)
  relatedTrigger?: QuestionProbeFollowUpTrigger | null;

  @ApiProperty({
    required: false,
    type: [QuestionProbeSignalRequirementInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionProbeSignalRequirementInputDto)
  requirements?: QuestionProbeSignalRequirementInputDto[];
}

export class QuestionProbeScoringHintInputDto {
  @ApiProperty({ example: 'strong' })
  @IsString()
  @IsNotEmpty()
  scoreBand!: string;

  @ApiProperty({ example: 'Mentions specific action and measurable impact.' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class QuestionProbeSourceReferenceInputDto {
  @ApiProperty({ example: 'Internal content brief' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class QuestionProbeDraftDto {
  @ApiProperty({ required: false, example: 'backend-mid-conflict-001' })
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiProperty({ required: false, enum: QUESTION_PROBE_STAGES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(QUESTION_PROBE_STAGES, { each: true })
  stages?: QuestionProbeStage[];

  @ApiProperty({
    required: false,
    enum: QUESTION_PROBE_ROLE_FAMILIES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(QUESTION_PROBE_ROLE_FAMILIES, { each: true })
  roleFamilies?: QuestionProbeRoleFamily[];

  @ApiProperty({ required: false, enum: QUESTION_PROBE_LEVELS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(QUESTION_PROBE_LEVELS, { each: true })
  levels?: QuestionProbeLevel[];

  @ApiProperty({ required: false, enum: QUESTION_PROBE_TYPES })
  @IsOptional()
  @IsIn(QUESTION_PROBE_TYPES)
  type?: QuestionProbeType | null;

  @ApiProperty({
    required: false,
    enum: QUESTION_PROBE_COMPETENCIES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(QUESTION_PROBE_COMPETENCIES, { each: true })
  competencies?: QuestionProbeCompetency[];

  @ApiProperty({ required: false, example: ['nestjs', 'postgresql'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techTags?: string[];

  @ApiProperty({
    required: false,
    enum: QUESTION_PROBE_TOPIC_TAGS,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(QUESTION_PROBE_TOPIC_TAGS, { each: true })
  topicTags?: QuestionProbeTopicTag[];

  @ApiProperty({ required: false, minimum: 1, maximum: 5, example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  intent?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  primaryQuestion?: string | null;

  @ApiProperty({
    required: false,
    type: [QuestionProbeExpectedSignalInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionProbeExpectedSignalInputDto)
  expectedSignals?: QuestionProbeExpectedSignalInputDto[];

  @ApiProperty({ required: false, type: [QuestionProbeScoringHintInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionProbeScoringHintInputDto)
  scoringHints?: QuestionProbeScoringHintInputDto[];

  @ApiProperty({ required: false, type: [QuestionProbeFollowUpInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionProbeFollowUpInputDto)
  followUps?: QuestionProbeFollowUpInputDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  localizedContent?: Record<string, QuestionProbeLocalizedContentDto>;

  @ApiProperty({
    required: false,
    type: [QuestionProbeSourceReferenceInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionProbeSourceReferenceInputDto)
  sourceReferences?: QuestionProbeSourceReferenceInputDto[];
}

export class TransitionQuestionProbeDto {
  @ApiProperty({ required: false, example: 'Content passes review.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ImportQuestionProbesDto {
  @ApiProperty({ type: [QuestionProbeDraftDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionProbeDraftDto)
  items!: QuestionProbeDraftDto[];
}
