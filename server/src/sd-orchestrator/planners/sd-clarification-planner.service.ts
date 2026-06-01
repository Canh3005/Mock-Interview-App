import { Injectable } from '@nestjs/common';
import type {
  SDClarificationIntent,
  SDClarificationPlannerInput,
  SDClarificationDecision,
  SDClarificationTransitionCriteria,
  SDClarificationTracker,
} from '../types/sd-orchestrator.types';

// Architecture/implementation terms forbidden in all Clarification responses
const FORBIDDEN_ARCHITECTURE_TERMS = [
  'cache',
  'sharding',
  'load balancer',
  'database design',
  'database partition',
  'consistent hashing',
  'replication',
  'microservice',
  'monolith',
  'api gateway design',
  'cdn',
  'queue',
  'kafka',
  'redis',
  'elasticsearch',
  'index',
  'horizontal scaling',
  'vertical scaling',
  'leader election',
  'raft',
  'paxos',
  'two-phase commit',
];

// Per-dimension coverage signals (hints for assessor, also used for nudge selection)
export const DIMENSION_COVERAGE_SIGNALS: Record<string, string[]> = {
  scope: [
    'use case',
    'feature',
    'functionality',
    'what',
    'user can',
    'support',
    'include',
    'exclude',
    'out of scope',
    'core',
  ],
  scale: [
    'user',
    'dau',
    'mau',
    'qps',
    'rps',
    'traffic',
    'request per',
    'million',
    'billion',
    'how many',
    'volume',
    'throughput',
  ],
  nfr: [
    'latency',
    'availability',
    'sla',
    'slo',
    'p99',
    'uptime',
    'reliability',
    'consistency',
    'durability',
    'performance',
  ],
  data: [
    'data size',
    'storage',
    'retention',
    'how long',
    'data model',
    'schema',
    'type of data',
    'format',
  ],
  constraints: [
    'budget',
    'team size',
    'timeline',
    'technology constraint',
    'existing infrastructure',
    'compliance',
    'regulation',
  ],
  non_goal: [
    'out of scope',
    'not building',
    'exclude',
    'skip',
    'ignore',
    'no need',
    'not required',
    "won't",
  ],
};

// Transition criteria per candidate level
export const CLARIFICATION_CRITERIA: Record<
  string,
  SDClarificationTransitionCriteria
> = {
  junior: {
    requiredDimensions: ['scope', 'scale'],
    minCandidateTurns: 2,
    minDurationSeconds: 60,
    maxDurationSeconds: 600,
  },
  mid: {
    requiredDimensions: ['scope', 'scale', 'nfr'],
    minCandidateTurns: 2,
    minDurationSeconds: 90,
    maxDurationSeconds: 600,
  },
  senior: {
    requiredDimensions: ['scope', 'scale', 'nfr'],
    minCandidateTurns: 3,
    minDurationSeconds: 120,
    maxDurationSeconds: 720,
  },
  staff: {
    requiredDimensions: ['scope', 'scale', 'nfr', 'data'],
    minCandidateTurns: 3,
    minDurationSeconds: 120,
    maxDurationSeconds: 720,
  },
};

@Injectable()
export class SDClarificationPlannerService {
  buildOpeningIntent(
    problemTitle: string,
    durationMinutes: number,
    language: 'vi' | 'en' | 'ja',
  ): SDClarificationIntent {
    const templates: Record<string, string> = {
      vi: `Đây là bài toán của bạn: "${problemTitle}". Bạn có ${durationMinutes} phút. Bắt đầu bằng các câu hỏi làm rõ yêu cầu.`,
      en: `Here's your problem: "${problemTitle}". You have ${durationMinutes} minutes. Start with clarifying questions.`,
      ja: `問題はこちらです: "${problemTitle}"。${durationMinutes}分あります。要件確認の質問から始めてください。`,
    };
    return {
      stage: 'CLARIFICATION',
      type: 'OPENING',
      promptTemplate: templates[language] ?? templates['en'],
      forbiddenHints: [],
      maxSentences: 3,
      language,
    };
  }

  planNextIntent(input: SDClarificationPlannerInput): SDClarificationDecision {
    const { tracker, lastCandidateIntent, data, context, elapsedSeconds } =
      input;
    const { language, level } = context;
    const criteria =
      CLARIFICATION_CRITERIA[level] ?? CLARIFICATION_CRITERIA['senior'];

    // 1. REDIRECT — highest priority: candidate jumped to solution
    if (lastCandidateIntent === 'solution_leap') {
      return {
        action: 'REDIRECT',
        reason: 'Candidate jumped to solution before requirements gathered',
        nextIntent: this._buildRedirectIntent(language),
      };
    }

    // 2. Check TRANSITION_STAGE
    const canTransition = this._canTransition(
      tracker,
      criteria,
      elapsedSeconds,
    );
    if (canTransition) {
      return {
        action: 'TRANSITION_STAGE',
        reason: 'All required dimensions covered and min criteria met',
      };
    }

    // 3. Max time → force transition
    if (elapsedSeconds >= criteria.maxDurationSeconds) {
      return {
        action: 'TRANSITION_STAGE',
        reason: 'Max clarification time reached',
      };
    }

    // 4. ANSWER_FACT — if planner is called after an ANSWER_FACT, we need to check if nudge is chained
    // (This is handled by the orchestrator calling this method with the assessment result)

    // 5. ASK_NUDGE — if candidate says ready_to_continue but missing required dims
    const missingDimensions = criteria.requiredDimensions.filter(
      (d) => !tracker.progress.coveredDimensions.includes(d),
    );
    if (
      missingDimensions.length > 0 &&
      (lastCandidateIntent === 'ready_to_continue' ||
        lastCandidateIntent === 'dont_know')
    ) {
      const nudgeDimension = missingDimensions[0];
      return {
        action: 'ASK_NUDGE',
        reason: `Candidate ready to continue but missing required dimension: ${nudgeDimension}`,
        nextIntent: this._buildNudgeIntent(nudgeDimension, language),
      };
    }

    return {
      action: 'ASK_NUDGE',
      reason: 'Waiting for candidate clarification questions',
    };
  }

  buildAnswerFactDecision(
    factKey: string,
    dimension: string,
    factAnswer: string,
    tracker: SDClarificationTracker,
    criteria: SDClarificationTransitionCriteria,
    elapsedSeconds: number,
    language: 'vi' | 'en' | 'ja',
  ): SDClarificationDecision {
    const intent: SDClarificationIntent = {
      stage: 'CLARIFICATION',
      type: 'ANSWER_FACT',
      promptTemplate: `Answer using this fact: "{answer}". Be concise.`,
      forbiddenHints: [...FORBIDDEN_ARCHITECTURE_TERMS],
      maxSentences: 2,
      language,
      target: { factKey, dimension },
    };

    // Check if a nudge should be chained (required dimensions still missing after this answer)
    const willCoverDimensions = [
      ...tracker.progress.coveredDimensions,
      dimension,
    ];
    const stillMissing = criteria.requiredDimensions.filter(
      (d) => !willCoverDimensions.includes(d),
    );

    const canTransitionAfter =
      stillMissing.length === 0 &&
      tracker.turnCount + 1 >= criteria.minCandidateTurns &&
      elapsedSeconds >= criteria.minDurationSeconds;

    if (stillMissing.length > 0 && !canTransitionAfter) {
      const chainDimension = stillMissing[0];
      return {
        action: 'ANSWER_FACT',
        reason: `matchedFactKey=${factKey}; dimension ${chainDimension} still missing`,
        nextIntent: intent,
        chainedAction: {
          action: 'ASK_NUDGE',
          intent: this._buildNudgeIntent(chainDimension, language),
        },
      };
    }

    return {
      action: 'ANSWER_FACT',
      reason: `matchedFactKey=${factKey}`,
      nextIntent: intent,
    };
  }

  private _canTransition(
    tracker: SDClarificationTracker,
    criteria: SDClarificationTransitionCriteria,
    elapsedSeconds: number,
  ): boolean {
    const allRequired = criteria.requiredDimensions.every((d) =>
      tracker.progress.coveredDimensions.includes(d),
    );
    return (
      allRequired &&
      tracker.turnCount >= criteria.minCandidateTurns &&
      elapsedSeconds >= criteria.minDurationSeconds
    );
  }

  private _buildRedirectIntent(
    language: 'vi' | 'en' | 'ja',
  ): SDClarificationIntent {
    const templates: Record<string, string> = {
      vi: 'Ứng viên đang nhảy vào giải pháp. Hãy đưa họ trở lại giai đoạn làm rõ yêu cầu. Đừng gợi ý những yêu cầu còn thiếu.',
      en: 'Candidate jumped to solution. Redirect them back to requirements gathering. Do not hint at what requirements are missing.',
      ja: '候補者がソリューションに飛びついています。要件確認に戻るよう促してください。不足している要件をヒントとして与えないでください。',
    };
    return {
      stage: 'CLARIFICATION',
      type: 'REDIRECT',
      promptTemplate: templates[language] ?? templates['en'],
      forbiddenHints: [
        ...FORBIDDEN_ARCHITECTURE_TERMS,
        'scale',
        'nfr',
        'latency',
        'scope',
      ],
      maxSentences: 2,
      language,
    };
  }

  private _buildNudgeIntent(
    dimension: string,
    language: 'vi' | 'en' | 'ja',
  ): SDClarificationIntent {
    const nudgeTemplates: Record<string, Record<string, string>> = {
      scope: {
        vi: 'Ứng viên chưa hỏi về scope. Gợi ý họ làm rõ thêm mà không tiết lộ dimension còn thiếu.',
        en: 'Candidate has not asked about scope. Nudge them to clarify further without revealing what is missing.',
        ja: '候補者がスコープについて質問していません。不足している内容を明かさずに、さらに明確化するよう促してください。',
      },
      scale: {
        vi: 'Ứng viên chưa hỏi về scale/số lượng người dùng. Gợi ý họ hỏi về những điều còn chưa rõ.',
        en: 'Candidate has not asked about scale/user numbers. Nudge them without revealing the missing dimension.',
        ja: '候補者がスケール/ユーザー数について質問していません。不足している次元を明かさずに促してください。',
      },
      nfr: {
        vi: 'Ứng viên chưa hỏi về non-functional requirements. Gợi ý họ tiếp tục làm rõ.',
        en: 'Candidate has not asked about non-functional requirements. Nudge them to continue clarifying.',
        ja: '候補者が非機能要件について質問していません。引き続き明確化するよう促してください。',
      },
      data: {
        vi: 'Ứng viên chưa hỏi về data requirements. Gợi ý họ khám phá thêm.',
        en: 'Candidate has not asked about data requirements. Nudge them to explore further.',
        ja: '候補者がデータ要件について質問していません。さらに探求するよう促してください。',
      },
      constraints: {
        vi: 'Ứng viên chưa hỏi về constraints. Gợi ý họ làm rõ thêm.',
        en: 'Candidate has not asked about constraints. Nudge them to clarify further.',
        ja: '候補者が制約について質問していません。さらに明確化するよう促してください。',
      },
      non_goal: {
        vi: 'Ứng viên chưa hỏi về những gì nằm ngoài scope. Gợi ý họ suy nghĩ về non-goals.',
        en: 'Candidate has not asked about non-goals. Nudge them to think about what is out of scope.',
        ja: '候補者が非目標について質問していません。スコープ外を考えるよう促してください。',
      },
    };
    const dimTemplates = nudgeTemplates[dimension] ?? nudgeTemplates['scope'];
    return {
      stage: 'CLARIFICATION',
      type: 'NUDGE',
      promptTemplate: dimTemplates[language] ?? dimTemplates['en'],
      forbiddenHints: [...FORBIDDEN_ARCHITECTURE_TERMS],
      maxSentences: 2,
      language,
      target: { dimension },
    };
  }

  buildTransitionIntent(language: 'vi' | 'en' | 'ja'): SDClarificationIntent {
    const templates: Record<string, string> = {
      vi: 'Tốt rồi. Hãy vẽ kiến trúc của bạn — bạn có thể nêu assumptions trong khi vẽ.',
      en: 'Good. Go ahead and draw your architecture — feel free to state your assumptions as you start.',
      ja: 'よし、アーキテクチャを描いてください。描きながら前提条件を述べても構いません。',
    };
    return {
      stage: 'CLARIFICATION',
      type: 'ANSWER_FACT',
      promptTemplate: templates[language] ?? templates['en'],
      forbiddenHints: [],
      maxSentences: 2,
      language,
    };
  }

  getForbiddenHints(): string[] {
    return [...FORBIDDEN_ARCHITECTURE_TERMS];
  }

  getCriteriaForLevel(level: string): SDClarificationTransitionCriteria {
    return CLARIFICATION_CRITERIA[level] ?? CLARIFICATION_CRITERIA['senior'];
  }
}
