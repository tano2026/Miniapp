import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OrderStatus, PaxType, PaymentStatus, Prisma } from '@prisma/client';
import { PartnerSession } from '../auth/session.types';
import { newOrderCode } from '../common/codes';
import { env } from '../common/env';
import { logEvent } from '../common/events';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { PaymentProviderRegistry } from '../payments/payment-provider-registry';
import { RefundService } from '../payments/refund.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, OrderItemDto } from './orders.dto';
import {
  BookingRuleError,
  normalizeFlightNumber,
  priceItem,
  validatePax,
  validateServiceTime,
} from './order-rules';

/** Trường đơn hàng khách được xem (không lộ giá net, ghi chú nội bộ). */
export const customerOrderSelect = {
  code: true,
  status: true,
  paymentStatus: true,
  currency: true,
  totalAmount: true,
  refundAmount: true,
  contactName: true,
  contactPhone: true,
  contactEmail: true,
  expiresAt: true,
  paidAt: true,
  createdAt: true,
  items: {
    select: {
      id: true,
      status: true,
      flightNumber: true,
      serviceTime: true,
      adults: true,
      children: true,
      infants: true,
      amount: true,
      voucherCode: true,
      failureReason: true,
      passengers: { select: { fullName: true, type: true } },
      product: {
        select: {
          id: true, type: true, name: true, airportCode: true, terminal: true,
          direction: true, openingHours: true, maxStayHours: true, freeCancelHours: true,
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: PaymentProviderRegistry,
    private readonly fulfillment: FulfillmentService,
    private readonly refunds: RefundService,
  ) {}

  async create(session: PartnerSession, dto: CreateOrderDto) {
    const partner = await this.prisma.partner.findUniqueOrThrow({ where: { id: session.pid } });
    const now = new Date();
    const items = await Promise.all(dto.items.map((i) => this.buildItem(i, now)));
    const totalAmount = items.reduce((s, i) => s + i.amount, 0);

    const order = await this.insertWithUniqueCode((code) =>
      this.prisma.order.create({
        data: {
          code,
          partnerId: partner.id,
          partnerUserId: session.sub,
          totalAmount,
          contactName: dto.contact.name.trim(),
          contactPhone: dto.contact.phone,
          contactEmail: dto.contact.email.toLowerCase(),
          expiresAt: new Date(now.getTime() + env.paymentTtlMinutes * 60_000),
          items: { create: items },
        },
      }),
    );
    await logEvent(this.prisma, order.id, 'CREATED', `Tạo đơn ${totalAmount.toLocaleString('vi-VN')}đ`, `user:${session.sub}`);

    const provider = this.providers.get(partner.paymentProvider);
    const { providerRef, paymentUrl } = await provider.createPayment({
      orderCode: order.code,
      amount: totalAmount,
      description: `Thanh toan don ${order.code}`,
      returnUrl: `${env.webUrl}/orders/${order.code}`,
    });
    await this.prisma.payment.create({
      data: { orderId: order.id, provider: provider.key, providerRef, paymentUrl, amount: totalAmount },
    });

    return { code: order.code, totalAmount, expiresAt: order.expiresAt, paymentUrl };
  }

  /** Kiểm tra quy tắc, tính giá phía server cho một dịch vụ — không tin giá từ client. */
  private async buildItem(dto: OrderItemDto, now: Date) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, active: true, supplier: { active: true } },
    });
    if (!product) throw new BookingRuleError('Dịch vụ không còn mở bán');

    const pax = { adults: dto.adults, children: dto.children, infants: dto.infants };
    validatePax(pax);
    const countOf = (t: PaxType) => dto.passengers.filter((p) => p.type === t).length;
    if (countOf('ADULT') !== pax.adults || countOf('CHILD') !== pax.children || countOf('INFANT') !== pax.infants) {
      throw new BookingRuleError('Danh sách hành khách không khớp số lượng');
    }

    const serviceTime = new Date(dto.serviceTime);
    validateServiceTime(serviceTime, now, product.leadTimeHours);
    const { amount, netAmount } = priceItem(product, pax);

    return {
      productId: product.id,
      flightNumber: normalizeFlightNumber(dto.flightNumber),
      serviceTime,
      ...pax,
      unitPriceAdult: product.priceAdult,
      unitPriceChild: product.priceChild,
      unitPriceInfant: product.priceInfant,
      amount,
      netAmount,
      passengers: {
        create: dto.passengers.map((p) => ({ fullName: p.fullName.trim().toUpperCase(), type: p.type })),
      },
    };
  }

  private async insertWithUniqueCode<T>(create: (code: string) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await create(newOrderCode());
      } catch (err) {
        const unique = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!unique) throw err;
      }
    }
    throw new Error('Không sinh được mã đơn duy nhất');
  }

  listMine(session: PartnerSession) {
    return this.prisma.order.findMany({
      where: { partnerId: session.pid, partnerUserId: session.sub, status: { not: OrderStatus.EXPIRED } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: customerOrderSelect,
    });
  }

  async getMine(session: PartnerSession, code: string) {
    const order = await this.prisma.order.findFirst({
      where: { code, partnerId: session.pid, partnerUserId: session.sub },
      select: { ...customerOrderSelect, payments: { where: { status: 'PENDING' }, select: { paymentUrl: true } } },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    const { payments, ...rest } = order;
    return {
      ...rest,
      paymentUrl: order.status === OrderStatus.PENDING_PAYMENT ? (payments[0]?.paymentUrl ?? null) : null,
      // Chỉ hiện mã voucher khi đã xác nhận.
      items: rest.items.map((i) => ({ ...i, voucherCode: i.status === 'CONFIRMED' ? i.voucherCode : null })),
    };
  }

  /** Xử lý IPN từ cổng thanh toán. Idempotent: gọi lại nhiều lần vẫn an toàn. */
  async handleIpn(providerKey: string, body: unknown) {
    const ipn = this.providers.get(providerKey).verifyIpn(body);
    const payment = await this.prisma.payment.findUnique({ where: { providerRef: ipn.providerRef } });
    if (!payment || payment.provider !== providerKey) throw new NotFoundException('Không tìm thấy giao dịch');
    if (payment.status !== 'PENDING') return { ok: true, duplicate: true };

    if (!ipn.success) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', rawIpn: body as object } });
      await logEvent(this.prisma, payment.orderId, 'PAYMENT_FAILED', 'Thanh toán không thành công');
      return { ok: true };
    }
    if (ipn.amount !== payment.amount) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'AMOUNT_MISMATCH', rawIpn: body as object } });
      await logEvent(this.prisma, payment.orderId, 'PAYMENT_MISMATCH', `IPN báo ${ipn.amount}, đơn cần ${payment.amount} — cần kiểm tra`);
      throw new BadRequestException('Sai số tiền');
    }

    const marked = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'SUCCESS', rawIpn: body as object },
    });
    if (marked.count === 0) return { ok: true, duplicate: true };

    const paidAt = new Date();
    const moved = await this.prisma.order.updateMany({
      where: { id: payment.orderId, status: OrderStatus.PENDING_PAYMENT },
      data: { status: OrderStatus.PROCESSING, paymentStatus: PaymentStatus.PAID, paidAt },
    });

    if (moved.count === 0) {
      // Khách trả tiền sau khi đơn đã hết hạn/hủy: ghi nhận rồi hoàn ngay.
      await this.prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: PaymentStatus.PAID, paidAt } });
      await logEvent(this.prisma, payment.orderId, 'LATE_PAYMENT', 'Nhận tiền sau khi đơn hết hạn — tự động hoàn');
      await this.refunds.refund(payment.orderId, payment.amount, 'Thanh toán sau khi đơn hết hạn');
      return { ok: true };
    }

    await logEvent(this.prisma, payment.orderId, 'PAID', `Đã thanh toán qua ${providerKey}`);
    // Trả IPN nhanh; xử lý với NCC chạy nền.
    this.fulfillment.dispatchOrder(payment.orderId).catch((err) =>
      this.log.error(`dispatchOrder failed for ${payment.orderId}`, err),
    );
    return { ok: true };
  }

  @Interval(60_000)
  async expireUnpaidOrders() {
    const res = await this.prisma.order.updateMany({
      where: { status: OrderStatus.PENDING_PAYMENT, expiresAt: { lt: new Date() } },
      data: { status: OrderStatus.EXPIRED },
    });
    if (res.count) this.log.log(`Expired ${res.count} unpaid orders`);
  }
}
