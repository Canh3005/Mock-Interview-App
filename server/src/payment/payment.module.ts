import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { PaymentOrder } from './entities/payment-order.entity';
import { PaymentService } from './services/payment.service';
import { MomoService } from './services/momo.service';
import { VnpayService } from './services/vnpay.service';
import { PaymentController } from './payment.controller';
import { PaymentRecoveryWorker } from './workers/payment-recovery.worker';
import { PAYMENT_RECOVERY_QUEUE } from './constants/payment.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder]),
    HttpModule,
    BullModule.registerQueueAsync({ name: PAYMENT_RECOVERY_QUEUE }),
  ],
  providers: [PaymentService, MomoService, VnpayService, PaymentRecoveryWorker],
  controllers: [PaymentController],
})
export class PaymentModule {}
