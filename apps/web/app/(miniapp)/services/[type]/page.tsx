'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { ServiceIcon } from '@/components/icons';
import { api } from '@/lib/api';
import { directionLabel, productTypeLabel, scopeLabel, vnd } from '@/lib/format';
import type { Airport, Direction, FlightScope, Product, ProductType } from '@/lib/types';

function ServiceList() {
  const { type } = useParams<{ type: ProductType }>();
  const params = useSearchParams();
  const router = useRouter();
  const airport = params.get('airport') ?? 'SGN';
  const scope = (params.get('scope') as FlightScope | null) ?? '';
  const direction = (params.get('direction') as Direction | null) ?? '';

  const [airports, setAirports] = useState<Airport[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    api<Airport[]>('/airports').then(setAirports).catch(() => {});
  }, []);

  useEffect(() => {
    setProducts(null);
    const q = new URLSearchParams({ type, airport, ...(scope && { scope }), ...(direction && { direction }) });
    api<Product[]>(`/products?${q}`).then(setProducts).catch(() => setProducts([]));
  }, [type, airport, scope, direction]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`?${next}`, { scroll: false });
  };

  const chip = (active: boolean) =>
    `chip ${active ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-slate-700'}`;

  return (
    <>
      <Header title={productTypeLabel[type] ?? 'Dịch vụ'} />
      <div className="space-y-2 bg-white px-4 py-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {airports.map((a) => (
            <button key={a.code} className={chip(a.code === airport)} onClick={() => setParam('airport', a.code)}>
              {a.city}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(['', 'DOMESTIC', 'INTERNATIONAL'] as const).map((s) => (
            <button key={s} className={chip(scope === s)} onClick={() => setParam('scope', s)}>
              {s ? `Chuyến ${scopeLabel[s].toLowerCase()}` : 'Tất cả'}
            </button>
          ))}
          {type === 'FAST_TRACK' &&
            (['DEPARTURE', 'ARRIVAL'] as const).map((d) => (
              <button key={d} className={chip(direction === d)} onClick={() => setParam('direction', direction === d ? '' : d)}>
                {directionLabel[d]}
              </button>
            ))}
        </div>
      </div>

      <div className="space-y-3 p-4">
        {products === null && <p className="py-8 text-center text-slate-400">Đang tải…</p>}
        {products?.length === 0 && (
          <p className="card text-center text-slate-500">Chưa có dịch vụ phù hợp tại sân bay này.</p>
        )}
        {products?.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="card block active:bg-slate-50">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ServiceIcon type={p.type} className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold leading-snug">{p.name}</div>
                <div className="mt-0.5 text-sm text-slate-500">{p.shortDescription}</div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">{scopeLabel[p.scope]}</span>
                  {p.type === 'FAST_TRACK' && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">{directionLabel[p.direction]}</span>
                  )}
                  {p.instantConfirm ? (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">⚡ Xác nhận tức thì</span>
                  ) : (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Xác nhận trong 2 giờ</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">Đặt trước tối thiểu {p.leadTimeHours} giờ</span>
              <span className="text-right">
                <span className="text-xs text-slate-500">từ </span>
                <span className="text-lg font-bold text-primary">{vnd(p.priceAdult)}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ServiceList />
    </Suspense>
  );
}
