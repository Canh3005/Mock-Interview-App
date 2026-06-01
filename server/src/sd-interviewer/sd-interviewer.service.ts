import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SDSession, SDPhase } from '../sd-session/entities/sd-session.entity';
import { GroqService } from '../ai/groq.service';
import { buildHintPrompt } from './prompts/sd-phase-prompts';

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

const FAST_MODEL = 'llama-3.1-8b-instant';

@Injectable()
export class SDInterviewerService {
  constructor(
    @InjectRepository(SDSession)
    private readonly sdSessionRepo: Repository<SDSession>,
    private readonly groqService: GroqService,
  ) {}

  async requestHint(
    sessionId: string,
  ): Promise<{ hintMessage: string; hintsUsed: number }> {
    const session = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['problem'],
    });
    if (!session) throw new NotFoundException('Session not found');

    const history = session.transcriptHistory as unknown as TranscriptEntry[];
    const hintPrompt = buildHintPrompt({
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

    const hintMessage = await this.groqService.generateContent({
      model: FAST_MODEL,
      contents: [{ role: 'user', parts: [{ text: 'Generate hint' }] }],
      config: { systemInstruction: hintPrompt, maxOutputTokens: 150 },
    });

    const newHintsUsed = (session.hintsUsed ?? 0) + 1;
    await this.sdSessionRepo.update(sessionId, { hintsUsed: newHintsUsed });

    return { hintMessage: hintMessage.trim(), hintsUsed: newHintsUsed };
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
}
