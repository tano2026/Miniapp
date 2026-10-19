/** Hợp đồng chung cho mọi nhà cung cấp phòng chờ / fast track. */

export interface BookingContext {
  orderCode: string;
  itemId: string;
  supplierProductCode: string | null;
  productName: string;
  airportCode: string;
  terminal: string;
  flightNumber: string;
  serviceTime: Date;
  passengers: { fullName: string; type: 'ADULT' | 'CHILD' | 'INFANT' }[];
  contact: { name: string; phone: string; email: string };
}

export type BookingResult =
  | { kind: 'CONFIRMED'; supplierRef: string; voucherCode: string }
  /** NCC xử lý tay: tạo việc trong hàng đợi ops. */
  | { kind: 'MANUAL' }
  | { kind: 'FAILED'; reason: string };

export interface SupplierAdapter {
  readonly key: string;
  book(ctx: BookingContext): Promise<BookingResult>;
  cancel?(supplierRef: string): Promise<void>;
}
