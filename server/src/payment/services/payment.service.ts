import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PaymentOrder, OrderStatus, PaymentMethodEnum } from '../entities/payment-order.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderStatusResponseDto } from '../dto/order-status-response.dto';
import {
  CREDIT_PACKAGES,
  ORDER_EXPIRY_MINUTES,
  PackageId,
} from '../constants/payment.constants';
import { MomoService, MomoWebhookPayload } from './momo.service';
import { VnpayService } from './vnpay.service';
import { Wallet } from '../../wallet/entities/wallet.entity';
import {
  WalletTransaction,
  TransactionType,
} from '../../wallet/entities/wallet-transaction.entity';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private readonly orderRepo: Repository<PaymentOrder>,
    private readonly dataSource: DataSource,
    private readonly momoService: MomoService,
    private readonly vnpayService: VnpayService,
  ) {}

  getPackages() {
    return { packages: Object.values(CREDIT_PACKAGES) };
  }

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    ipAddr: string,
  ): Promise<{ orderId: string; redirectUrl: string }> {
    const pkg = CREDIT_PACKAGES[dto.packageId as PackageId];
    if (!pkg) {
      throw new BadRequestException({ code: 'INVALID_PACKAGE' });
    }

    const idempotencyKey = uuidv4();
    const expiredAt = new Date(
      Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000,
    );

    const order: PaymentOrder = this.orderRepo.create({
      userId,
      packageId: dto.packageId,
      paymentMethod: dto.paymentMethod as PaymentMethodEnum,
      credits: pkg.credits,
      amountVnd: pkg.priceVnd,
      idempotencyKey,
      expiredAt,
      status: OrderStatus.PENDING,
    });
    await this.orderRepo.save(order);

    let redirectUrl: string;
    const orderInfo = `Mua ${pkg.credits} Credits - ${pkg.name}`;

    if (dto.paymentMethod === 'momo') {
      redirectUrl = await this.momoService.createPayment({
        orderId: idempotencyKey,
        amount: pkg.priceVnd,
        orderInfo,
      });
    } else {
      redirectUrl = this.vnpayService.createPaymentUrl({
        orderId: idempotencyKey,
        amount: pkg.priceVnd,
        orderInfo,
        ipAddr,
      });
    }

    this.logger.log(
      `Order ${order.id} created for user ${userId} [${dto.packageId} / ${dto.paymentMethod}]`,
    );

    return { orderId: order.id, redirectUrl };
  }

  async getOrderStatus(
    orderId: string,
    userId: string,
  ): Promise<OrderStatusResponseDto> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new BadRequestException({ code: 'ORDER_NOT_FOUND' });
    }
    if (order.userId !== userId) {
      throw new ForbiddenException();
    }

    if (
      order.status === OrderStatus.PENDING &&
      order.expiredAt < new Date()
    ) {
      order.status = OrderStatus.EXPIRED;
      await this.orderRepo.save(order);
    }

    return { status: order.status };
  }

  async handleMomoWebhook(payload: MomoWebhookPayload): Promise<void> {
    this.logger.log(
      `MoMo webhook received: orderId=${payload.orderId} resultCode=${payload.resultCode}`,
    );

    const valid = this.momoService.verifySignature(payload);
    if (!valid) {
      this.logger.warn(`MoMo webhook signature invalid for orderId=${payload.orderId}`);
      throw new BadRequestException('Invalid signature');
    }

    const success = payload.resultCode === 0;
    await this._processWebhookPayment(payload.orderId, success, 'momo');
  }

  async handleVnpayWebhook(
    query: Record<string, string>,
  ): Promise<{ RspCode: string; Message: string }> {
    const orderId = query['vnp_TxnRef'];
    this.logger.log(
      `VNPay webhook received: orderId=${orderId} responseCode=${query['vnp_ResponseCode']}`,
    );

    const valid = this.vnpayService.verifySignature(query);
    if (!valid) {
      this.logger.warn(`VNPay webhook signature invalid for orderId=${orderId}`);
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }

    const order = await this.orderRepo.findOne({
      where: { idempotencyKey: orderId },
    });
    if (!order) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    const success = query['vnp_ResponseCode'] === '00';
    await this._processWebhookPayment(orderId, success, 'vnpay');

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  private async _processWebhookPayment(
    idempotencyKey: string,
    success: boolean,
    provider: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(PaymentOrder, {
        where: { idempotencyKey },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        this.logger.warn(
          `[${provider}] Unknown order for idempotencyKey: ${idempotencyKey}`,
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      if (order.status !== OrderStatus.PENDING) {
        this.logger.log(
          `[${provider}] Order ${order.id} already processed (status: ${order.status}) — skipping`,
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      if (order.expiredAt < new Date()) {
        order.status = OrderStatus.EXPIRED;
        await queryRunner.manager.save(order);
        await queryRunner.commitTransaction();
        this.logger.warn(`[${provider}] Order ${order.id} expired`);
        return;
      }

      if (!success) {
        order.status = OrderStatus.FAILED;
        await queryRunner.manager.save(order);
        await queryRunner.commitTransaction();
        this.logger.log(`[${provider}] Payment failed for order ${order.id}`);
        return;
      }

      let wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: order.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        wallet = queryRunner.manager.create(Wallet, {
          userId: order.userId,
          balance: 0,
        });
        await queryRunner.manager.save(wallet);
      }

      wallet.balance += order.credits;
      await queryRunner.manager.save(wallet);

      const tx: WalletTransaction = queryRunner.manager.create(WalletTransaction, {
        walletId: wallet.id,
        type: TransactionType.CREDIT,
        amount: order.credits,
        description: `Purchase: ${order.credits} credits (order ${order.id})`,
      });
      await queryRunner.manager.save(tx);

      order.status = OrderStatus.PAID;
      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      this.logger.log(
        `[${provider}] Order ${order.id} PAID: +${order.credits} credits to user ${order.userId}. New balance: ${wallet.balance}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[${provider}] Webhook processing failed for ${idempotencyKey}`,
        error,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
