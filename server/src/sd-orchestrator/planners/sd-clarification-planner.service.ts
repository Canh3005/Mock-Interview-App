import { Injectable } from '@nestjs/common';
import type {
  SDClarificationIntent,
  SDClarificationPlannerInput,
  SDClarificationDecision,
  SDClarificationTransitionCriteria,
  SDClarificationTracker,
} from '../types/sd-orchestrator.types';
import {
  CLARIFICATION_CRITERIA,
  FORBIDDEN_ARCHITECTURE_TERMS,
} from '../constants/sd-clarification.constants';

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
    const { tracker, context } = input;
    const { language, level } = context;
    const criteria =
      CLARIFICATION_CRITERIA[level] ?? CLARIFICATION_CRITERIA['senior'];

    const missingDimensions = criteria.requiredDimensions.filter(
      (d) => !tracker.progress.coveredDimensions.includes(d),
    );
    if (missingDimensions.length > 0) {
      return {
        action: 'ASK_NUDGE',
        reason: `Missing required dimension: ${missingDimensions[0]}`,
        nextIntent: this._buildNudgeIntent(missingDimensions[0], language),
      };
    }

    const holdingTemplates: Record<string, string> = {
      vi: 'Bạn đã hỏi về những điểm chính. Có điều gì khác bạn muốn làm rõ trước khi bắt đầu thiết kế không?',
      en: "You've covered the main areas. Is there anything else you'd like to clarify before moving to the design?",
      ja: '主なポイントについて質問されました。設計に移る前に、他に確認したいことはありますか？',
    };
    return {
      action: 'ASK_NUDGE',
      reason:
        'All required dimensions covered — prompting candidate to confirm readiness',
      nextIntent: {
        stage: 'CLARIFICATION',
        type: 'NUDGE',
        promptTemplate: holdingTemplates[language] ?? holdingTemplates['en'],
        forbiddenHints: [...FORBIDDEN_ARCHITECTURE_TERMS],
        maxSentences: 2,
        language,
      },
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

    return {
      action: 'ANSWER_FACT',
      reason: `matchedFactKey=${factKey}`,
      nextIntent: intent,
    };
  }

  buildRedirectIntent(language: 'vi' | 'en' | 'ja'): SDClarificationIntent {
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
      vi: 'Tốt rồi, bạn đã tìm hiểu đủ các yêu cầu của hệ thống. Hãy vẽ kiến trúc của bạn.',
      en: 'Great, you have gathered enough requirements. Go ahead and draw your architecture.',
      ja: '素晴らしい、十分な要件が集まりました。アーキテクチャを描いてください。',
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
