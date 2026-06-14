import { Injectable } from '@nestjs/common';
import type {
  NSDCanvasState,
  NSDCanvasNode,
  NSDNodeType,
  NSDRequiredNodeCheck,
  NSDKnownExtraNode,
  NSDPhase4FeatureDesign,
  NSDDeepDiveQuestion,
  NSDReferenceNode,
  NSDAcceptedNodeRole,
  NSDExtraNodeReview,
} from '../types/nsd.types';

export interface NSDRequiredNodeStatus {
  key: string;
  status: 'present' | 'missing';
  matchedNodeId?: string;
}

export interface NSDExtraNodeResult {
  nodeId: string;
  nodeLabel: string;
  nodeType: NSDNodeType;
  knownExtra: NSDKnownExtraNode | null;
  probeQuestion: string;
}

export interface NSDCanvasAnalysis {
  requiredNodeStatuses: NSDRequiredNodeStatus[];
  newAcceptedRoles: NSDAcceptedNodeRole[];
  promotedFromFutureRole: NSDAcceptedNodeRole[];
  pendingProbeNode: NSDExtraNodeResult | null;
  newProbeToAsk: NSDExtraNodeResult | null;
  // Full replacement for the caller's "own" extraNodeReviews array for this turn
  // (already revalidated, promoted entries removed, step-3 detections merged in).
  newExtraNodeReviews: NSDExtraNodeReview[];
}

interface AnalyzeArgs {
  canvas: NSDCanvasState;
  requiredNodes: NSDRequiredNodeCheck[];
  ownerKey: string;
  knownExtraNodes: NSDKnownExtraNode[];
  claimedRolesPool: NSDAcceptedNodeRole[];
  ownExtraNodeReviews: NSDExtraNodeReview[];
  inheritedExtraNodeReviews: NSDExtraNodeReview[];
  futureRoleCandidates: Array<{
    featureKey: string;
    check: NSDRequiredNodeCheck;
  }>;
  fallbackKnownTypes: Set<NSDNodeType>;
}

@Injectable()
export class NSDCanvasAnalyzerService {
  /**
   * Analyze canvas against a Phase 4 feature design, matching required_nodes by
   * role (type + acceptable_types + match_labels + reuse_from) against the canvas
   * and the roles already accepted in earlier features, and tracking extra nodes
   * through the detected -> asked -> accepted/rejected/accepted_future_role lifecycle.
   */
  analyzeForFeature(
    canvas: NSDCanvasState,
    featureDesign: NSDPhase4FeatureDesign,
    allFeatures: NSDPhase4FeatureDesign[],
    currentFeatureIndex: number,
    acceptedNodeRoles: NSDAcceptedNodeRole[],
    extraNodeReviews: NSDExtraNodeReview[],
  ): NSDCanvasAnalysis {
    const futureRoleCandidates = allFeatures
      .slice(currentFeatureIndex + 1)
      .flatMap((f) =>
        f.evaluation_checklist.required_nodes.map((check) => ({
          featureKey: f.feature,
          check,
        })),
      );

    return this._analyze({
      canvas,
      requiredNodes: featureDesign.evaluation_checklist.required_nodes,
      ownerKey: featureDesign.feature,
      knownExtraNodes: featureDesign.known_extra_nodes,
      claimedRolesPool: acceptedNodeRoles,
      ownExtraNodeReviews: extraNodeReviews,
      inheritedExtraNodeReviews: [],
      futureRoleCandidates,
      fallbackKnownTypes: new Set(),
    });
  }

  /**
   * Analyze canvas against a Phase 5 deep dive question. Roles/reviews accepted in
   * Phase 4 (inheritedAcceptedNodeRoles/inheritedExtraNodeReviews) are treated as an
   * immutable "already claimed" pool — new matches only extend the Phase 5-own arrays.
   * fallbackKnownTypes (from buildPhase4KnownTypes) softens the probe wording for node
   * types that already appeared in Phase 4, even if they don't match any role here.
   */
  analyzeForDeepDive(
    canvas: NSDCanvasState,
    question: NSDDeepDiveQuestion,
    inheritedAcceptedNodeRoles: NSDAcceptedNodeRole[],
    inheritedExtraNodeReviews: NSDExtraNodeReview[],
    acceptedNodeRoles: NSDAcceptedNodeRole[],
    extraNodeReviews: NSDExtraNodeReview[],
    fallbackKnownTypes: Set<NSDNodeType>,
  ): NSDCanvasAnalysis {
    return this._analyze({
      canvas,
      requiredNodes: question.evaluation_checklist.required_nodes,
      ownerKey: question.key,
      knownExtraNodes: [],
      claimedRolesPool: [...inheritedAcceptedNodeRoles, ...acceptedNodeRoles],
      ownExtraNodeReviews: extraNodeReviews,
      inheritedExtraNodeReviews,
      futureRoleCandidates: [],
      fallbackKnownTypes,
    });
  }

  /**
   * Build a set of all node types referenced in any Phase 4 feature design,
   * used as a fallback "known" type set for Phase 5 extra-node probe wording.
   */
  buildPhase4KnownTypes(features: NSDPhase4FeatureDesign[]): Set<NSDNodeType> {
    const types = new Set<NSDNodeType>();
    for (const f of features) {
      this._collectRefTypes(f.reference_graph).forEach((t) => types.add(t));
    }
    return types;
  }

  // ── Core algorithm (Bước 0-3) ────────────────────────────────────────────────

  private _analyze(args: AnalyzeArgs): NSDCanvasAnalysis {
    const {
      canvas,
      requiredNodes,
      ownerKey,
      knownExtraNodes,
      claimedRolesPool,
      ownExtraNodeReviews,
      inheritedExtraNodeReviews,
      futureRoleCandidates,
      fallbackKnownTypes,
    } = args;

    // Bước 0 — drop own review entries whose node no longer exists on canvas.
    const canvasNodeIds = new Set(canvas.nodes.map((n) => n.id));
    let workingReviews = ownExtraNodeReviews.filter((r) =>
      canvasNodeIds.has(r.nodeId),
    );

    // Bước 1 — promote accepted_future_role entries targeting this feature/question.
    const promotedFromFutureRole: NSDAcceptedNodeRole[] = [];
    const remainingReviews: NSDExtraNodeReview[] = [];
    for (const review of workingReviews) {
      if (
        review.status === 'accepted_future_role' &&
        review.futureFeatureKey === ownerKey
      ) {
        promotedFromFutureRole.push({
          nodeId: review.nodeId,
          nodeType: review.nodeType,
          label: review.label,
          feature: ownerKey,
          roleKey: review.futureRoleKey!,
        });
      } else {
        remainingReviews.push(review);
      }
    }
    workingReviews = remainingReviews;

    // Bước 2 — match required_nodes against the claimed pool + canvas.
    const rolesPool = [...claimedRolesPool, ...promotedFromFutureRole];
    const claimedNodeIds = new Set<string>([
      ...rolesPool.map((r) => r.nodeId),
      ...inheritedExtraNodeReviews
        .filter(
          (r) =>
            r.status === 'accepted' ||
            r.status === 'rejected' ||
            r.status === 'accepted_future_role',
        )
        .map((r) => r.nodeId),
      ...workingReviews
        .filter(
          (r) =>
            r.status === 'accepted' ||
            r.status === 'rejected' ||
            r.status === 'accepted_future_role',
        )
        .map((r) => r.nodeId),
    ]);

    const requiredNodeStatuses: NSDRequiredNodeStatus[] = [];
    const newAcceptedRoles: NSDAcceptedNodeRole[] = [];

    for (const check of requiredNodes) {
      // 2.1 — reuse a role already accepted elsewhere (cross-feature/cross-question).
      if (check.reuse_from?.length) {
        const reused = [...rolesPool, ...newAcceptedRoles].find((r) =>
          check.reuse_from!.includes(r.roleKey),
        );
        if (reused) {
          requiredNodeStatuses.push({
            key: check.key,
            status: 'present',
            matchedNodeId: reused.nodeId,
          });
          continue;
        }
      }

      // 2.2 — unclaimed canvas nodes matching expected_type/acceptable_types.
      const typeCandidates = canvas.nodes.filter(
        (n) => !claimedNodeIds.has(n.id) && this._typeMatches(n, check),
      );

      let matched: NSDCanvasNode | null = null;
      if (check.match_labels?.length) {
        const labelCandidates = typeCandidates.filter((n) =>
          this._labelMatches(n, check.match_labels!),
        );
        if (labelCandidates.length === 1) {
          matched = labelCandidates[0];
        }
      } else if (typeCandidates.length === 1) {
        matched = typeCandidates[0];
      }

      if (matched) {
        requiredNodeStatuses.push({
          key: check.key,
          status: 'present',
          matchedNodeId: matched.id,
        });
        newAcceptedRoles.push({
          nodeId: matched.id,
          nodeType: matched.type,
          label: matched.label,
          feature: ownerKey,
          roleKey: check.key,
        });
        claimedNodeIds.add(matched.id);
      } else {
        requiredNodeStatuses.push({ key: check.key, status: 'missing' });
      }
    }

    // Bước 3 — extra node detection among unclaimed canvas nodes.
    const reviewLookup = new Map<string, NSDExtraNodeReview>();
    for (const r of [...inheritedExtraNodeReviews, ...workingReviews]) {
      reviewLookup.set(r.nodeId, r);
    }

    let pendingProbeNode: NSDExtraNodeResult | null = null;
    const finalReviews: NSDExtraNodeReview[] = [...workingReviews];

    for (const node of canvas.nodes) {
      if (claimedNodeIds.has(node.id)) continue;
      const existing = reviewLookup.get(node.id);

      if (existing?.status === 'asked') {
        pendingProbeNode = {
          nodeId: node.id,
          nodeLabel: node.label,
          nodeType: node.type,
          knownExtra: knownExtraNodes.find((e) => e.type === node.type) ?? null,
          probeQuestion: existing.probeQuestion,
        };
        continue;
      }

      // 'detected' (still pending a probe slot) or already-reviewed
      // (accepted/rejected/accepted_future_role from inherited) — leave as is.
      if (existing) continue;

      // First time seeing this node as extra.
      const futureMatch = futureRoleCandidates.find((c) =>
        this._matchesRequiredCheck(node, c.check),
      );
      if (futureMatch) {
        finalReviews.push({
          nodeId: node.id,
          nodeType: node.type,
          label: node.label,
          featureKey: ownerKey,
          status: 'accepted_future_role',
          probeQuestion: '',
          futureFeatureKey: futureMatch.featureKey,
          futureRoleKey: futureMatch.check.key,
        });
        continue;
      }

      const knownExtra =
        knownExtraNodes.find((e) => e.type === node.type) ?? null;
      const probeQuestion = knownExtra
        ? knownExtra.probe_question
        : fallbackKnownTypes.has(node.type)
          ? `You added another ${node.type} node ("${node.label}") in this part of the design. Can you explain its role here?`
          : `You drew a ${node.type} node labeled "${node.label}". Can you explain why it's needed here?`;

      finalReviews.push({
        nodeId: node.id,
        nodeType: node.type,
        label: node.label,
        featureKey: ownerKey,
        status: 'detected',
        probeQuestion,
      });
    }

    // Pick one 'detected' entry to ask this turn — only if nothing is already pending
    // (a pending probe takes priority and must not be overwritten before it's answered).
    let newProbeToAsk: NSDExtraNodeResult | null = null;
    if (!pendingProbeNode) {
      const idx = finalReviews.findIndex((r) => r.status === 'detected');
      if (idx >= 0) {
        const review = finalReviews[idx];
        finalReviews[idx] = { ...review, status: 'asked' };
        newProbeToAsk = {
          nodeId: review.nodeId,
          nodeLabel: review.label,
          nodeType: review.nodeType,
          knownExtra:
            knownExtraNodes.find((e) => e.type === review.nodeType) ?? null,
          probeQuestion: review.probeQuestion,
        };
      }
    }

    return {
      requiredNodeStatuses,
      newAcceptedRoles,
      promotedFromFutureRole,
      pendingProbeNode,
      newProbeToAsk,
      newExtraNodeReviews: finalReviews,
    };
  }

  // ── Matching helpers ──────────────────────────────────────────────────────────

  private _typeMatches(
    node: NSDCanvasNode,
    check: NSDRequiredNodeCheck,
  ): boolean {
    return (
      node.type === check.expected_type ||
      !!check.acceptable_types?.includes(node.type)
    );
  }

  private _labelMatches(node: NSDCanvasNode, labels: string[]): boolean {
    const label = node.label.toLowerCase();
    return labels.some((m) => label.includes(m.toLowerCase()));
  }

  private _matchesRequiredCheck(
    node: NSDCanvasNode,
    check: NSDRequiredNodeCheck,
  ): boolean {
    if (!this._typeMatches(node, check)) return false;
    if (check.match_labels?.length) {
      return this._labelMatches(node, check.match_labels);
    }
    return true;
  }

  private _collectRefTypes(
    refGraph: NSDPhase4FeatureDesign['reference_graph'],
  ): Set<NSDNodeType> {
    const types = new Set<NSDNodeType>();
    const addNodes = (nodes: NSDReferenceNode[]) =>
      nodes.forEach((n) => {
        types.add(n.type);
        n.acceptable_types?.forEach((t) => types.add(t));
      });
    addNodes(refGraph.naive.nodes);
    addNodes(refGraph.optimized.nodes);
    return types;
  }
}
