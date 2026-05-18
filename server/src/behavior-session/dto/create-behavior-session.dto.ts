import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateBehaviorSessionDto {
  @ApiProperty({ example: 'uuid-of-interview-session' })
  @IsUUID()
  @IsNotEmpty()
  interviewSessionId: string;
}
