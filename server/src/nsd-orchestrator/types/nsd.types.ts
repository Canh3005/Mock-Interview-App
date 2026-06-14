// ── Base enums/unions ─────────────────────────────────────────────────────────

export type NSDPhase =
  | 'PHASE_1_FR'
  | 'PHASE_2_NFR'
  | 'PHASE_3_SCALE'
  | 'PHASE_4_HLD'
  | 'PHASE_5_DEEP_DIVE'
  | 'EVALUATING'
  | 'COMPLETED';

// Only interview phases — phases that can have fills, summaries, and evidence
export type NSDInterviewPhase =
  | 'PHASE_1_FR'
  | 'PHASE_2_NFR'
  | 'PHASE_3_SCALE'
  | 'PHASE_4_HLD'
  | 'PHASE_5_DEEP_DIVE';

// String union (not enum) → serializes directly into LLM prompts without transform
export type NSDEvalLevel = 'good' | 'incomplete' | 'weak' | 'irrelevant';

export type NSDSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

// 12 values matching NODE_TYPES in SDNodeTypes.jsx exactly — match by type enum, not label
export type NSDNodeType =
  | 'Client'
  | 'LoadBalancer'
  | 'APIGateway'
  | 'CDN'
  | 'WebServer'
  | 'Worker'
  | 'DatabaseSQL'
  | 'DatabaseNoSQL'
  | 'Cache'
  | 'ObjectStorage'
  | 'MessageQueue'
  | 'ExternalService';

export type NSDSkillTag =
  | 'fr_clarification'
  | 'synthesis'
  | 'nfr_reasoning'
  | 'tradeoff_awareness'
  | 'scale_estimation'
  | 'architecture_connection'
  | 'storage_design'
  | 'db_selection'
  | 'caching_strategy'
  | 'read_write_optimization'
  | 'naive_first_thinking'
  | 'cross_feature_coherence' // matches P4 dimension name
  | 'bottleneck_identification'
  | 'scaling_patterns';

// 13 named evaluation dimensions across 5 phases
export type NSDPhaseDimension =
  | 'completeness'
  | 'synthesis' // P1
  | 'nfr_coverage'
  | 'reasoning_quality'
  | 'tradeoff_awareness' // P2
  | 'calculation_approach'
  | 'architecture_connection' // P3
  | 'component_correctness'
  | 'design_reasoning'
  | 'cross_feature_coherence' // P4
  | 'bottleneck_identification'
  | 'solution_knowledge'
  | 'tradeoff_articulation'; // P5

// ── Problem data types (stored as JSONB per phase in nsd_problems) ────────────

// Shared check item — used across all phases
export interface NSDCheckItem {
  key: string;
  red_flag: string;
  followup_question: string;
  fill_answer: string;
  skill_tag: NSDSkillTag;
  optional?: boolean; // true → never fill, never count in dimension score
}

// Phase 1 ─────────────────────────────────────────────────────────────────────

export interface NSDPhase1Feature {
  name: string;
  question: string;
  expected_result: string;
  expected_constraints: NSDCheckItem[];
}

export interface NSDPhase1Data {
  opening: {
    question: string;
    system_facts: string; // brief system description shown to candidate at kickoff
    expected_result: string;
  };
  features: NSDPhase1Feature[];
  closing: {
    question: string;
    expected_result: string;
    red_flags: NSDCheckItem[];
  };
}

// Phase 2 ─────────────────────────────────────────────────────────────────────

export interface NSDNFRDimension {
  key: string;
  question: string;
  expected_result: string;
  expected_reasoning: NSDCheckItem[];
}

export interface NSDPhase2Data {
  opening: {
    question: string;
    system_nfr_list: string; // pre-formatted e.g. "availability, latency, consistency, durability"
    expected_result: string;
  };
  nfr_dimensions: NSDNFRDimension[];
  closing: {
    question: string;
    expected_result: string;
    red_flags: NSDCheckItem[];
  };
}

// Phase 3 ─────────────────────────────────────────────────────────────────────

export interface NSDScaleDimension {
  key: string;
  question: string;
  expected_result: string;
  expected_elements: NSDCheckItem[];
}

export interface NSDPhase3Data {
  opening: {
    question: string;
    provided_number: string; // DAU/MAU given to candidate by interviewer
    expected_result: string;
  };
  scale_dimensions: NSDScaleDimension[];
  closing: {
    question: string;
    expected_result: string;
    red_flags: NSDCheckItem[];
  };
}

// Phase 4 ─────────────────────────────────────────────────────────────────────

export interface NSDReferenceNode {
  id: string;
  type: NSDNodeType;
  acceptable_types?: NSDNodeType[];
}

// Problem data graph edge (from/to = node ids in reference_graph)
export interface NSDReferenceEdge {
  from: string;
  to: string;
  label?: string;
}

export interface NSDRequiredNodeCheck extends NSDCheckItem {
  expected_type: NSDNodeType;
  acceptable_types?: NSDNodeType[]; // other node types also valid for this role
  match_labels?: string[]; // lowercase substrings to match against canvas node.label
  reuse_from?: string[]; // required_nodes[].key of another feature/question whose accepted role satisfies this one
  check: string; // positive pass condition — what a correct response looks like
}

export interface NSDKnownExtraNode {
  key: string;
  type: NSDNodeType;
  valid_context: string;
  probe_question: string;
}

export interface NSDPhase4FeatureDesign {
  feature: string;
  question: string;
  reference_graph: {
    naive: { nodes: NSDReferenceNode[]; edges: NSDReferenceEdge[] };
    optimized: { nodes: NSDReferenceNode[]; edges: NSDReferenceEdge[] };
  };
  reference_walkthrough: Array<{ step: number; text: string }>;
  evaluation_checklist: {
    required_nodes: NSDRequiredNodeCheck[];
    required_explanations: Array<NSDCheckItem & { check: string }>;
  };
  known_extra_nodes: NSDKnownExtraNode[];
  // Cross-feature integration walkthrough checks — only present on the last feature.
  integration_checks?: Array<NSDCheckItem & { check: string }>;
}

export interface NSDPhase4Data {
  feature_design: NSDPhase4FeatureDesign[];
}

// Phase 5 ─────────────────────────────────────────────────────────────────────
// Canvas is editable. Candidate adapts Phase 4 canvas to handle scaling scenarios.
// evaluation_checklist mirrors Phase 4:
//   required_nodes → nodes candidate must add/have on canvas for this scaling solution
//   required_explanations → verbal reasoning checks

export interface NSDDeepDiveQuestion {
  type: 'scale' | 'edge_case';
  key: string;
  question: string;
  expected_result: string;
  evaluation_checklist: {
    required_nodes: NSDRequiredNodeCheck[];
    required_explanations: Array<NSDCheckItem & { check: string }>;
  };
}

export interface NSDPhase5Data {
  deep_dive_questions: NSDDeepDiveQuestion[];
}

// ── Canvas state ──────────────────────────────────────────────────────────────

// React Flow node
export interface NSDCanvasNode {
  id: string;
  type: NSDNodeType;
  label: string;
  position: { x: number; y: number };
}

// React Flow edge (source/target convention)
export interface NSDCanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface NSDCanvasState {
  nodes: NSDCanvasNode[];
  edges: NSDCanvasEdge[];
}

// ── Canvas role/review tracking (Phase 4/5 accumulation) ───────────────────────

// A canvas node that has been accepted as fulfilling a required_nodes role,
// either for the feature/question it was added in, or reused/promoted from elsewhere.
export interface NSDAcceptedNodeRole {
  nodeId: string;
  nodeType: NSDNodeType;
  label: string;
  feature: string; // feature (Phase 4) or question key (Phase 5) that accepted this role
  roleKey: string; // = required_nodes[].key matched
}

// status:
//  - 'detected'  : phát hiện node lạ, CHƯA hỏi probe (chờ turn hỏi)
//  - 'asked'     : đã hỏi probe, đang chờ candidate trả lời ở turn kế tiếp
//  - 'accepted'  : candidate giải thích hợp lý → không hỏi lại
//  - 'rejected'  : candidate không giải thích được → không hỏi lại, ghi nhận unjustified
//  - 'accepted_future_role' : node trùng role của 1 required_node thuộc feature SAU —
//    không probe; sẽ được promote sang acceptedNodeRoles khi feature đó bắt đầu
export type NSDExtraNodeReviewStatus =
  | 'detected'
  | 'asked'
  | 'accepted'
  | 'rejected'
  | 'accepted_future_role';

export interface NSDExtraNodeReview {
  nodeId: string;
  nodeType: NSDNodeType;
  label: string; // snapshot lúc detect — dùng để revalidate nếu node bị đổi label
  featureKey: string; // feature/question đang chạy lúc node được phát hiện
  status: NSDExtraNodeReviewStatus;
  probeQuestion: string;
  futureFeatureKey?: string; // set khi status = 'accepted_future_role'
  futureRoleKey?: string; // = required_nodes[].key của feature tương lai mà node này match
}

export interface NSDIntegrationReviewState {
  started: boolean;
  itemCounters: NSDItemCounters[];
  initialAssessmentDone: boolean;
}

// ── Runtime phase progress (stored as JSONB per phase in nsd_sessions) ────────

// Used by Phase 4/5 canvas-driven evaluation (counter-per-item approach)
export interface NSDItemCounters {
  itemKey: string;
  isOptional: boolean;
  incomplete_count: number;
  weak_count: number;
  irrelevant_count: number;
  filled: boolean;
  resolved: boolean;
  added: boolean;
  rounds_needed: number;
}

// Used by Phase 1/2/3 holistic evaluation
export interface NSDResolvedItem {
  itemKey: string;
  isOptional: boolean;
  wasFilled: boolean;
  roundsNeeded: number; // 0 = self-resolved on group question, 1+ = followup attempts needed
}

// Shared sub-state for the "current group" state machine (feature / dimension / closing)
export interface NSDGroupState {
  state: 'asking_question' | 'asking_followup';
  unresolvedKeys: string[]; // red flag item keys not yet resolved
  currentItemKey: string | null;
  currentItemAttempts: number; // 0 or 1; fill triggered on 2nd fail
}

// Separate typed progress per phase — type-safe access, no polymorphic cast needed
export interface NSDPhase1Progress {
  openingDone: boolean;
  featureIndex: number;
  group: NSDGroupState;
  resolvedItems: NSDResolvedItem[];
  fillEvents: NSDFillEvent[];
  closingStarted: boolean;
  closing: NSDGroupState;
  closingResolvedItems: NSDResolvedItem[];
  closingFillEvents: NSDFillEvent[];
  turnCount: number;
}

export interface NSDPhase2Progress {
  openingDone: boolean;
  dimensionIndex: number;
  group: NSDGroupState;
  resolvedItems: NSDResolvedItem[];
  fillEvents: NSDFillEvent[];
  closingStarted: boolean;
  closing: NSDGroupState;
  closingResolvedItems: NSDResolvedItem[];
  closingFillEvents: NSDFillEvent[];
  turnCount: number;
}

export interface NSDPhase3Progress {
  openingDone: boolean;
  dimensionIndex: number;
  group: NSDGroupState;
  resolvedItems: NSDResolvedItem[];
  fillEvents: NSDFillEvent[];
  closingStarted: boolean;
  closing: NSDGroupState;
  closingResolvedItems: NSDResolvedItem[];
  closingFillEvents: NSDFillEvent[];
  turnCount: number;
}

export interface NSDPhase4Progress {
  featureIndex: number;
  initialAssessmentDone: boolean; // holistic pass for required_explanations of current feature
  nodeItemCounters: NSDItemCounters[];
  explanationItemCounters: NSDItemCounters[];
  acceptedNodeRoles: NSDAcceptedNodeRole[]; // accumulates across features
  extraNodeReviews: NSDExtraNodeReview[]; // accumulates across features
  integrationReview: NSDIntegrationReviewState | null;
  turnCount: number;
}

export interface NSDPhase5Progress {
  questionIndex: number;
  nodeItemCounters: NSDItemCounters[];
  explanationItemCounters: NSDItemCounters[];
  inheritedCanvas: NSDCanvasState | null; // canvas state copied from end of Phase 4
  inheritedAcceptedNodeRoles: NSDAcceptedNodeRole[]; // copied from Phase 4 at transition — immutable
  inheritedExtraNodeReviews: NSDExtraNodeReview[]; // copied from Phase 4 at transition — immutable
  acceptedNodeRoles: NSDAcceptedNodeRole[]; // accumulated within Phase 5
  extraNodeReviews: NSDExtraNodeReview[]; // accumulated within Phase 5
  turnCount: number;
}

// ── Turn record & evaluation ──────────────────────────────────────────────────

export type NSDTurnAction =
  | 'OPEN_PHASE'
  | 'ASK_ITEM'
  | 'FOLLOWUP'
  | 'FILL'
  | 'NEXT_ITEM'
  | 'NEXT_FEATURE'
  | 'NEXT_DIMENSION'
  | 'NEXT_DEEP_DIVE_QUESTION'
  | 'CLOSE_PHASE'
  | 'CANVAS_PROBE'
  | 'INITIAL_ASSESSMENT'
  | 'INTEGRATION_REVIEW';

export interface NSDFillEvent {
  itemKey: string;
  skill_tag: NSDSkillTag;
  fill_answer: string;
  followup_count_at_fill: number;
  canvasUpdated: boolean;
  phase: NSDInterviewPhase;
  featureOrDimensionKey?: string;
}

export interface NSDExtraNodeEvent {
  nodeKey: string;
  nodeType: NSDNodeType;
  in_known_extra_nodes: boolean;
  candidate_justified: boolean;
  probeQuestion: string;
  outcome: 'valid_advanced' | 'unjustified' | 'misunderstanding';
  skill_tag?: NSDSkillTag; // set when outcome=misunderstanding, for gap mapping
}

export interface NSDTurnRecord {
  phase: NSDInterviewPhase;
  questionKey: string;
  initialEvaluation: NSDEvalLevel; // eval on candidate's first response, before any followup
  followupRounds: number;
  resolvedItems: Array<{ itemKey: string; roundsNeeded: number }>;
  fillEvents: NSDFillEvent[];
  optionalItemsAdded: Array<{ itemKey: string }>;
  extraNodeEvents: NSDExtraNodeEvent[];
}

// ── 3-tier evaluation ─────────────────────────────────────────────────────────

export type NSDDimensionScore = 'good' | 'pass' | 'needs_improvement' | 'poor';
// Scoring priority (check in order):
//   poor:              filled/total > 0.5
//   good:              selfResolved/total >= 0.75 AND filled == 0
//   pass:              (selfResolved+prompted)/total >= 0.5 AND filled <= 1
//   needs_improvement: all other cases
// Only required (isOptional=false) items count toward total.
// Phase score = lowest dimension score (bottleneck drives overall).

export interface NSDPhaseDimensionResult {
  dimension: NSDPhaseDimension;
  score: NSDDimensionScore;
  totalItems: number; // required items only
  selfResolved: number; // rounds_needed == 0
  promptedResolved: number; // rounds_needed >= 1, not filled
  filled: number;
}

export interface NSDPhaseSummaryRecord {
  phase: NSDInterviewPhase;
  dimensions: NSDPhaseDimensionResult[];
  phaseScore: NSDDimensionScore;
  fillCount: number;
  totalItems: number;
  optionalItemsAdded: string[];
}

export type NSDSkillGapSeverity = 'critical' | 'attention' | 'minor';
// critical:   >= 1 fill_event with this tag, OR misunderstanding extra node
// attention:  no fill, rounds_needed >= 2 across MULTIPLE questions
// minor:      rounds_needed >= 2, only a single question once

export interface NSDSkillGapEntry {
  skill_tag: NSDSkillTag;
  severity: NSDSkillGapSeverity;
  evidence: Array<{
    type: 'fill_event' | 'high_rounds' | 'misunderstanding';
    phase: NSDInterviewPhase;
    itemKey?: string;
    nodeKey?: string;
  }>;
}

export interface NSDAdvancedSignal {
  nodeKey: string;
  questionKey: string;
  phase: NSDInterviewPhase;
  context: string; // from known_extra_nodes.valid_context
}

export interface NSDDesignIssue {
  nodeKey: string;
  questionKey: string;
  phase: NSDInterviewPhase;
  in_known_extra_nodes: boolean;
  candidate_justified: boolean;
  outcome: 'unjustified' | 'misunderstanding';
  skill_tag?: NSDSkillTag; // when misunderstanding → also merged into skill_gap_map as critical
}

export interface NSDEvaluationResult {
  tier2_phases: NSDPhaseSummaryRecord[];
  tier3_skill_gaps: {
    gaps: NSDSkillGapEntry[];
    design_issues: NSDDesignIssue[];
    advanced_signals: NSDAdvancedSignal[];
  };
  overallGrade: NSDDimensionScore;
  completedAt: Date;
}

// ── SSE meta ──────────────────────────────────────────────────────────────────

export interface NSDSSEMeta {
  stageChanged: boolean;
  stage?: NSDPhase;
  canvasMode?: 'locked' | 'editable'; // Phase 4+5 = editable, else locked
  wasFill: boolean;
  fillAnswer?: string;
  phaseProgress?: { currentItem: number; totalItems: number };
}
