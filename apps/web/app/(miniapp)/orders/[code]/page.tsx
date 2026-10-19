'use client';

import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { RequireSession } from '@/components/session';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';
import { dateTime, paxLabel, paymentStatusLabel, vnd } from '@/lib/format';
import type { Order } from '@/lib/types';

// Đơn ở các trạng thái này còn có thể thay đổi -> tự cập nhật.
const LIVE = ['PENDING_PAYMENT', 'PROCESSING'];

function OrderDetail({ code }: { code: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api<Order>(`/orders/${code}`).then(setOrder).catch((e) => setError(e.message)), [code]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!order || !LIVE.includes(order.status)) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [order, load]);

  if (error) return <p className="card m-4 text-center text-rose-600">{error}</p>;
  if (!order) return <p className="p-8 text-center text-slate-400">Đang tải…</p>;

  return (
    <div className="space-y-4 p-4">
      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Mã đơn hàng</div>
            <div className="font-mono text-lg font-bold">{order.code}</div>
          </div>
          <StatusBadge status={order.status} />
        </div>
        {order.status === 'PROCESSING' && (
          <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">
            Đã nhận thanh toán. Chúng tôi đang xác nhận với nhà cung cấp, bạn sẽ nhận voucher qua SMS/email.
          </p>
        )}
        {order.status === 'PENDING_PAYMENT' && order.paymentUrl && (
          <a href={order.paymentUrl} className="btn-primary mt-3 w-full">
            Tiếp tục thanh toán · hạn {dateTime(order.expiresAt)}
          </a>
        )}
      </section>

      {order.items.map((i) => (
        <section key={i.id} className="card">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-snug">{i.product.name}</h3>
            <StatusBadge status={i.status} item />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {i.product.airportCode} · Nhà ga {i.product.terminal} · Chuyến {i.flightNumber} · {dateTime(i.serviceTime)}
          </p>

          {i.voucherCode && (
            <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
              <QRCodeSVG value={i.voucherCode} size={160} />
              <div className="mt-2 font-mono text-lg font-bold tracking-wider">{i.voucherCode}</div>
              <p className="mt-1 text-center text-xs text-slate-500">
                {i.product.type === 'LOUNGE'
                  ? 'Xuất trình mã này cùng thẻ lên máy bay tại quầy lễ tân phòng chờ.'
                  : i.product.direction === 'ARRIVAL'
                    ? 'Nhân viên sẽ đón bạn tại cửa máy bay với bảng tên.'
                    : 'Xuất trình mã tại điểm hẹn Fast Track trước giờ bay ít nhất 90 phút.'}
              </p>
            </div>
          )}
          {i.failureReason && i.status === 'FAILED' && (
            <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{i.failureReason} — tiền dịch vụ này đã được hoàn.</p>
          )}

          <ul className="mt-3 space-y-1 text-sm">
            {i.passengers.map((p, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{p.fullName}</span>
                <span className="text-slate-500">{paxLabel[p.type]}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm">
            <span className="text-slate-500">Hủy miễn phí trước {i.product.freeCancelHours} giờ</span>
            <span className="font-semibold">{vnd(i.amount)}</span>
          </div>
        </section>
      ))}

      <section className="card space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Tổng tiền</span><span className="font-semibold">{vnd(order.totalAmount)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Thanh toán</span><span>{paymentStatusLabel[order.paymentStatus]}</span></div>
        {order.refundAmount > 0 && (
          <div className="flex justify-between"><span className="text-slate-500">Đã hoàn</span><span>{vnd(order.refundAmount)}</span></div>
        )}
        <div className="flex justify-between"><span className="text-slate-500">Liên hệ</span><span>{order.contactPhone}</span></div>
      </section>
    </div>
  );
}

export default function OrderPage() {
  const { code } = useParams<{ code: string }>();
  return (
    <>
      <Header title="Chi tiết đơn" />
      <RequireSession>{() => <OrderDetail code={code} />}</RequireSession>
    </>
  );
}
