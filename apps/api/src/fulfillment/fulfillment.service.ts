import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ItemStatus, OrderStatus, TaskStatus } from '@prisma/client';
import { logEvent } from '../common/events';
import { NotificationService } from '../notifications/notification.service';
import { manualTaskDueAt, rollupOrderStatus } from '../orders/order-rules';
import { RefundService } from '../payments/refund.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingContext } from '../suppliers/supplier-adapter';
import { SupplierRegistry } from '../suppliers/supplier-registry';

const itemInclude = {
  product: { include: { supplier: true } },
  passengers: true,
  order: true,
} as const;

@Injectable()
export class FulfillmentService {
  private readonly log = new Logger(FulfillmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly suppliers: SupplierRegistry,
    private readonly refunds: RefundService,
    private readonly notify: NotificationService,
  ) {}

  /** Gửi từng dịch vụ của đơn đã thanh toán sang nhà cung cấp tương ứng. */
  async dispatchOrder(orderId: string): Promise<void> {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId, status: ItemStatus.PENDING },
      include: itemInclude,
    });

    for (const item of items) {
      // Khóa lạc quan: chỉ một tiến trình được chuyển PENDING -> PROCESSING.
      const claimed = await this.prisma.orderItem.updateMany({
        where: { id: item.id, status: ItemStatus.PENDING },
        data: { status: ItemStatus.PROCESSING },
      });
      if (claimed.count === 0) continue;

      const { product, order } = item;
      const ctx: BookingContext = {
        orderCode: order.code,
        itemId: item.id,
        supplierProductCode: product.supplierProductCode,
        productName: product.name,
        airportCode: product.airportCode,
        terminal: product.terminal,
        flightNumber: item.flightNumber,
        serviceTime: item.serviceTime,
        passengers: item.passengers.map((p) => ({ fullName: p.fullName, type: p.type })),
        contact: { name: order.contactName, phone: order.contactPhone, email: order.contactEmail },
      };

      let result;
      try {
        result = await this.suppliers.get(product.supplier.adapterKey).book(ctx);
      } catch (err) {
        // Lỗi kết nối NCC không làm hỏng đơn: chuyển sang ops xử lý tay.
        this.log.error(`Supplier error for ${order.code}/${item.id}`, err as Error);
        await this.createManualTask(item.id, order.id, item.serviceTime, `API NCC lỗi: ${(err as Error).message}`);
        continue;
      }

      if (result.kind === 'CONFIRMED') {
        await this.prisma.orderItem.update({
          where: { id: item.id },
          data: { status: ItemStatus.CONFIRMED, supplierRef: result.supplierRef, voucherCode: result.voucherCode },
        });
        await logEvent(this.prisma, order.id, 'ITEM_CONFIRMED', `${product.name}: NCC xác nhận ${result.supplierRef}`);
      } else if (result.kind === 'FAILED') {
        await this.prisma.orderItem.update({
          where: { id: item.id },
          data: { status: ItemStatus.FAILED, failureReason: result.reason },
        });
        await logEvent(this.prisma, order.id, 'ITEM_FAILED', `${product.name}: ${result.reason}`);
      } else {
        await this.createManualTask(item.id, order.id, item.serviceTime);
        await this.notify.supplier(
          order.id,
          product.supplier.name,
          product.supplier.contactEmail,
          `Yêu cầu đặt ${product.name} — ${item.flightNumber} — ${item.passengers.length} khách`,
        );
      }
    }

    await this.settle(orderId);
  }

  private async createManualTask(itemId: string, orderId: string, serviceTime: Date, note?: string) {
    await this.prisma.fulfillmentTask.upsert({
      where: { itemId },
      create: { itemId, dueAt: manualTaskDueAt(new Date(), serviceTime), note },
      update: { status: TaskStatus.OPEN, note },
    });
    await logEvent(this.prisma, orderId, 'TASK_CREATED', 'Chuyển ops xử lý với nhà cung cấp');
  }

  async claimTask(taskId: string, actor: string) {
    const res = await this.prisma.fulfillmentTask.updateMany({
      where: { id: taskId, status: TaskStatus.OPEN },
      data: { status: TaskStatus.IN_PROGRESS, assignee: actor },
    });
    if (res.count === 0) throw new BadRequestException('Việc đã có người nhận hoặc đã đóng');
  }

  async completeTask(taskId: string, input: { voucherCode: string; supplierRef?: string; note?: string }, actor: string) {
    const task = await this.openTask(taskId);
    await this.prisma.$transaction([
      this.prisma.fulfillmentTask.update({
        where: { id: taskId },
        data: { status: TaskStatus.DONE, completedAt: new Date(), assignee: task.assignee ?? actor, note: input.note ?? task.note },
      }),
      this.prisma.orderItem.update({
        where: { id: task.itemId },
        data: { status: ItemStatus.CONFIRMED, voucherCode: input.voucherCode.trim(), supplierRef: input.supplierRef?.trim() || null },
      }),
    ]);
    await logEvent(this.prisma, task.item.orderId, 'ITEM_CONFIRMED', `${task.item.product.name}: ops xác nhận mã ${input.voucherCode}`, actor);
    await this.settle(task.item.orderId);
  }

  async failTask(taskId: string, reason: string, actor: string) {
    const task = await this.openTask(taskId);
    await this.prisma.$transaction([
      this.prisma.fulfillmentTask.update({
        where: { id: taskId },
        data: { status: TaskStatus.FAILED, completedAt: new Date(), note: reason },
      }),
      this.prisma.orderItem.update({
        where: { id: task.itemId },
        data: { status: ItemStatus.FAILED, failureReason: reason },
      }),
    ]);
    await logEvent(this.prisma, task.item.orderId, 'ITEM_FAILED', `${task.item.product.name}: ${reason}`, actor);
    await this.settle(task.item.orderId);
  }

  private async openTask(taskId: string) {
    const task = await this.prisma.fulfillmentTask.findUnique({
      where: { id: taskId },
      include: { item: { include: { product: true } } },
    });
    if (!task) throw new NotFoundException();
    if (task.status === TaskStatus.DONE || task.status === TaskStatus.FAILED) {
      throw new BadRequestException('Việc này đã đóng');
    }
    return task;
  }

  /**
   * Khi mọi dịch vụ đã có kết quả: chốt trạng thái đơn, hoàn tiền phần lỗi, báo khách.
   * Chỉ chạy một lần nhờ điều kiện status = PROCESSING trong updateMany.
   */
  async settle(orderId: string): Promise<void> {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    const next = rollupOrderStatus(items);
    if (!next) return;

    const res = await this.prisma.order.updateMany({
      where: { id: orderId, status: OrderStatus.PROCESSING },
      data: { status: next },
    });
    if (res.count === 0) return;
    await logEvent(this.prisma, orderId, 'STATUS', `Đơn chuyển sang ${next}`);

    const failedAmount = items.filter((i) => i.status === ItemStatus.FAILED).reduce((s, i) => s + i.amount, 0);
    if (failedAmount > 0) {
      await this.refunds.refund(orderId, failedAmount, 'Nhà cung cấp không xác nhận được dịch vụ');
    }

    if (next === OrderStatus.CONFIRMED) {
      await this.notify.customer(orderId, 'Dịch vụ đã được xác nhận — gửi mã voucher');
    } else if (next === OrderStatus.PARTIALLY_CONFIRMED) {
      await this.notify.customer(orderId, 'Một phần dịch vụ được xác nhận, phần còn lại đã hoàn tiền');
    } else if (next === OrderStatus.FAILED) {
      await this.notify.customer(orderId, 'Rất tiếc, dịch vụ không thể xác nhận — đã hoàn tiền');
    }
  }

  /** Ops hủy đơn đã thanh toán (khách yêu cầu, chuyến bay hủy...). */
  async cancelOrder(orderId: string, refund: boolean, reason: string, actor: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { include: { supplier: true } } } } },
    });
    if (!order) throw new NotFoundException();
    const cancellable: OrderStatus[] = [OrderStatus.PROCESSING, OrderStatus.CONFIRMED, OrderStatus.PARTIALLY_CONFIRMED];
    if (!cancellable.includes(order.status)) throw new BadRequestException('Đơn ở trạng thái này không thể hủy');

    for (const item of order.items) {
      if (item.status === ItemStatus.CONFIRMED && item.supplierRef) {
        const adapter = this.suppliers.get(item.product.supplier.adapterKey);
        try {
          await adapter.cancel?.(item.supplierRef);
        } catch (err) {
          await logEvent(this.prisma, orderId, 'WARN', `Hủy với NCC thất bại (${item.supplierRef}), cần xử lý tay`, actor);
        }
      }
    }

    await this.prisma.$transaction([
      this.prisma.orderItem.updateMany({
        where: { orderId, status: { notIn: [ItemStatus.FAILED, ItemStatus.CANCELLED] } },
        data: { status: ItemStatus.CANCELLED },
      }),
      this.prisma.fulfillmentTask.updateMany({
        where: { item: { orderId }, status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } },
        data: { status: TaskStatus.FAILED, note: 'Đơn đã hủy', completedAt: new Date() },
      }),
      this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } }),
    ]);
    await logEvent(this.prisma, orderId, 'CANCELLED', reason, actor);

    if (refund) await this.refunds.refund(orderId, order.totalAmount, `Hủy đơn: ${reason}`, actor);
    await this.notify.customer(orderId, 'Đơn hàng đã được hủy');
  }
}
