import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import {
  WalletTransaction,
  TransactionType,
} from './entities/wallet-transaction.entity';
import { WalletBonusClaim } from './entities/wallet-bonus-claim.entity';
import {
  PG_UNIQUE_VIOLATION,
  SIGNUP_BONUS,
} from './constants/wallet.constants';
import {
  TransactionItemDto,
  TransactionListResponseDto,
} from './dto/transaction-list-response.dto';

const TX_FILTER_MAP: Record<string, TransactionType[]> = {
  income: [
    TransactionType.CREDIT,
    TransactionType.BONUS,
    TransactionType.REFUND,
  ],
  expense: [TransactionType.DEBIT],
  refund: [TransactionType.REFUND],
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    private dataSource: DataSource,
  ) {}

  async createWalletWithBonus({
    userId,
    email,
  }: {
    userId: string;
    email: string;
  }): Promise<void> {
    const wallet: Wallet = this.walletRepo.create({ userId, balance: 0 });
    const savedWallet: Wallet = await this.walletRepo.save(wallet);

    await this._claimSignupBonus({ wallet: savedWallet, email });
  }

  async deductCredit({
    userId,
    amount,
    description,
  }: {
    userId: string;
    amount: number;
    description: string;
  }): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet: Wallet | null = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet || wallet.balance < amount) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_CREDITS',
          required: amount,
          current: wallet?.balance ?? 0,
          deficit: amount - (wallet?.balance ?? 0),
        });
      }

      wallet.balance -= amount;
      await queryRunner.manager.save(wallet);

      const tx: WalletTransaction = queryRunner.manager.create(
        WalletTransaction,
        {
          walletId: wallet.id,
          type: TransactionType.DEBIT,
          amount,
          description,
          balanceAfter: wallet.balance,
        },
      );
      await queryRunner.manager.save(tx);

      await queryRunner.commitTransaction();
      this.logger.log(
        `Deducted ${amount} credits from user ${userId}. New balance: ${wallet.balance}`,
      );

      return wallet.balance;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async addCredit({
    userId,
    amount,
    description,
  }: {
    userId: string;
    amount: number;
    description: string;
  }): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let wallet: Wallet | null = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        wallet = queryRunner.manager.create(Wallet, { userId, balance: 0 });
        await queryRunner.manager.save(wallet);
      }

      wallet.balance += amount;
      await queryRunner.manager.save(wallet);

      const tx: WalletTransaction = queryRunner.manager.create(
        WalletTransaction,
        {
          walletId: wallet.id,
          type: TransactionType.CREDIT,
          amount,
          description,
          balanceAfter: wallet.balance,
        },
      );
      await queryRunner.manager.save(tx);

      await queryRunner.commitTransaction();
      this.logger.log(
        `Added ${amount} credits to user ${userId}. New balance: ${wallet.balance}`,
      );

      return wallet.balance;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getBalance(userId: string, email?: string): Promise<number> {
    const wallet: Wallet | null = await this.walletRepo.findOne({
      where: { userId },
    });
    if (!wallet) {
      if (email) {
        await this.createWalletWithBonus({ userId, email });
        return SIGNUP_BONUS;
      }
      return 0;
    }
    return wallet.balance;
  }

  async getTransactions(
    userId: string,
    page: number,
    limit: number,
    type: string,
  ): Promise<TransactionListResponseDto> {
    const wallet: Wallet | null = await this.walletRepo.findOne({
      where: { userId },
    });

    if (!wallet) {
      return { data: [], total: 0, page, limit };
    }

    const typeFilter = TX_FILTER_MAP[type];
    const where: Record<string, unknown> = { walletId: wallet.id };
    if (typeFilter) {
      where['type'] = In(typeFilter);
    }

    const txRepo = this.dataSource.getRepository(WalletTransaction);
    const [rows, total] = await txRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data: TransactionItemDto[] = rows.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      description: tx.description ?? null,
      createdAt: tx.createdAt,
    }));

    return { data, total, page, limit };
  }

  private async _claimSignupBonus({
    wallet,
    email,
  }: {
    wallet: Wallet;
    email: string;
  }): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const claim: WalletBonusClaim = queryRunner.manager.create(
        WalletBonusClaim,
        { email },
      );
      await queryRunner.manager.save(claim);

      wallet.balance = SIGNUP_BONUS;
      await queryRunner.manager.save(wallet);

      const tx: WalletTransaction = queryRunner.manager.create(
        WalletTransaction,
        {
          walletId: wallet.id,
          type: TransactionType.BONUS,
          amount: SIGNUP_BONUS,
          description: 'Signup bonus',
          balanceAfter: SIGNUP_BONUS,
        },
      );
      await queryRunner.manager.save(tx);

      await queryRunner.commitTransaction();
      this.logger.log(`Signup bonus granted to ${email}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();

      const isUniqueViolation =
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code: string }).code ===
          PG_UNIQUE_VIOLATION;

      if (!isUniqueViolation) {
        this.logger.error('Failed to claim signup bonus', error);
      }
    } finally {
      await queryRunner.release();
    }
  }
}
