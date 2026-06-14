import { Injectable } from '@nestjs/common';
import { NSDAssessorService } from './nsd-assessor.service';
import { NSDResponderService } from './nsd-responder.service';
import type {
  NSDInterviewPhase,
  NSDGroupState,
  NSDResolvedItem,
  NSDFillEvent,
  NSDCheckItem,
} from '../types/nsd.types';
import type { InterviewLanguage } from '../../interview/entities/interview-session.entity';

export interface NSDGroupTurnResult {
  responseText: string;
  updatedProgress: {
    group: NSDGroupState;
    resolvedItems: NSDResolvedItem[];
    fillEvents: NSDFillEvent[];
  };
  done: boolean;
  wasFill: boolean;
  fillAnswer?: string;
}

/**
 * Shared "feature/dimension/closing group" state machine used by Phase 1/2/3.
 * State 'asking_question' → holistic initial assessment of all required items.
 * State 'asking_followup'  → per-item followup; fill after 2 failed attempts.
 */
@Injectable()
export class NSDGroupTurnService {
  constructor(
    private readonly assessor: NSDAssessorService,
    private readonly responder: NSDResponderService,
  ) {}

  /** Fresh NSDGroupState for a feature/dimension/closing group, before its first turn. */
  initGroupState(): NSDGroupState {
    return {
      state: 'asking_question',
      unresolvedKeys: [],
      currentItemKey: null,
      currentItemAttempts: 0,
    };
  }

  /**
   * Bridge Phase 1/2/3's holistic NSDResolvedItem[] into Phase 4/5's NSDItemCounters[]
   * shape so writePhaseSummary / computeDimensionScore can stay shared across all phases.
   * resolved is always true here — Phase 1/2/3 only ever record an item once it's settled
   * (self-resolved, resolved via followup, or filled).
   */
  resolvedToCounters(items: NSDResolvedItem[]) {
    return items.map((item) => ({
      itemKey: item.itemKey,
      isOptional: item.isOptional,
      incomplete_count: 0,
      weak_count: 0,
      irrelevant_count: 0,
      filled: item.wasFilled,
      resolved: true,
      added: false,
      rounds_needed: item.roundsNeeded,
    }));
  }

  async handleGroupTurn(
    phase: NSDInterviewPhase,
    candidateAnswer: string,
    groupState: NSDGroupState,
    resolvedItems: NSDResolvedItem[],
    fillEvents: NSDFillEvent[],
    allItems: NSDCheckItem[],
    groupQuestion: string,
    expectedResult: string,
    groupKey: string,
    language: InterviewLanguage,
  ): Promise<NSDGroupTurnResult> {
    const requiredItems = allItems.filter((i) => !i.optional);
    const group: NSDGroupState = { ...groupState };
    const newResolved: NSDResolvedItem[] = [...resolvedItems];
    const newFillEvents: NSDFillEvent[] = [...fillEvents];

    if (group.state === 'asking_question') {
      // Turn 1 of this group: one holistic LLM call evaluates the candidate's
      // answer against ALL required items at once.
      const { unresolvedKeys } = await this.assessor.classifyInitial(
        candidateAnswer,
        groupQuestion,
        expectedResult,
        requiredItems,
      );
      group.unresolvedKeys = unresolvedKeys;
      // Items not flagged as unresolved are considered self-resolved (0 followup rounds).
      for (const item of requiredItems) {
        if (!unresolvedKeys.includes(item.key)) {
          newResolved.push({
            itemKey: item.key,
            isOptional: false,
            wasFilled: false,
            roundsNeeded: 0,
          });
        }
      }

      // Candidate covered everything → group done, no followups needed.
      if (unresolvedKeys.length === 0) {
        return {
          responseText: '',
          updatedProgress: {
            group,
            resolvedItems: newResolved,
            fillEvents: newFillEvents,
          },
          done: true,
          wasFill: false,
        };
      }

      // Otherwise, start asking followups for the first unresolved item.
      const firstItem = allItems.find((i) => i.key === unresolvedKeys[0])!;
      group.state = 'asking_followup';
      group.currentItemKey = firstItem.key;
      group.currentItemAttempts = 0;
      return {
        responseText: firstItem.followup_question,
        updatedProgress: {
          group,
          resolvedItems: newResolved,
          fillEvents: newFillEvents,
        },
        done: false,
        wasFill: false,
      };
    }

    // state === 'asking_followup': candidate just answered the followup_question
    // for group.currentItemKey. Compare against item.fill_answer in one LLM call.
    const currentKey = group.currentItemKey!;
    const currentItem = allItems.find((i) => i.key === currentKey)!;
    const { comment, resolved } = await this.assessor.classifyFollowup(
      candidateAnswer,
      currentItem,
      language,
    );

    // 1st failed attempt → re-ask the same followup with the assessor's comment.
    if (!resolved && group.currentItemAttempts < 1) {
      group.currentItemAttempts++;
      return {
        responseText: `${comment}${currentItem.followup_question}`,
        updatedProgress: {
          group,
          resolvedItems: newResolved,
          fillEvents: newFillEvents,
        },
        done: false,
        wasFill: false,
      };
    }

    // Either resolved, or 2nd failed attempt → finalize this item (fill if still unresolved).
    const wasFill = !resolved;
    const fillText = wasFill
      ? `\n\n${this.responder.buildFillAnswer(currentItem)}`
      : '';

    newResolved.push({
      itemKey: currentKey,
      isOptional: false,
      wasFilled: wasFill,
      roundsNeeded: group.currentItemAttempts + 1,
    });
    if (wasFill) {
      newFillEvents.push({
        itemKey: currentKey,
        skill_tag: currentItem.skill_tag,
        fill_answer: currentItem.fill_answer,
        followup_count_at_fill: 2,
        canvasUpdated: false,
        phase,
        featureOrDimensionKey: groupKey,
      });
    }

    group.unresolvedKeys = group.unresolvedKeys.filter((k) => k !== currentKey);
    group.currentItemKey = null;
    group.currentItemAttempts = 0;

    // No more unresolved items in this group → done.
    if (group.unresolvedKeys.length === 0) {
      return {
        responseText: `${comment}${fillText}`,
        updatedProgress: {
          group,
          resolvedItems: newResolved,
          fillEvents: newFillEvents,
        },
        done: true,
        wasFill,
        fillAnswer: wasFill ? currentItem.fill_answer : undefined,
      };
    }

    // Otherwise, move on to the next unresolved item's followup.
    const nextItem = allItems.find((i) => i.key === group.unresolvedKeys[0])!;
    group.state = 'asking_followup';
    group.currentItemKey = nextItem.key;
    group.currentItemAttempts = 0;
    return {
      responseText: `${comment}${fillText}\n\n${nextItem.followup_question}`,
      updatedProgress: {
        group,
        resolvedItems: newResolved,
        fillEvents: newFillEvents,
      },
      done: false,
      wasFill,
      fillAnswer: wasFill ? currentItem.fill_answer : undefined,
    };
  }
}
