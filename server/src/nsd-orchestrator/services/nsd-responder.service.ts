import { Injectable } from '@nestjs/common';
import type {
  NSDPhase,
  NSDCheckItem,
  NSDEvalLevel,
  NSDPhase1Data,
  NSDPhase2Data,
  NSDPhase3Data,
  NSDPhase4Data,
  NSDPhase4FeatureDesign,
  NSDPhase5Data,
  NSDNodeType,
  NSDKnownExtraNode,
  NSDCanvasState,
} from '../types/nsd.types';
import type { InterviewLanguage } from '../../interview/entities/interview-session.entity';

const PROBE_ACKNOWLEDGMENT: Record<
  InterviewLanguage,
  { accepted: string; rejected: string }
> = {
  vi: {
    accepted: 'Cảm ơn bạn đã giải thích.',
    rejected: 'Mình ghi nhận phần này, chúng ta tiếp tục nhé.',
  },
  en: {
    accepted: 'Thanks for explaining that.',
    rejected: "Noted — let's continue.",
  },
  ja: {
    accepted: '説明ありがとうございます。',
    rejected: '了解しました。続けましょう。',
  },
};

const PHASE_TRANSITIONS: Partial<
  Record<NSDPhase, Record<InterviewLanguage, string>>
> = {
  PHASE_2_NFR: {
    en: "Good, we have a solid picture of the functional requirements. Now let's discuss non-functional requirements.",
    vi: 'Tốt, chúng ta đã có bức tranh khá đầy đủ về yêu cầu chức năng. Bây giờ hãy chuyển sang thảo luận về yêu cầu phi chức năng.',
    ja: '良いですね、機能要件についてはしっかり把握できました。次は非機能要件について話しましょう。',
  },
  PHASE_3_SCALE: {
    en: "Great NFR discussion. Let's estimate the scale of the system now.",
    vi: 'Phần thảo luận về yêu cầu phi chức năng khá tốt. Bây giờ hãy ước lượng quy mô của hệ thống.',
    ja: 'NFRの議論は良かったです。次にシステムの規模を見積もりましょう。',
  },
  PHASE_4_HLD: {
    en: 'Scale estimation done. Time to design the high-level architecture. You can use the canvas on the right.',
    vi: 'Đã xong phần ước lượng quy mô. Giờ là lúc thiết kế kiến trúc tổng thể. Bạn có thể sử dụng canvas ở bên phải.',
    ja: '規模の見積もりが完了しました。次は全体のアーキテクチャを設計しましょう。右側のキャンバスを使用できます。',
  },
  PHASE_5_DEEP_DIVE: {
    en: "Solid architecture. Now let's stress-test it with some scenarios.",
    vi: 'Kiến trúc khá ổn. Bây giờ hãy cùng thử thách nó với một vài tình huống thực tế.',
    ja: 'しっかりした設計ですね。いくつかのシナリオで負荷テストをしてみましょう。',
  },
  EVALUATING: {
    en: "That completes the interview. Thank you — I'm generating your evaluation now.",
    vi: 'Vậy là buổi phỏng vấn đã hoàn thành. Cảm ơn bạn — tôi đang tạo đánh giá của bạn.',
    ja: 'これでインタビューは終了です。ありがとうございました。評価を作成しています。',
  },
};

@Injectable()
export class NSDResponderService {
  // ── Phase openings ─────────────────────────────────────────────────────────

  buildPhase1Opening(data: NSDPhase1Data): string {
    return data.opening.question;
  }

  buildPhase1SystemFactsAndFirstFeature(data: NSDPhase1Data): string {
    return `System overview: ${data.opening.system_facts}\n\n${data.features[0].question}`;
  }

  buildPhase2Opening(data: NSDPhase2Data): string {
    return data.opening.question;
  }

  buildPhase2ContextAndFirstDimension(data: NSDPhase2Data): string {
    return `Key NFRs to consider: ${data.opening.system_nfr_list}\n\n${data.nfr_dimensions[0].question}`;
  }

  buildPhase3Opening(data: NSDPhase3Data): string {
    return data.opening.question;
  }

  buildPhase3ContextAndFirstDimension(data: NSDPhase3Data): string {
    return `Provided numbers: ${data.opening.provided_number}\n\n${data.scale_dimensions[0].question}`;
  }

  buildPhase4Opening(data: NSDPhase4Data): string {
    const featureList = data.feature_design
      .map((f, i) => `${i + 1}. ${f.feature}`)
      .join('\n');
    return `Now let's move on to the high-level design. We'll design the following features:\n${featureList}\n\n${data.feature_design[0].question}`;
  }

  buildPhase5Opening(data: NSDPhase5Data): string {
    const count = data.deep_dive_questions.length;
    return `Great work on the design. Now let's do a deep dive — I have ${count} scenario${count !== 1 ? 's' : ''} for you.\n\n${data.deep_dive_questions[0].question}`;
  }

  // ── Item questions ──────────────────────────────────────────────────────────

  buildItemQuestion(item: NSDCheckItem): string {
    return item.followup_question;
  }

  buildFollowup(item: NSDCheckItem): string {
    return item.followup_question;
  }

  buildFillAnswer(item: NSDCheckItem): string {
    return `Let me help with that — ${item.fill_answer}`;
  }

  // ── Canvas probes ───────────────────────────────────────────────────────────

  buildExtraNodeProbe(extra: NSDKnownExtraNode): string {
    return extra.probe_question;
  }

  buildUnknownExtraNodeProbe(nodeLabel: string, nodeType: NSDNodeType): string {
    return `I see you added a ${nodeType} node labeled "${nodeLabel}". Can you walk me through why that component is needed here?`;
  }

  /** Short acknowledgment after classifying a candidate's explanation of an extra canvas node. */
  buildProbeAcknowledgment(
    evalLevel: NSDEvalLevel,
    language: InterviewLanguage,
  ): string {
    const entry = PROBE_ACKNOWLEDGMENT[language] ?? PROBE_ACKNOWLEDGMENT.en;
    return evalLevel === 'good' ? entry.accepted : entry.rejected;
  }

  // ── Integration review (Phase 4, last feature) ──────────────────────────────

  buildIntegrationReviewQuestion(feature: NSDPhase4FeatureDesign): string {
    return `We've now designed all the features. Walk me through how "${feature.feature}" fits together with the rest of the system — how do these features share infrastructure, and where do their data flows connect or overlap?`;
  }

  // ── Feature/dimension advance ───────────────────────────────────────────────

  buildNextFeatureTransition(featureName: string, question: string): string {
    return `Good. Now let's look at the "${featureName}" feature.\n\n${question}`;
  }

  buildNextDimensionTransition(dimensionKey: string, question: string): string {
    return `Let's move to ${dimensionKey}.\n\n${question}`;
  }

  buildNextDeepDiveTransition(question: string): string {
    return question;
  }

  // ── Closing ─────────────────────────────────────────────────────────────────

  buildAcknowledgment(groupName: string): string {
    return `Cảm ơn bạn đã làm rõ về ${groupName}.`;
  }

  buildPhase1Closing(data: NSDPhase1Data): string {
    return data.closing.question;
  }

  buildPhase2Closing(data: NSDPhase2Data): string {
    return data.closing.question;
  }

  buildPhase3Closing(data: NSDPhase3Data): string {
    return data.closing.question;
  }

  // ── Phase transitions ───────────────────────────────────────────────────────

  buildPhaseTransition(
    from: NSDPhase,
    to: NSDPhase,
    language: InterviewLanguage,
  ): string {
    void from;
    const entry = PHASE_TRANSITIONS[to];
    return entry?.[language] ?? entry?.en ?? `Moving to ${to}.`;
  }

  // ── Canvas display helpers ──────────────────────────────────────────────────

  buildCanvasContextMessage(canvas: NSDCanvasState): string {
    if (canvas.nodes.length === 0) {
      return 'Your canvas is currently empty. Start by adding components.';
    }
    const types = [...new Set(canvas.nodes.map((n) => n.type))].join(', ');
    return `Your canvas has ${canvas.nodes.length} node(s): ${types}.`;
  }
}
