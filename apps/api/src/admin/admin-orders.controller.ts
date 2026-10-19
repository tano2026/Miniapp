import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminGuard, CurrentAdmin } from '../auth/guards';
import { AdminSession } from '../auth/session.types';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelOrderDto, OrderListQuery } from './admin.dto';

@Controller('admin/orders')
@UseGuards(AdminGuard)
export class AdminOrdersController {
  constructor(private readonly prisma: PrismaService, private readonly fulfillment: FulfillmentService) {}

  @Get()
  list(@Query() q: OrderListQuery) {
    const term = q.q?.trim();
    const where: Prisma.OrderWhereInput = {
      status: q.status,
      ...(term && {
        OR: [
          { code: { contains: term, mode: 'insensitive' } },
          { contactPhone: { contains: term } },
          { contactEmail: { contains: term, mode: 'insensitive' } },
          { items: { some: { flightNumber: { contains: term.replace(/\s/g, ''), mode: 'insensitive' } } } },
        ],
      }),
    };
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        partner: { select: { code: true, name: true } },
        items: { select: { status: true, flightNumber: true, serviceTime: true, product: { select: { name: true, type: true, airportCode: true } } } },
      },
    });
  }

  @Get(':code')
  async get(@Param('code') code: string) {
    const order = await this.prisma.order.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        partner: { select: { code: true, name: true, commissionBps: true } },
        items: {
          include: {
            passengers: true,
            task: true,
            product: { include: { supplier: { select: { name: true, mode: true } } } },
          },
        },
        payments: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException();
    return order;
  }

  @Post(':code/cancel')
  @HttpCode(200)
  async cancel(@Param('code') code: string, @Body() dto: CancelOrderDto, @CurrentAdmin() admin: AdminSession) {
    const order = await this.prisma.order.findUnique({ where: { code: code.toUpperCase() } });
    if (!order) throw new NotFoundException();
    await this.fulfillment.cancelOrder(order.id, dto.refund, dto.reason, admin.email);
    return { ok: true };
  }
}
