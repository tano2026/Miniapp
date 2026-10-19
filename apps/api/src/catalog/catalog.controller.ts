import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { FlightScope, Prisma, ProductType, ServiceDirection } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class ProductQuery {
  @IsOptional() @IsEnum(ProductType) type?: ProductType;
  @IsOptional() @IsString() @Length(3, 3) airport?: string;
  @IsOptional() @IsEnum(FlightScope) scope?: FlightScope;
  @IsOptional() @IsEnum(ServiceDirection) direction?: ServiceDirection;
}

/** Chỉ trả các trường khách được xem — không lộ giá net, mã NCC. */
export const publicProductSelect = {
  id: true,
  type: true,
  airportCode: true,
  terminal: true,
  scope: true,
  direction: true,
  name: true,
  shortDescription: true,
  description: true,
  amenities: true,
  imageUrl: true,
  openingHours: true,
  maxStayHours: true,
  currency: true,
  priceAdult: true,
  priceChild: true,
  priceInfant: true,
  leadTimeHours: true,
  freeCancelHours: true,
  airport: { select: { code: true, name: true, city: true } },
  supplier: { select: { mode: true } },
} satisfies Prisma.ProductSelect;

@Controller()
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('airports')
  airports() {
    return this.prisma.airport.findMany({
      where: { active: true, products: { some: { active: true } } },
      orderBy: { code: 'asc' },
      select: { code: true, name: true, city: true },
    });
  }

  @Get('products')
  async products(@Query() q: ProductQuery) {
    const rows = await this.prisma.product.findMany({
      where: {
        active: true,
        supplier: { active: true },
        type: q.type,
        airportCode: q.airport?.toUpperCase(),
        scope: q.scope,
        direction: q.direction,
      },
      orderBy: [{ sortOrder: 'asc' }, { priceAdult: 'asc' }],
      select: publicProductSelect,
    });
    return rows.map(toPublic);
  }

  @Get('products/:id')
  async product(@Param('id') id: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, active: true, supplier: { active: true } },
      select: publicProductSelect,
    });
    if (!p) throw new NotFoundException('Không tìm thấy dịch vụ');
    return toPublic(p);
  }
}

function toPublic<T extends { supplier: { mode: string } }>(p: T) {
  const { supplier, ...rest } = p;
  return { ...rest, instantConfirm: supplier.mode === 'API' };
}
