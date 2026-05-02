import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Response } from 'express';
import { SDSession, SDPhase } from '../sd-session/entities/sd-session.entity';
import { CurveBallScenario } from '../sd-problem/entities/sd-problem.entity';
import { GroqMessage, GroqService } from '../ai/groq.service';
import { buildSystemPrompt, buildHintPrompt } from './prompts/sd-phase-prompts';

interface TranscriptEntry {
  role: 'user' | 'ai' | 'summary' | 'system-trigger';
  content: string;
  timestamp: string;
  phase: SDPhase;
}

interface ArchitectureJSON {
  nodes: { type: string }[];
  edges: unknown[];
}

const PHASE_MAX_MS: Record<SDPhase, number> = {
  CLARIFICATION: 12 * 60 * 1000,
  DESIGN: 15 * 60 * 1000,
  DEEP_DIVE: 20 * 60 * 1000,
  WRAP_UP: Infinity,
  COMPLETED: 0,
};

const PHASE_MIN_MS: Record<SDPhase, number> = {
  CLARIFICATION: 0,
  DESIGN: 0,
  DEEP_DIVE: 0,
  WRAP_UP: 0,
  COMPLETED: 0,
};

// Minimum user exchanges (not counting system-trigger) before AI signal is accepted
const PHASE_MIN_EXCHANGES: Record<SDPhase, number> = {
  CLARIFICATION: 3,
  DESIGN: 2,
  DEEP_DIVE: 3,
  WRAP_UP: 0,
  COMPLETED: 0,
};

const PHASE_SEQUENCE: Partial<Record<SDPhase, SDPhase>> = {
  CLARIFICATION: 'DESIGN',
  DESIGN: 'DEEP_DIVE',
  DEEP_DIVE: 'WRAP_UP',
  WRAP_UP: 'COMPLETED',
};

const MAIN_MODEL = 'llama-3.3-70b-versatile';
const FAST_MODEL = 'llama-3.1-8b-instant';
const STREAM_TIMEOUT_MS = 30_000;

@Injectable()
export class SDInterviewerService {
  private readonly logger = new Logger(SDInterviewerService.name);

  constructor(
    @InjectRepository(SDSession)
    private readonly sdSessionRepo: Repository<SDSession>,
    private readonly groqService: GroqService,
  ) {}

  async streamMessage({
    sessionId,
    userMessage,
    isSilenceTrigger = false,
    res,
  }: {
    sessionId: string;
    userMessage: string;
    isSilenceTrigger?: boolean;
    res: Response;
  }): Promise<void> {
    const session: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['problem'],
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.phase === 'COMPLETED') {
      throw new BadRequestException('Session already completed');
    }

    const coverage: number = this._computeCoverage(session);
    const curveball: CurveBallScenario | null = this._checkCurveballEligible(
      session,
      coverage,
    );
    const systemPrompt: string = this._buildSystemPrompt(session, curveball);
    const history: GroqMessage[] = this._buildHistory(session);

    this._setSSEHeaders(res);

    const fullText: string = await this._streamToClient({
      res,
      systemPrompt,
      history,
      userMessage,
    });

    if (fullText === '') return;

    await this._appendTranscript(
      session,
      userMessage,
      fullText,
      isSilenceTrigger,
    );
    const newPhase: SDPhase | null = await this._processTransition(
      session,
      fullText,
    );

    if (curveball && !session.curveballInjectedAt) {
      const curveballUpdate: DeepPartial<SDSession> = {
        id: sessionId,
        curveballInjectedAt: new Date(),
        curveballArchitectureSnapshot: session.architectureJSON as {
          nodes: unknown[];
          edges: unknown[];
        } | null,
      };
      await this.sdSessionRepo.save(curveballUpdate);
    }

    res.write(
      `data: ${JSON.stringify({
        done: true,
        meta: {
          phase: newPhase ?? session.phase,
          phaseChanged: !!newPhase,
          componentCoverage: Math.round(coverage * 100),
          curveballInjected: !!(curveball && !session.curveballInjectedAt),
        },
      })}\n\n`,
    );
    res.end();
  }

  async startSession({
    sessionId,
    res,
  }: {
    sessionId: string;
    res: Response;
  }): Promise<void> {
    const session: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['problem'],
    });
    if (!session) throw new NotFoundException('Session not found');

    const history = session.transcriptHistory as unknown as TranscriptEntry[];
    const existingOpening = history.find(
      (e) => e.role === 'ai' && e.phase === session.phase,
    );

    this._setSSEHeaders(res);

    if (existingOpening) {
      res.write(
        `data: ${JSON.stringify({ token: existingOpening.content, done: false })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({ done: true, meta: { phase: session.phase, phaseChanged: false, componentCoverage: 0, curveballInjected: false } })}\n\n`,
      );
      res.end();
      return;
    }

    const systemPrompt: string = this._buildSystemPrompt(session, null);
    const fullText: string = await this._streamToClient({
      res,
      systemPrompt,
      history: [],
      userMessage: '[SESSION_START]',
    });

    if (fullText === '') return;

    const now: string = new Date().toISOString();
    const initEntries: TranscriptEntry[] = [
      {
        role: 'system-trigger',
        content: '[SESSION_START]',
        timestamp: now,
        phase: 'CLARIFICATION',
      },
      {
        role: 'ai',
        content: fullText.trim(),
        timestamp: now,
        phase: 'CLARIFICATION',
      },
    ];
    const transcriptUpdate: DeepPartial<SDSession> = {
      id: session.id,
      transcriptHistory: initEntries as unknown as Record<string, unknown>[],
    };
    await this.sdSessionRepo.save(transcriptUpdate);

    res.write(
      `data: ${JSON.stringify({ done: true, meta: { phase: session.phase, phaseChanged: false, componentCoverage: 0, curveballInjected: false } })}\n\n`,
    );
    res.end();
  }

  async requestHint(
    sessionId: string,
  ): Promise<{ hintMessage: string; hintsUsed: number }> {
    const session: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['problem'],
    });
    if (!session) throw new NotFoundException('Session not found');

    const history = session.transcriptHistory as unknown as TranscriptEntry[];
    const hintPrompt: string = buildHintPrompt({
      phase: session.phase,
      problemTitle: session.problem.title,
      problemContext: session.problem.context,
      scalingConstraints: session.problem.scalingConstraints,
      architectureNodeTypes: this._getNodeTypes(session),
      transcriptSummary: this._getLatestSummary(history),
      recentExchanges: this._getCurrentPhaseExchanges(history, session.phase),
      lastInterviewerQuestion: this._getLastInterviewerQuestion(
        history,
        session.phase,
      ),
      language: session.language,
    });

    const hintMessage: string = await this.groqService.generateContent({
      model: FAST_MODEL,
      contents: [{ role: 'user', parts: [{ text: 'Generate hint' }] }],
      config: { systemInstruction: hintPrompt, maxOutputTokens: 150 },
    });

    const newHintsUsed: number = (session.hintsUsed ?? 0) + 1;
    await this.sdSessionRepo.update(sessionId, { hintsUsed: newHintsUsed });

    return { hintMessage: hintMessage.trim(), hintsUsed: newHintsUsed };
  }

  private _computeCoverage(session: SDSession): number {
    const expected: string[] = session.problem.expectedComponents;
    if (!session.architectureJSON || expected.length === 0) return 0;
    const arch = session.architectureJSON as unknown as ArchitectureJSON;
    const presentTypes: Set<string> = new Set(arch.nodes.map((n) => n.type));
    const matched: number = expected.filter((c) => presentTypes.has(c)).length;
    return matched / expected.length;
  }

  private _checkCurveballEligible(
    session: SDSession,
    coverage: number,
  ): CurveBallScenario | null {
    if (!session.enableCurveball) return null;
    if (session.curveballInjectedAt) return null;
    if (session.phase === 'CLARIFICATION') return null;
    if (coverage < 0.8) return null;
    const scenarios = session.problem.curveBallScenarios;
    if (!scenarios?.length) return null;
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }

  private _buildSystemPrompt(
    session: SDSession,
    curveball: CurveBallScenario | null,
  ): string {
    const history = session.transcriptHistory as unknown as TranscriptEntry[];
    return buildSystemPrompt({
      phase: session.phase,
      problemTitle: session.problem.title,
      problemContext: session.problem.context,
      problemDomain: session.problem.domain,
      targetLevel: session.problem.targetLevel,
      targetRole: session.problem.targetRole,
      scalingConstraints: session.problem.scalingConstraints,
      architectureNodeTypes: this._getNodeTypes(session),
      transcriptSummary: this._getLatestSummary(history),
      curveballPrompt: curveball ? curveball.prompt : null,
      language: session.language,
    });
  }

  private _buildHistory(session: SDSession): GroqMessage[] {
    const history = session.transcriptHistory as unknown as TranscriptEntry[];
    return history
      .filter((e) => e.phase === session.phase && e.role !== 'summary')
      .map((e) => ({
        role: e.role === 'ai' ? 'model' : 'user',
        parts: [{ text: e.content }],
      }));
  }

  private _getCurrentPhaseExchanges(
    history: TranscriptEntry[],
    phase: SDPhase,
  ): string | null {
    const lines = history
      .filter(
        (e) => e.phase === phase && (e.role === 'user' || e.role === 'ai'),
      )
      .map(
        (e) =>
          `${e.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${e.content}`,
      )
      .join('\n');
    return lines || null;
  }

  private _getLatestSummary(history: TranscriptEntry[]): string | null {
    const summary = history
      .slice()
      .reverse()
      .find((e) => e.role === 'summary');
    return summary ? summary.content : null;
  }

  private _getLastInterviewerQuestion(
    history: TranscriptEntry[],
    phase: SDPhase,
  ): string | null {
    const entry = history
      .slice()
      .reverse()
      .find((e) => e.phase === phase && e.role === 'ai');
    return entry ? entry.content : null;
  }

  private _getNodeTypes(session: SDSession): string[] {
    if (!session.architectureJSON) return [];
    const arch = session.architectureJSON as unknown as ArchitectureJSON;
    return arch.nodes.map((n) => n.type);
  }

  private _setSSEHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  private async _streamToClient({
    res,
    systemPrompt,
    history,
    userMessage,
  }: {
    res: Response;
    systemPrompt: string;
    history: GroqMessage[];
    userMessage: string;
  }): Promise<string> {
    let fullText: string = '';
    let timedOut: boolean = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      this.logger.warn('Groq stream timeout');
      res.write(
        `data: ${JSON.stringify({ done: true, error: 'AI response timeout' })}\n\n`,
      );
      res.end();
    }, STREAM_TIMEOUT_MS);

    try {
      const stream = this.groqService.generateContentStream({
        model: MAIN_MODEL,
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userMessage }] },
        ],
        config: { systemInstruction: systemPrompt, maxOutputTokens: 512 },
      });

      for await (const chunk of stream) {
        if (timedOut) break;
        const token: string = chunk.text ?? '';
        if (token) {
          fullText += token;
          res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
        }
      }

      clearTimeout(timeoutId);
      if (timedOut) return '';
      return fullText;
    } catch (err) {
      clearTimeout(timeoutId);
      if (!timedOut) {
        this.logger.error('Groq stream error', err);
        res.write(
          `data: ${JSON.stringify({ done: true, error: 'AI service error' })}\n\n`,
        );
        res.end();
      }
      return '';
    }
  }

  private async _appendTranscript(
    session: SDSession,
    userMessage: string,
    aiResponse: string,
    isSilenceTrigger = false,
  ): Promise<void> {
    const cleanResponse: string = aiResponse
      .replace('[PHASE_COMPLETE]', '')
      .trim();
    const now: string = new Date().toISOString();
    const newEntries: TranscriptEntry[] = [
      {
        role: isSilenceTrigger ? 'system-trigger' : 'user',
        content: userMessage,
        timestamp: now,
        phase: session.phase,
      },
      {
        role: 'ai',
        content: cleanResponse,
        timestamp: now,
        phase: session.phase,
      },
    ];
    const updated: TranscriptEntry[] = [
      ...(session.transcriptHistory as unknown as TranscriptEntry[]),
      ...newEntries,
    ];
    const transcriptUpdate: DeepPartial<SDSession> = {
      id: session.id,
      transcriptHistory: updated as unknown as Record<string, unknown>[],
    };
    await this.sdSessionRepo.save(transcriptUpdate);
  }

  private async _processTransition(
    session: SDSession,
    aiResponse: string,
  ): Promise<SDPhase | null> {
    const history = session.transcriptHistory as unknown as TranscriptEntry[];
    const phaseStartEntry = history.find((e) => e.phase === session.phase);
    const phaseElapsedMs: number = phaseStartEntry
      ? Date.now() - new Date(phaseStartEntry.timestamp).getTime()
      : 0;

    const firstEntry = history[0];
    const sessionElapsedMs: number = firstEntry
      ? Date.now() - new Date(firstEntry.timestamp).getTime()
      : 0;
    const isSessionTimeout: boolean =
      sessionElapsedMs >= session.durationMinutes * 60 * 1000;
    const isPhaseTimeout: boolean =
      phaseElapsedMs >= PHASE_MAX_MS[session.phase];
    const userExchanges: number = history.filter(
      (e) => e.phase === session.phase && e.role === 'user',
    ).length;
    const isAiSignalValid: boolean =
      aiResponse.includes('[PHASE_COMPLETE]') &&
      phaseElapsedMs >= PHASE_MIN_MS[session.phase] &&
      userExchanges >= PHASE_MIN_EXCHANGES[session.phase];
    console.log('aiResponse:', isAiSignalValid);
    if (!isAiSignalValid && !isPhaseTimeout && !isSessionTimeout) return null;

    const newPhase: SDPhase = isSessionTimeout
      ? 'COMPLETED'
      : (PHASE_SEQUENCE[session.phase] ?? 'COMPLETED');

    await this.sdSessionRepo.update(session.id, { phase: newPhase });

    const currentEntries: TranscriptEntry[] = history.filter(
      (e) => e.phase === session.phase,
    );
    this._summarizePhaseTranscript({
      sessionId: session.id,
      phase: session.phase,
      entries: currentEntries,
    }).catch((err: unknown) => this.logger.error('Summarization failed', err));

    return newPhase;
  }

  private async _summarizePhaseTranscript({
    sessionId,
    phase,
    entries,
  }: {
    sessionId: string;
    phase: SDPhase;
    entries: TranscriptEntry[];
  }): Promise<void> {
    const dialogue: string = entries
      .filter((e) => e.role !== 'summary')
      .map((e) => `${e.role.toUpperCase()}: ${e.content}`)
      .join('\n');

    if (!dialogue) return;

    const summary: string = await this.groqService.generateContent({
      model: FAST_MODEL,
      contents: [{ role: 'user', parts: [{ text: dialogue }] }],
      config: {
        systemInstruction: `Summarize this system design interview ${phase} phase conversation in 3–5 bullet points. Focus on key decisions, components discussed, and trade-offs mentioned. Be concise.`,
        maxOutputTokens: 300,
      },
    });

    const fresh: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!fresh) return;

    const summaryEntry: TranscriptEntry = {
      role: 'summary',
      content: `[${phase} SUMMARY]\n${summary.trim()}`,
      timestamp: new Date().toISOString(),
      phase,
    };

    const updated: TranscriptEntry[] = [
      ...(fresh.transcriptHistory as unknown as TranscriptEntry[]),
      summaryEntry,
    ];
    const summaryUpdate: DeepPartial<SDSession> = {
      id: sessionId,
      transcriptHistory: updated as unknown as Record<string, unknown>[],
    };
    await this.sdSessionRepo.save(summaryUpdate);
  }
}
