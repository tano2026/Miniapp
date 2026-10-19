import { Module } from '@nestjs/common';
import { MockPayProvider } from './mock-pay.provider';
import { PaymentProviderRegistry } from './payment-provider-registry';
import { RefundService } from './refund.service';

@Module({
  providers: [MockPayProvider, PaymentProviderRegistry, RefundService],
  exports: [MockPayProvider, PaymentProviderRegistry, RefundService],
})
export class PaymentsModule {}
