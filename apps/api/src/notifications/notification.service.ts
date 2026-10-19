import { Injectable, Logger } from '@nestjs/common';
import { logEvent } from '../common/events';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Điểm gửi thông báo. Hiện ghi log + nhật ký đơn; khi lên thật nối email/SMS/Zalo ZNS
 * và push notification qua app đối tác tại đây.
 */
@Injectable()
export class NotificationService {
  private readonly log = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async customer(orderId: string, subject: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    this.log.log(`[to customer ${order.contactEmail}/${order.contactPhone}] ${order.code}: ${subject}`);
    await logEvent(this.prisma, orderId, 'NOTIFY_CUSTOMER', subject);
  }

  async supplier(orderId: string, supplierName: string, contact: string | null, subject: string) {
    this.log.log(`[to supplier ${supplierName} <${contact ?? 'n/a'}>] ${subject}`);
    await logEvent(this.prisma, orderId, 'NOTIFY_SUPPLIER', `${supplierName}: ${subject}`);
  }
}
