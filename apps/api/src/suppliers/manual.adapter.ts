import { Injectable } from '@nestjs/common';
import { BookingResult, SupplierAdapter } from './supplier-adapter';

/** NCC ký trực tiếp, chưa có API: mọi đơn đi vào hàng đợi ops. */
@Injectable()
export class ManualSupplierAdapter implements SupplierAdapter {
  readonly key = 'manual';

  async book(): Promise<BookingResult> {
    return { kind: 'MANUAL' };
  }
}
