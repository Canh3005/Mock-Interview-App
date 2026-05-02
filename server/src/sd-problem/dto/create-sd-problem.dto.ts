import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsIn,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CurveBallScenarioDto {
  @IsString()
  @IsNotEmpty()
  trigger!: string;

  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsString()
  @IsNotEmpty()
  expectedAdaptation!: string;
}

export class CreateSDProblemDto {
  @ApiProperty({ example: 'URL Shortener' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    required: false,
    example: 'When you paste a long URL into Bit.ly...',
  })
  @IsOptional()
  @IsString()
  context?: string | null;

  @ApiProperty({ example: 'url-shortener' })
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @ApiProperty({ example: ['backend', 'full-stack'] })
  @IsArray()
  @IsString({ each: true })
  targetRole!: string[];

  @ApiProperty({ enum: ['mid', 'senior', 'staff'] })
  @IsIn(['mid', 'senior', 'staff'])
  targetLevel!: 'mid' | 'senior' | 'staff';

  @ApiProperty({ enum: ['medium', 'hard'] })
  @IsIn(['medium', 'hard'])
  difficulty!: 'medium' | 'hard';

  @ApiProperty({ example: 45 })
  @IsNumber()
  estimatedDuration!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  scalingConstraints?: Record<string, unknown>;

  @ApiProperty({ example: ['API Gateway', 'Cache', 'DB'] })
  @IsArray()
  @IsString({ each: true })
  expectedComponents!: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  referenceArchitecture?: Record<string, unknown>;

  @ApiProperty({ required: false, type: [CurveBallScenarioDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurveBallScenarioDto)
  curveBallScenarios?: CurveBallScenarioDto[];

  @ApiProperty({ required: false, example: ['scalability', 'caching'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
