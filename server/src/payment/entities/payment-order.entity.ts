import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentMethodEnum {
  MOMO = 'momo',
  VNPAY = 'vnpay',
}

@Entity('payment_order')
export class PaymentOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  packageId: string;

  @Column({ type: 'enum', enum: PaymentMethodEnum })
  paymentMethod: PaymentMethodEnum;

  @Column({ type: 'int' })
  credits: number;

  @Column({ type: 'int' })
  amountVnd: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ unique: true })
  idempotencyKey: string;

  @Column({ nullable: true })
  providerOrderId?: string;

  @Column({ type: 'timestamp with time zone' })
  expiredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
