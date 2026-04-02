import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  InterviewSession,
  CandidateLevel,
} from './entities/interview-session.entity';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';
import { InitSessionDto } from './dto/init-session.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { CvJson, JdJson } from '../documents/documents.ai.service';

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

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);
  private redisClient: Redis;

  constructor(
    @InjectRepository(InterviewSession)
    private sessionRepo: Repository<InterviewSession>,
    @InjectRepository(BehavioralSession)
    private behavioralSessionRepo: Repository<BehavioralSession>,
    private configService: ConfigService,
  ) {
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST') || '127.0.0.1',
      port: this.configService.get('REDIS_PORT') || 6379,
    });
  }

  async preflight(userId: string) {
    const [rawCv, rawJd] = await Promise.all([
      this.redisClient.get(`cv_context:${userId}`),
      this.redisClient.get(`jd_context:${userId}`),
    ]);
    console.log(`Preflight check for user ${userId}:`);
    console.log('Preflight check - CV context:', rawCv ? 'FOUND' : 'MISSING');
    console.log('Preflight check - JD context:', rawJd ? 'FOUND' : 'MISSING');
    const missing: string[] = [];
    if (!rawCv) missing.push('cv_context');
    if (!rawJd) missing.push('jd_context');

    if (missing.length > 0) {
      return { ready: false, missing };
    }

    const cvJson = JSON.parse(rawCv!) as CvJson;
    const jdJson = JSON.parse(rawJd!) as JdJson;

    const cvSnippet = this.buildCvSnippet(cvJson);
    const jdSnippet = this.buildJdSnippet(jdJson);

    return {
      ready: true,
      missing: [],
      summary: { cvSnippet, jdSnippet },
      cv: cvJson,
      jd: jdJson,
    };
  }

  async initSession(
    userId: string,
    dto: InitSessionDto,
  ): Promise<{
    sessionId: string;
    candidateLevel: CandidateLevel;
    estimatedDuration: number;
  }> {
    const [rawCv, rawJd] = await Promise.all([
      this.redisClient.get(`cv_context:${userId}`),
      this.redisClient.get(`jd_context:${userId}`),
    ]);

    if (!rawCv || !rawJd) {
      throw new BadRequestException(
        'CV and JD context are required to start an interview session.',
      );
    }

    const cvJson = JSON.parse(rawCv) as CvJson;
    const jdJson = JSON.parse(rawJd) as JdJson;

    // BE determines level (FE may suggest but BE validates/overrides if needed)
    const candidateLevel: CandidateLevel =
      dto.candidateLevel ?? this.classifyCandidateLevel(cvJson, jdJson);

    const estimatedDuration = dto.rounds.reduce(
      (sum, r) => sum + (ROUND_DURATIONS[r] ?? 20),
      0,
    );

    const session = this.sessionRepo.create({
      userId,
      mode: dto.mode,
      rounds: dto.rounds,
      candidateLevel,
      status: 'IN_PROGRESS',
      cvContextSnapshot: rawCv,
      jdContextSnapshot: rawJd,
    });

    await this.sessionRepo.save(session);
    this.logger.log(
      `Session ${session.id} created for user ${userId} [${candidateLevel} / ${dto.mode}]`,
    );

    return { sessionId: session.id, candidateLevel, estimatedDuration };
  }

  async updateContext(
    userId: string,
    dto: UpdateContextDto,
  ): Promise<{ updated: boolean }> {
    const pipeline = this.redisClient.pipeline();
    if (dto.cv) {
      pipeline.set(`cv_context:${userId}`, JSON.stringify(dto.cv));
    }
    if (dto.jd) {
      pipeline.set(`jd_context:${userId}`, JSON.stringify(dto.jd));
    }
    await pipeline.exec();
    console.log(await this.redisClient.get(`cv_context:${userId}`));
    console.log(await this.redisClient.get(`jd_context:${userId}`));
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
    const totalMonths = (cvJson.experiences ?? []).reduce(
      (sum, exp) => sum + this.parseDurationToMonths(exp.duration),
      0,
    );
    const years = totalMonths / 12;

    // Weight JD minimum_experience_years if available
    const jdMinYears = jdJson.minimum_experience_years ?? 0;

    // Use the higher of the two signals (CV actual vs JD expected)
    const effectiveYears = Math.max(years, jdMinYears * 0.8);

    if (effectiveYears < 2) return 'junior';
    if (effectiveYears < 5) return 'mid';
    return 'senior';
  }

  private parseDurationToMonths(duration: string): number {
    if (!duration) return 0;

    // "2 years", "2 năm", "1 year 6 months"
    const yearMatch = duration.match(/(\d+)\s*(?:year|yr|năm)/i);
    const monthMatch = duration.match(/(\d+)\s*(?:month|tháng)/i);

    let months = 0;
    if (yearMatch) months += parseInt(yearMatch[1]) * 12;
    if (monthMatch) months += parseInt(monthMatch[1]);
    if (months > 0) return months;

    // "Jan 2020 – Dec 2022" or "2020 - 2023" or "2021 - present"
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
    const firstRole = cv.experiences?.[0];
    const roleText = firstRole
      ? `${firstRole.role} tại ${firstRole.company}`
      : '';
    const skillsText = [
      ...(cv.skills?.languages ?? []),
      ...(cv.skills?.frameworks ?? []),
    ]
      .slice(0, 5)
      .join(', ');
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
