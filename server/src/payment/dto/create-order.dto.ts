import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PACKAGE_IDS,
  PAYMENT_METHODS,
  PackageId,
  PaymentMethod,
} from '../constants/payment.constants';

export class CreateOrderDto {
  @ApiProperty({ enum: PACKAGE_IDS })
  @IsString()
  @IsIn(PACKAGE_IDS)
  packageId: PackageId;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsString()
  @IsIn(PAYMENT_METHODS)
  paymentMethod: PaymentMethod;
}
