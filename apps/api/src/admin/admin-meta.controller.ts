import { Controller, Get, UseGuards } from '@nestjs/common';
import { OrderStatus, TaskStatus } from '@prisma/client';
import { AdminGuard } from '../auth/guards';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminMetaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('suppliers')
  suppliers() {
    return this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  }

  @Get('airports')
  airports() {
    return this.prisma.airport.findMany({ orderBy: { code: 'asc' } });
  }

  @Get('stats')
  async stats() {
    // Đầu ngày theo giờ Việt Nam (UTC+7, không có DST).
    const vnNow = new Date(Date.now() + 7 * 3_600_000);
    const startOfDay = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()) - 7 * 3_600_000);
    const paidStatuses = [OrderStatus.PROCESSING, OrderStatus.CONFIRMED, OrderStatus.PARTIALLY_CONFIRMED];
    const now = new Date();

    const [openTasks, overdueTasks, processing, today, byStatus] = await Promise.all([
      this.prisma.fulfillmentTask.count({ where: { status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } } }),
      this.prisma.fulfillmentTask.count({
        where: { status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] }, dueAt: { lt: now } },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      this.prisma.order.aggregate({
        where: { paidAt: { gte: startOfDay }, status: { in: paidStatuses } },
        _count: true,
        _sum: { totalAmount: true, refundAmount: true },
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
    ]);
    const todayItems = await this.prisma.orderItem.aggregate({
      where: { order: { paidAt: { gte: startOfDay }, status: { in: paidStatuses } }, status: 'CONFIRMED' },
      _sum: { amount: true, netAmount: true },
    });

    return {
      openTasks,
      overdueTasks,
      processing,
      today: {
        orders: today._count,
        revenue: (today._sum.totalAmount ?? 0) - (today._sum.refundAmount ?? 0),
        grossProfit: (todayItems._sum.amount ?? 0) - (todayItems._sum.netAmount ?? 0),
      },
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
    };
  }
}
