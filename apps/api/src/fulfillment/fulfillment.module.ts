import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { FulfillmentService } from './fulfillment.service';

@Module({
  imports: [SuppliersModule, PaymentsModule],
  providers: [FulfillmentService],
  exports: [FulfillmentService],
})
export class FulfillmentModule {}
