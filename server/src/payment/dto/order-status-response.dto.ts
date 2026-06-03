import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../entities/payment-order.entity';

export class OrderStatusResponseDto {
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiPropertyOptional({ example: 27 })
  newBalance?: number;
}
