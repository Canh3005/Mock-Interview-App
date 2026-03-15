import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export interface IAiProvider {
  extractCvJson(content: any): Promise<any>;
  extractJdJson(content: any): Promise<any>;
  assessFitScore(cvJson: any, jdJson: any): Promise<any>;
}

@Injectable()
export class DocumentsAiService implements IAiProvider {
  private readonly logger = new Logger(DocumentsAiService.name);
  private readonly ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
    });
  }

  async extractCvJson(content: any): Promise<any> {
    this.logger.log('Extracting CV JSON via Gemini...');

    const cvSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        skills: {
          type: Type.OBJECT,
          properties: {
            languages: { type: Type.ARRAY, items: { type: Type.STRING } },
            frameworks: { type: Type.ARRAY, items: { type: Type.STRING } },
            tools: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        experiences: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              company: { type: Type.STRING },
              role: { type: Type.STRING },
              duration: { type: Type.STRING },
              responsibilities: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
        education: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              degree: { type: Type.STRING },
              institution: { type: Type.STRING },
              year: { type: Type.STRING },
            },
          },
        },
      },
      required: ['skills', 'experiences'],
    };

    const promptText = `Extract the candidate's professional information from this document and return it EXCLUSIVELY in the requested JSON structure. Ignore any fluff.`;

    let parts: any[] = [];
    if (typeof content === 'string') {
      parts = [{ text: promptText + `\n\nText:\n${content}` }];
    } else {
      parts = [content, { text: promptText }];
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: cvSchema,
        temperature: 0.1,
      },
    });

    return JSON.parse(response.text || '{}');
  }

  async extractJdJson(content: any): Promise<any> {
    this.logger.log('Extracting JD JSON via Gemini...');

    const jdSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        role: { type: Type.STRING },
        required_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        nice_to_have_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        minimum_experience_years: { type: Type.INTEGER },
        key_responsibilities: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['role', 'required_skills', 'key_responsibilities'],
    };

    const promptText = `Extract the core requirements from this Job Description (JD). Output ONLY in the requested JSON structure.`;

    let parts: any[] = [];
    if (typeof content === 'string') {
      parts = [{ text: promptText + `\n\nJD:\n${content}` }];
    } else {
      parts = [content, { text: promptText }];
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: jdSchema,
        temperature: 0.1,
      },
    });

    return JSON.parse(response.text || '{}');
  }

  async assessFitScore(cvJson: any, jdJson: any): Promise<any> {
    this.logger.log('Assessing Fit Score via Gemini...');

    const assessSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        fit_score: {
          type: Type.INTEGER,
          description: 'Match percentage from 0 to 100',
        },
        gap_analysis: {
          type: Type.OBJECT,
          properties: {
            missing_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
      required: ['fit_score', 'gap_analysis'],
    };

    const prompt = `Act as an expert technical recruiter matching a candidate's CV against a Job Description. 
Compare the provided JSON payloads and return a fit score along with a gap analysis in the specified JSON format.

CV:
${JSON.stringify(cvJson, null, 2)}

Expected Job Description (JD):
${JSON.stringify(jdJson, null, 2)}
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: assessSchema,
        temperature: 0.2, // Let it be a bit more analytical
      },
    });

    return JSON.parse(response.text || '{}');
  }
}
