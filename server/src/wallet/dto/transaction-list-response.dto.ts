import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../entities/wallet-transaction.entity';

export class TransactionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: TransactionType })
  type!: TransactionType;

  @ApiProperty()
  amount!: number;

  @ApiPropertyOptional()
  balanceAfter!: number | null;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class TransactionListResponseDto {
  @ApiProperty({ type: [TransactionItemDto] })
  data!: TransactionItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
