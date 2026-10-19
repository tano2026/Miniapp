import { ItemStatus, OrderStatus } from '@prisma/client';
import {
  BookingRuleError,
  isFreeCancellable,
  manualTaskDueAt,
  normalizeFlightNumber,
  priceItem,
  rollupOrderStatus,
  validatePax,
  validateServiceTime,
} from './order-rules';

const H = 3_600_000;

describe('validatePax', () => {
  it('requires at least one adult', () => {
    expect(() => validatePax({ adults: 0, children: 1, infants: 0 })).toThrow(BookingRuleError);
  });
  it('requires one adult per infant', () => {
    expect(() => validatePax({ adults: 1, children: 0, infants: 2 })).toThrow(BookingRuleError);
  });
  it('caps total pax', () => {
    expect(() => validatePax({ adults: 8, children: 2, infants: 0 })).toThrow(BookingRuleError);
  });
  it('accepts a normal family', () => {
    expect(() => validatePax({ adults: 2, children: 1, infants: 1 })).not.toThrow();
  });
});

describe('validateServiceTime', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  it('rejects bookings inside lead time', () => {
    expect(() => validateServiceTime(new Date(now.getTime() + 5 * H), now, 12)).toThrow(/12 giờ/);
  });
  it('accepts bookings outside lead time', () => {
    expect(() => validateServiceTime(new Date(now.getTime() + 13 * H), now, 12)).not.toThrow();
  });
  it('rejects invalid dates', () => {
    expect(() => validateServiceTime(new Date('x'), now, 1)).toThrow(BookingRuleError);
  });
});

describe('priceItem', () => {
  it('sums sell and net prices per pax type', () => {
    const table = {
      priceAdult: 500_000, priceChild: 300_000, priceInfant: 0,
      netAdult: 400_000, netChild: 250_000, netInfant: 0,
    };
    expect(priceItem(table, { adults: 2, children: 1, infants: 1 })).toEqual({
      amount: 1_300_000,
      netAmount: 1_050_000,
    });
  });
});

describe('normalizeFlightNumber', () => {
  it('normalizes spacing and case', () => {
    expect(normalizeFlightNumber(' vn 213 ')).toBe('VN213');
    expect(normalizeFlightNumber('vj1')).toBe('VJ1');
  });
  it('rejects garbage', () => {
    expect(() => normalizeFlightNumber('hello')).toThrow(BookingRuleError);
  });
});

describe('rollupOrderStatus', () => {
  const s = (...st: ItemStatus[]) => st.map((status) => ({ status }));
  it('waits while any item is pending', () => {
    expect(rollupOrderStatus(s(ItemStatus.CONFIRMED, ItemStatus.PROCESSING))).toBeNull();
  });
  it('confirms when all confirmed', () => {
    expect(rollupOrderStatus(s(ItemStatus.CONFIRMED, ItemStatus.CONFIRMED))).toBe(OrderStatus.CONFIRMED);
  });
  it('fails when all failed', () => {
    expect(rollupOrderStatus(s(ItemStatus.FAILED))).toBe(OrderStatus.FAILED);
  });
  it('partially confirms a mixed order', () => {
    expect(rollupOrderStatus(s(ItemStatus.CONFIRMED, ItemStatus.FAILED))).toBe(
      OrderStatus.PARTIALLY_CONFIRMED,
    );
  });
  it('ignores cancelled items', () => {
    expect(rollupOrderStatus(s(ItemStatus.CONFIRMED, ItemStatus.CANCELLED))).toBe(OrderStatus.CONFIRMED);
    expect(rollupOrderStatus(s(ItemStatus.CANCELLED))).toBe(OrderStatus.CANCELLED);
  });
});

describe('manualTaskDueAt', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  it('uses a 2h SLA when the flight is far away', () => {
    expect(manualTaskDueAt(now, new Date(now.getTime() + 48 * H)).getTime()).toBe(now.getTime() + 2 * H);
  });
  it('tightens to 3h before service time', () => {
    expect(manualTaskDueAt(now, new Date(now.getTime() + 4 * H)).getTime()).toBe(now.getTime() + 1 * H);
  });
  it('never returns a time in the past', () => {
    expect(manualTaskDueAt(now, new Date(now.getTime() + 1 * H)).getTime()).toBe(now.getTime());
  });
});

describe('isFreeCancellable', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  it('respects the free-cancel window', () => {
    expect(isFreeCancellable(new Date(now.getTime() + 25 * H), now, 24)).toBe(true);
    expect(isFreeCancellable(new Date(now.getTime() + 23 * H), now, 24)).toBe(false);
  });
});
