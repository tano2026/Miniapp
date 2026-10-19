import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/** Ghi nhật ký đơn hàng — hiển thị ở màn hình chi tiết đơn của ops. */
export function logEvent(db: Db, orderId: string, type: string, message: string, actor = 'system') {
  return db.orderEvent.create({ data: { orderId, type, message, actor } });
}
