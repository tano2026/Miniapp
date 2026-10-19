import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { logEvent } from '../common/events';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProviderRegistry } from './payment-provider-registry';

@Injectable()
export class RefundService {
  private readonly log = new Logger(RefundService.name);

  constructor(private readonly prisma: PrismaService, private readonly providers: PaymentProviderRegistry) {}

  /** Hoàn tiền một phần hoặc toàn bộ; tự giới hạn ở số tiền còn có thể hoàn. */
  async refund(orderId: string, requested: number, reason: string, actor = 'system'): Promise<number> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payments: { where: { status: 'SUCCESS' } } },
    });
    const payment = order.payments[0];
    if (!payment) return 0;
    const amount = Math.min(requested, payment.amount - payment.refunded);
    if (amount <= 0) return 0;

    await this.providers.get(payment.provider).refund({ providerRef: payment.providerRef, amount, reason });

    const refundedTotal = payment.refunded + amount;
    await this.prisma.$transaction([
      this.prisma.payment.update({ where: { id: payment.id }, data: { refunded: refundedTotal } }),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          refundAmount: refundedTotal,
          paymentStatus:
            refundedTotal >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        },
      }),
    ]);
    await logEvent(this.prisma, orderId, 'REFUND', `Hoàn ${amount.toLocaleString('vi-VN')}đ — ${reason}`, actor);
    this.log.log(`Order ${order.code}: refunded ${amount}`);
    return amount;
  }
}
