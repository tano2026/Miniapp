'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { RequireSession } from '@/components/session';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';
import { dateTime, vnd } from '@/lib/format';
import type { Order } from '@/lib/types';

function OrderList() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    api<Order[]>('/orders').then(setOrders).catch(() => setOrders([]));
  }, []);

  if (!orders) return <p className="p-8 text-center text-slate-400">Đang tải…</p>;
  if (!orders.length) return <p className="card m-4 text-center text-slate-500">Bạn chưa có đơn hàng nào.</p>;

  return (
    <div className="space-y-3 p-4">
      {orders.map((o) => (
        <Link key={o.code} href={`/orders/${o.code}`} className="card block active:bg-slate-50">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-semibold">{o.code}</span>
            <StatusBadge status={o.status} />
          </div>
          {o.items.map((i) => (
            <div key={i.id} className="mt-2 text-sm">
              <div className="font-medium">{i.product.name}</div>
              <div className="text-slate-500">{i.flightNumber} · {dateTime(i.serviceTime)}</div>
            </div>
          ))}
          <div className="mt-2 text-right font-semibold">{vnd(o.totalAmount)}</div>
        </Link>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <>
      <Header title="Đơn hàng của tôi" />
      <RequireSession>{() => <OrderList />}</RequireSession>
    </>
  );
}
