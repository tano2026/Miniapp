import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { randomCode } from '../common/codes';
import { env } from '../common/env';
import { CreatePaymentInput, PaymentProvider, VerifiedIpn } from './payment-provider';

export interface MockIpnBody {
  ref: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  signature: string;
}

/**
 * Cổng thanh toán giả lập để chạy end-to-end khi chưa có sandbox của ngân hàng.
 * Mô phỏng đúng các bước thật: tạo giao dịch -> trang thanh toán -> IPN có chữ ký.
 */
@Injectable()
export class MockPayProvider implements PaymentProvider {
  readonly key = 'mock';
  private readonly log = new Logger(MockPayProvider.name);

  async createPayment(input: CreatePaymentInput) {
    const providerRef = `MP${randomCode(10)}`;
    return { providerRef, paymentUrl: `${env.webUrl}/pay/mock/${providerRef}` };
  }

  sign(ref: string, amount: number, status: string): string {
    return createHmac('sha256', env.mockPaySecret).update(`${ref}|${amount}|${status}`).digest('hex');
  }

  verifyIpn(body: unknown): VerifiedIpn {
    const b = body as Partial<MockIpnBody>;
    if (!b?.ref || typeof b.amount !== 'number' || !b.status || !b.signature) {
      throw new BadRequestException('IPN thiếu trường');
    }
    const expected = Buffer.from(this.sign(b.ref, b.amount, b.status), 'hex');
    const given = Buffer.from(b.signature, 'hex');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new BadRequestException('Sai chữ ký IPN');
    }
    return { providerRef: b.ref, amount: b.amount, success: b.status === 'SUCCESS' };
  }

  async refund(input: { providerRef: string; amount: number; reason: string }) {
    this.log.log(`Refund ${input.amount} for ${input.providerRef}: ${input.reason}`);
  }
}
