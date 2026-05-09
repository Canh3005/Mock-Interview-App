import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import {
  WalletTransaction,
  TransactionType,
} from './entities/wallet-transaction.entity';
import { WalletBonusClaim } from './entities/wallet-bonus-claim.entity';

const SIGNUP_BONUS = 5;
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(WalletBonusClaim)
    private claimRepo: Repository<WalletBonusClaim>,
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

  // async deductCredit({
  //   userId,
  //   amount,
  //   description,
  // }: {
  //   userId: string;
  //   amount: number;
  //   description: string;
  // }): Promise<number> {
  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();

  //   try {
  //     const wallet: Wallet | null = await queryRunner.manager.findOne(Wallet, {
  //       where: { userId },
  //       lock: { mode: 'pessimistic_write' },
  //     });

  //     // if (!wallet) throw new NotFoundException('Wallet not found');

  //     if (wallet.balance < amount) {
  //       throw new BadRequestException({
  //         code: 'INSUFFICIENT_CREDITS',
  //         required: amount,
  //         current: wallet.balance,
  //         deficit: amount - wallet.balance,
  //       });
  //     }

  //     wallet.balance -= amount;
  //     await queryRunner.manager.save(wallet);

  //     const tx: WalletTransaction = queryRunner.manager.create(
  //       WalletTransaction,
  //       {
  //         walletId: wallet.id,
  //         type: TransactionType.DEBIT,
  //         amount,
  //         description,
  //       },
  //     );
  //     await queryRunner.manager.save(tx);

  //     await queryRunner.commitTransaction();
  //     this.logger.log(
  //       `Deducted ${amount} credits from user ${userId}. New balance: ${wallet.balance}`,
  //     );

  //     return wallet.balance;
  //   } catch (error) {
  //     await queryRunner.rollbackTransaction();
  //     throw error;
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

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
