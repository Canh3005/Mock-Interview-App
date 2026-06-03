import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentOrder } from './entities/payment-order.entity';
import { PaymentService } from './services/payment.service';
import { MomoService } from './services/momo.service';
import { VnpayService } from './services/vnpay.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder]),
    HttpModule,
  ],
  providers: [PaymentService, MomoService, VnpayService],
  controllers: [PaymentController],
})
export class PaymentModule {}
