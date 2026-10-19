import { Injectable } from '@nestjs/common';
import { ManualSupplierAdapter } from './manual.adapter';
import { MockAggregatorAdapter } from './mock-aggregator.adapter';
import { SupplierAdapter } from './supplier-adapter';

@Injectable()
export class SupplierRegistry {
  private readonly adapters: Map<string, SupplierAdapter>;

  constructor(manual: ManualSupplierAdapter, mockAggregator: MockAggregatorAdapter) {
    this.adapters = new Map([manual, mockAggregator].map((a) => [a.key, a]));
  }

  get(key: string): SupplierAdapter {
    // Adapter chưa đăng ký thì rơi về xử lý tay thay vì làm hỏng đơn đã thanh toán.
    return this.adapters.get(key) ?? this.adapters.get('manual')!;
  }

  keys(): string[] {
    return [...this.adapters.keys()];
  }
}
