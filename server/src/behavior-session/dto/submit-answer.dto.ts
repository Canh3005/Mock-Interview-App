import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({ example: 'Tôi đã từng dẫn dắt một dự án...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;
}
