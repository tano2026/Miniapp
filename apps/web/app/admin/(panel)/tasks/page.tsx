'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { dateTime, directionLabel, paxLabel, productTypeLabel } from '@/lib/format';
import type { Direction, PaxType, ProductType } from '@/lib/types';

interface Task {
  id: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'FAILED';
  assignee: string | null;
  dueAt: string;
  note: string | null;
  item: {
    flightNumber: string;
    serviceTime: string;
    passengers: { fullName: string; type: PaxType }[];
    order: { code: string; contactName: string; contactPhone: string; contactEmail: string };
    product: {
      name: string;
      type: ProductType;
      airportCode: string;
      terminal: string;
      direction: Direction;
      supplierProductCode: string | null;
      supplier: { name: string; contactEmail: string | null; contactPhone: string | null };
    };
  };
}

/** Nội dung soạn sẵn để ops dán vào email/Zalo gửi nhà cung cấp. */
function supplierMessage(t: Task) {
  const { item } = t;
  const p = item.product;
  return [
    `Đặt dịch vụ: ${p.name}${p.supplierProductCode ? ` [${p.supplierProductCode}]` : ''}`,
    `Sân bay: ${p.airportCode} – Nhà ga ${p.terminal} – ${directionLabel[p.direction]}`,
    `Chuyến bay: ${item.flightNumber} – ${p.direction === 'ARRIVAL' ? 'hạ cánh' : 'cất cánh'} ${dateTime(item.serviceTime)}`,
    `Hành khách (${item.passengers.length}):`,
    ...item.passengers.map((x, i) => `  ${i + 1}. ${x.fullName} (${paxLabel[x.type]})`),
    `Liên hệ khách: ${item.order.contactName} – ${item.order.contactPhone}`,
    `Mã tham chiếu: ${item.order.code}`,
  ].join('\n');
}

function TaskCard({ t, onChange }: { t: Task; onChange: () => void }) {
  const [voucher, setVoucher] = useState('');
  const [supplierRef, setSupplierRef] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const overdue = new Date(t.dueAt).getTime() < Date.now();

  const act = async (path: string, body: object) => {
    setError('');
    try {
      await api(`/admin/tasks/${t.id}/${path}`, { body });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const fail = () => {
    const reason = window.prompt('Lý do không xác nhận được (sẽ hoàn tiền dịch vụ này cho khách):');
    if (reason?.trim()) act('fail', { reason: reason.trim() });
  };

  const copy = async () => {
    await navigator.clipboard.writeText(supplierMessage(t));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`card ${overdue ? 'ring-2 ring-rose-400' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">
            {productTypeLabel[t.item.product.type]} · {t.item.product.supplier.name}
          </div>
          <div className="font-semibold">{t.item.product.name}</div>
          <Link href={`/admin/orders/${t.item.order.code}`} className="font-mono text-sm text-blue-600">
            {t.item.order.code}
          </Link>
        </div>
        <div className="text-right text-sm">
          <div className={overdue ? 'font-semibold text-rose-600' : 'text-slate-600'}>
            Hạn xử lý {dateTime(t.dueAt)} {overdue && '(quá hạn)'}
          </div>
          <div className="text-slate-500">
            {t.status === 'IN_PROGRESS' ? `Đang xử lý: ${t.assignee}` : 'Chưa có người nhận'}
          </div>
        </div>
      </div>

      <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{supplierMessage(t)}</pre>
      {t.note && <p className="mt-2 text-sm text-amber-700">Ghi chú: {t.note}</p>}
      <div className="mt-1 text-xs text-slate-500">
        NCC: {t.item.product.supplier.contactEmail ?? '—'} · {t.item.product.supplier.contactPhone ?? '—'}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={copy} className="btn-ghost py-2 text-sm">{copied ? 'Đã copy' : 'Copy nội dung gửi NCC'}</button>
        {t.status === 'OPEN' && (
          <button onClick={() => act('claim', {})} className="btn py-2 text-sm bg-slate-900 text-white">Nhận xử lý</button>
        )}
      </div>

      <form
        className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          act('complete', { voucherCode: voucher, supplierRef: supplierRef || undefined });
        }}
      >
        <div>
          <label className="label">Mã voucher / xác nhận *</label>
          <input className="input py-2" required value={voucher} onChange={(e) => setVoucher(e.target.value)} />
        </div>
        <div>
          <label className="label">Mã tham chiếu NCC</label>
          <input className="input py-2" value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} />
        </div>
        <button className="btn py-2 text-sm bg-emerald-600 text-white">Xác nhận</button>
        <button type="button" onClick={fail} className="btn py-2 text-sm border border-rose-300 text-rose-700">
          NCC từ chối
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const load = useCallback(() => api<Task[]>('/admin/tasks').then(setTasks).catch(() => setTasks([])), []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Hàng đợi xử lý với nhà cung cấp</h1>
      <p className="text-sm text-slate-500">
        Dịch vụ của NCC chưa có API. Gửi yêu cầu cho NCC, nhận mã xác nhận rồi nhập vào đây — khách nhận voucher ngay.
      </p>
      {tasks?.length === 0 && <p className="card text-center text-slate-500">Không còn việc nào 🎉</p>}
      {tasks?.map((t) => <TaskCard key={t.id} t={t} onChange={load} />)}
    </div>
  );
}
