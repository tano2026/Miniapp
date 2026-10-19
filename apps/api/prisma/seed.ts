/**
 * Dữ liệu mẫu để chạy thử. Tên, giá, giờ mở cửa chỉ mang tính minh họa —
 * thay bằng dữ liệu thật từ hợp đồng nhà cung cấp trước khi mở bán.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const airports = [
  { code: 'SGN', name: 'Sân bay quốc tế Tân Sơn Nhất', city: 'TP. Hồ Chí Minh' },
  { code: 'HAN', name: 'Sân bay quốc tế Nội Bài', city: 'Hà Nội' },
  { code: 'DAD', name: 'Sân bay quốc tế Đà Nẵng', city: 'Đà Nẵng' },
  { code: 'CXR', name: 'Sân bay quốc tế Cam Ranh', city: 'Khánh Hòa' },
  { code: 'PQC', name: 'Sân bay quốc tế Phú Quốc', city: 'Phú Quốc' },
];

const LOUNGE_AMENITIES = ['Buffet đồ ăn nhẹ', 'Đồ uống & cà phê', 'Wi-Fi tốc độ cao', 'Ghế nghỉ, ổ cắm sạc', 'Nhà vệ sinh riêng'];
const FT_DEP = ['Làn check-in ưu tiên', 'Làn an ninh ưu tiên', 'Nhân viên đón & hỗ trợ thủ tục'];
const FT_DEP_INTL = [...FT_DEP, 'Làn xuất cảnh ưu tiên'];
const FT_ARR_INTL = ['Nhân viên đón tại cửa máy bay', 'Làn nhập cảnh ưu tiên', 'Hỗ trợ nhận hành lý'];

type Seed = Omit<Prisma.ProductUncheckedCreateInput, 'supplierId'> & { supplier: 'manual' | 'api' };

function lounge(p: Partial<Seed> & Pick<Seed, 'airportCode' | 'terminal' | 'scope' | 'name' | 'supplier'>, price: number): Seed {
  const child = Math.round((price * 0.7) / 1000) * 1000;
  return {
    type: 'LOUNGE',
    direction: 'DEPARTURE',
    shortDescription: 'Nghỉ ngơi thoải mái trước giờ bay, tối đa 3 giờ',
    description:
      'Phòng chờ dành cho hành khách mọi hạng vé. Xuất trình mã voucher và thẻ lên máy bay tại quầy lễ tân. ' +
      'Thời gian sử dụng tối đa 3 giờ trước giờ khởi hành. Trẻ em dưới 2 tuổi miễn phí.',
    amenities: LOUNGE_AMENITIES,
    openingHours: '05:00 – 23:00',
    maxStayHours: 3,
    priceAdult: price,
    priceChild: child,
    priceInfant: 0,
    netAdult: Math.round(price * 0.78),
    netChild: Math.round(child * 0.78),
    netInfant: 0,
    leadTimeHours: p.supplier === 'api' ? 3 : 12,
    freeCancelHours: 24,
    ...p,
  };
}

function fastTrack(
  p: Partial<Seed> & Pick<Seed, 'airportCode' | 'terminal' | 'scope' | 'direction' | 'name' | 'supplier'>,
  price: number,
): Seed {
  const arrival = p.direction === 'ARRIVAL';
  const intl = p.scope === 'INTERNATIONAL';
  return {
    type: 'FAST_TRACK',
    shortDescription: arrival ? 'Nhập cảnh nhanh, có người đón tại cửa máy bay' : 'Làm thủ tục nhanh, không xếp hàng',
    description: arrival
      ? 'Nhân viên đón khách tại cửa máy bay với bảng tên, đưa qua làn nhập cảnh ưu tiên và hỗ trợ nhận hành lý. ' +
        'Khách cần có visa/miễn thị thực hợp lệ — dịch vụ không thay thế thủ tục nhập cảnh.'
      : 'Nhân viên đón tại khu vực check-in theo giờ hẹn, hỗ trợ làm thủ tục qua các làn ưu tiên' +
        (intl ? ' gồm cả xuất cảnh.' : '.') +
        ' Có mặt tại điểm hẹn trước giờ bay ít nhất 90 phút (quốc tế 120 phút).',
    amenities: arrival ? FT_ARR_INTL : intl ? FT_DEP_INTL : FT_DEP,
    priceAdult: price,
    priceChild: price,
    priceInfant: 0,
    netAdult: Math.round(price * 0.75),
    netChild: Math.round(price * 0.75),
    netInfant: 0,
    leadTimeHours: p.supplier === 'api' ? 4 : 24,
    freeCancelHours: 24,
    ...p,
  };
}

const products: Seed[] = [
  // SGN
  lounge({ airportCode: 'SGN', terminal: 'T1', scope: 'DOMESTIC', name: 'Phòng chờ thương gia — Ga nội địa T1', supplier: 'manual', sortOrder: 1 }, 450_000),
  lounge({ airportCode: 'SGN', terminal: 'T1', scope: 'DOMESTIC', name: 'Phòng chờ Premium — Ga nội địa T1', supplier: 'api', supplierProductCode: 'SGN-T1-PREM', sortOrder: 2 }, 590_000),
  lounge({ airportCode: 'SGN', terminal: 'T2', scope: 'INTERNATIONAL', name: 'Phòng chờ thương gia — Ga quốc tế T2', supplier: 'api', supplierProductCode: 'SGN-T2-BIZ', sortOrder: 1 }, 790_000),
  fastTrack({ airportCode: 'SGN', terminal: 'T1', scope: 'DOMESTIC', direction: 'DEPARTURE', name: 'Fast Track khởi hành — Ga nội địa T1', supplier: 'manual' }, 350_000),
  fastTrack({ airportCode: 'SGN', terminal: 'T2', scope: 'INTERNATIONAL', direction: 'DEPARTURE', name: 'Fast Track xuất cảnh — Ga quốc tế T2', supplier: 'manual' }, 690_000),
  fastTrack({ airportCode: 'SGN', terminal: 'T2', scope: 'INTERNATIONAL', direction: 'ARRIVAL', name: 'Fast Track nhập cảnh — Ga quốc tế T2', supplier: 'api', supplierProductCode: 'SGN-T2-FT-ARR' }, 790_000),
  // HAN
  lounge({ airportCode: 'HAN', terminal: 'T1', scope: 'DOMESTIC', name: 'Phòng chờ thương gia — Ga nội địa T1', supplier: 'manual' }, 450_000),
  lounge({ airportCode: 'HAN', terminal: 'T2', scope: 'INTERNATIONAL', name: 'Phòng chờ thương gia — Ga quốc tế T2', supplier: 'api', supplierProductCode: 'HAN-T2-BIZ' }, 790_000),
  fastTrack({ airportCode: 'HAN', terminal: 'T1', scope: 'DOMESTIC', direction: 'DEPARTURE', name: 'Fast Track khởi hành — Ga nội địa T1', supplier: 'manual' }, 350_000),
  fastTrack({ airportCode: 'HAN', terminal: 'T2', scope: 'INTERNATIONAL', direction: 'DEPARTURE', name: 'Fast Track xuất cảnh — Ga quốc tế T2', supplier: 'manual' }, 690_000),
  fastTrack({ airportCode: 'HAN', terminal: 'T2', scope: 'INTERNATIONAL', direction: 'ARRIVAL', name: 'Fast Track nhập cảnh — Ga quốc tế T2', supplier: 'manual' }, 790_000),
  // DAD
  lounge({ airportCode: 'DAD', terminal: 'T1', scope: 'DOMESTIC', name: 'Phòng chờ thương gia — Ga nội địa', supplier: 'manual' }, 400_000),
  lounge({ airportCode: 'DAD', terminal: 'T2', scope: 'INTERNATIONAL', name: 'Phòng chờ thương gia — Ga quốc tế', supplier: 'api', supplierProductCode: 'DAD-T2-BIZ' }, 690_000),
  fastTrack({ airportCode: 'DAD', terminal: 'T2', scope: 'INTERNATIONAL', direction: 'ARRIVAL', name: 'Fast Track nhập cảnh — Ga quốc tế', supplier: 'manual' }, 690_000),
  // CXR
  lounge({ airportCode: 'CXR', terminal: 'T1', scope: 'DOMESTIC', name: 'Phòng chờ thương gia — Ga nội địa', supplier: 'manual' }, 390_000),
  fastTrack({ airportCode: 'CXR', terminal: 'T2', scope: 'INTERNATIONAL', direction: 'ARRIVAL', name: 'Fast Track nhập cảnh — Ga quốc tế', supplier: 'manual' }, 650_000),
  // PQC
  lounge({ airportCode: 'PQC', terminal: 'Chính', scope: 'DOMESTIC', name: 'Phòng chờ thương gia — Khu nội địa', supplier: 'manual' }, 390_000),
  fastTrack({ airportCode: 'PQC', terminal: 'Chính', scope: 'INTERNATIONAL', direction: 'ARRIVAL', name: 'Fast Track nhập cảnh — Khu quốc tế', supplier: 'api', supplierProductCode: 'PQC-FT-ARR' }, 650_000),
];

async function main() {
  for (const a of airports) {
    await prisma.airport.upsert({ where: { code: a.code }, create: a, update: a });
  }

  const manual =
    (await prisma.supplier.findFirst({ where: { adapterKey: 'manual' } })) ??
    (await prisma.supplier.create({
      data: { name: 'NCC dịch vụ mặt đất (ký trực tiếp)', mode: 'MANUAL', adapterKey: 'manual', contactEmail: 'booking@ncc-mau.vn', contactPhone: '0900000000' },
    }));
  const api =
    (await prisma.supplier.findFirst({ where: { adapterKey: 'mock-aggregator' } })) ??
    (await prisma.supplier.create({
      data: { name: 'Aggregator mẫu (giả lập API)', mode: 'API', adapterKey: 'mock-aggregator' },
    }));

  if ((await prisma.product.count()) === 0) {
    for (const { supplier, ...p } of products) {
      await prisma.product.create({ data: { ...p, supplierId: supplier === 'api' ? api.id : manual.id } });
    }
  }

  const partners = [
    { code: 'DEMO', name: 'Ngân hàng Demo', ssoSecret: 'demo-sso-secret', commissionBps: 300, primaryColor: '#0B5FFF' },
    { code: 'WALLETX', name: 'Ví X', ssoSecret: 'walletx-sso-secret', commissionBps: 500, primaryColor: '#C2185B' },
  ];
  for (const p of partners) {
    await prisma.partner.upsert({ where: { code: p.code }, create: p, update: {} });
  }

  const admins = [
    { email: 'admin@demo.vn', name: 'Quản trị', role: 'ADMIN', password: 'Admin@123' },
    { email: 'ops@demo.vn', name: 'Nhân viên Ops', role: 'OPS', password: 'Ops@12345' },
  ];
  for (const { password, ...a } of admins) {
    await prisma.adminUser.upsert({
      where: { email: a.email },
      create: { ...a, passwordHash: await bcrypt.hash(password, 10) },
      update: {},
    });
  }

  console.log(`Seeded ${airports.length} airports, ${await prisma.product.count()} products, ${partners.length} partners`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
