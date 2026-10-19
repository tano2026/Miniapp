import { Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { CurrentPartner, PartnerSessionGuard } from '../auth/guards';
import { PartnerSession } from '../auth/session.types';
import { env } from '../common/env';
import { MockPayProvider } from '../payments/mock-pay.provider';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

class SimulateDto {
  @IsBoolean() success: boolean;
}

@Controller()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly prisma: PrismaService,
    private readonly mockPay: MockPayProvider,
  ) {}

  @Post('orders')
  @UseGuards(PartnerSessionGuard)
  create(@CurrentPartner() s: PartnerSession, @Body() dto: CreateOrderDto) {
    return this.orders.create(s, dto);
  }

  @Get('orders')
  @UseGuards(PartnerSessionGuard)
  list(@CurrentPartner() s: PartnerSession) {
    return this.orders.listMine(s);
  }

  @Get('orders/:code')
  @UseGuards(PartnerSessionGuard)
  get(@CurrentPartner() s: PartnerSession, @Param('code') code: string) {
    return this.orders.getMine(s, code.toUpperCase());
  }

  /** Cổng thanh toán gọi về (server-to-server). Mỗi provider một đường dẫn. */
  @Post('payments/ipn/:provider')
  @HttpCode(200)
  ipn(@Param('provider') provider: string, @Body() body: unknown) {
    return this.orders.handleIpn(provider, body);
  }

  // ── Cổng thanh toán giả lập (chỉ dev) ──────────────────────────────────────

  @Get('payments/mock/:ref')
  async mockInfo(@Param('ref') ref: string) {
    if (env.isProd) throw new ForbiddenException();
    const p = await this.prisma.payment.findUnique({
      where: { providerRef: ref },
      include: { order: { include: { partner: { select: { name: true } } } } },
    });
    if (!p || p.provider !== 'mock') throw new NotFoundException();
    return {
      ref,
      amount: p.amount,
      status: p.status,
      orderCode: p.order.code,
      partnerName: p.order.partner.name,
      expiresAt: p.order.expiresAt,
    };
  }

  /** Mô phỏng ngân hàng gửi IPN có chữ ký hợp lệ. */
  @Post('payments/mock/:ref/simulate')
  @HttpCode(200)
  async mockSimulate(@Param('ref') ref: string, @Body() dto: SimulateDto) {
    if (env.isProd) throw new ForbiddenException();
    const p = await this.prisma.payment.findUnique({ where: { providerRef: ref }, include: { order: true } });
    if (!p || p.provider !== 'mock') throw new NotFoundException();
    const status = dto.success ? 'SUCCESS' : 'FAILED';
    await this.orders.handleIpn('mock', { ref, amount: p.amount, status, signature: this.mockPay.sign(ref, p.amount, status) });
    return { orderCode: p.order.code };
  }
}
