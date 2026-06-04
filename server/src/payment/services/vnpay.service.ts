import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface VnpayCreatePaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  ipAddr: string;
}

@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly vnpUrl: string;
  private readonly returnUrl: string;
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.tmnCode = this.configService.get<string>('VNPAY_TMN_CODE', '');
    this.hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET', '');
    this.vnpUrl = this.configService.get<string>(
      'VNPAY_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
    this.returnUrl = this.configService.get<string>('VNPAY_RETURN_URL', '');
    this.apiUrl = this.configService.get<string>(
      'VNPAY_API_URL',
      'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
    );
  }

  createPaymentUrl(params: VnpayCreatePaymentParams): string {
    const { orderId, amount, orderInfo, ipAddr } = params;
    const now = new Date();
    const createDate = this._formatDate(now);
    const expireDate = this._formatDate(
      new Date(now.getTime() + 15 * 60 * 1000),
    );

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(amount * 100),
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const sortedParams = this._sortParams(vnpParams);
    const signData = new URLSearchParams(sortedParams).toString();
    const secureHash = createHmac('sha512', this.hashSecret)
      .update(signData)
      .digest('hex');

    sortedParams['vnp_SecureHash'] = secureHash;

    return `${this.vnpUrl}?${new URLSearchParams(sortedParams).toString()}`;
  }

  verifySignature(query: Record<string, string>): boolean {
    const receivedHash = query['vnp_SecureHash'];
    if (!receivedHash) return false;

    const params = { ...query };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    const sortedParams = this._sortParams(params);
    const signData = new URLSearchParams(sortedParams).toString();
    const expected = createHmac('sha512', this.hashSecret)
      .update(signData)
      .digest('hex');

    return expected === receivedHash;
  }

  async queryTransaction(
    idempotencyKey: string,
    orderCreatedAt: Date,
  ): Promise<'paid' | 'pending' | 'failed'> {
    const now = new Date();
    const createDate = this._formatDate(now);
    const transactionDate = this._formatDate(orderCreatedAt);
    const requestId = uuidv4().replace(/-/g, '').slice(0, 32);

    const params: Record<string, string> = {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: this.tmnCode,
      vnp_TxnRef: idempotencyKey,
      vnp_OrderInfo: `Query ${idempotencyKey}`,
      vnp_TransactionDate: transactionDate,
      vnp_CreateDate: createDate,
      vnp_IpAddr: '127.0.0.1',
    };

    const sortedParams = this._sortParams(params);
    const signData = Object.entries(sortedParams)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    params['vnp_SecureHash'] = createHmac('sha512', this.hashSecret)
      .update(signData)
      .digest('hex');

    try {
      const res = await firstValueFrom(
        this.httpService.post<{
          vnp_ResponseCode: string;
          vnp_TransactionStatus: string;
        }>(this.apiUrl, params),
      );
      const status = res.data.vnp_TransactionStatus;
      if (status === '00') return 'paid';
      if (status === '01') return 'pending';
      return 'failed';
    } catch (error) {
      this.logger.error(
        `VNPay queryTransaction failed for ${idempotencyKey}`,
        error,
      );
      return 'pending';
    }
  }

  private _sortParams(params: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params).sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  private _formatDate(date: Date): string {
    const pad = (n: number): string => String(n).padStart(2, '0');
    // VNPay yêu cầu giờ Việt Nam (UTC+7)
    const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return (
      `${vn.getUTCFullYear()}` +
      `${pad(vn.getUTCMonth() + 1)}` +
      `${pad(vn.getUTCDate())}` +
      `${pad(vn.getUTCHours())}` +
      `${pad(vn.getUTCMinutes())}` +
      `${pad(vn.getUTCSeconds())}`
    );
  }
}
