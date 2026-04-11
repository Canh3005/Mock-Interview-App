import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import WebSocket from 'ws';

// Vietnamese voices
const VOICE_MAP: Record<string, string> = {
  junior: 'x2_ViVn_ThuHien',
  mid: 'x2_ViVn_ThuHien',
  senior: 'x2_ViVn_ThuHien',
};

// English voices
const VOICE_MAP_EN: Record<string, string> = {
  junior: 'x4_EnUs_Gavin_assist',
  mid: 'x4_EnUs_Gavin_assist',
  senior: 'x4_EnUk_Ashleigh_assist',
};

// Japanese voices
const VOICE_MAP_JA: Record<string, string> = {
  junior: 'x2_JaJp_ZhongCun',
  mid: 'x2_JaJp_ZhongCun',
  senior: 'x2_JaJp_Otoya',
};

export interface SynthesizeOptions {
  voice?: string;
  speed?: number;
  level?: string;
  language?: 'vi' | 'en' | 'ja';
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly appId: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly wsUrl = 'wss://tts-api-sg.xf-yun.com/v2/tts';

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('XFYUN_APP_ID') ?? '';
    this.apiKey = this.configService.get<string>('XFYUN_API_KEY') ?? '';
    this.apiSecret = this.configService.get<string>('XFYUN_API_SECRET') ?? '';
  }

  private buildAuthUrl(): string {
    const url = new URL(this.wsUrl);
    const host = url.host;
    const path = url.pathname;
    const date = new Date().toUTCString();

    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(signatureOrigin)
      .digest('base64');

    const authorizationOrigin =
      `api_key="${this.apiKey}", algorithm="hmac-sha256", ` +
      `headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');

    return (
      `${this.wsUrl}?authorization=${encodeURIComponent(authorization)}` +
      `&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`
    );
  }

  async synthesize(
    text: string,
    options: SynthesizeOptions = {},
  ): Promise<Buffer> {
    if (!this.appId || !this.apiKey || !this.apiSecret) {
      this.logger.warn(
        'XFYUN credentials not set — returning empty audio buffer',
      );
      return Buffer.alloc(0);
    }

    const level = options.level ?? 'mid';
    const lang = options.language ?? 'vi';
    const voiceMap =
      lang === 'en' ? VOICE_MAP_EN : lang === 'ja' ? VOICE_MAP_JA : VOICE_MAP;
    const vcn = options.voice ?? voiceMap[level] ?? 'x2_ViVn_ThuHien';
    // speed: iFlytek range 0-100, default 50; input is 0.5–2.0 speaking rate → map to 0–100
    const speed =
      options.speed != null ? Math.round((options.speed / 2.0) * 100) : 50;

    // Japanese requires tte=Unicode (UTF-16 LE), other languages use UTF8
    const tte = lang === 'ja' ? 'Unicode' : 'UTF8';
    const textEncoded =
      lang === 'ja'
        ? Buffer.from(text, 'utf16le').toString('base64')
        : Buffer.from(text, 'utf-8').toString('base64');

    return new Promise<Buffer>((resolve, reject) => {
      const authUrl = this.buildAuthUrl();
      const ws = new WebSocket(authUrl);
      const chunks: Buffer[] = [];

      ws.on('open', () => {
        this.logger.debug(
          `TTS request: vcn=${vcn} lang=${lang} text="${text.slice(0, 30)}..."`,
        );
        const payload = {
          common: { app_id: this.appId },
          business: {
            aue: 'lame',
            sfl: 1,
            vcn,
            speed,
            volume: 50,
            pitch: 50,
            tte,
          },
          data: {
            status: 2,
            text: textEncoded,
          },
        };
        ws.send(JSON.stringify(payload));
      });

      ws.on('message', (raw: WebSocket.RawData) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          const msg = JSON.parse(raw.toString()) as {
            code: number;
            message: string;
            data?: { audio?: string; status?: number };
          };

          if (msg.code !== 0) {
            ws.close();
            reject(new Error(`iFlytek TTS error ${msg.code}: ${msg.message}`));
            return;
          }

          if (msg.data?.audio) {
            chunks.push(Buffer.from(msg.data.audio, 'base64'));
          }

          if (msg.data?.status === 2) {
            ws.close();
            resolve(Buffer.concat(chunks));
          }
        } catch (e) {
          ws.close();
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(e);
        }
      });

      ws.on('error', (err) => {
        this.logger.error('iFlytek TTS WebSocket error', err);
        reject(err);
      });

      ws.on('close', (code, reason) => {
        if (chunks.length === 0 && code !== 1000) {
          reject(
            new Error(
              `WebSocket closed unexpectedly: ${code} ${reason.toString()}`,
            ),
          );
        }
      });
    });
  }
}
