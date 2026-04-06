/**
 * Task 3.1 — Combat Interview Orchestrator (State Machine)
 * Chạy trên FE, phát events, UI components subscribe.
 * BE là source of truth cho session state — FE sync qua response metadata.
 */

const STATES = {
  INITIALIZING: 'INITIALIZING',
  GREETING: 'GREETING',
  STAGE_INTRO: 'STAGE_INTRO',
  AI_ASKING: 'AI_ASKING',
  CANDIDATE_THINKING: 'CANDIDATE_THINKING',
  CANDIDATE_SPEAKING: 'CANDIDATE_SPEAKING',
  AI_PROCESSING: 'AI_PROCESSING',
  AI_FOLLOW_UP: 'AI_FOLLOW_UP',
  STAGE_TRANSITION: 'STAGE_TRANSITION',
  CLOSING: 'CLOSING',
  COMPLETED: 'COMPLETED',
};

export { STATES as COMBAT_STATES };

// Phân bổ thời gian mỗi stage (tỉ lệ)
const STAGE_TIME_ALLOCATION = {
  1: 0.15,
  2: 0.20,
  3: 0.20,
  4: 0.20,
  5: 0.15,
  6: 0.10,
};

class EventEmitter {
  constructor() {
    this._listeners = {};
  }
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    this._listeners[event] = (this._listeners[event] ?? []).filter(
      (f) => f !== fn,
    );
  }
  emit(event, payload) {
    (this._listeners[event] ?? []).forEach((fn) => fn(payload));
  }
}

class CombatOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.state = {
      currentState: STATES.INITIALIZING,
      currentStage: 1,
      stageTimeBudget: 0,
      stageElapsed: 0,
      turnsInStage: 0,
      totalElapsed: 0,
      totalTimeBudget: 20 * 60 * 1000, // 20 phút default
      silenceStartedAt: null,
      inputMode: 'voice',
    };
    this._stageStartTs = null;
    this._sessionStartTs = null;
    this._stateLog = [];
    this._stageTimer = null;
    this._reduxDispatch = null; // injected từ saga
  }

  init({ totalBudgetMs = 20 * 60 * 1000, inputMode = 'voice', dispatch } = {}) {
    this.state.totalTimeBudget = totalBudgetMs;
    this.state.inputMode = inputMode;
    this._reduxDispatch = dispatch;
    this._sessionStartTs = Date.now();
    this._stageStartTs = Date.now();
    this.state.stageTimeBudget = this._getStageBudget(1);
  }

  transition(newState, payload = {}) {
    const prev = this.state.currentState;
    this.state.currentState = newState;
    this._stateLog.push({
      from: prev,
      to: newState,
      ts: Date.now(),
      payload,
    });

    // Update elapsed timers
    const now = Date.now();
    this.state.totalElapsed = now - (this._sessionStartTs ?? now);
    this.state.stageElapsed = now - (this._stageStartTs ?? now);

    this.emit('stateChange', { state: newState, payload, orchestratorState: { ...this.state } });

    // Sync to Redux
    this._reduxDispatch?.({
      type: 'combatOrchestrator/stateChanged',
      payload: { combatState: newState, ...payload },
    });
  }

  onTurnComplete() {
    this.state.turnsInStage++;
  }

  advanceStage(nextStage) {
    this.state.currentStage = nextStage;
    this.state.turnsInStage = 0;
    this.state.stageElapsed = 0;
    this._stageStartTs = Date.now();
    this.state.stageTimeBudget = this._getStageBudget(nextStage);
  }

  getStageElapsedMs() {
    return Date.now() - (this._stageStartTs ?? Date.now());
  }

  getTotalElapsedMs() {
    return Date.now() - (this._sessionStartTs ?? Date.now());
  }

  getStateLog() {
    return [...this._stateLog];
  }

  _getStageBudget(stage) {
    const ratio = STAGE_TIME_ALLOCATION[stage] ?? 0.15;
    return Math.floor(this.state.totalTimeBudget * ratio);
  }
}

export const combatOrchestrator = new CombatOrchestrator();
export { STATES };
export default CombatOrchestrator;
