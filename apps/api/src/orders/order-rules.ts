import { ItemStatus, OrderStatus } from '@prisma/client';

/** Các quy tắc nghiệp vụ thuần (không phụ thuộc DB) để dễ test. */

export const MAX_PAX_PER_ITEM = 9;
export const MAX_BOOKING_DAYS_AHEAD = 365;

export interface PaxCount {
  adults: number;
  children: number;
  infants: number;
}

export interface PriceTable {
  priceAdult: number;
  priceChild: number;
  priceInfant: number;
  netAdult: number;
  netChild: number;
  netInfant: number;
}

export class BookingRuleError extends Error {}

export function totalPax(p: PaxCount): number {
  return p.adults + p.children + p.infants;
}

export function validatePax(p: PaxCount): void {
  if (p.adults < 1) throw new BookingRuleError('Cần ít nhất 1 người lớn đi kèm');
  if (p.children < 0 || p.infants < 0) throw new BookingRuleError('Số khách không hợp lệ');
  if (p.infants > p.adults) throw new BookingRuleError('Mỗi em bé cần 1 người lớn đi kèm');
  if (totalPax(p) > MAX_PAX_PER_ITEM) {
    throw new BookingRuleError(`Tối đa ${MAX_PAX_PER_ITEM} khách mỗi dịch vụ`);
  }
}

/** Giờ phục vụ phải cách hiện tại ít nhất leadTimeHours và không quá xa. */
export function validateServiceTime(serviceTime: Date, now: Date, leadTimeHours: number): void {
  if (Number.isNaN(serviceTime.getTime())) throw new BookingRuleError('Giờ bay không hợp lệ');
  const hoursAhead = (serviceTime.getTime() - now.getTime()) / 3_600_000;
  if (hoursAhead < leadTimeHours) {
    throw new BookingRuleError(`Dịch vụ cần đặt trước giờ bay ít nhất ${leadTimeHours} giờ`);
  }
  if (hoursAhead > MAX_BOOKING_DAYS_AHEAD * 24) {
    throw new BookingRuleError(`Chỉ nhận đặt trước tối đa ${MAX_BOOKING_DAYS_AHEAD} ngày`);
  }
}

export function priceItem(table: PriceTable, pax: PaxCount) {
  return {
    amount:
      table.priceAdult * pax.adults + table.priceChild * pax.children + table.priceInfant * pax.infants,
    netAmount:
      table.netAdult * pax.adults + table.netChild * pax.children + table.netInfant * pax.infants,
  };
}

/** Chuẩn hóa số hiệu chuyến bay: "vn 213" -> "VN213". */
export function normalizeFlightNumber(raw: string): string {
  const v = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(v)) throw new BookingRuleError('Số hiệu chuyến bay không hợp lệ');
  return v;
}

/**
 * Tính trạng thái đơn từ trạng thái các dịch vụ con (sau khi đã thanh toán).
 * Trả về null nếu vẫn còn dịch vụ đang chờ xử lý.
 */
export function rollupOrderStatus(items: { status: ItemStatus }[]): OrderStatus | null {
  const active = items.filter((i) => i.status !== ItemStatus.CANCELLED);
  if (active.length === 0) return OrderStatus.CANCELLED;
  if (active.some((i) => i.status === ItemStatus.PENDING || i.status === ItemStatus.PROCESSING)) {
    return null;
  }
  const confirmed = active.filter((i) => i.status === ItemStatus.CONFIRMED).length;
  if (confirmed === active.length) return OrderStatus.CONFIRMED;
  if (confirmed === 0) return OrderStatus.FAILED;
  return OrderStatus.PARTIALLY_CONFIRMED;
}

/** Hạn xử lý của ops: SLA 2 giờ, nhưng không muộn hơn 3 giờ trước giờ phục vụ. */
export function manualTaskDueAt(now: Date, serviceTime: Date): Date {
  const sla = now.getTime() + 2 * 3_600_000;
  const latest = serviceTime.getTime() - 3 * 3_600_000;
  return new Date(Math.max(now.getTime(), Math.min(sla, latest)));
}

/** Còn trong thời gian hủy miễn phí không. */
export function isFreeCancellable(serviceTime: Date, now: Date, freeCancelHours: number): boolean {
  return serviceTime.getTime() - now.getTime() >= freeCancelHours * 3_600_000;
}
