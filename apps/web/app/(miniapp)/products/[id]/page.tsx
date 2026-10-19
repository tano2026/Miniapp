'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookingForm } from './booking-form';
import { Header } from '@/components/header';
import { api } from '@/lib/api';
import { directionLabel, scopeLabel, vnd } from '@/lib/format';
import type { Product } from '@/lib/types';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Product>(`/products/${id}`).then(setProduct).catch((e) => setError(e.message));
  }, [id]);

  if (error) return (<><Header title="Dịch vụ" /><p className="card m-4 text-center text-rose-600">{error}</p></>);
  if (!product) return (<><Header title="Dịch vụ" /><p className="p-8 text-center text-slate-400">Đang tải…</p></>);

  const p = product;
  return (
    <>
      <Header title={p.type === 'LOUNGE' ? 'Phòng chờ' : 'Fast Track'} />
      <div className="space-y-4 p-4">
        <section className="card">
          <h2 className="text-lg font-semibold leading-snug">{p.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {p.airport.name} · Nhà ga {p.terminal} · {scopeLabel[p.scope]}
            {p.type === 'FAST_TRACK' && ` · ${directionLabel[p.direction]}`}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{p.description}</p>
          <ul className="mt-3 grid grid-cols-1 gap-1 text-sm">
            {p.amenities.map((a) => (
              <li key={a} className="flex gap-2"><span className="text-primary">✓</span>{a}</li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
            {p.openingHours && (<div><dt className="text-slate-500">Giờ mở cửa</dt><dd className="font-medium">{p.openingHours}</dd></div>)}
            {p.maxStayHours && (<div><dt className="text-slate-500">Thời gian sử dụng</dt><dd className="font-medium">Tối đa {p.maxStayHours} giờ</dd></div>)}
            <div><dt className="text-slate-500">Xác nhận</dt><dd className="font-medium">{p.instantConfirm ? 'Tức thì' : 'Trong vòng 2 giờ'}</dd></div>
            <div><dt className="text-slate-500">Hủy miễn phí</dt><dd className="font-medium">Trước {p.freeCancelHours} giờ</dd></div>
          </dl>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-sm">
            <div><div className="text-slate-500">Người lớn</div><div className="font-semibold">{vnd(p.priceAdult)}</div></div>
            <div><div className="text-slate-500">Trẻ em</div><div className="font-semibold">{vnd(p.priceChild)}</div></div>
            <div><div className="text-slate-500">Em bé</div><div className="font-semibold">{vnd(p.priceInfant)}</div></div>
          </div>
        </section>

        <BookingForm product={p} />
      </div>
    </>
  );
}
