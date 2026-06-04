import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import {
  PaymentOrder,
  OrderStatus,
  PaymentMethodEnum,
} from '../entities/payment-order.entity';
import { PaymentService } from '../services/payment.service';
import { VnpayService } from '../services/vnpay.service';
import {
  PAYMENT_RECOVERY_QUEUE,
  PaymentRecoveryJobName,
} from '../constants/payment.constants';

@Processor(PAYMENT_RECOVERY_QUEUE)
export class PaymentRecoveryWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(PaymentRecoveryWorker.name);

  constructor(
    @InjectQueue(PAYMENT_RECOVERY_QUEUE) private readonly queue: Queue,
    @InjectRepository(PaymentOrder)
    private readonly orderRepo: Repository<PaymentOrder>,
    private readonly paymentService: PaymentService,
    private readonly vnpayService: VnpayService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.add(
      PaymentRecoveryJobName.SCAN,
      {},
      {
        repeat: { every: 5 * 60 * 1000 }, // every 5 minutes
        jobId: 'payment-recovery-repeatable',
      },
    );
    this.logger.log('Payment recovery job scheduled (every 5 min)');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== PaymentRecoveryJobName.SCAN) return;

    const cutoff = new Date(Date.now() - 2 * 60 * 1000); // older than 2 min
    const staleOrders = await this.orderRepo.find({
      where: {
        status: OrderStatus.PENDING,
        createdAt: LessThan(cutoff),
      },
      take: 50,
    });

    if (staleOrders.length === 0) return;

    this.logger.log(
      `Recovery scan: found ${staleOrders.length} stale PENDING orders`,
    );

    for (const order of staleOrders) {
      try {
        await this._recoverOrder(order);
      } catch (error) {
        this.logger.error(`Recovery failed for order ${order.id}`, error);
      }
    }
  }

  private async _recoverOrder(order: PaymentOrder): Promise<void> {
    if (order.expiredAt < new Date()) {
      await this.orderRepo.update(order.id, { status: OrderStatus.EXPIRED });
      this.logger.log(`Order ${order.id} marked EXPIRED`);
      return;
    }

    if (order.paymentMethod === PaymentMethodEnum.VNPAY) {
      const result = await this.vnpayService.queryTransaction(
        order.idempotencyKey,
        order.createdAt,
      );

      this.logger.log(`Order ${order.id} VNPay query result: ${result}`);

      if (result === 'paid') {
        await this.paymentService.processVnpayReturnByKey(order.idempotencyKey);
      } else if (result === 'failed') {
        await this.orderRepo.update(order.id, { status: OrderStatus.FAILED });
      }
      // 'pending' → leave as is, retry next scan
    }
    // MoMo: rely on IPN only (no query API implemented)
  }
}
