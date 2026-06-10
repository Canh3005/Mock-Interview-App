// ─── Shared Enums ────────────────────────────────────────────────────────────

export type SDStage =
  | 'CLARIFICATION'
  | 'DESIGN_DRAWING'
  | 'DESIGN_WALKTHROUGH'
  | 'DEEP_DIVE'
  | 'WRAP_UP'
  | 'EVALUATING'
  | 'COMPLETED';

// Stages that produce a scored summary (excludes drawing and terminal stages)
export type SDScoredStage = Exclude<
  SDStage,
  'DESIGN_DRAWING' | 'EVALUATING' | 'COMPLETED'
>;

export type SDCandidateIntent =
  | 'clarification_question'
  | 'requirement_summary'
  | 'architecture_walkthrough'
  | 'direct_answer'
  | 'dont_know'
  | 'off_topic'
  | 'ready_to_continue'
  | 'solution_leap';

export type SDDecisionAction =
  | 'ANSWER_FACT'
  | 'ASK_NUDGE'
  | 'ASK_FOLLOW_UP'
  | 'ASK_CHALLENGE'
  | 'REDIRECT'
  | 'CLOSE_PROBE'
  | 'TRANSITION_STAGE'
  | 'COMPLETE_SESSION';

export type SDIntentType =
  | 'TRANSITION_STAGE'
  | 'OPENING'
  | 'ANSWER_FACT'
  | 'NUDGE'
  | 'REDIRECT'
  | 'WALKTHROUGH_OPEN'
  | 'WALKTHROUGH_OPEN_GAP'
  | 'FLOW_PROBE'
  | 'COMPONENT_PROBE'
  | 'EDGE_PROBE'
  | 'CONTRADICTION_CHALLENGE'
  | 'WALKTHROUGH_REDIRECT'
  | 'PERSISTENCE_GAP_PROBE'
  | 'PROBE_PRIMARY'
  | 'PROBE_FOLLOW_UP'
  | 'PROBE_CHALLENGE'
  | 'PROBE_REDIRECT'
  | 'PROBE_CLOSE'
  | 'SCENARIO_PRESENT'
  | 'SCENARIO_FOLLOW_UP'
  | 'SCENARIO_CHALLENGE'
  | 'SCENARIO_REDIRECT'
  | 'SCENARIO_CLOSE';

// ─── Graph Types ─────────────────────────────────────────────────────────────

export type SDKnownGraphNodeType =
  | 'service'
  | 'database'
  | 'queue'
  | 'cache'
  | 'client'
  | 'cdn'
  | 'lb'
  | 'gateway'
  | 'worker'
  | 'storage';

export type SDGraphNodeType = SDKnownGraphNodeType | (string & {});

export interface SDGraphNode {
  id: string;
  type: SDGraphNodeType;
  label: string;
  metadata?: { technology?: string; notes?: string };
}

export interface SDGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  direction: 'unidirectional' | 'bidirectional';
}

export interface SDGraphState {
  nodes: SDGraphNode[];
  edges: SDGraphEdge[];
}

export interface SDGraphMetrics {
  componentCoverage: number;
  topologyCoverage: number;
  dataFlowCompleteness: number;
  requirementAlignment: number;
  architectureSimplicity: number;
  nodeCount: number;
  edgeCount: number;
}

// ─── Problem Data Types ───────────────────────────────────────────────────────

export interface SDFlowPath {
  id: string;
  name: string;
  description: string;
  expectedNodeSequence: string[];
  expectedEdges?: Array<{ from: string; to: string }>;
  required: boolean;
  priority: number;
}

export interface SDRequirementContract {
  disclosedFacts: Array<{
    dimension: 'scope' | 'scale' | 'nfr' | 'data' | 'constraints' | 'non_goal';
    key: string;
    value: string;
  }>;
  coveredDimensions: string[];
}

export interface SDClarificationFact {
  dimension: 'scope' | 'scale' | 'nfr' | 'data' | 'constraints' | 'non_goal';
  key: string;
  answer: string;
  discloseWhen: string[];
}

export interface SDClarificationData {
  facts: SDClarificationFact[];
}

export interface SDProbe {
  id: string;
  stage: 'DEEP_DIVE' | 'WRAP_UP';
  dimension?:
    | 'data_model'
    | 'scalability'
    | 'consistency'
    | 'reliability'
    | 'latency'
    | 'cost'
    | 'security'
    | 'operability';
  appliesToNodeTypes?: string[];
  primaryQuestionTemplate: string;
  structuralGapQuestion?: string;
  expectedSignals: string[];
  redFlags: string[];
  followUps?: Array<{
    trigger: string;
    questionTemplate: string;
  }>;
  curveballType?:
    | 'failure'
    | 'scale_spike'
    | 'constraint_change'
    | 'dependency_outage'
    | 'cost_pressure';
}

// ─── Graph Snapshot ───────────────────────────────────────────────────────────

export interface SDGraphSnapshot {
  stage: SDStage;
  graph: SDGraphState;
  metrics: SDGraphMetrics;
  capturedAt: Date;
}

// ─── Leftover / Handoff Types ─────────────────────────────────────────────────

export interface SDClarificationLeftoverJson {
  requirementContract: SDRequirementContract;
  uncoveredDimensions: string[];
}

export interface SDWalkthroughLeftoverJson {
  unexplainedAtEnd: { nodeIds: string[]; edgeIds: string[] };
}

export interface SDDeepDiveLeftoverJson {
  completedProbeIds: string[];
  perProbeSignals: Record<string, string[]>;
  unresolvedRedFlags: string[];
}

export interface SDWrapUpLeftoverJson {
  completedScenarioIds: string[];
}

export type SDStageLeftoverJson =
  | SDClarificationLeftoverJson
  | SDWalkthroughLeftoverJson
  | SDDeepDiveLeftoverJson
  | SDWrapUpLeftoverJson;

// ─── Generic Base Types (stage-level generics) ────────────────────────────────

export interface SDQuestionIntent<TType extends string, TTarget = object> {
  stage: SDStage;
  type: TType;
  promptTemplate: string;
  forbiddenHints: string[];
  maxSentences: number;
  language: 'vi' | 'en' | 'ja';
  target?: TTarget;
}

export interface SDResponseAssessment<
  TSignals,
  TScoreDim extends string,
  TExtra = object,
> {
  candidateIntent: SDCandidateIntent;
  signals: TSignals;
  scoreDelta: Record<TScoreDim, number>;
  redFlags: string[];
  extra?: TExtra;
}

export interface SDStageTracker<TProgress> {
  turnCount: number;
  elapsedSeconds: number;
  progress: TProgress;
}

export interface SDStageDecision<TIntent> {
  action: SDDecisionAction;
  reason: string;
  nextIntent?: TIntent;
  chainedAction?: {
    action: SDDecisionAction;
    intent: TIntent;
  };
}

export interface SDDeepDiveIntentContext {
  intentType:
    | 'PROBE_PRIMARY'
    | 'PROBE_FOLLOW_UP'
    | 'PROBE_CHALLENGE'
    | 'PROBE_REDIRECT';
  followUpTrigger?: string;
}

export interface SDWrapUpIntentContext {
  intentType: 'SCENARIO_PRESENT' | 'SCENARIO_FOLLOW_UP' | 'SCENARIO_CHALLENGE';
  followUpReason?: 'blastRadius' | 'consistency' | 'mitigation';
  challengeDetail?: string;
}

// ─── Session Stage State (persisted to sd_sessions.stageState) ───────────────

export interface SDSessionStageState {
  stage: SDStage;
  trackerJson: Record<string, unknown>;
  runningScores: Record<string, number>;
  activeIntentJson?: Record<string, unknown>;
  graphSnapshotId?: string;
  hasNudgedEmptyCanvas?: boolean;
  graphAnalysisJson?: Record<string, unknown>;
}

// ─── Stage 1 — Clarification ──────────────────────────────────────────────────

export type SDClarificationIntentType =
  | 'OPENING'
  | 'ANSWER_FACT'
  | 'NUDGE'
  | 'REDIRECT';

export type SDClarificationIntent = SDQuestionIntent<
  SDClarificationIntentType,
  { factKeys?: string[]; dimension?: string }
>;

export interface SDClarificationSignals {
  dimensionCovered: string[];
  factDisclosed: boolean;
  matchedFactKeys: string[];
  solutionLeapDetected: boolean;
}

export type SDClarificationScoreDim =
  | 'requirementCoverage'
  | 'questionSpecificity'
  | 'assumptionDiscipline'
  | 'prioritization';

export type SDClarificationAssessment = SDResponseAssessment<
  SDClarificationSignals,
  SDClarificationScoreDim
>;

export interface SDClarificationProgress {
  coveredDimensions: string[];
  disclosedFactKeys: string[];
}

export type SDClarificationTracker = SDStageTracker<SDClarificationProgress>;

export type SDClarificationDecision = SDStageDecision<SDClarificationIntent>;

export interface SDClarificationTransitionCriteria {
  requiredDimensions: string[];
  minCandidateTurns: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
}

export interface SDClarificationPlannerInput {
  data: SDClarificationData;
  tracker: SDClarificationTracker;
  lastCandidateIntent?: SDCandidateIntent;
  context: { language: 'vi' | 'en' | 'ja'; level: string };
  elapsedSeconds: number;
}

// ─── Stage 2 — Walkthrough ────────────────────────────────────────────────────

export type SDWalkthroughIntentType =
  | 'WALKTHROUGH_OPEN'
  | 'WALKTHROUGH_OPEN_GAP'
  | 'FLOW_PROBE'
  | 'COMPONENT_PROBE'
  | 'EDGE_PROBE'
  | 'CONTRADICTION_CHALLENGE'
  | 'WALKTHROUGH_REDIRECT'
  | 'PERSISTENCE_GAP_PROBE';

export type SDWalkthroughIntent = SDQuestionIntent<
  SDWalkthroughIntentType,
  { targetNodeId?: string; targetEdgeId?: string; targetPathId?: string }
>;

export interface SDWalkthroughSignals {
  coveredPathIds: string[];
  constraintLinked: boolean;
  scopeViolation: boolean;
  contradictionDetected: boolean;
}

export interface SDWalkthroughExtra {
  explainedNodeIds: string[];
  explainedEdgeIds: string[];
  contradictionDetail?: string;
  synthesisFirstTurn?: {
    requirementSynthesis: boolean;
    scaleReasoning: boolean;
    scopeControl: boolean;
  };
}

export type SDWalkthroughScoreDim =
  | 'walkthroughCompleteness'
  | 'flowClarity'
  | 'graphVerbalAlignment'
  | 'communicationStructure'
  | 'requirementSynthesis'
  | 'scaleReasoning'
  | 'scopeControl';

export type SDWalkthroughAssessment = SDResponseAssessment<
  SDWalkthroughSignals,
  SDWalkthroughScoreDim,
  SDWalkthroughExtra
>;

export interface SDWalkthroughProgress {
  unexplainedNodeIds: string[];
  unexplainedEdgeIds: string[];
  coveredPathIds: string[];
  criticalPathsCovered: boolean;
  contradictionChallengesUsed: number;
}

export type SDWalkthroughTracker = SDStageTracker<SDWalkthroughProgress>;
export type SDWalkthroughDecision = SDStageDecision<SDWalkthroughIntent>;

export interface SDWalkthroughTransitionCriteria {
  minTurns: number;
  maxTurns: number;
  mustCoverCriticalPath: boolean;
  maxUnexplainedAllowed: number;
  contradictionMustBeResolved: boolean;
  maxContradictionChallenges: number;
}

export interface SDWalkthroughPlannerInput {
  graph: SDGraphState;
  flowPaths: SDFlowPath[];
  tracker: SDWalkthroughTracker;
  clarificationLeftover: SDClarificationLeftoverJson;
  graphMetrics: SDGraphMetrics;
  context: { language: 'vi' | 'en' | 'ja'; level: string };
  elapsedSeconds: number;
}

// ─── Stage 3 — Deep Dive ─────────────────────────────────────────────────────

export type SDDeepDiveIntentType =
  | 'PROBE_PRIMARY'
  | 'PROBE_FOLLOW_UP'
  | 'PROBE_CHALLENGE'
  | 'PROBE_REDIRECT';

export type SDDeepDiveIntent = SDQuestionIntent<
  SDDeepDiveIntentType,
  {
    probeId: string;
    targetNodeId?: string;
    probeDimension: string;
    followUpTrigger?: string;
  }
>;

export interface SDDeepDiveSignals {
  expectedSignalsCovered: string[];
  tradeoffMentioned: boolean;
  metricsMentioned: boolean;
  failureModeMentioned: boolean;
  constraintLinked: boolean;
}

export type SDDeepDiveScoreDim =
  | 'technicalDepth'
  | 'tradeoffArticulation'
  | 'bottleneckReasoning'
  | 'componentOwnership'
  | 'operationalAwareness';

export type SDDeepDiveAssessment = SDResponseAssessment<
  SDDeepDiveSignals,
  SDDeepDiveScoreDim
>;

export interface SDActiveProbeState {
  probeId: string;
  turnCount: number;
  followUpCount: number;
  challengeCount: number;
  coveredSignals: string[];
  closeReason?: 'signals_covered' | 'turn_limit' | 'timebox';
}

export interface SDDeepDiveProgress {
  completedProbeIds: string[];
  activeProbe: SDActiveProbeState | null;
  probeBudgetRemaining: number;
  perProbeSignals: Record<string, string[]>;
}

export type SDDeepDiveTracker = SDStageTracker<SDDeepDiveProgress>;
export type SDDeepDiveDecision = SDStageDecision<SDDeepDiveIntent>;

export interface SDDeepDiveTransitionCriteria {
  minProbes: number;
  maxProbes: number;
  maxStageSeconds: number;
  requiredDimensions: NonNullable<SDProbe['dimension']>[];
}

export interface SDDeepDivePlannerInput {
  graph: SDGraphState;
  graphMetrics: SDGraphMetrics;
  graphAnalysis?: {
    flowCoverage: Array<{
      pathId: string;
      covered: boolean;
      missingRoles: string[];
    }>;
    componentGaps: string[];
    structuralGapNodeTypes: string[];
    probePriorities: string[];
  };
  clarificationLeftover: SDClarificationLeftoverJson;
  walkthroughLeftover: SDWalkthroughLeftoverJson;
  walkthroughScores: Record<string, number>;
  tracker: SDDeepDiveTracker;
  probeBank: SDProbe[];
  context: { language: 'vi' | 'en' | 'ja'; level: string };
  elapsedSeconds: number;
}

// ─── Stage 4 — Wrap-Up ───────────────────────────────────────────────────────

export type SDWrapUpIntentType =
  | 'SCENARIO_PRESENT'
  | 'SCENARIO_FOLLOW_UP'
  | 'SCENARIO_CHALLENGE'
  | 'SCENARIO_REDIRECT'
  | 'SCENARIO_CLOSE';

export type SDWrapUpIntent = SDQuestionIntent<
  SDWrapUpIntentType,
  { scenarioId: string }
>;

export interface SDWrapUpSignals {
  blastRadiusRecognized: boolean;
  mitigationProposed: boolean;
  consistencyWithOriginalDesign: boolean;
  mentionedMitigations: string[];
}

export type SDWrapUpScoreDim =
  | 'failureReasoning'
  | 'adaptationQuality'
  | 'curveballHandling'
  | 'riskPrioritization'
  | 'consistencyWithOriginalDesign';

export type SDWrapUpAssessment = SDResponseAssessment<
  SDWrapUpSignals,
  SDWrapUpScoreDim
>;

export interface SDActiveScenarioState {
  scenarioId: string;
  turnCount: number;
  followUpCount: number;
  challengeCount: number;
  mentionedMitigations: string[];
  closeReason?: 'signals_covered' | 'turn_limit' | 'timebox';
}

export interface SDWrapUpProgress {
  completedItemIds: string[];
  activeScenario: SDActiveScenarioState | null;
  scenarioBudgetRemaining: number;
}

export type SDWrapUpTracker = SDStageTracker<SDWrapUpProgress>;
export type SDWrapUpDecision = SDStageDecision<SDWrapUpIntent>;

export interface SDWrapUpTransitionCriteria {
  minScenarios: number;
  maxScenarios: number;
  maxStageSeconds: number;
  maxFollowUpsPerScenario: number;
}

export interface SDWrapUpPlannerInput {
  graph: SDGraphState;
  probeBank: SDProbe[];
  clarificationLeftover: SDClarificationLeftoverJson;
  deepDiveLeftover: SDDeepDiveLeftoverJson;
  deepDiveScores: Record<string, number>;
  tracker: SDWrapUpTracker;
  context: { language: 'vi' | 'en' | 'ja'; level: string };
  timeRemainingSeconds: number;
}

// ─── Final Evaluation ─────────────────────────────────────────────────────────

export interface SDFinalEvaluationInput {
  stageScores: Record<SDScoredStage, number>;
  dimensionScores: Record<string, number>;
  stageSummaries: Array<{
    stage: SDScoredStage;
    totalTurns: number;
    elapsedSeconds: number;
    scores: Record<string, number>;
    redFlags: string[];
    leftoverJson: SDStageLeftoverJson;
  }>;
  graphSnapshots: Array<{
    stage: SDStage;
    metrics: SDGraphMetrics;
    capturedAt: Date;
  }>;
  redFlags: string[];
  strengths: string[];
  weaknesses: string[];
}

// ─── Drawing Transition ───────────────────────────────────────────────────────

export interface SDDrawingTransitionCriteria {
  emptyThreshold: number;
  sparseThreshold: number;
  requiredNodeTypes: string[];
}
