import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard, Roles } from '../auth/guards';
import { PrismaService } from '../prisma/prisma.service';
import { ProductDto } from './admin.dto';

@Controller('admin/products')
@UseGuards(AdminGuard)
export class AdminProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.product.findMany({
      orderBy: [{ airportCode: 'asc' }, { type: 'asc' }, { sortOrder: 'asc' }],
      include: { supplier: { select: { name: true, mode: true } } },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    return p;
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: ProductDto) {
    await this.validate(dto);
    return this.prisma.product.create({ data: dto });
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: ProductDto) {
    await this.validate(dto);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  private async validate(dto: ProductDto) {
    if (dto.type === 'LOUNGE' && dto.direction !== 'DEPARTURE') {
      throw new BadRequestException('Phòng chờ chỉ áp dụng chiều đi');
    }
    for (const t of ['Adult', 'Child', 'Infant'] as const) {
      if (dto[`price${t}`] < dto[`net${t}`]) throw new BadRequestException(`Giá bán ${t} thấp hơn giá net`);
    }
    const [airport, supplier] = await Promise.all([
      this.prisma.airport.findUnique({ where: { code: dto.airportCode } }),
      this.prisma.supplier.findUnique({ where: { id: dto.supplierId } }),
    ]);
    if (!airport) throw new BadRequestException('Sân bay không tồn tại');
    if (!supplier) throw new BadRequestException('Nhà cung cấp không tồn tại');
  }
}
