import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsIn,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SDPhase } from '../entities/sd-session.entity';

export class ArchitectureNodeDto {
  @ApiProperty({ example: 'node-1' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 'LoadBalancer' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: 'LB' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ example: { x: 100, y: 200 } })
  position!: { x: number; y: number };
}

export class ArchitectureEdgeDto {
  @ApiProperty({ example: 'node-1' })
  @IsString()
  @IsNotEmpty()
  from!: string;

  @ApiProperty({ example: 'node-2' })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ example: 'HTTP' })
  @IsString()
  @IsNotEmpty()
  label!: string;
}

export class UpdateArchitectureDto {
  @ApiProperty({ type: [ArchitectureNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArchitectureNodeDto)
  nodes!: ArchitectureNodeDto[];

  @ApiProperty({ type: [ArchitectureEdgeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArchitectureEdgeDto)
  edges!: ArchitectureEdgeDto[];
}

export class UpdatePhaseDto {
  @ApiProperty({
    enum: ['CLARIFICATION', 'DESIGN', 'DEEP_DIVE', 'WRAP_UP', 'COMPLETED'],
  })
  @IsIn(['CLARIFICATION', 'DESIGN', 'DEEP_DIVE', 'WRAP_UP', 'COMPLETED'])
  phase!: SDPhase;
}

export class AppendTranscriptDto {
  @ApiProperty({ example: 'I would use a load balancer here.' })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @ApiProperty({ enum: ['voice', 'text'] })
  @IsIn(['voice', 'text'])
  source!: 'voice' | 'text';
}
