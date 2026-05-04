import { ScalingConstraints } from '../../sd-problem/entities/sd-problem.entity';

const LANGUAGE_INSTRUCTION: Record<string, string> = {
  vi: 'You MUST respond entirely in Vietnamese.',
  en: 'You MUST respond entirely in English.',
  ja: 'You MUST respond entirely in Japanese.',
};

export function buildScalabilityPrompt({
  problemTitle,
  scalingConstraints,
  nodeTypes,
  edges,
  language,
}: {
  problemTitle: string;
  scalingConstraints: ScalingConstraints | null;
  nodeTypes: string[];
  edges: unknown[];
  language?: string;
}): string {
  const langRule =
    LANGUAGE_INSTRUCTION[language ?? 'vi'] ?? LANGUAGE_INSTRUCTION['vi'];
  return `You are evaluating a system design interview answer.
${langRule}

Problem: ${problemTitle}
Scaling constraints: ${JSON.stringify(scalingConstraints)}
Candidate's architecture — components: [${nodeTypes.join(', ')}]
Connections: ${JSON.stringify(edges)}

Evaluate the architecture's scalability fit. Consider:
- Are the right components present for the stated scale (QPS, DAU, storage)?
- Is the design over-engineered (unnecessary complexity for this scale)?
- Is the design under-engineered (missing critical components for this scale)?

Return ONLY valid JSON, no explanation outside the JSON:
{ "score": <number 0–20>, "reasoning": "<1–2 sentences>" }`;
}

export function buildTradeoffPrompt({
  problemTitle,
  transcriptHistory,
  language,
}: {
  problemTitle: string;
  transcriptHistory: unknown[];
  language?: string;
}): string {
  const langRule =
    LANGUAGE_INSTRUCTION[language ?? 'vi'] ?? LANGUAGE_INSTRUCTION['vi'];
  return `You are evaluating a system design interview transcript.
${langRule}

Problem: ${problemTitle}
Transcript (chronological, with phase labels):
${JSON.stringify(transcriptHistory)}

Identify instances where the candidate explicitly articulated a trade-off — comparing two or more technical choices with clear reasoning (e.g. "I chose X over Y because Z").
Each trade-off you count MUST be grounded in a direct quote from the transcript above.

Scoring: 0 trade-offs = 0 pts | 1 = 8 pts | 2 = 14 pts | 3+ = 20 pts

Return ONLY valid JSON, no explanation outside the JSON:
{
  "score": <number 0–20>,
  "tradeoffs": [
    { "quote": "<exact text>", "phase": "<phase label>", "description": "<what trade-off>" }
  ]
}

IMPORTANT: If no trade-off has a grounded quote, score MUST be 0 and tradeoffs MUST be [].`;
}

export function buildCommunicationPrompt({
  problemTitle,
  transcriptHistory,
  language,
}: {
  problemTitle: string;
  transcriptHistory: unknown[];
  language?: string;
}): string {
  const langRule =
    LANGUAGE_INSTRUCTION[language ?? 'vi'] ?? LANGUAGE_INSTRUCTION['vi'];
  return `You are evaluating the communication quality of a system design interview.
${langRule}

Problem: ${problemTitle}
Transcript:
${JSON.stringify(transcriptHistory)}

Evaluate the candidate on:
- Fluency: clear structured sentences, minimal filler
- Technical terminology: correct use of domain terms (e.g. "eventual consistency", "horizontal scaling")
- Explanation structure: logical step-by-step vs jumping between ideas

Return ONLY valid JSON, no explanation outside the JSON:
{ "score": <number 0–15>, "reasoning": "<1–2 sentences>" }`;
}

export function buildAnnotationPrompt({
  problemTitle,
  transcriptHistory,
  language,
}: {
  problemTitle: string;
  transcriptHistory: unknown[];
  language?: string;
}): string {
  const langRule =
    LANGUAGE_INSTRUCTION[language ?? 'vi'] ?? LANGUAGE_INSTRUCTION['vi'];
  return `You are reviewing a system design interview transcript.
${langRule}

Problem: "${problemTitle}"

Candidate responses (JSON array — interviewer turns already removed, each entry includes its entryIndex in the full conversation):
${JSON.stringify(transcriptHistory, null, 2)}

For each notable candidate response:

Annotation types:
- "green": explicit trade-off articulated, correct technical depth, or successful adaptation
- "yellow": concept mentioned but lacked depth, skipped capacity estimate, or answer was vague
- "red": direct question not answered, significant architecture gap, or technically incorrect statement

Rules:
- Only annotate entries that are clearly notable. Skip trivial or filler responses.
- Maximum 6 annotations total.
- comment must be 1 sentence, specific — cite the exact concept or gap.
- Use the entryIndex field from the entry object exactly as given. Do NOT compute positions yourself.

Return JSON only — no text outside JSON:
[{ "entryIndex": <number>, "type": "green"|"yellow"|"red", "comment": "<1-sentence>" }]`;
}

export function buildSuggestionsPrompt({
  problemTitle,
  dimensions,
  language,
}: {
  problemTitle: string;
  dimensions: Array<{
    dimension: string;
    score: number;
    maxScore: number;
    data?: Record<string, unknown>;
  }>;
  language?: string;
}): string {
  const scoringDims: typeof dimensions = dimensions.filter(
    (d) => d.maxScore > 0,
  );
  const sorted: typeof dimensions = [...scoringDims].sort(
    (a, b) => a.score / a.maxScore - b.score / b.maxScore,
  );
  const weakest: typeof dimensions = sorted.slice(0, 2);
  const missingComponents: unknown = weakest[0]?.data?.missingComponents;
  const langRule =
    LANGUAGE_INSTRUCTION[language ?? 'vi'] ?? LANGUAGE_INSTRUCTION['vi'];
  return `You are giving actionable feedback after a system design interview.
${langRule}

Problem: "${problemTitle}"

Dimension scores:
${scoringDims.map((d) => `- ${d.dimension}: ${d.score}/${d.maxScore}`).join('\n')}

Weakest dimensions: ${weakest.map((d) => d.dimension).join(', ')}
${missingComponents ? `Missing components: ${(missingComponents as string[]).join(', ')}` : ''}

Write exactly 2–3 actionable suggestions. Each suggestion:
- Is specific to this problem and the weak dimension (not generic advice like "study more")
- Tells the candidate exactly what to practice or add next time
- Is 1–2 sentences

Return JSON only:
{ "suggestions": ["<suggestion 1>", "<suggestion 2>", "<optional suggestion 3>"] }`;
}

export function buildCurveballPrompt({
  problemTitle,
  curveballScenarioPrompt,
  expectedAdaptation,
  beforeNodeTypes,
  afterNodeTypes,
  curveballAdaptation,
  language,
}: {
  problemTitle: string;
  curveballScenarioPrompt: string;
  expectedAdaptation: string;
  beforeNodeTypes: string[];
  afterNodeTypes: string[];
  curveballAdaptation: unknown;
  language?: string;
}): string {
  const langRule =
    LANGUAGE_INSTRUCTION[language ?? 'vi'] ?? LANGUAGE_INSTRUCTION['vi'];
  return `You are evaluating how a candidate adapted their architecture after a curveball scenario.
${langRule}

Problem: ${problemTitle}
Curveball given: "${curveballScenarioPrompt}"
Expected adaptation direction: "${expectedAdaptation}"

Architecture before curveball (component types): [${beforeNodeTypes.join(', ')}]
Architecture after curveball (component types): [${afterNodeTypes.join(', ')}]
Diagram changes (diff): ${JSON.stringify(curveballAdaptation)}

Evaluate whether the diagram changes reflect the expected adaptation direction.

Return ONLY valid JSON, no explanation outside the JSON:
{
  "score": <number 0–20>,
  "reasoning": "<1–2 sentences>",
  "adaptationFound": <true|false>
}

IMPORTANT: If diagram changes are empty, score MUST be 0.`;
}
