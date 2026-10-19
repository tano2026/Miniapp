'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { directionLabel, productTypeLabel, scopeLabel, vnd } from '@/lib/format';
import type { Direction, FlightScope, ProductType } from '@/lib/types';
import { useAdmin } from '../admin-context';

interface Row {
  id: string;
  type: ProductType;
  airportCode: string;
  terminal: string;
  scope: FlightScope;
  direction: Direction;
  name: string;
  priceAdult: number;
  netAdult: number;
  leadTimeHours: number;
  active: boolean;
  supplier: { name: string; mode: string };
}

export default function ProductsPage() {
  const admin = useAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    api<Row[]>('/admin/products').then(setRows).catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sản phẩm</h1>
        {admin.role === 'ADMIN' && <Link href="/admin/products/new" className="btn py-2 bg-slate-900 text-white">+ Thêm sản phẩm</Link>}
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Sân bay</th><th className="p-3">Dịch vụ</th><th className="p-3">NCC</th>
              <th className="p-3 text-right">Giá bán NL</th><th className="p-3 text-right">Biên</th>
              <th className="p-3">Đặt trước</th><th className="p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-3">{r.airportCode} · {r.terminal}</td>
                <td className="p-3">
                  <Link href={`/admin/products/${r.id}`} className="text-blue-600">{r.name}</Link>
                  <div className="text-xs text-slate-500">
                    {productTypeLabel[r.type]} · {scopeLabel[r.scope]}{r.type === 'FAST_TRACK' && ` · ${directionLabel[r.direction]}`}
                  </div>
                </td>
                <td className="p-3">{r.supplier.name}<div className="text-xs text-slate-500">{r.supplier.mode}</div></td>
                <td className="p-3 text-right tabular-nums">{vnd(r.priceAdult)}</td>
                <td className="p-3 text-right tabular-nums">
                  {r.priceAdult ? `${Math.round(((r.priceAdult - r.netAdult) / r.priceAdult) * 100)}%` : '—'}
                </td>
                <td className="p-3">{r.leadTimeHours}h</td>
                <td className="p-3">{r.active ? <span className="text-emerald-700">Đang bán</span> : <span className="text-slate-400">Tạm ẩn</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
