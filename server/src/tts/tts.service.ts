import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import WebSocket from 'ws';

// Vietnamese voices: 'ThuHien' (natural) or 'xiaoyun'
const VOICE_MAP: Record<string, string> = {
  junior: 'xiaoyun',
  mid: 'xiaoyun',
  senior: 'xiaoyun',
};

const VOICE_MAP_EN: Record<string, string> = {
  junior: 'Catherine',
  mid: 'Catherine',
  senior: 'Catherine',
};

export interface SynthesizeOptions {
  voice?: string;
  speed?: number;
  level?: string;
  language?: 'vi' | 'en';
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
    const voiceMap = lang === 'en' ? VOICE_MAP_EN : VOICE_MAP;
    const vcn = options.voice ?? voiceMap[level] ?? 'ThuHien';
    // speed: iFlytek range 0-100, default 50; input is 0.5–2.0 speaking rate → map to 0–100
    const speed =
      options.speed != null ? Math.round((options.speed / 2.0) * 100) : 80;

    return new Promise<Buffer>((resolve, reject) => {
      const authUrl = this.buildAuthUrl();
      const ws = new WebSocket(authUrl);
      const chunks: Buffer[] = [];

      ws.on('open', () => {
        this.logger.debug(
          `TTS request: vcn=${vcn} text="${text.slice(0, 30)}..."`,
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
            tte: 'UTF8',
          },
          data: {
            status: 2,
            text: Buffer.from(text, 'utf-8').toString('base64'),
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
