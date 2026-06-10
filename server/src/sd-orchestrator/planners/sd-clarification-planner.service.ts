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

// Final nudge texts per dimension — a topical pointer plus an invitation for
// the candidate to ask, never a request for the candidate to explain.
const NUDGE_TEXTS: Record<string, Record<'vi' | 'en' | 'ja', string>> = {
  scope: {
    vi: 'Trước khi đi sâu vào thiết kế, có lẽ nên thống nhất rõ hơn — hệ thống này sẽ được dùng trong bối cảnh nào, phục vụ nhóm người dùng ra sao? Bạn có muốn hỏi thêm gì về phần đó không?',
    en: 'Before diving into the design, it might help to align on the bigger picture — what context will this system be used in, and who are the main users? Feel free to ask anything about that.',
    ja: '設計に入る前に、もう少し全体像を揃えておくと良いかもしれません——このシステムはどんな状況で使われ、主にどんな利用者を想定していますか？その点について質問はありますか？',
  },
  scale: {
    vi: 'Một điều thường ảnh hưởng lớn đến thiết kế là quy mô vận hành — số lượng người dùng, tần suất sử dụng... Bạn có muốn hỏi thêm về khía cạnh này không?',
    en: "One thing that often shapes the design heavily is the operating scale — user volume, request frequency, and so on. Anything you'd like to ask about that?",
    ja: '設計に大きく影響する要素の一つに運用規模があります——ユーザー数やアクセス頻度など。その点について質問はありますか？',
  },
  nfr: {
    vi: 'Ngoài chức năng chính, các đặc tính vận hành như độ trễ, độ sẵn sàng hay mức độ nhất quán cũng thường đáng làm rõ ở giai đoạn này. Bạn có câu hỏi nào về phần đó không?',
    en: "Beyond core functionality, operating characteristics like latency, availability, or consistency are usually worth clarifying at this stage. Anything you'd like to ask there?",
    ja: '中核機能以外にも、レイテンシ、可用性、整合性といった運用特性をこの段階で確認しておくと良いでしょう。その点について質問はありますか？',
  },
  data: {
    vi: 'Dữ liệu mà hệ thống xử lý — loại dữ liệu, khối lượng, cách lưu trữ — cũng là điều đáng làm rõ trước khi thiết kế. Bạn có muốn hỏi thêm về phần này không?',
    en: "The kind of data this system handles — its types, volume, how it's stored — is also worth clarifying before designing. Anything you'd like to ask about that?",
    ja: 'システムが扱うデータ——種類、量、保存方法——も設計前に確認しておく価値があります。その点について質問はありますか？',
  },
  constraints: {
    vi: 'Đôi khi có những ràng buộc về mặt kỹ thuật hay nghiệp vụ ảnh hưởng đến hướng thiết kế. Bạn có muốn hỏi thêm để nắm rõ những giới hạn đó không?',
    en: 'Sometimes there are technical or business constraints that shape the design direction. Would you like to ask about any limitations to keep in mind?',
    ja: '設計の方向性に影響する技術面・ビジネス面の制約がある場合もあります。その点について質問はありますか？',
  },
  non_goal: {
    vi: 'Biết rõ những gì KHÔNG nằm trong phạm vi của bài toán cũng quan trọng không kém việc biết phạm vi của nó. Bạn có muốn hỏi thêm để xác định ranh giới đó không?',
    en: "Knowing what's explicitly out of scope can be just as important as knowing what's in. Would you like to ask anything to pin down those boundaries?",
    ja: '範囲に含まれるものと同じくらい、含まれないものを把握することも重要です。その境界について質問はありますか？',
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
    matchedFacts: Array<{ key: string; dimension: string; answer: string }>,
    tracker: SDClarificationTracker,
    criteria: SDClarificationTransitionCriteria,
    elapsedSeconds: number,
    language: 'vi' | 'en' | 'ja',
  ): SDClarificationDecision {
    const isMulti = matchedFacts.length > 1;
    const intent: SDClarificationIntent = {
      stage: 'CLARIFICATION',
      type: 'ANSWER_FACT',
      promptTemplate: isMulti
        ? `Answer using these facts: "{answer}". Combine them naturally into one cohesive response.`
        : `Answer using this fact: "{answer}". Be concise.`,
      forbiddenHints: [...FORBIDDEN_ARCHITECTURE_TERMS],
      maxSentences: isMulti ? 3 : 2,
      language,
      target: {
        factKeys: matchedFacts.map((f) => f.key),
        dimension: matchedFacts[0].dimension,
      },
    };

    return {
      action: 'ANSWER_FACT',
      reason: `matchedFactKeys=${matchedFacts.map((f) => f.key).join(',')}`,
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
    const dimTemplates = NUDGE_TEXTS[dimension] ?? NUDGE_TEXTS['scope'];
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
