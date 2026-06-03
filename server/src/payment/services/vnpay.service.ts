import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

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

  constructor(private readonly configService: ConfigService) {
    this.tmnCode = this.configService.get<string>('VNPAY_TMN_CODE', '');
    this.hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET', '');
    this.vnpUrl = this.configService.get<string>(
      'VNPAY_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
    this.returnUrl = this.configService.get<string>('VNPAY_RETURN_URL', '');
  }

  createPaymentUrl(params: VnpayCreatePaymentParams): string {
    const { orderId, amount, orderInfo, ipAddr } = params;
    const now = new Date();
    const createDate = this._formatDate(now);
    const expireDate = this._formatDate(new Date(now.getTime() + 15 * 60 * 1000));

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

  private _sortParams(params: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params).sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  private _formatDate(date: Date): string {
    const pad = (n: number): string => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}` +
      `${pad(date.getMonth() + 1)}` +
      `${pad(date.getDate())}` +
      `${pad(date.getHours())}` +
      `${pad(date.getMinutes())}` +
      `${pad(date.getSeconds())}`
    );
  }
}
