import { Injectable } from '@nestjs/common';
import type {
  QuestionProbeFollowUpTrigger,
  QuestionProbeLevel,
} from '../question-bank/constants/question-bank-taxonomy.constants';
import type { QuestionProbeFollowUp } from '../question-bank/entities/question-probe.entity';
import type { PressureProfile } from '../session-planning/types/session-plan.types';
import type { ProbeScoringResult } from '../question-bank/types/question-practice-scoring.types';
import type {
  ActiveProbeSession,
  PolicyDecision,
} from './types/behavior-session.types';

const MAX_REDIRECTS_PER_PROBE = 1;

const MAX_FOLLOW_UPS_PER_LEVEL: Record<QuestionProbeLevel, number> = {
  junior: 1,
  mid: 2,
  senior: 3,
};

const MAX_TURNS_PER_PROBE: Record<QuestionProbeLevel, number> = {
  junior: 2,
  mid: 3,
  senior: 4,
};

@Injectable()
export class PolicyEngineService {
  /**
   * Quyết định action tiếp theo cho probe hiện tại, dựa trên scoring result và session state.
   * Deterministic — không gọi LLM.
   *
   * @param scoringResult - Kết quả scoring lần này (cumulative answer)
   * @param activeProbe - State probe đang chạy
   * @param pressureProfile - Cấu hình áp lực từ SessionPlan
   * @param probeFollowUps - Danh sách follow-up của probe hiện tại
   * @param level - Candidate level để xác định ngưỡng follow-up và turn limit
   * @param hasFallbackProbe - Có fallback probe sẵn trong stage không
   * @returns PolicyDecision với action và metadata
   */
  decide({
    scoringResult,
    activeProbe,
    pressureProfile,
    probeFollowUps,
    level,
    hasFallbackProbe,
  }: {
    scoringResult: ProbeScoringResult;
    activeProbe: ActiveProbeSession;
    pressureProfile: PressureProfile;
    probeFollowUps: QuestionProbeFollowUp[];
    level: QuestionProbeLevel;
    hasFallbackProbe: boolean;
  }): PolicyDecision {
    const { overallBand } = scoringResult;
    const maxFollowUps: number = MAX_FOLLOW_UPS_PER_LEVEL[level];
    const maxTurns: number = MAX_TURNS_PER_PROBE[level];

    // Step 0a: ứng viên thừa nhận không biết → bỏ probe, chuyển fallback hoặc đóng
    if (scoringResult.candidateIntent === 'dont_know') {
      return {
        action: hasFallbackProbe ? 'USE_FALLBACK' : 'CLOSE_PROBE',
        closeReason: 'candidate_no_knowledge',
        hasFallback: hasFallbackProbe,
      };
    }

    // Step 0b: ứng viên xin làm rõ câu hỏi → rephrase (tối đa 1 lần)
    if (scoringResult.candidateIntent === 'clarification_request') {
      if (activeProbe.rephraseCount < 1) {
        return { action: 'REPHRASE' };
      }
      return {
        action: hasFallbackProbe ? 'USE_FALLBACK' : 'CLOSE_PROBE',
        closeReason: 'candidate_no_knowledge',
        hasFallback: hasFallbackProbe,
      };
    }

    // Step 0c: câu trả lời lạc đề / rỗng — nhắc trước khi fallback
    if (overallBand === 'insufficient_evidence') {
      if (activeProbe.redirectCount < MAX_REDIRECTS_PER_PROBE) {
        return { action: 'REDIRECT' };
      }
      return {
        action: hasFallbackProbe ? 'USE_FALLBACK' : 'CLOSE_PROBE',
        closeReason: 'no_relevant_story',
        hasFallback: hasFallbackProbe,
      };
    }

    // Step 1: đủ evidence
    if (overallBand === 'strong') {
      return { action: 'CLOSE_PROBE', closeReason: 'sufficient_evidence' };
    }

    // Step 1b: safety ceiling — tránh LLM hallucination loop
    if (activeProbe.totalTurnCount >= maxTurns) {
      return { action: 'CLOSE_PROBE', closeReason: 'turn_limit_reached' };
    }

    // Step 2: có red flag → challenge nếu chưa đạt giới hạn
    const hasRedFlag: boolean = scoringResult.redFlags.some((rf) => rf.present);
    if (
      hasRedFlag &&
      activeProbe.challengeCount < pressureProfile.maxChallengesPerProbe
    ) {
      const redFlagFollowUp: QuestionProbeFollowUp | undefined =
        probeFollowUps.find((f) => f.trigger === 'red_flag');
      if (redFlagFollowUp) {
        return {
          action: 'CHALLENGE',
          followUpTrigger: 'red_flag',
          challengeReason: this._firstPresentRedFlagLabel(scoringResult),
        };
      }
    }

    // Step 3: đã đủ follow-up theo level
    if (activeProbe.followUpCount >= maxFollowUps) {
      return { action: 'CLOSE_PROBE', closeReason: 'max_follow_ups_reached' };
    }

    // Step 4: band không cải thiện sau ít nhất 1 follow-up
    if (
      activeProbe.previousBand !== null &&
      activeProbe.previousBand === overallBand &&
      activeProbe.followUpCount >= 1
    ) {
      return { action: 'CLOSE_PROBE', closeReason: 'no_new_evidence' };
    }

    // Step 5: tìm trigger phù hợp từ signal gaps
    const trigger: QuestionProbeFollowUpTrigger | null = this._pickTrigger({
      scoringResult,
      probeFollowUps,
    });
    if (trigger !== null) {
      return { action: 'FOLLOW_UP', followUpTrigger: trigger };
    }

    // Step 6: fallback close
    return { action: 'CLOSE_PROBE', closeReason: 'no_follow_up_available' };
  }

  /**
   * Chọn trigger phù hợp nhất từ signal gaps của probe.
   * Priority: missing_tradeoff (cho technical) > missing_metric > missing_context > vague_answer.
   *
   * @returns trigger nếu probe có follow-up tương ứng, null nếu không tìm được
   */
  private _pickTrigger({
    scoringResult,
    probeFollowUps,
  }: {
    scoringResult: ProbeScoringResult;
    probeFollowUps: QuestionProbeFollowUp[];
  }): QuestionProbeFollowUpTrigger | null {
    const availableTriggers: Set<QuestionProbeFollowUpTrigger> = new Set(
      probeFollowUps.map((f) => f.trigger),
    );

    const priority: QuestionProbeFollowUpTrigger[] = [
      'missing_tradeoff',
      'missing_metric',
      'missing_personal_contribution',
      'missing_consequence',
      'missing_context',
      'missing_reflection',
      'vague_answer',
    ];

    const notCovered: boolean = scoringResult.signalResults.some(
      (s) => s.status !== 'covered',
    );
    if (!notCovered) return null;

    for (const trigger of priority) {
      if (availableTriggers.has(trigger)) {
        return trigger;
      }
    }
    return null;
  }

  private _firstPresentRedFlagLabel(scoringResult: ProbeScoringResult): string {
    const first = scoringResult.redFlags.find((rf) => rf.present);
    return first?.label ?? 'red flag detected';
  }
}
