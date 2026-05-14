import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletService } from '../wallet/wallet.service';
import {
  InterviewSession,
  CandidateLevel,
} from './entities/interview-session.entity';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';
import { LiveCodingSession } from '../live-coding/entities/live-coding-session.entity';
import { LiveCodingSessionProblem } from '../live-coding/entities/live-coding-session-problem.entity';
import { SDSession } from '../sd-session/entities/sd-session.entity';
import { InitSessionDto } from './dto/init-session.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { CvJson, JdJson } from '../documents/documents.ai.service';
import { DocumentContextService } from '../documents/document-context.service';

const STAGE_NAMES: Record<number, string> = {
  1: 'Culture Fit',
  2: 'Tech Stack Deep-Dive',
  3: 'Domain Knowledge',
  4: 'CV-based Q&A',
  5: 'Soft Skills',
  6: 'Reverse Interview',
};

const ROUND_DURATIONS: Record<string, number> = {
  hr_behavioral: 20,
  dsa: 30,
  ai_prompting: 20,
  system_design: 30,
};

// TODO: re-enable when credit gate is active
// const ROUND_CREDIT_COST: Record<string, number> = {
//   hr_behavioral: 4,
//   dsa: 3,
//   system_design: 8,
//   ai_prompting: 2,
// };

const LOW_BALANCE_THRESHOLD = 5;

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    @InjectRepository(InterviewSession)
    private sessionRepo: Repository<InterviewSession>,
    @InjectRepository(BehavioralSession)
    private behavioralSessionRepo: Repository<BehavioralSession>,
    @InjectRepository(LiveCodingSession)
    private liveCodingSessionRepo: Repository<LiveCodingSession>,
    @InjectRepository(LiveCodingSessionProblem)
    private liveCodingSessionProblemRepo: Repository<LiveCodingSessionProblem>,
    @InjectRepository(SDSession)
    private sdSessionRepo: Repository<SDSession>,
    private walletService: WalletService,
    private documentContextService: DocumentContextService,
  ) {}

  async getAllSessionsForInterview(interviewSessionId: string) {
    const interviewSession = await this.sessionRepo.findOne({
      where: { id: interviewSessionId },
    });

    if (!interviewSession) {
      throw new BadRequestException('Interview session not found');
    }

    const [behavioralSession, liveCodingSession] = await Promise.all([
      this.behavioralSessionRepo.findOne({ where: { interviewSessionId } }),
      this.liveCodingSessionRepo.findOne({ where: { interviewSessionId } }),
    ]);

    let liveCodingData: Record<string, unknown> | null = null;
    if (liveCodingSession) {
      const sessionProblems = await this.liveCodingSessionProblemRepo.find({
        where: { sessionId: liveCodingSession.id },
        order: { order: 'ASC' },
      });
      liveCodingData = {
        id: liveCodingSession.id,
        status: liveCodingSession.status,
        finalScore: liveCodingSession.finalScore,
        problemIds: sessionProblems.map((sp) => sp.problemId),
        finalCode: Object.fromEntries(
          sessionProblems.map((sp) => [sp.problemId, sp.finalCode]),
        ),
        language: sessionProblems[0]?.language ?? 'python',
      };
    }

    const sdSession: SDSession | null = await this.sdSessionRepo.findOne({
      where: { interviewSessionId },
      relations: ['problem'],
    });

    return {
      interviewSessionId,
      sessions: {
        behavioral: behavioralSession || null,
        liveCoding: liveCodingData,
        prompt: null,
        systemDesign: sdSession ?? null,
      },
    };
  }

  async preflight(userId: string) {
    const context =
      await this.documentContextService.getInterviewContext(userId);
    this.logger.log(
      `Preflight check userId=${userId} missing=${context.missing.join(',') || 'none'} cvSource=${context.sources.cv} jdSource=${context.sources.jd}`,
    );

    if (context.missing.length > 0 || !context.cv || !context.jd) {
      return { ready: false, missing: context.missing };
    }

    const cvSnippet = this.buildCvSnippet(context.cv);
    const jdSnippet = this.buildJdSnippet(context.jd);

    return {
      ready: true,
      missing: [],
      summary: { cvSnippet, jdSnippet },
      cv: context.cv,
      jd: context.jd,
    };
  }

  async initSession(
    userId: string,
    dto: InitSessionDto,
  ): Promise<{
    sessionId: string;
    candidateLevel: CandidateLevel;
    estimatedDuration: number;
    newBalance: number | null;
    lowBalance: boolean;
  }> {
    const context =
      await this.documentContextService.getInterviewContext(userId);

    if (context.missing.length > 0 || !context.cv || !context.jd) {
      throw new BadRequestException(
        'CV and JD context are required to start an interview session.',
      );
    }

    const cvJson = context.cv;
    const jdJson = context.jd;
    const rawCv = JSON.stringify(cvJson);
    const rawJd = JSON.stringify(jdJson);

    // BE determines level (FE may suggest but BE validates/overrides if needed)
    const candidateLevel: CandidateLevel =
      dto.candidateLevel ?? this.classifyCandidateLevel(cvJson, jdJson);

    const estimatedDuration = dto.rounds.reduce(
      (sum, r) => sum + (ROUND_DURATIONS[r] ?? 20),
      0,
    );

    // TODO: re-enable credit gate after wallet migration for existing accounts
    // const totalCost: number = dto.rounds.reduce(
    //   (sum, r) => sum + (ROUND_CREDIT_COST[r] ?? 0),
    //   0,
    // );
    // if (totalCost > 0) {
    //   const roundNames: string = dto.rounds.join(', ');
    //   newBalance = await this.walletService.deductCredit({
    //     userId,
    //     amount: totalCost,
    //     description: `Interview session: ${roundNames}`,
    //   });
    // }
    const newBalance: number | null = null;

    const session = this.sessionRepo.create({
      userId,
      mode: dto.mode,
      rounds: dto.rounds,
      candidateLevel,
      status: 'IN_PROGRESS',
      cvContextSnapshot: rawCv,
      jdContextSnapshot: rawJd,
      language: dto.language ?? 'vi',
    });

    await this.sessionRepo.save(session);
    this.logger.log(
      `Session ${session.id} created for user ${userId} [${candidateLevel} / ${dto.mode}]`,
    );

    return {
      sessionId: session.id,
      candidateLevel,
      estimatedDuration,
      newBalance,
      lowBalance: newBalance !== null && newBalance < LOW_BALANCE_THRESHOLD,
    };
  }

  async updateContext(
    userId: string,
    dto: UpdateContextDto,
  ): Promise<{ updated: boolean }> {
    await this.documentContextService.saveContextOverride(userId, dto);
    return { updated: true };
  }

  async getInProgressSessions(
    userId: string,
    limit = 5,
    offset = 0,
  ): Promise<{ data: unknown[]; total: number }> {
    const [interviewSessions, total] = await this.sessionRepo.findAndCount({
      where: { userId },
      order: { startedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    if (interviewSessions.length === 0) return { data: [], total };

    const data = await Promise.all(
      interviewSessions.map(async (session) => {
        const behavioralSession = await this.behavioralSessionRepo.findOne({
          where: { interviewSessionId: session.id },
          order: { startedAt: 'DESC' },
        });
        return {
          sessionId: session.id,
          mode: session.mode,
          rounds: session.rounds,
          candidateLevel: session.candidateLevel,
          startedAt: session.startedAt,
          behavioralSession: behavioralSession
            ? {
                sessionId: behavioralSession.id,
                currentStage: behavioralSession.currentStage,
                stageName:
                  STAGE_NAMES[behavioralSession.currentStage] ?? 'Unknown',
                status: behavioralSession.status,
              }
            : null,
        };
      }),
    );

    return { data, total };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private classifyCandidateLevel(
    cvJson: CvJson,
    jdJson: JdJson,
  ): CandidateLevel {
    const jdMinYears = jdJson.minimum_experience_years ?? 0;

    // New schema: totalYearsExperience computed by normalizeCvJson
    let cvYears = cvJson.totalYearsExperience;

    // Backward compat: old DB records have experiences[].duration
    if (cvYears == null) {
      const legacy = (cvJson as any).experiences as
        | Array<{ duration: string }>
        | undefined;
      if (legacy?.length) {
        cvYears =
          legacy.reduce(
            (sum, exp) => sum + this.parseDurationToMonths(exp.duration ?? ''),
            0,
          ) / 12;
      }
    }

    const effectiveYears = Math.max(cvYears ?? 0, jdMinYears * 0.8);
    if (effectiveYears < 2) return 'junior';
    if (effectiveYears < 5) return 'mid';
    return 'senior';
  }

  private parseDurationToMonths(duration: string): number {
    if (!duration) return 0;
    const yearMatch = duration.match(/(\d+)\s*(?:year|yr|năm)/i);
    const monthMatch = duration.match(/(\d+)\s*(?:month|tháng)/i);
    let months = 0;
    if (yearMatch) months += parseInt(yearMatch[1]) * 12;
    if (monthMatch) months += parseInt(monthMatch[1]);
    if (months > 0) return months;
    const rangeMatch = duration.match(
      /(\d{4})\s*[-–]\s*(\d{4}|present|now|hiện\s*tại)/i,
    );
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = /\d{4}/.test(rangeMatch[2])
        ? parseInt(rangeMatch[2])
        : new Date().getFullYear();
      return Math.max(0, (end - start) * 12);
    }
    return 0;
  }

  private buildCvSnippet(cv: CvJson): string {
    const legacy = cv as any;
    const firstExp = cv.experience?.[0] ?? legacy.experiences?.[0];
    const roleText = firstExp
      ? `${String((firstExp as any).title ?? (firstExp as any).role ?? '')} tại ${String((firstExp as any).company ?? '')}`
      : '';
    const skills: string[] = Array.isArray(cv.skills)
      ? cv.skills
      : [
          ...(legacy.skills?.languages ?? []),
          ...(legacy.skills?.frameworks ?? []),
        ];
    const skillsText = skills.slice(0, 5).join(', ');
    return (
      [roleText, skillsText].filter(Boolean).join(' • ') || 'CV đã được tải lên'
    );
  }

  private buildJdSnippet(jd: JdJson): string {
    const skills = (jd.required_skills ?? []).slice(0, 4).join(', ');
    return (
      [jd.role, skills].filter(Boolean).join(' – ') || 'JD đã được tải lên'
    );
  }
}
