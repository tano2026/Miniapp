import { Injectable, Logger } from '@nestjs/common';
import { randomCode } from '../common/codes';
import { BookingContext, BookingResult, SupplierAdapter } from './supplier-adapter';

/**
 * Giả lập một aggregator có API (xác nhận tức thì).
 * Khi ký với aggregator thật, tạo adapter mới cùng interface và đổi adapterKey của Supplier.
 * Mã sản phẩm chứa "SOLDOUT" sẽ trả lỗi hết chỗ để test luồng hoàn tiền.
 */
@Injectable()
export class MockAggregatorAdapter implements SupplierAdapter {
  readonly key = 'mock-aggregator';
  private readonly log = new Logger(MockAggregatorAdapter.name);

  async book(ctx: BookingContext): Promise<BookingResult> {
    await new Promise((r) => setTimeout(r, 300));
    if (ctx.supplierProductCode?.includes('SOLDOUT')) {
      return { kind: 'FAILED', reason: 'Nhà cung cấp báo hết chỗ' };
    }
    const supplierRef = `AGG-${randomCode(8)}`;
    this.log.log(`Booked ${ctx.orderCode}/${ctx.itemId} -> ${supplierRef}`);
    return { kind: 'CONFIRMED', supplierRef, voucherCode: randomCode(10) };
  }

  async cancel(supplierRef: string): Promise<void> {
    this.log.log(`Cancelled ${supplierRef}`);
  }
}
