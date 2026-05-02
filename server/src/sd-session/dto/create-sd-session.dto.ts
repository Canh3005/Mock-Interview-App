import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsIn,
  IsOptional,
} from 'class-validator';

export class CreateSDSessionDto {
  @ApiProperty({ example: 'uuid-of-interview-session' })
  @IsUUID()
  @IsNotEmpty()
  interviewSessionId!: string;

  @ApiProperty({ example: 45 })
  @IsNumber()
  durationMinutes!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  enableCurveball!: boolean;

  @ApiProperty({ example: 'vi', enum: ['vi', 'en', 'ja'] })
  @IsOptional()
  @IsIn(['vi', 'en', 'ja'])
  language?: string;
}
