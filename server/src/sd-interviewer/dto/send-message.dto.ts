import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'What is the expected QPS for this system?' })
  @IsString()
  @IsNotEmpty()
  userMessage!: string;
}
