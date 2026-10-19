'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { orderStatusLabel, vnd } from '@/lib/format';

interface Stats {
  openTasks: number;
  overdueTasks: number;
  processing: number;
  today: { orders: number; revenue: number; grossProfit: number };
  byStatus: Record<string, number>;
}

export default function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    const load = () => api<Stats>('/admin/stats').then(setS).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);
  if (!s) return null;

  const tiles = [
    { label: 'Việc chờ xử lý', value: s.openTasks, href: '/admin/tasks', alert: s.openTasks > 0 },
    { label: 'Việc quá hạn', value: s.overdueTasks, href: '/admin/tasks', alert: s.overdueTasks > 0 },
    { label: 'Đơn đang xác nhận', value: s.processing, href: '/admin/orders?status=PROCESSING' },
    { label: 'Đơn đã thanh toán hôm nay', value: s.today.orders, href: '/admin/orders' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`card ${t.alert ? 'ring-2 ring-amber-400' : ''}`}>
            <div className="text-sm text-slate-500">{t.label}</div>
            <div className="text-3xl font-bold tabular-nums">{t.value}</div>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <div className="text-sm text-slate-500">Doanh thu hôm nay (đã trừ hoàn)</div>
          <div className="text-2xl font-bold">{vnd(s.today.revenue)}</div>
          <div className="mt-1 text-sm text-slate-500">Lãi gộp dịch vụ đã xác nhận: {vnd(s.today.grossProfit)}</div>
        </div>
        <div className="card">
          <div className="mb-2 text-sm text-slate-500">Đơn theo trạng thái</div>
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {Object.entries(s.byStatus).map(([k, v]) => (
              <li key={k} className="flex justify-between pr-4"><span>{orderStatusLabel[k] ?? k}</span><b>{v}</b></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
