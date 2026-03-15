import { Injectable, Logger } from '@nestjs/common';
import { Type, Schema } from '@google/genai';
import { GeminiService } from '../ai/gemini.service';

export interface CvJson {
  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
  };
  experiences: Array<{
    company: string;
    role: string;
    duration: string;
    responsibilities: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
}

export interface JdJson {
  role: string;
  required_skills: string[];
  nice_to_have_skills?: string[];
  minimum_experience_years?: number;
  key_responsibilities: string[];
}

export interface FitAssessment {
  fit_score: number;
  gap_analysis: {
    missing_skills: string[];
    suggestions: string[];
  };
}

export interface IAiProvider {
  extractCvJson(content: string | object): Promise<CvJson>;
  extractJdJson(content: string | object): Promise<JdJson>;
  assessFitScore(cvJson: CvJson, jdJson: JdJson): Promise<FitAssessment>;
}

@Injectable()
export class DocumentsAiService implements IAiProvider {
  private readonly logger = new Logger(DocumentsAiService.name);

  constructor(private gemini: GeminiService) {}

  async extractCvJson(content: string | object): Promise<CvJson> {
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

    const parts =
      typeof content === 'string'
        ? [{ text: `${promptText}\n\nText:\n${content}` }]
        : [content, { text: promptText }];

    const text = await this.gemini.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: cvSchema,
        temperature: 0.1,
      },
    });

    return JSON.parse(text || '{}') as CvJson;
  }

  async extractJdJson(content: string | object): Promise<JdJson> {
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

    const parts =
      typeof content === 'string'
        ? [{ text: `${promptText}\n\nJD:\n${content}` }]
        : [content, { text: promptText }];

    const text = await this.gemini.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: jdSchema,
        temperature: 0.1,
      },
    });

    return JSON.parse(text || '{}') as JdJson;
  }

  async assessFitScore(cvJson: CvJson, jdJson: JdJson): Promise<FitAssessment> {
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

    const text = await this.gemini.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: assessSchema,
        temperature: 0.2,
      },
    });

    return JSON.parse(text || '{}') as FitAssessment;
  }
}
