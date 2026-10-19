'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';
import { dateTime, paxLabel, paymentStatusLabel, vnd } from '@/lib/format';
import type { PaxType } from '@/lib/types';

interface AdminOrder {
  code: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  refundAmount: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  partnerUserId: string;
  createdAt: string;
  paidAt: string | null;
  partner: { code: string; name: string; commissionBps: number };
  items: {
    id: string;
    status: string;
    flightNumber: string;
    serviceTime: string;
    amount: number;
    netAmount: number;
    voucherCode: string | null;
    supplierRef: string | null;
    failureReason: string | null;
    passengers: { fullName: string; type: PaxType }[];
    task: { status: string; assignee: string | null; dueAt: string } | null;
    product: { name: string; airportCode: string; terminal: string; supplier: { name: string; mode: string } };
  }[];
  payments: { provider: string; providerRef: string; amount: number; status: string; refunded: number; createdAt: string }[];
  events: { id: string; type: string; message: string; actor: string; createdAt: string }[];
}

const CANCELLABLE = ['PROCESSING', 'CONFIRMED', 'PARTIALLY_CONFIRMED'];

export default function AdminOrderDetail() {
  const { code } = useParams<{ code: string }>();
  const [o, setO] = useState<AdminOrder | null>(null);
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => api<AdminOrder>(`/admin/orders/${code}`).then(setO).catch((e) => setError(e.message)), [code]);
  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Hủy đơn ${code}${refund ? ' và hoàn tiền' : ''}?`)) return;
    try {
      await api(`/admin/orders/${code}/cancel`, { body: { refund, reason } });
      setReason('');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (error && !o) return <p className="text-rose-600">{error}</p>;
  if (!o) return null;

  const net = o.items.reduce((s, i) => s + i.netAmount, 0);
  const commission = Math.round((o.totalAmount * o.partner.commissionBps) / 10_000);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{o.code}</h1>
        <StatusBadge status={o.status} />
        <span className="text-sm text-slate-500">{paymentStatusLabel[o.paymentStatus]}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card text-sm">
          <h2 className="mb-2 font-semibold">Khách hàng</h2>
          <div>{o.contactName}</div>
          <div>{o.contactPhone}</div>
          <div>{o.contactEmail}</div>
          <div className="mt-2 text-slate-500">{o.partner.name} · user {o.partnerUserId}</div>
        </div>
        <div className="card text-sm">
          <h2 className="mb-2 font-semibold">Tài chính</h2>
          <div className="flex justify-between"><span>Doanh thu</span><b>{vnd(o.totalAmount)}</b></div>
          <div className="flex justify-between"><span>Giá net NCC</span><span>{vnd(net)}</span></div>
          <div className="flex justify-between"><span>Hoa hồng đối tác ({o.partner.commissionBps / 100}%)</span><span>{vnd(commission)}</span></div>
          <div className="flex justify-between"><span>Đã hoàn</span><span>{vnd(o.refundAmount)}</span></div>
        </div>
        <div className="card text-sm">
          <h2 className="mb-2 font-semibold">Thanh toán</h2>
          {o.payments.map((p) => (
            <div key={p.providerRef} className="mb-1">
              <span className="font-mono">{p.providerRef}</span> · {p.provider} · {p.status}
              {p.refunded > 0 && <span className="text-rose-600"> · hoàn {vnd(p.refunded)}</span>}
            </div>
          ))}
          <div className="text-slate-500">Tạo {dateTime(o.createdAt)}{o.paidAt && ` · Trả ${dateTime(o.paidAt)}`}</div>
        </div>
      </div>

      {o.items.map((i) => (
        <div key={i.id} className="card text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{i.product.airportCode} · {i.product.name}</h3>
            <StatusBadge status={i.status} item />
          </div>
          <div className="mt-1 text-slate-500">
            {i.flightNumber} · {dateTime(i.serviceTime)} · NCC {i.product.supplier.name} ({i.product.supplier.mode})
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <ul>{i.passengers.map((p, idx) => <li key={idx}>{p.fullName} <span className="text-slate-500">— {paxLabel[p.type]}</span></li>)}</ul>
            <div>
              <div>Voucher: <b className="font-mono">{i.voucherCode ?? '—'}</b></div>
              <div>Mã NCC: <span className="font-mono">{i.supplierRef ?? '—'}</span></div>
              {i.failureReason && <div className="text-rose-600">{i.failureReason}</div>}
            </div>
            <div>
              <div>Bán {vnd(i.amount)} · Net {vnd(i.netAmount)}</div>
              {i.task && <div className="text-slate-500">Task: {i.task.status}{i.task.assignee && ` · ${i.task.assignee}`}</div>}
            </div>
          </div>
        </div>
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card text-sm">
          <h2 className="mb-2 font-semibold">Nhật ký</h2>
          <ol className="space-y-1.5">
            {o.events.map((e) => (
              <li key={e.id}>
                <span className="text-slate-500">{dateTime(e.createdAt)}</span> · <b>{e.type}</b> — {e.message}
                {e.actor !== 'system' && <span className="text-slate-500"> ({e.actor})</span>}
              </li>
            ))}
          </ol>
        </div>

        {CANCELLABLE.includes(o.status) && (
          <form onSubmit={cancel} className="card space-y-2 text-sm">
            <h2 className="font-semibold">Hủy đơn</h2>
            <input className="input py-2" required placeholder="Lý do (khách đổi lịch, chuyến bay hủy…)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
              Hoàn tiền phần còn lại cho khách
            </label>
            <p className="text-xs text-slate-500">Kiểm tra điều kiện hủy miễn phí của từng dịch vụ trước khi chọn hoàn tiền.</p>
            {error && <p className="text-rose-600">{error}</p>}
            <button className="btn py-2 bg-rose-600 text-white">Hủy đơn</button>
          </form>
        )}
      </div>
    </div>
  );
}
