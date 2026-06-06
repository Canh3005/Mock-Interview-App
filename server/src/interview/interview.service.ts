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
import { DocumentContextService } from '../documents/document-context.service';
import { BehaviorCalibrationService } from '../documents/behavior-calibration.service';
import { SessionPlanningService } from '../session-planning/session-planning.service';
import {
  LOW_BALANCE_THRESHOLD,
  ROUND_CREDIT_COST,
  STAGE_NAMES,
} from './constants/interview.constants';
import type { CvJson, JdJson } from '../documents/types/document-ai.types';

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
    private calibrationService: BehaviorCalibrationService,
    private sessionPlanningService: SessionPlanningService,
  ) {}

  async getAllSessionsForInterview(interviewSessionId: string) {
    const interviewSession = await this.sessionRepo.findOne({
      where: { id: interviewSessionId },
    });

    if (!interviewSession) {
      throw new BadRequestException('Interview session not found');
    }

    const [liveCodingSession, sdSession] = await Promise.all([
      this.liveCodingSessionRepo.findOne({ where: { interviewSessionId } }),
      this.sdSessionRepo.findOne({
        where: { interviewSessionId },
        relations: ['problem'],
      }),
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

    return {
      interviewSessionId,
      status: interviewSession.status,
      finalScorecard: interviewSession.finalScorecard ?? null,
      sessions: {
        behavioral: interviewSession.rounds.includes('hr_behavioral')
          ? {}
          : null,
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

    const calibrationProfile =
      await this.calibrationService.getLatestForUser(userId);
    const behaviorCalibration = this.calibrationService.buildSummary(
      calibrationProfile,
      context.missing,
    );

    const latestCvRecord =
      await this.documentContextService.getLatestCompletedCvRecord(userId);
    const latestJdRecord =
      await this.documentContextService.getLatestCompletedJdRecord(userId);
    const calibrationStale =
      calibrationProfile != null &&
      (calibrationProfile.cvId !== latestCvRecord?.id ||
        calibrationProfile.jdAnalysisId !== latestJdRecord?.id);

    return {
      ready: true,
      missing: [],
      summary: { cvSnippet, jdSnippet },
      cv: context.cv,
      jd: context.jd,
      behaviorCalibration,
      calibrationProfileId: calibrationProfile?.id ?? null,
      calibrationStale,
    };
  }

  async initSession(
    userId: string,
    dto: InitSessionDto,
  ): Promise<{
    sessionId: string;
    candidateLevel: CandidateLevel;
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

    let calibrationProfileId: string | undefined;
    if (dto.rounds.includes('hr_behavioral')) {
      const calibration =
        await this.calibrationService.getLatestForUser(userId);
      if (!calibration) {
        throw new BadRequestException(
          'Calibration profile required for behavioral round',
        );
      }
      calibrationProfileId = calibration.id;
    }

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

    if (calibrationProfileId) {
      await this.sessionPlanningService.createPlan({
        dto: {
          sessionId: session.id,
          calibrationProfileId,
          depth: dto.behavioralDepth ?? 'broad',
          durationMinutes: dto.behavioralDurationMinutes ?? 60,
          language: (dto.language ?? 'vi') as 'vi' | 'en' | 'ja',
        },
        userId,
      });
    }

    const totalCost: number = dto.rounds.reduce(
      (sum, r) => sum + (ROUND_CREDIT_COST[r] ?? 0),
      0,
    );
    let newBalance: number | null = null;
    if (totalCost > 0) {
      const roundNames: string = dto.rounds.join(', ');
      newBalance = await this.walletService.deductCredit({
        userId,
        amount: totalCost,
        description: `Interview session: ${roundNames}`,
      });
    }

    return {
      sessionId: session.id,
      candidateLevel,
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
    const legacy = cv as unknown as {
      experiences?: CvJson['experience'];
      skills?: string[] | { languages?: unknown; frameworks?: unknown };
    };
    const firstExp = cv.experience?.[0] ?? legacy.experiences?.[0];
    const roleText = firstExp
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `${String((firstExp as any).title ?? (firstExp as any).role ?? '')} tại ${String((firstExp as any).company ?? '')}`
      : '';
    const rawSkills = legacy.skills ?? cv.skills;
    const skills: string[] = Array.isArray(rawSkills)
      ? this.stringArray(rawSkills)
      : [
          ...this.stringArray(rawSkills.languages),
          ...this.stringArray(rawSkills.frameworks),
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

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
