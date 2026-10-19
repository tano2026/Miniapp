'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';
import { dateTime, orderStatusLabel, vnd } from '@/lib/format';

interface Row {
  code: string;
  status: string;
  totalAmount: number;
  refundAmount: number;
  contactName: string;
  contactPhone: string;
  createdAt: string;
  partner: { code: string; name: string };
  items: { status: string; flightNumber: string; serviceTime: string; product: { name: string; airportCode: string } }[];
}

function Orders() {
  const params = useSearchParams();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState(params.get('q') ?? '');
  const status = params.get('status') ?? '';

  useEffect(() => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (params.get('q')) qs.set('q', params.get('q')!);
    api<Row[]>(`/admin/orders?${qs}`).then(setRows).catch(() => setRows([]));
  }, [params, status]);

  const go = (next: Record<string, string>) => {
    const qs = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => (v ? qs.set(k, v) : qs.delete(k)));
    router.replace(`/admin/orders?${qs}`);
  };

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Đơn hàng</h1>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); go({ q }); }}>
        <input className="input max-w-xs py-2" placeholder="Mã đơn, SĐT, email, chuyến bay" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[220px] py-2" value={status} onChange={(e) => go({ status: e.target.value })}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(orderStatusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn py-2 bg-slate-900 text-white">Tìm</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Mã đơn</th><th className="p-3">Dịch vụ</th><th className="p-3">Khách</th>
              <th className="p-3">Đối tác</th><th className="p-3 text-right">Tiền</th><th className="p-3">Trạng thái</th><th className="p-3">Tạo lúc</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.code} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-mono"><Link className="text-blue-600" href={`/admin/orders/${r.code}`}>{r.code}</Link></td>
                <td className="p-3">
                  {r.items.map((i, idx) => (
                    <div key={idx}>{i.product.airportCode} · {i.product.name} <span className="text-slate-500">({i.flightNumber} {dateTime(i.serviceTime)})</span></div>
                  ))}
                </td>
                <td className="p-3">{r.contactName}<div className="text-slate-500">{r.contactPhone}</div></td>
                <td className="p-3">{r.partner.code}</td>
                <td className="p-3 text-right tabular-nums">
                  {vnd(r.totalAmount)}
                  {r.refundAmount > 0 && <div className="text-xs text-rose-600">hoàn {vnd(r.refundAmount)}</div>}
                </td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
                <td className="p-3 text-slate-500">{dateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows?.length === 0 && <p className="p-6 text-center text-slate-500">Không có đơn nào.</p>}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Orders />
    </Suspense>
  );
}
