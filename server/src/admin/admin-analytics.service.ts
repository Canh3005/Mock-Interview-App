import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WalletTransaction,
  TransactionType,
} from '../wallet/entities/wallet-transaction.entity';
import { LlmUsageLog } from '../ai/entities/llm-usage-log.entity';
import { LlmAnomalyAlert } from '../ai/entities/llm-anomaly-alert.entity';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import { InterviewSession } from '../interview/entities/interview-session.entity';
import type {
  InterviewMode,
  InterviewRound,
} from '../interview/entities/interview-session.entity';

export interface RevenueRow {
  date: string;
  creditTotal: string | number | null;
  bonusTotal: string | number | null;
  txCount: string | number;
}

export interface RevenueTotals {
  creditTotal: number;
  bonusTotal: number;
}

export interface LlmModelCostRow {
  model: string | null;
  callCount: string | number;
  totalInputTokens: string | number | null;
  totalOutputTokens: string | number | null;
  totalCostUsd: string | number | null;
}

export interface LlmDailyCostRow {
  date: string;
  callCount: string | number;
  totalCostUsd: string | number | null;
}

export interface ExamModeUsageRow {
  mode: InterviewMode | null;
  count: string | number;
}

export interface RoundUsageRow {
  round: InterviewRound;
  count: string | number;
}

export interface RevenueDayTransactionRow {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
  userId: string;
  userName: string | null;
  userEmail: string;
}

export interface RevenueDayTransactionsResult {
  data: RevenueDayTransactionRow[];
  total: number;
  page: number;
  limit: number;
}

const PERIOD_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };

function periodStart(period: string): Date {
  const days = PERIOD_DAYS[period] ?? 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    @InjectRepository(LlmUsageLog)
    private readonly llmLogRepo: Repository<LlmUsageLog>,
    @InjectRepository(LlmAnomalyAlert)
    private readonly anomalyRepo: Repository<LlmAnomalyAlert>,
    @InjectRepository(QuestionProbe)
    private readonly probeRepo: Repository<QuestionProbe>,
    @InjectRepository(InterviewSession)
    private readonly sessionRepo: Repository<InterviewSession>,
  ) {}

  async getRevenue(period: string) {
    const since = periodStart(period);

    const rows = await this.txRepo
      .createQueryBuilder('tx')
      .select(`DATE(tx."createdAt")`, 'date')
      .addSelect(
        `SUM(CASE WHEN tx.type = '${TransactionType.CREDIT}' THEN tx.amount ELSE 0 END)`,
        'creditTotal',
      )
      .addSelect(
        `SUM(CASE WHEN tx.type = '${TransactionType.BONUS}' THEN tx.amount ELSE 0 END)`,
        'bonusTotal',
      )
      .addSelect(`COUNT(*)`, 'txCount')
      .where(`tx."createdAt" >= :since`, { since })
      .andWhere(`tx.type IN (:...types)`, {
        types: [TransactionType.CREDIT, TransactionType.BONUS],
      })
      .groupBy(`DATE(tx."createdAt")`)
      .orderBy(`DATE(tx."createdAt")`, 'DESC')
      .getRawMany<RevenueRow>();

    const totals = rows.reduce<RevenueTotals>(
      (acc, r) => ({
        creditTotal: acc.creditTotal + Number(r.creditTotal ?? 0),
        bonusTotal: acc.bonusTotal + Number(r.bonusTotal ?? 0),
      }),
      { creditTotal: 0, bonusTotal: 0 },
    );

    return { period, totals, daily: rows };
  }

  async getLlmCost(period: string) {
    const since = periodStart(period);

    const byModel = await this.llmLogRepo
      .createQueryBuilder('log')
      .select('log.model', 'model')
      .addSelect('COUNT(*)', 'callCount')
      .addSelect('SUM(log."inputTokens")', 'totalInputTokens')
      .addSelect('SUM(log."outputTokens")', 'totalOutputTokens')
      .addSelect('SUM(log."costUsd")', 'totalCostUsd')
      .where(`log."createdAt" >= :since`, { since })
      .groupBy('log.model')
      .orderBy('SUM(log."costUsd")', 'DESC')
      .getRawMany<LlmModelCostRow>();

    const daily = await this.llmLogRepo
      .createQueryBuilder('log')
      .select(`DATE(log."createdAt")`, 'date')
      .addSelect('COUNT(*)', 'callCount')
      .addSelect('SUM(log."costUsd")', 'totalCostUsd')
      .where(`log."createdAt" >= :since`, { since })
      .groupBy(`DATE(log."createdAt")`)
      .orderBy(`DATE(log."createdAt")`, 'DESC')
      .getRawMany<LlmDailyCostRow>();

    return { period, byModel, daily };
  }

  async getQuestionUsage(limit: number) {
    const probes = await this.probeRepo.find({
      where: { status: 'active' },
      order: { viewCount: 'DESC' },
      take: limit,
      select: [
        'id',
        'code',
        'primaryQuestion',
        'viewCount',
        'status',
        'roleFamilies',
        'levels',
      ],
    });

    return { data: probes };
  }

  async getExamModeUsage(period: string) {
    const since = periodStart(period);

    const byMode = await this.sessionRepo
      .createQueryBuilder('s')
      .select('s.mode', 'mode')
      .addSelect('COUNT(*)', 'count')
      .where(`s."startedAt" >= :since`, { since })
      .groupBy('s.mode')
      .getRawMany<ExamModeUsageRow>();

    // unnest rounds array to count per round type
    const byRound = await this.sessionRepo.query<RoundUsageRow[]>(
      `SELECT r.round, COUNT(*) as count
       FROM interview_sessions s, jsonb_array_elements_text(s.rounds::jsonb) AS r(round)
       WHERE s."startedAt" >= $1
       GROUP BY r.round
       ORDER BY count DESC`,
      [since],
    );

    return { period, byMode, byRound };
  }

  async getRevenueDayTransactions(
    date: string,
    page: number,
    limit: number,
  ): Promise<RevenueDayTransactionsResult> {
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      this.txRepo.query<
        {
          id: string;
          type: string;
          amount: string;
          description: string | null;
          createdAt: string;
          userId: string;
          userName: string | null;
          userEmail: string;
        }[]
      >(
        `SELECT tx.id, tx.type, tx.amount, tx.description, tx."createdAt",
                u.id AS "userId", u.name AS "userName", u.email AS "userEmail"
         FROM wallet_transaction tx
         JOIN wallet w ON w.id = tx."walletId"
         JOIN "user" u ON u.id = w."userId"
         WHERE DATE(tx."createdAt") = $1::date
           AND tx.type IN ('CREDIT', 'BONUS')
         ORDER BY tx."createdAt" DESC
         LIMIT $2 OFFSET $3`,
        [date, limit, offset],
      ),
      this.txRepo.query<{ count: string }[]>(
        `SELECT COUNT(*) as count
         FROM wallet_transaction tx
         JOIN wallet w ON w.id = tx."walletId"
         WHERE DATE(tx."createdAt") = $1::date
           AND tx.type IN ('CREDIT', 'BONUS')`,
        [date],
      ),
    ]);

    return {
      data: rows.map((r) => ({ ...r, amount: Number(r.amount) })),
      total: Number(countResult[0]?.count ?? 0),
      page,
      limit,
    };
  }

  async getAnomalies(page: number, limit: number) {
    const [data, total] = await this.anomalyRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }
}
