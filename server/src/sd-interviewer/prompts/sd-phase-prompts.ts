import { SDPhase } from '../../sd-session/entities/sd-session.entity';
import { ScalingConstraints } from '../../sd-problem/entities/sd-problem.entity';

const LANGUAGE_INSTRUCTION: Record<string, string> = {
  vi: 'You MUST respond entirely in Vietnamese.',
  en: 'You MUST respond entirely in English.',
  ja: 'You MUST respond entirely in Japanese.',
};

export function buildHintPrompt(params: {
  phase: SDPhase;
  problemTitle: string;
  problemContext: string | null;
  scalingConstraints: ScalingConstraints | null;
  architectureNodeTypes: string[];
  transcriptSummary: string | null;
  recentExchanges: string | null;
  lastInterviewerQuestion: string | null;
  language?: string;
}): string {
  const arch =
    params.architectureNodeTypes.length > 0
      ? `[${params.architectureNodeTypes.join(', ')}]`
      : 'empty';
  const langRule =
    LANGUAGE_INSTRUCTION[params.language ?? 'vi'] ?? LANGUAGE_INSTRUCTION['vi'];

  const phaseHintStrategy: Record<SDPhase, string> = {
    CLARIFICATION: `The candidate has not yet covered all clarification dimensions (scope, scale, non-functional requirements).
Look at the conversation below and identify what they have already asked.
Give ONE short clue that points them toward an unexplored dimension — do NOT name the dimension directly.
Example clue: "Think about how much load this system needs to handle."`,

    DESIGN_DRAWING: `The interviewer has already asked the candidate a question. The candidate is stuck and needs a nudge.
Current diagram components: ${arch}
Look at the last interviewer question in the conversation. Give ONE short clue that helps the candidate think of an answer to THAT question.
Do NOT ask a new question.`,

    DESIGN_WALKTHROUGH: `The interviewer has already asked the candidate a question. The candidate is stuck and needs a nudge.
Current diagram components: ${arch}
Look at the last interviewer question in the conversation. Give ONE short clue that helps the candidate think of an answer to THAT question.
Do NOT ask a new question.`,

    DEEP_DIVE: `The interviewer has already asked a probe question. The candidate is stuck and needs a nudge.
Current diagram components: ${arch}
Look at "The question the candidate needs help answering" field above. Give ONE short clue — a concrete scenario or constraint — that nudges the candidate toward answering THAT specific question.
Do NOT ask a new question. The clue must directly relate to the question above, not to any example below.
Example format only (different problem): "Consider what happens to write throughput when all requests must go through a single primary node."`,

    WRAP_UP: `The interviewer has already asked a failure or scaling question. The candidate is stuck and needs a nudge.
Current diagram components: ${arch}
Look at the last interviewer question in the conversation. Give ONE short clue that points the candidate toward an answer to THAT question.
Do NOT ask a new question.`,

    EVALUATING: `The session is being evaluated. Do not provide a hint.`,

    COMPLETED: `The session is completed. Do not provide a hint.`,
  };

  return `You are a system design interviewer providing a subtle hint to help the candidate answer the current question.
Problem: ${params.problemTitle}
${params.problemContext ? `Context: ${params.problemContext}` : ''}
${params.scalingConstraints ? `Scale: ${JSON.stringify(params.scalingConstraints)}` : ''}
${params.transcriptSummary ? `Previous phase summary:\n${params.transcriptSummary}` : ''}
${params.recentExchanges ? `Current phase conversation:\n${params.recentExchanges}` : ''}
${params.lastInterviewerQuestion ? `The question the candidate needs help answering: "${params.lastInterviewerQuestion}"` : ''}
${langRule}

${phaseHintStrategy[params.phase]}

ABSOLUTE RULES:
- Respond with exactly ONE short clue statement (1–2 sentences) — no preamble, no explanation
- Do NOT ask a question of any form — the interviewer already asked one; your job is to nudge the candidate toward answering it
- The clue MUST directly address "The question the candidate needs help answering" shown above
- Never give the answer directly
- Never name a specific technology the candidate should use

Bad (asks a question): "Have you considered what happens when requests are distributed unevenly?"
Good (statement clue): "Consider that each server only sees its own slice of traffic, so local counters alone cannot represent the global request rate."`;
}
