import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { AdminGuard, CurrentAdmin } from '../auth/guards';
import { AdminSession } from '../auth/session.types';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteTaskDto, FailTaskDto, TaskListQuery } from './admin.dto';

/** Hàng đợi ops: các dịch vụ cần đặt tay với nhà cung cấp. */
@Controller('admin/tasks')
@UseGuards(AdminGuard)
export class AdminTasksController {
  constructor(private readonly prisma: PrismaService, private readonly fulfillment: FulfillmentService) {}

  @Get()
  list(@Query() q: TaskListQuery) {
    const open = !q.status;
    return this.prisma.fulfillmentTask.findMany({
      where: open ? { status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } } : { status: q.status },
      orderBy: open ? { dueAt: 'asc' } : { updatedAt: 'desc' },
      take: 200,
      include: {
        item: {
          include: {
            passengers: true,
            order: { select: { code: true, contactName: true, contactPhone: true, contactEmail: true } },
            product: {
              select: {
                name: true, type: true, airportCode: true, terminal: true, direction: true, supplierProductCode: true,
                supplier: { select: { name: true, contactEmail: true, contactPhone: true } },
              },
            },
          },
        },
      },
    });
  }

  @Post(':id/claim')
  @HttpCode(200)
  async claim(@Param('id') id: string, @CurrentAdmin() a: AdminSession) {
    await this.fulfillment.claimTask(id, a.email);
    return { ok: true };
  }

  @Post(':id/complete')
  @HttpCode(200)
  async complete(@Param('id') id: string, @Body() dto: CompleteTaskDto, @CurrentAdmin() a: AdminSession) {
    await this.fulfillment.completeTask(id, dto, a.email);
    return { ok: true };
  }

  @Post(':id/fail')
  @HttpCode(200)
  async fail(@Param('id') id: string, @Body() dto: FailTaskDto, @CurrentAdmin() a: AdminSession) {
    await this.fulfillment.failTask(id, dto.reason, a.email);
    return { ok: true };
  }
}
