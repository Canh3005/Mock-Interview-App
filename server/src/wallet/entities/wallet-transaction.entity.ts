import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  BONUS = 'BONUS',
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
  REFUND = 'REFUND',
}

@Entity('wallet_transaction')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  walletId!: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'walletId' })
  wallet!: Wallet;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'int', nullable: true })
  balanceAfter!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
