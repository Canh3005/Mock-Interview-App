import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'What is the expected QPS for this system?' })
  @IsString()
  @IsNotEmpty()
  userMessage!: string;

  @ApiProperty({
    required: false,
    description: 'True when sent by silence detection timer',
  })
  @IsOptional()
  @IsBoolean()
  isSilenceTrigger?: boolean;

  @ApiProperty({
    required: false,
    description: 'Silence trigger count (1 or 2) for this phase',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  silenceCount?: number;
}
