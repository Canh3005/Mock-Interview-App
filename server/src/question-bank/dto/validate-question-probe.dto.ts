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
  QUESTION_PROBE_TYPES,
  QuestionProbeFollowUpTrigger,
} from '../constants/question-bank-taxonomy.constants';

export class QuestionProbeLocalizedContentDto {
  @ApiProperty({ example: 'Handling technical disagreement' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'How do you handle technical disagreement?' })
  @IsString()
  @IsNotEmpty()
  displayQuestion!: string;

  @ApiProperty({ example: 'Assess ownership and conflict handling.' })
  @IsString()
  @IsNotEmpty()
  displayIntent!: string;

  @ApiProperty({ example: ['Use a specific situation', 'Clarify impact'] })
  @IsArray()
  @IsString({ each: true })
  guidance!: string[];

  @ApiProperty({ example: ['Answering only in theory'] })
  @IsArray()
  @IsString({ each: true })
  commonMistakes!: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  labels?: Record<string, string>;
}

export class QuestionProbeFollowUpDto {
  @ApiProperty({ enum: QUESTION_PROBE_FOLLOW_UP_TRIGGERS })
  @IsIn(QUESTION_PROBE_FOLLOW_UP_TRIGGERS)
  trigger!: string;

  @ApiProperty({ example: 'What metric changed after your decision?' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ example: 'Clarify impact measurement.' })
  @IsString()
  @IsNotEmpty()
  purpose!: string;
}

export class QuestionProbeExpectedSignalDto {
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
}

export class QuestionProbeScoringHintDto {
  @ApiProperty({ example: 'strong' })
  @IsString()
  @IsNotEmpty()
  scoreBand!: string;

  @ApiProperty({ example: 'Gives a specific decision and measurable impact.' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class ValidateQuestionProbeDto {
  @ApiProperty({ required: false, example: 'backend-mid-conflict-001' })
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiProperty({ enum: QUESTION_PROBE_STAGES, isArray: true })
  @IsArray()
  @IsIn(QUESTION_PROBE_STAGES, { each: true })
  stages!: string[];

  @ApiProperty({ enum: QUESTION_PROBE_ROLE_FAMILIES, isArray: true })
  @IsArray()
  @IsIn(QUESTION_PROBE_ROLE_FAMILIES, { each: true })
  roleFamilies!: string[];

  @ApiProperty({ enum: QUESTION_PROBE_LEVELS, isArray: true })
  @IsArray()
  @IsIn(QUESTION_PROBE_LEVELS, { each: true })
  levels!: string[];

  @ApiProperty({ enum: QUESTION_PROBE_TYPES })
  @IsIn(QUESTION_PROBE_TYPES)
  type!: string;

  @ApiProperty({ enum: QUESTION_PROBE_COMPETENCIES, isArray: true })
  @IsArray()
  @IsIn(QUESTION_PROBE_COMPETENCIES, { each: true })
  competencies!: string[];

  @ApiProperty({ example: ['nestjs', 'postgresql'] })
  @IsArray()
  @IsString({ each: true })
  techTags!: string[];

  @ApiProperty({ minimum: 1, maximum: 5, example: 3 })
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty!: number;

  @ApiProperty({ example: 'Assess how the candidate resolves disagreement.' })
  @IsString()
  @IsNotEmpty()
  intent!: string;

  @ApiProperty({ example: 'Ask about a real technical disagreement.' })
  @IsString()
  @IsNotEmpty()
  primaryQuestion!: string;

  @ApiProperty({ type: [QuestionProbeExpectedSignalDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionProbeExpectedSignalDto)
  expectedSignals!: QuestionProbeExpectedSignalDto[];

  @ApiProperty({ example: ['Blames others', 'No concrete action'] })
  @IsArray()
  @IsString({ each: true })
  redFlags!: string[];

  @ApiProperty({ type: [QuestionProbeScoringHintDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionProbeScoringHintDto)
  scoringHints!: QuestionProbeScoringHintDto[];

  @ApiProperty({ type: [QuestionProbeFollowUpDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionProbeFollowUpDto)
  followUps!: QuestionProbeFollowUpDto[];

  @ApiProperty({
    example: {
      vi: {
        title: 'Bất đồng kỹ thuật',
        displayQuestion: 'Bạn xử lý bất đồng kỹ thuật như thế nào?',
        displayIntent: 'Đánh giá ownership và conflict handling.',
        guidance: ['Nêu tình huống cụ thể'],
        commonMistakes: ['Trả lời quá chung chung'],
        labels: { difficulty: 'Trung bình' },
      },
    },
  })
  @IsObject()
  localizedContent!: Record<string, QuestionProbeLocalizedContentDto>;
}
