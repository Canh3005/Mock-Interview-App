import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';

export interface MomoCreatePaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
}

export interface MomoWebhookPayload {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);
  private readonly partnerCode: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly notifyUrl: string;
  private readonly returnUrl: string;
  private readonly endpoint: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE', '');
    this.accessKey = this.configService.get<string>('MOMO_ACCESS_KEY', '');
    this.secretKey = this.configService.get<string>('MOMO_SECRET_KEY', '');
    this.notifyUrl = this.configService.get<string>('MOMO_NOTIFY_URL', '');
    this.returnUrl = this.configService.get<string>('MOMO_RETURN_URL', '');
    this.endpoint = this.configService.get<string>(
      'MOMO_ENDPOINT',
      'https://test-payment.momo.vn/v2/gateway/api/create',
    );
  }

  async createPayment(params: MomoCreatePaymentParams): Promise<string> {
    const { orderId, amount, orderInfo } = params;
    const requestId = orderId;
    const extraData = '';
    const requestType = 'payWithMethod';

    const rawSignature = [
      `accessKey=${this.accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${this.notifyUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${this.partnerCode}`,
      `redirectUrl=${this.returnUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');

    const signature = createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    const body = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: this.returnUrl,
      ipnUrl: this.notifyUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    };

    const response = await firstValueFrom(
      this.httpService.post<{
        resultCode: number;
        payUrl?: string;
        message: string;
      }>(this.endpoint, body),
    );

    if (response.data.resultCode !== 0 || !response.data.payUrl) {
      this.logger.error('MoMo createPayment failed', response.data);
      throw new Error(`MoMo payment creation failed: ${response.data.message}`);
    }

    return response.data.payUrl;
  }

  verifySignature(payload: MomoWebhookPayload): boolean {
    const {
      accessKey,
      amount,
      extraData,
      message,
      orderId,
      orderInfo,
      orderType,
      partnerCode,
      payType,
      requestId,
      responseTime,
      resultCode,
      transId,
      signature,
    } = payload as MomoWebhookPayload & { accessKey?: string };

    const rawSignature = [
      `accessKey=${accessKey ?? this.accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `message=${message}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `orderType=${orderType}`,
      `partnerCode=${partnerCode}`,
      `payType=${payType}`,
      `requestId=${requestId}`,
      `responseTime=${responseTime}`,
      `resultCode=${resultCode}`,
      `transId=${transId}`,
    ].join('&');

    const expected = createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    return expected === signature;
  }
}
