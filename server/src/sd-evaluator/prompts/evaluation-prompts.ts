import { ScalingConstraints } from '../../sd-problem/entities/sd-problem.entity';

export function buildScalabilityPrompt({
  problemTitle,
  scalingConstraints,
  nodeTypes,
  edges,
}: {
  problemTitle: string;
  scalingConstraints: ScalingConstraints | null;
  nodeTypes: string[];
  edges: unknown[];
}): string {
  return `You are evaluating a system design interview answer.

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
}: {
  problemTitle: string;
  transcriptHistory: unknown[];
}): string {
  return `You are evaluating a system design interview transcript.

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
}: {
  problemTitle: string;
  transcriptHistory: unknown[];
}): string {
  return `You are evaluating the communication quality of a system design interview.

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

export function buildCurveballPrompt({
  problemTitle,
  curveballScenarioPrompt,
  expectedAdaptation,
  beforeNodeTypes,
  afterNodeTypes,
  curveballAdaptation,
}: {
  problemTitle: string;
  curveballScenarioPrompt: string;
  expectedAdaptation: string;
  beforeNodeTypes: string[];
  afterNodeTypes: string[];
  curveballAdaptation: unknown;
}): string {
  return `You are evaluating how a candidate adapted their architecture after a curveball scenario.

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
