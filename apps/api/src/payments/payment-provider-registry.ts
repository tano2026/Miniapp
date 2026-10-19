import { Injectable, NotFoundException } from '@nestjs/common';
import { MockPayProvider } from './mock-pay.provider';
import { PaymentProvider } from './payment-provider';

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: Map<string, PaymentProvider>;

  constructor(mock: MockPayProvider) {
    this.providers = new Map([[mock.key, mock]]);
  }

  get(key: string): PaymentProvider {
    const p = this.providers.get(key);
    if (!p) throw new NotFoundException(`Chưa cấu hình cổng thanh toán "${key}"`);
    return p;
  }
}
