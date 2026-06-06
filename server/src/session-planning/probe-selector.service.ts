import { Injectable } from '@nestjs/common';
import {
  QuestionProbeCompetency,
  QuestionProbeLanguage,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeStage,
} from '../question-bank/constants/question-bank-taxonomy.constants';
import type { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import type { CandidateClaim } from '../documents/entities/candidate-claim.entity';
import type { RiskHypothesis } from '../documents/entities/risk-hypothesis.entity';
import type {
  BehavioralScoringParams,
  CvScoringParams,
  FallbackTrigger,
  PlannedProbe,
  ProbeSelectionContext,
  StageProbeAllocation,
  StagePriority,
  TechnicalScoringParams,
} from './types/session-plan.types';
import {
  CLAIM_PRIORITY_WEIGHTS,
  DIFFICULTY_RANGES,
  ORDERED_STAGES,
  PROBE_COUNTS,
  RECENT_PROBE_SCORE_PENALTY,
  RISK_SEVERITY_SCORES,
  STAGE_3_COMPETENCY_BONUS,
  STAGE_3_DOMAIN_COMPETENCIES,
  STAGE_3_THEME_TAGS,
  STAGE_3_TYPE_BONUS,
  STAGE_5_BASE_PRIORITIES,
  STAGE_5_SOFT_SKILL_POOL,
  STAGE_PRIORITIES,
  TOP_K_MULTIPLIER,
} from './constants/probe-selector.constants';
import {
  CLOSING_OVERHEAD_MINUTES,
  MIN_PROBE_MINUTES,
  OPENING_OVERHEAD_MINUTES,
  STAGE_WEIGHTS,
} from './constants/session-planning.constants';
import type { ScoredProbe } from './types/probe-selector.types';

@Injectable()
export class ProbeSelectorService {
  /**
   * Xây dựng danh sách probe được chọn cho từng stage của phiên phỏng vấn.
   *
   * @param context - Toàn bộ thông tin cần thiết cho quá trình selection: level, roleFamily, language, competencies, claims, risks, tech stack
   * @returns Mảng StageProbeAllocation theo thứ tự stage (stage 1 → stage 6), mỗi phần tử chứa probe đã chọn và fallback
   */
  buildStageAllocations(
    context: ProbeSelectionContext,
  ): StageProbeAllocation[] {
    const usableMinutes: number =
      context.durationMinutes -
      OPENING_OVERHEAD_MINUTES -
      CLOSING_OVERHEAD_MINUTES;
    return ORDERED_STAGES.map((stage) => {
      const stageMinutes: number =
        usableMinutes * (STAGE_WEIGHTS[stage]?.[context.depth] ?? 0);
      const budgetCount: number = Math.max(
        1,
        Math.floor(stageMinutes / MIN_PROBE_MINUTES),
      );
      const count: number = Math.min(
        PROBE_COUNTS[stage][context.depth],
        budgetCount,
      );
      const priority: StagePriority = STAGE_PRIORITIES[stage];
      const filteredProbes: QuestionProbe[] = this._hardFilter({
        probes: context.probes,
        stage,
        targetLevel: context.targetLevel,
        roleFamily: context.roleFamily,
        language: context.language,
      });
      const { selected, fallbacks } = this._selectForStage({
        stage,
        probes: filteredProbes,
        count,
        context,
      });
      return {
        stage,
        priority,
        allocatedMinutes: 0,
        selectedProbes: selected,
        fallbackProbes: fallbacks,
      };
    });
  }

  /**
   * Lọc cứng danh sách probe theo các điều kiện bắt buộc của stage.
   * Probe không vượt qua filter này bị loại hoàn toàn, không được đưa vào scoring.
   *
   * @param probes - Toàn bộ probe đã pre-filter từ DB
   * @param stage - Stage cần lọc
   * @param targetLevel - Level ứng viên; probe phải hỗ trợ level này
   * @param roleFamily - Role family; probe có roleFamilies rỗng áp dụng cho mọi role
   * @param language - Ngôn ngữ phiên phỏng vấn; probe phải có localizedContent cho ngôn ngữ này
   * @returns Danh sách probe đủ điều kiện cho stage
   */
  private _hardFilter({
    probes,
    stage,
    targetLevel,
    roleFamily,
    language,
  }: {
    probes: QuestionProbe[];
    stage: QuestionProbeStage;
    targetLevel: QuestionProbeLevel;
    roleFamily: QuestionProbeRoleFamily;
    language: QuestionProbeLanguage;
  }): QuestionProbe[] {
    return probes.filter((p) => {
      if (!p.stages.includes(stage)) return false;
      if (p.levels.length > 0 && !p.levels.includes(targetLevel)) return false;
      if (p.roleFamilies.length > 0 && !p.roleFamilies.includes(roleFamily))
        return false;
      if (p.status !== 'active') return false;
      if (!p.localizedContent[language]) return false;
      return true;
    });
  }

  /**
   * Chọn probe tốt nhất cho một stage cụ thể dựa trên scoring.
   * Stage 6 (reverse interview) dùng logic selection riêng, không dùng scoring chung.
   *
   * @param stage - Stage cần chọn probe
   * @param probes - Danh sách probe đã qua hard filter cho stage này
   * @param count - Số lượng probe cần chọn (theo PROBE_COUNTS)
   * @param context - Context đầy đủ để tính score
   * @returns Mảng probe được chọn và mảng fallback (dùng khi probe chính không phù hợp lúc phỏng vấn)
   */
  private _selectForStage({
    stage,
    probes,
    count,
    context,
  }: {
    stage: QuestionProbeStage;
    probes: QuestionProbe[];
    count: number;
    context: ProbeSelectionContext;
  }): { selected: PlannedProbe[]; fallbacks: PlannedProbe[] } {
    const { targetLevel, roleFamily, priorityCompetencies, riskHypotheses } =
      context;
    if (stage === 'stage_6_reverse_interview') {
      return this._selectStage6({
        probes,
        targetLevel,
        roleFamily,
        selectionSeed: context.selectionSeed,
        recentlyUsedProbeIds: context.recentlyUsedProbeIds,
      });
    }
    // For stage 5, override priority competencies with risk-related ones if there are active risk hypotheses, to increase chances of uncovering relevant risks through soft skill questions.
    const effectivePriorities: QuestionProbeCompetency[] =
      stage === 'stage_5_soft_skills'
        ? this._resolveStage5Priorities(riskHypotheses)
        : priorityCompetencies;
    const scored = this._applyRecentUsagePenalty(
      this._scoreProbesForStage({
        stage,
        probes,
        context,
        effectivePriorities,
      }),
      context.recentlyUsedProbeIds,
    );
    const selectedRaw = this._selectRawForStage({
      stage,
      scored,
      count,
      context,
    });
    const fallbackRaw = this._selectFallbackRaw({
      scored,
      selectedRaw,
      fallbackCount: selectedRaw.length,
    });
    const selected: PlannedProbe[] = selectedRaw.map((s, i) =>
      this._buildPlannedProbe({ probe: s.probe, order: i + 1, score: s.score }),
    );
    const fallbacks: PlannedProbe[] = fallbackRaw.map((s, i) =>
      this._buildPlannedProbe({
        probe: s.probe,
        order: i + 1,
        score: s.score,
        isFallbackFor: selectedRaw[i]?.probe.id,
        fallbackTrigger: 'no_relevant_story',
      }),
    );
    return { selected, fallbacks };
  }

  private _selectRawForStage({
    stage,
    scored,
    count,
    context,
  }: {
    stage: QuestionProbeStage;
    scored: ScoredProbe[];
    count: number;
    context: ProbeSelectionContext;
  }): ScoredProbe[] {
    if (stage === 'stage_2_tech_stack' && context.jdTechStack.length > 0) {
      return this._selectStage2TechCoverage({
        scored,
        count,
        jdTechStack: context.jdTechStack,
        selectionSeed: context.selectionSeed,
      });
    }
    if (stage === 'stage_3_domain_knowledge') {
      return this._selectStage3DomainCoverage({
        scored,
        count,
        selectionSeed: context.selectionSeed,
      });
    }
    if (stage === 'stage_1_culture_fit' || stage === 'stage_5_soft_skills') {
      const selected = this._selectMMR({
        scored,
        count,
        seed: context.selectionSeed,
        scope: stage,
        similarityFn: (a, b) => this._competencySimilarity(a, b),
        lambda: stage === 'stage_1_culture_fit' ? 0.7 : 0.6,
      });
      return stage === 'stage_1_culture_fit'
        ? this._sortIntroFirst(selected)
        : selected;
    }
    if (stage === 'stage_4_cv_deep_dive') {
      return this._selectStage4ClaimCoverage({
        scored,
        candidateClaims: context.candidateClaims,
        count,
        context,
      });
    }
    return this._selectTopKSeeded({
      candidates: scored,
      count,
      seed: context.selectionSeed,
      scope: stage,
    });
  }

  private _selectFallbackRaw({
    scored,
    selectedRaw,
    fallbackCount,
  }: {
    scored: ScoredProbe[];
    selectedRaw: ScoredProbe[];
    fallbackCount: number;
  }): ScoredProbe[] {
    const selectedIds = new Set(selectedRaw.map((s) => s.probe.id));
    const available = scored.filter((s) => !selectedIds.has(s.probe.id));
    const usedFallbackIds = new Set<string>();
    const result: ScoredProbe[] = [];

    // Pair each fallback with its primary probe by tech overlap first, then score.
    // This prevents high-score but tech-unrelated probes from becoming fallbacks
    // for low-score probes selected purely for coverage reasons.
    for (let i = 0; i < Math.min(fallbackCount, selectedRaw.length); i++) {
      const primaryTechSet = new Set(selectedRaw[i].probe.techTags);
      const best = available
        .filter((s) => !usedFallbackIds.has(s.probe.id))
        .sort((a, b) => {
          const aOverlap = a.probe.techTags.filter((t) =>
            primaryTechSet.has(t),
          ).length;
          const bOverlap = b.probe.techTags.filter((t) =>
            primaryTechSet.has(t),
          ).length;
          return bOverlap - aOverlap || b.score - a.score;
        })[0];
      if (best) {
        usedFallbackIds.add(best.probe.id);
        result.push(best);
      }
    }
    return result;
  }

  /**
   * Chọn probe cho stage 2 (tech stack) với mục tiêu phủ tối đa jdTechStack.
   *
   * - count >= số tech có probe: phủ hết, chia slot đều cho từng tech
   *   (base = floor(count/techs), (count % techs) tech đầu được thêm 1 slot)
   * - count < số tech có probe: chọn ngẫu nhiên deterministic `count` tech
   *   bằng selectionSeed, mỗi tech 1 probe
   *
   * Trong mỗi tech, probe intro được ưu tiên hơn mid/deep.
   * Fallback về _selectTopKSeeded nếu không có tech nào trong JD có probe.
   */
  private _selectStage2TechCoverage({
    scored,
    count,
    jdTechStack,
    selectionSeed,
  }: {
    scored: ScoredProbe[];
    count: number;
    jdTechStack: string[];
    selectionSeed: string;
  }): ScoredProbe[] {
    const availableTechs = jdTechStack.filter((tech) =>
      scored.some((s) => s.probe.techTags.includes(tech)),
    );
    if (availableTechs.length === 0) {
      return this._selectTopKSeeded({
        candidates: scored,
        count,
        seed: selectionSeed,
        scope: 'stage_2_tech_stack',
      });
    }

    const techRankCache = new Map(
      availableTechs.map((t) => [
        t,
        this._seededRank({
          seed: selectionSeed,
          scope: 'stage_2_tech_stack',
          id: t,
        }),
      ]),
    );
    const selectedTechs: string[] =
      count >= availableTechs.length
        ? availableTechs
        : [...availableTechs]
            .sort((a, b) => techRankCache.get(a)! - techRankCache.get(b)!)
            .slice(0, count);

    const techCount = selectedTechs.length;
    const base = Math.floor(count / techCount);
    const extra = count % techCount;
    const slotsPerTech = selectedTechs.map(
      (_, i) => base + (i < extra ? 1 : 0),
    );

    const selected: ScoredProbe[] = [];
    const selectedIds = new Set<string>();

    for (let i = 0; i < selectedTechs.length; i++) {
      const tech = selectedTechs[i];
      const slots = slotsPerTech[i];
      const available = scored.filter(
        (s) => s.probe.techTags.includes(tech) && !selectedIds.has(s.probe.id),
      );

      // Pick at most 1 intro (highest score), then fill remaining slots with non-intro
      const intro = available
        .filter((s) => s.probe.conversationDepth === 'intro')
        .sort((a, b) => b.score - a.score)[0];
      const nonIntro = available
        .filter(
          (s) =>
            s.probe.conversationDepth !== 'intro' &&
            s.probe.id !== intro?.probe.id,
        )
        .sort((a, b) => b.score - a.score);

      const picks: ScoredProbe[] = [];
      if (intro) picks.push(intro);
      for (const s of nonIntro) {
        if (picks.length >= slots) break;
        picks.push(s);
      }

      for (const pick of picks) {
        selectedIds.add(pick.probe.id);
        selected.push(pick);
      }
    }

    return this._orderStage2Probes({ selected, targetTechs: selectedTechs });
  }

  /**
   * Sắp xếp probe stage 2 theo thứ tự tech trong JD, intro trước mid/deep trong mỗi nhóm.
   * Probe không thuộc tech nào trong JD được đặt cuối.
   */
  private _orderStage2Probes({
    selected,
    targetTechs,
  }: {
    selected: ScoredProbe[];
    targetTechs: string[];
  }): ScoredProbe[] {
    const groups = new Map<string, ScoredProbe[]>();
    const ungrouped: ScoredProbe[] = [];

    for (const probe of selected) {
      const primaryTech = targetTechs.find((t) =>
        probe.probe.techTags.includes(t),
      );
      if (primaryTech) {
        if (!groups.has(primaryTech)) groups.set(primaryTech, []);
        groups.get(primaryTech)!.push(probe);
      } else {
        ungrouped.push(probe);
      }
    }

    const ordered: ScoredProbe[] = [];
    for (const tech of targetTechs) {
      const group = groups.get(tech) ?? [];
      group.sort((a, b) => {
        const aIsIntro = a.probe.conversationDepth === 'intro' ? 0 : 1;
        const bIsIntro = b.probe.conversationDepth === 'intro' ? 0 : 1;
        return aIsIntro - bIsIntro || b.score - a.score;
      });
      ordered.push(...group);
    }
    ordered.push(...ungrouped);

    return ordered;
  }

  private _selectStage3DomainCoverage({
    scored,
    count,
    selectionSeed,
  }: {
    scored: ScoredProbe[];
    count: number;
    selectionSeed: string;
  }): ScoredProbe[] {
    const selected: ScoredProbe[] = [];
    const remaining: ScoredProbe[] = scored.filter(
      (s) =>
        !(
          s.probe.type === 'technical_depth' &&
          s.probe.conversationDepth === 'intro'
        ),
    );
    const coveredThemes = new Set<string>();
    const coveredTechs = new Set<string>();
    const themesCache = new Map(
      remaining.map((s) => [s.probe.id, this._stage3Themes(s.probe)]),
    );

    while (selected.length < count && remaining.length > 0) {
      const remainingSlots = count - selected.length;
      const adjustedCandidates = remaining.map((candidate, index) => {
        const adjusted = this._stage3AdjustedScore({
          candidate,
          coveredThemes,
          coveredTechs,
          themesCache,
        });
        return { ...candidate, adjustedScore: adjusted, originalIndex: index };
      });
      const picked = this._pickOneFromTopK({
        candidates: adjustedCandidates,
        count: remainingSlots,
        seed: selectionSeed,
        scope: `stage_3_domain_knowledge:${selected.length}`,
        score: (candidate) => candidate.adjustedScore,
        id: (candidate) => candidate.probe.id,
      });
      remaining.splice(picked.originalIndex, 1);
      selected.push({
        probe: picked.probe,
        score: picked.adjustedScore,
      });
      (
        themesCache.get(picked.probe.id) ?? this._stage3Themes(picked.probe)
      ).forEach((theme) => coveredThemes.add(theme));
      picked.probe.techTags.forEach((tag) => coveredTechs.add(tag));
    }

    return selected;
  }

  private _selectStage4ClaimCoverage({
    scored,
    candidateClaims,
    count,
    context,
  }: {
    scored: ScoredProbe[];
    candidateClaims: CandidateClaim[];
    count: number;
    context: ProbeSelectionContext;
  }): ScoredProbe[] {
    if (candidateClaims.length === 0) {
      return this._selectMMR({
        scored,
        count,
        seed: context.selectionSeed,
        scope: 'stage_4_cv_deep_dive',
        similarityFn: (a, b) => this._competencySimilarity(a, b),
        lambda: 0.65,
      });
    }

    const selected: ScoredProbe[] = [];
    const selectedIds = new Set<string>();

    const PRIORITY_ORDER: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };
    const sortedClaims = [...candidateClaims].sort(
      (a, b) =>
        (PRIORITY_ORDER[b.verificationPriority] ?? 1) -
        (PRIORITY_ORDER[a.verificationPriority] ?? 1),
    );

    // Phase 1: for each claim in priority order, pick best probe that verifies it
    for (const claim of sortedClaims) {
      if (selected.length >= count) break;

      const claimScored = scored
        .filter((s) => !selectedIds.has(s.probe.id))
        .map((s) => ({
          probe: s.probe,
          score: this._scoreProbeForClaim({
            probe: s.probe,
            claim,
            jdTechStack: context.jdTechStack,
            targetLevel: context.targetLevel,
            roleFamily: context.roleFamily,
          }),
        }))
        .filter((s) => s.score > 0);

      if (claimScored.length === 0) continue;

      const picked = this._pickOneFromTopK({
        candidates: claimScored,
        count: count - selected.length,
        seed: context.selectionSeed,
        scope: `stage_4_cv_deep_dive:claim:${selected.length}`,
        score: (c) => c.score,
        id: (c) => c.probe.id,
      });

      selectedIds.add(picked.probe.id);
      selected.push(picked);
    }

    // Phase 2: fill remaining slots with highest aggregate-scored probes
    if (selected.length < count) {
      scored
        .filter((s) => !selectedIds.has(s.probe.id))
        .sort((a, b) => b.score - a.score)
        .slice(0, count - selected.length)
        .forEach((s) => selected.push(s));
    }

    return selected;
  }

  private _stage3AdjustedScore({
    candidate,
    coveredThemes,
    coveredTechs,
    themesCache,
  }: {
    candidate: ScoredProbe;
    coveredThemes: Set<string>;
    coveredTechs: Set<string>;
    themesCache?: Map<string, string[]>;
  }): number {
    const probe = candidate.probe;
    const themes = themesCache?.get(probe.id) ?? this._stage3Themes(probe);
    const newThemeCount = themes.filter(
      (theme) => !coveredThemes.has(theme),
    ).length;
    const duplicateThemeCount = themes.length - newThemeCount;
    const duplicateTechCount = probe.techTags.filter((tag) =>
      coveredTechs.has(tag),
    ).length;

    let adjusted = candidate.score;
    if (newThemeCount > 0) adjusted += 0.12;
    adjusted -= Math.min(duplicateThemeCount * 0.04, 0.08);
    adjusted -= Math.min(duplicateTechCount * 0.02, 0.06);
    adjusted += STAGE_3_TYPE_BONUS[probe.type ?? ''] ?? 0;
    adjusted += this._bonusFromMap({
      keys: probe.competencies,
      weights: STAGE_3_COMPETENCY_BONUS,
      cap: 0.12,
    });
    if (
      probe.type === 'technical_depth' &&
      probe.conversationDepth === 'intro'
    ) {
      adjusted -= 0.2;
    }
    if (probe.conversationDepth === 'mid' || probe.conversationDepth === 'deep')
      adjusted += 0.04;
    if (probe.techTags.length > 1) adjusted += 0.03;
    return adjusted;
  }

  private _stage3Themes(probe: QuestionProbe): string[] {
    const themes = new Set<string>();
    const searchable = [
      probe.type ?? '',
      probe.intent ?? '',
      probe.primaryQuestion ?? '',
      ...probe.techTags,
    ]
      .join(' ')
      .toLowerCase();

    for (const [theme, tokens] of Object.entries(STAGE_3_THEME_TAGS)) {
      if (tokens.some((token) => searchable.includes(token))) {
        themes.add(theme);
      }
    }
    if (probe.type === 'debugging') themes.add('production_debugging');
    if (probe.type === 'trade_off') themes.add('trade_off_analysis');
    if (probe.type === 'situational') themes.add('practical_scenario');
    if (probe.competencies.includes('system_thinking'))
      themes.add('system_design');
    if (probe.competencies.includes('trade_off_analysis'))
      themes.add('trade_off_analysis');
    if (probe.competencies.includes('problem_solving'))
      themes.add('practical_scenario');
    return themes.size > 0 ? [...themes] : ['general_domain'];
  }

  private _selectTopKSeeded({
    candidates,
    count,
    seed,
    scope,
  }: {
    candidates: ScoredProbe[];
    count: number;
    seed: string;
    scope: string;
  }): ScoredProbe[] {
    const topK = this._topK({
      candidates,
      count,
      score: (candidate) => candidate.score,
    });
    const rankCache = new Map(
      topK.map((c) => [
        c.probe.id,
        this._seededRank({ seed, scope, id: c.probe.id }),
      ]),
    );
    return topK
      .sort(
        (a, b) =>
          rankCache.get(a.probe.id)! - rankCache.get(b.probe.id)! ||
          b.score - a.score ||
          a.probe.id.localeCompare(b.probe.id),
      )
      .slice(0, count)
      .sort(
        (a, b) =>
          b.score - a.score ||
          rankCache.get(a.probe.id)! - rankCache.get(b.probe.id)!,
      );
  }

  private _pickOneFromTopK<T>({
    candidates,
    count,
    seed,
    scope,
    score,
    id,
  }: {
    candidates: T[];
    count: number;
    seed: string;
    scope: string;
    score: (candidate: T) => number;
    id: (candidate: T) => string;
  }): T {
    const pool = this._topK({ candidates, count, score });
    const rankCache = new Map(
      pool.map((c) => [id(c), this._seededRank({ seed, scope, id: id(c) })]),
    );
    return [...pool].sort(
      (a, b) =>
        rankCache.get(id(a))! - rankCache.get(id(b))! ||
        score(b) - score(a) ||
        id(a).localeCompare(id(b)),
    )[0];
  }

  private _topK<T>({
    candidates,
    count,
    score,
  }: {
    candidates: T[];
    count: number;
    score: (candidate: T) => number;
  }): T[] {
    const topKSize = Math.min(
      candidates.length,
      Math.max(count, count * TOP_K_MULTIPLIER),
    );
    return [...candidates]
      .sort((a, b) => score(b) - score(a))
      .slice(0, topKSize);
  }

  private _seededRank({
    seed,
    scope,
    id,
  }: {
    seed: string;
    scope: string;
    id: string;
  }): number {
    const input = `${seed}:${scope}:${id}`;
    let hash = 2166136261;
    for (let index = 0; index < input.length; index++) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private _bonusFromMap<T extends string>({
    keys,
    weights,
    cap,
  }: {
    keys: T[];
    weights: Partial<Record<T, number>>;
    cap: number;
  }): number {
    const total = keys.reduce((sum, key) => sum + (weights[key] ?? 0), 0);
    return Math.min(total, cap);
  }

  private _applyRecentUsagePenalty(
    scored: ScoredProbe[],
    recentlyUsedProbeIds: string[],
  ): ScoredProbe[] {
    if (recentlyUsedProbeIds.length === 0) return scored;
    const recentSet = new Set(recentlyUsedProbeIds);
    return scored.map((s) =>
      recentSet.has(s.probe.id)
        ? { ...s, score: Math.max(0, s.score - RECENT_PROBE_SCORE_PENALTY) }
        : s,
    );
  }

  private _selectStage6({
    probes,
    targetLevel,
    roleFamily,
    selectionSeed,
    recentlyUsedProbeIds,
  }: {
    probes: QuestionProbe[];
    targetLevel: QuestionProbeLevel;
    roleFamily: QuestionProbeRoleFamily;
    selectionSeed: string;
    recentlyUsedProbeIds: string[];
  }): { selected: PlannedProbe[]; fallbacks: PlannedProbe[] } {
    const scored = this._applyRecentUsagePenalty(
      probes.map((p) => ({
        probe: p,
        score: this._roleLevelFit({
          probeLevels: p.levels,
          probeFamilies: p.roleFamilies,
          targetLevel,
          roleFamily,
        }),
      })),
      recentlyUsedProbeIds,
    );
    if (scored.length === 0) return { selected: [], fallbacks: [] };
    const topTwo = this._selectTopKSeeded({
      candidates: scored,
      count: 2,
      seed: selectionSeed,
      scope: 'stage_6_reverse_interview',
    });
    return {
      selected: [
        this._buildPlannedProbe({
          probe: topTwo[0].probe,
          order: 1,
          score: topTwo[0].score,
        }),
      ],
      fallbacks:
        topTwo.length > 1
          ? [
              this._buildPlannedProbe({
                probe: topTwo[1].probe,
                order: 1,
                score: topTwo[1].score,
                isFallbackFor: topTwo[0].probe.id,
                fallbackTrigger: 'no_relevant_story',
              }),
            ]
          : [],
    };
  }

  private _scoreProbesForStage({
    stage,
    probes,
    context,
    effectivePriorities,
  }: {
    stage: QuestionProbeStage;
    probes: QuestionProbe[];
    context: ProbeSelectionContext;
    effectivePriorities: QuestionProbeCompetency[];
  }): Array<{ probe: QuestionProbe; score: number }> {
    const {
      targetLevel,
      roleFamily,
      competencyWeights,
      riskHypotheses,
      candidateClaims,
      cvTechStack,
      jdTechStack,
    } = context;
    const results: Array<{ probe: QuestionProbe; score: number }> = [];
    for (const probe of probes) {
      const score: number | null = this._routeScore({
        stage,
        probe,
        targetLevel,
        roleFamily,
        competencyWeights,
        riskHypotheses,
        candidateClaims,
        cvTechStack,
        jdTechStack,
        effectivePriorities,
      });
      if (score !== null) results.push({ probe, score });
    }
    return results;
  }

  private _routeScore({
    stage,
    probe,
    targetLevel,
    roleFamily,
    competencyWeights,
    riskHypotheses,
    candidateClaims,
    cvTechStack,
    jdTechStack,
    effectivePriorities,
  }: {
    stage: QuestionProbeStage;
    probe: QuestionProbe;
    targetLevel: QuestionProbeLevel;
    roleFamily: QuestionProbeRoleFamily;
    competencyWeights: Record<string, number>;
    riskHypotheses: RiskHypothesis[];
    candidateClaims: CandidateClaim[];
    cvTechStack: string[];
    jdTechStack: string[];
    effectivePriorities: QuestionProbeCompetency[];
  }): number | null {
    if (stage === 'stage_1_culture_fit' || stage === 'stage_5_soft_skills') {
      return this._scoreBehavioralProbe({
        probe,
        priorityCompetencies: effectivePriorities,
        competencyWeights,
        riskHypotheses,
        targetLevel,
        roleFamily,
      });
    }
    if (stage === 'stage_4_cv_deep_dive') {
      return this._scoreCvProbe({
        probe,
        candidateClaims,
        cvTechStack,
        jdTechStack,
        targetLevel,
        roleFamily,
      });
    }
    if (stage === 'stage_3_domain_knowledge') {
      return this._scoreDomainProbe({
        probe,
        cvTechStack,
        jdTechStack,
        targetLevel,
        roleFamily,
      });
    }
    return this._scoreTechnicalProbe({
      probe,
      cvTechStack,
      jdTechStack,
      targetLevel,
      roleFamily,
    });
  }

  /**
   * Tính score hành vi cho probe dựa trên competency fit, role/level fit và risk signal.
   *
   * @param probe - Probe cần tính score
   * @param priorityCompetencies - Competency ưu tiên từ calibration profile (hoặc preset của stage 5)
   * @param competencyWeights - Trọng số từng competency từ calibration profile
   * @param riskHypotheses - Danh sách risk hypothesis để tăng weight cho probe liên quan
   * @param targetLevel - Level mục tiêu để tính role/level fit
   * @param roleFamily - Role family để tính role fit
   * @returns Score tổng hợp từ 0–1
   */
  private _scoreBehavioralProbe({
    probe,
    priorityCompetencies,
    competencyWeights,
    riskHypotheses,
    targetLevel,
    roleFamily,
  }: BehavioralScoringParams): number {
    const competencyFit: number = this._competencyFit({
      probeCompetencies: probe.competencies,
      priorityCompetencies,
      competencyWeights,
    });
    const roleLevelFit: number = this._roleLevelFit({
      probeLevels: probe.levels,
      probeFamilies: probe.roleFamilies,
      targetLevel,
      roleFamily,
    });
    const riskWeight: number = this._riskSignalWeight({
      probeCompetencies: probe.competencies,
      riskHypotheses,
    });
    return competencyFit * 0.45 + roleLevelFit * 0.35 + riskWeight * 0.2;
  }

  /**
   * Tính score kỹ thuật cho probe dựa trên overlap tech tag với CV và JD.
   *
   * @param probe - Probe cần tính score
   * @param cvTechStack - Danh sách tech từ CV của ứng viên
   * @param jdTechStack - Danh sách tech yêu cầu từ JD
   * @param targetLevel - Level mục tiêu để tính difficulty fit
   * @param roleFamily - Role family để tính role fit
   * @returns Score từ 0–1, hoặc null nếu probe có techTags nhưng không overlap — probe bị loại khỏi selection
   */
  private _scoreTechnicalProbe({
    probe,
    cvTechStack,
    jdTechStack,
    targetLevel,
    roleFamily,
  }: TechnicalScoringParams): number | null {
    const techFit: number = this._techTagFit({
      probeTechTags: probe.techTags,
      cvTechStack,
      jdTechStack,
    });
    if (probe.techTags.length > 0 && techFit === 0) return null;
    const roleLevelFit: number = this._roleLevelFit({
      probeLevels: probe.levels,
      probeFamilies: probe.roleFamilies,
      targetLevel,
      roleFamily,
    });
    const difficultyFit: number = this._difficultyFit({
      probeDifficulty: probe.difficulty,
      targetLevel,
    });
    return techFit * 0.55 + roleLevelFit * 0.3 + difficultyFit * 0.15;
  }

  /**
   * Tính score cho probe dùng trong CV deep dive (stage 4).
   * Ưu tiên probe có thể verify claim của ứng viên và match tech stack.
   *
   * @param probe - Probe cần tính score
   * @param candidateClaims - Danh sách claim từ CV để đánh giá claim fit
   * @param cvTechStack - Tech stack từ CV
   * @param jdTechStack - Tech stack từ JD
   * @param targetLevel - Level mục tiêu để tính role/level fit
   * @param roleFamily - Role family để tính role fit
   * @returns Score tổng hợp từ 0–1
   */
  private _scoreCvProbe({
    probe,
    candidateClaims,
    cvTechStack,
    jdTechStack,
    targetLevel,
    roleFamily,
  }: CvScoringParams): number {
    const claimFit: number = this._claimVerificationFit({
      probe,
      candidateClaims,
    });
    const techFit: number =
      candidateClaims.length > 0
        ? this._claimAwareTechFit({
            probe,
            candidateClaims,
            cvTechStack,
            jdTechStack,
          })
        : this._techTagFit({
            probeTechTags: probe.techTags,
            cvTechStack,
            jdTechStack,
          });
    const roleLevelFit: number = this._roleLevelFit({
      probeLevels: probe.levels,
      probeFamilies: probe.roleFamilies,
      targetLevel,
      roleFamily,
    });
    const depthFit: number =
      probe.conversationDepth === 'mid' || probe.conversationDepth === 'deep'
        ? 1.0
        : 0.0;
    return (
      claimFit * 0.4 + techFit * 0.25 + roleLevelFit * 0.2 + depthFit * 0.15
    );
  }

  private _claimAwareTechFit({
    probe,
    candidateClaims,
    cvTechStack,
    jdTechStack,
  }: {
    probe: QuestionProbe;
    candidateClaims: CandidateClaim[];
    cvTechStack: string[];
    jdTechStack: string[];
  }): number {
    const baseFit: number = this._techTagFit({
      probeTechTags: probe.techTags,
      cvTechStack,
      jdTechStack,
    });
    const claimsWithTechContext = candidateClaims.filter(
      (c) => c.techContext.length > 0,
    );
    if (claimsWithTechContext.length === 0) return baseFit;
    const bestClaimFit: number = Math.max(
      ...claimsWithTechContext.map((claim) =>
        this._techTagFit({
          probeTechTags: probe.techTags,
          cvTechStack: claim.techContext,
          jdTechStack,
        }),
      ),
    );
    // claim.techContext is the primary signal; cvTechStack covers probes
    // that don't match any specific claim but are still relevant to the CV
    return bestClaimFit * 0.7 + baseFit * 0.3;
  }

  private _scoreProbeForClaim({
    probe,
    claim,
    jdTechStack,
    targetLevel,
    roleFamily,
  }: {
    probe: QuestionProbe;
    claim: CandidateClaim;
    jdTechStack: string[];
    targetLevel: QuestionProbeLevel;
    roleFamily: QuestionProbeRoleFamily;
  }): number {
    if (claim.impliedCompetencies.length === 0) return 0;
    const matchingCompetencies = claim.impliedCompetencies.filter((c) =>
      probe.competencies.includes(c),
    );
    if (matchingCompetencies.length === 0) return 0;

    const competencyFit: number =
      matchingCompetencies.length /
      Math.max(claim.impliedCompetencies.length, probe.competencies.length);

    const techFit: number = this._techTagFit({
      probeTechTags: probe.techTags,
      cvTechStack: claim.techContext,
      jdTechStack,
    });

    const roleLevelFit: number = this._roleLevelFit({
      probeLevels: probe.levels,
      probeFamilies: probe.roleFamilies,
      targetLevel,
      roleFamily,
    });

    const depthFit: number =
      probe.conversationDepth === 'mid' || probe.conversationDepth === 'deep'
        ? 1.0
        : 0.3;

    const typeBonus: number = probe.type === 'cv_claim_verification' ? 0.1 : 0;

    return Math.min(
      competencyFit * 0.45 +
        techFit * 0.3 +
        roleLevelFit * 0.15 +
        depthFit * 0.1 +
        typeBonus,
      1.0,
    );
  }

  private _techTagFit({
    probeTechTags,
    cvTechStack,
    jdTechStack,
  }: {
    probeTechTags: string[];
    cvTechStack: string[];
    jdTechStack: string[];
  }): number {
    if (probeTechTags.length === 0) return 0.3;
    const jdMatches: number = probeTechTags.filter((t) =>
      jdTechStack.includes(t),
    ).length;
    const cvOnlyMatches: number = probeTechTags.filter(
      (t) => cvTechStack.includes(t) && !jdTechStack.includes(t),
    ).length;
    return (jdMatches * 0.7 + cvOnlyMatches * 0.3) / probeTechTags.length;
  }

  private _roleLevelFit({
    probeLevels,
    probeFamilies,
    targetLevel,
    roleFamily,
  }: {
    probeLevels: QuestionProbeLevel[];
    probeFamilies: QuestionProbeRoleFamily[];
    targetLevel: QuestionProbeLevel;
    roleFamily: QuestionProbeRoleFamily;
  }): number {
    const levelMatch: number =
      probeLevels.length === 0 || probeLevels.includes(targetLevel) ? 1.0 : 0.0;
    const familyMatch: number =
      probeFamilies.length === 0 || probeFamilies.includes(roleFamily)
        ? 1.0
        : 0.0;
    return (levelMatch + familyMatch) / 2;
  }

  private _difficultyFit({
    probeDifficulty,
    targetLevel,
  }: {
    probeDifficulty: number | null;
    targetLevel: QuestionProbeLevel;
  }): number {
    if (probeDifficulty === null) return 0.5;
    const [min, max] = DIFFICULTY_RANGES[targetLevel];
    if (probeDifficulty >= min && probeDifficulty <= max) return 1.0;
    const deviation: number = Math.min(
      Math.abs(probeDifficulty - min),
      Math.abs(probeDifficulty - max),
    );
    return deviation === 1 ? 0.5 : 0.0;
  }

  private _competencyFit({
    probeCompetencies,
    priorityCompetencies,
    competencyWeights,
  }: {
    probeCompetencies: QuestionProbeCompetency[];
    priorityCompetencies: QuestionProbeCompetency[];
    competencyWeights: Record<string, number>;
  }): number {
    if (priorityCompetencies.length === 0) return 0.0;
    let weightedOverlap: number = 0;
    let totalWeight: number = 0;
    for (const competency of priorityCompetencies) {
      const weight: number = competencyWeights[competency] ?? 1.0;
      totalWeight += weight;
      if (probeCompetencies.includes(competency)) weightedOverlap += weight;
    }
    return totalWeight > 0 ? weightedOverlap / totalWeight : 0.0;
  }

  private _riskSignalWeight({
    probeCompetencies,
    riskHypotheses,
  }: {
    probeCompetencies: QuestionProbeCompetency[];
    riskHypotheses: RiskHypothesis[];
  }): number {
    const overlapping: RiskHypothesis[] = riskHypotheses.filter((r) =>
      r.relatedCompetencies.some((c) => probeCompetencies.includes(c)),
    );
    if (overlapping.length === 0) return 0.0;
    const totalScore: number = overlapping.reduce(
      (sum, r) => sum + (RISK_SEVERITY_SCORES[r.severity] ?? 0.2),
      0,
    );
    return Math.min(totalScore / overlapping.length, 1.0);
  }

  private _claimVerificationFit({
    probe,
    candidateClaims,
  }: {
    probe: QuestionProbe;
    candidateClaims: CandidateClaim[];
  }): number {
    const typeBonus: number =
      probe.type === 'cv_claim_verification' ? 0.3 : 0.0;
    if (candidateClaims.length === 0) return typeBonus;
    let weightedOverlap: number = 0;
    let totalWeight: number = 0;
    for (const claim of candidateClaims) {
      const weight: number =
        CLAIM_PRIORITY_WEIGHTS[claim.verificationPriority] ?? 0.3;
      totalWeight += weight;
      const hasCompetencyOverlap: boolean = claim.impliedCompetencies.some(
        (c) => probe.competencies.includes(c),
      );
      const hasTechContextOverlap: boolean =
        claim.techContext.length > 0 &&
        claim.techContext.some((t) => probe.techTags.includes(t));
      if (hasCompetencyOverlap && hasTechContextOverlap) {
        // Both competency and tech context match — strong signal this probe
        // targets exactly what the candidate claimed
        weightedOverlap += weight * 1.4;
      } else if (hasCompetencyOverlap) {
        weightedOverlap += weight;
      } else if (hasTechContextOverlap) {
        // Tech match alone is a weak signal: probe is in the right tech area
        // but may not verify the specific competency claimed
        weightedOverlap += weight * 0.4;
      }
    }
    const claimFit: number =
      totalWeight > 0 ? Math.min(weightedOverlap / totalWeight, 1.0) : 0.0;
    return Math.min(claimFit + typeBonus, 1.0);
  }

  private _sortIntroFirst(
    scored: Array<{ probe: QuestionProbe; score: number }>,
  ): Array<{ probe: QuestionProbe; score: number }> {
    const intros = scored.filter((s) => s.probe.conversationDepth === 'intro');
    const rest = scored.filter((s) => s.probe.conversationDepth !== 'intro');
    return [...intros, ...rest];
  }

  private _buildPlannedProbe({
    probe,
    order,
    score,
    isFallbackFor,
    fallbackTrigger,
  }: {
    probe: QuestionProbe;
    order: number;
    score: number;
    isFallbackFor?: string;
    fallbackTrigger?: FallbackTrigger;
  }): PlannedProbe {
    const tagLabel: string =
      probe.techTags.length > 0
        ? `Tech: ${probe.techTags.slice(0, 3).join(', ')}`
        : `Competency: ${probe.competencies.slice(0, 2).join(', ')}`;
    return {
      questionProbeId: probe.id,
      questionProbeRevision: probe.revision,
      plannedOrder: order,
      selectionScore: Math.round(score * 1000) / 1000,
      selectionReason: tagLabel,
      estimatedMinutes: 0,
      ...(isFallbackFor !== undefined
        ? { isFallbackFor, fallbackTrigger }
        : {}),
    };
  }

  private _scoreDomainProbe({
    probe,
    cvTechStack,
    jdTechStack,
    targetLevel,
    roleFamily,
  }: {
    probe: QuestionProbe;
    cvTechStack: string[];
    jdTechStack: string[];
    targetLevel: QuestionProbeLevel;
    roleFamily: QuestionProbeRoleFamily;
  }): number {
    const competencyFit: number = this._competencyFit({
      probeCompetencies: probe.competencies,
      priorityCompetencies: STAGE_3_DOMAIN_COMPETENCIES,
      competencyWeights: Object.fromEntries(
        STAGE_3_DOMAIN_COMPETENCIES.map((c) => [c, 1.0]),
      ),
    });
    const techEcosystemFit: number = this._techEcosystemFit({
      probeTechTags: probe.techTags,
      cvTechStack,
      jdTechStack,
    });
    const roleLevelFit: number = this._roleLevelFit({
      probeLevels: probe.levels,
      probeFamilies: probe.roleFamilies,
      targetLevel,
      roleFamily,
    });
    return competencyFit * 0.5 + techEcosystemFit * 0.3 + roleLevelFit * 0.2;
  }

  private _techEcosystemFit({
    probeTechTags,
    cvTechStack,
    jdTechStack,
  }: {
    probeTechTags: string[];
    cvTechStack: string[];
    jdTechStack: string[];
  }): number {
    if (probeTechTags.length === 0) return 0.4;
    const allStack = new Set([...cvTechStack, ...jdTechStack]);
    const matchCount = probeTechTags.filter((t) => allStack.has(t)).length;
    if (matchCount === 0) return 0.1;
    return 0.3 + (matchCount / probeTechTags.length) * 0.7;
  }

  private _selectMMR({
    scored,
    count,
    seed,
    scope,
    similarityFn,
    lambda,
  }: {
    scored: ScoredProbe[];
    count: number;
    seed: string;
    scope: string;
    similarityFn: (a: QuestionProbe, b: QuestionProbe) => number;
    lambda: number;
  }): ScoredProbe[] {
    const selected: ScoredProbe[] = [];
    const remaining = scored.map((s, index) => ({
      ...s,
      originalIndex: index,
    }));

    while (selected.length < count && remaining.length > 0) {
      const isFirst = selected.length === 0;
      const mmrCandidates = remaining.map((candidate) => {
        const mmrScore = isFirst
          ? candidate.score
          : lambda * candidate.score -
            (1 - lambda) *
              Math.max(
                ...selected.map((s) => similarityFn(candidate.probe, s.probe)),
              );
        return { ...candidate, mmrScore };
      });

      const picked = this._pickOneFromTopK({
        candidates: mmrCandidates,
        count: count - selected.length,
        seed,
        scope: `${scope}:mmr:${selected.length}`,
        score: (c) => c.mmrScore,
        id: (c) => c.probe.id,
      });

      const idx = remaining.findIndex((r) => r.probe.id === picked.probe.id);
      remaining.splice(idx, 1);
      selected.push({ probe: picked.probe, score: picked.score });
    }

    return selected;
  }

  private _competencySimilarity(a: QuestionProbe, b: QuestionProbe): number {
    if (a.competencies.length === 0 || b.competencies.length === 0) return 0;
    const aSet = new Set(a.competencies);
    const overlapCount = b.competencies.filter((c) => aSet.has(c)).length;
    return (
      overlapCount / Math.max(a.competencies.length, b.competencies.length)
    );
  }

  private _resolveStage5Priorities(
    riskHypotheses: RiskHypothesis[],
  ): QuestionProbeCompetency[] {
    const riskAdditions = riskHypotheses
      .filter((r) => r.severity === 'high')
      .flatMap((r) => r.relatedCompetencies)
      .filter(
        (c): c is QuestionProbeCompetency =>
          (STAGE_5_SOFT_SKILL_POOL as readonly string[]).includes(c) &&
          !(STAGE_5_BASE_PRIORITIES as readonly string[]).includes(c),
      );
    return [...new Set([...STAGE_5_BASE_PRIORITIES, ...riskAdditions])];
  }
}
