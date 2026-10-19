import { Module } from '@nestjs/common';
import { ManualSupplierAdapter } from './manual.adapter';
import { MockAggregatorAdapter } from './mock-aggregator.adapter';
import { SupplierRegistry } from './supplier-registry';

@Module({
  providers: [ManualSupplierAdapter, MockAggregatorAdapter, SupplierRegistry],
  exports: [SupplierRegistry],
})
export class SuppliersModule {}
