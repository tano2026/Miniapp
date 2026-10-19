'use client';

import { useMemo, useState } from 'react';
import { RequireSession } from '@/components/session';
import { Stepper } from '@/components/stepper';
import { api } from '@/lib/api';
import { localToIso, paxLabel, vnd } from '@/lib/format';
import type { PaxType, Product, Session } from '@/lib/types';

const MAX_PAX = 9;

/** Thời điểm (giờ VN) dạng yyyy-MM-ddTHH:mm cho thuộc tính min của datetime-local. */
function vnLocal(ms: number) {
  return new Date(ms + 7 * 3_600_000).toISOString().slice(0, 16);
}

function Form({ product: p, session }: { product: Product; session: Session }) {
  const [flightNumber, setFlightNumber] = useState('');
  const [time, setTime] = useState('');
  const [counts, setCounts] = useState<Record<PaxType, number>>({ ADULT: 1, CHILD: 0, INFANT: 0 });
  const [names, setNames] = useState<Record<PaxType, string[]>>({ ADULT: [session.user.name ?? ''], CHILD: [], INFANT: [] });
  const [contact, setContact] = useState({
    name: session.user.name ?? '',
    phone: session.user.phone ?? '',
    email: session.user.email ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const minTime = useMemo(() => vnLocal(Date.now() + p.leadTimeHours * 3_600_000), [p.leadTimeHours]);
  const total = counts.ADULT * p.priceAdult + counts.CHILD * p.priceChild + counts.INFANT * p.priceInfant;
  const totalPax = counts.ADULT + counts.CHILD + counts.INFANT;

  const setCount = (t: PaxType, v: number) => {
    setCounts((c) => ({ ...c, [t]: v }));
    setNames((n) => ({ ...n, [t]: Array.from({ length: v }, (_, i) => n[t][i] ?? '') }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const passengers = (['ADULT', 'CHILD', 'INFANT'] as PaxType[]).flatMap((type) =>
        names[type].map((fullName) => ({ fullName, type })),
      );
      const res = await api<{ code: string; paymentUrl: string }>('/orders', {
        body: {
          contact,
          items: [{
            productId: p.id,
            flightNumber,
            serviceTime: localToIso(time),
            adults: counts.ADULT,
            children: counts.CHILD,
            infants: counts.INFANT,
            passengers,
          }],
        },
      });
      // Chuyển sang cổng thanh toán của đối tác.
      window.location.href = res.paymentUrl;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const timeLabel = p.direction === 'ARRIVAL' ? 'Giờ hạ cánh (giờ VN)' : 'Giờ cất cánh (giờ VN)';

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="card space-y-3">
        <h3 className="font-semibold">Thông tin chuyến bay</h3>
        <div>
          <label className="label" htmlFor="flight">Số hiệu chuyến bay</label>
          <input id="flight" className="input uppercase" placeholder="VD: VN213" required maxLength={8}
            value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="time">{timeLabel}</label>
          <input id="time" type="datetime-local" className="input" required min={minTime}
            value={time} onChange={(e) => setTime(e.target.value)} />
          <p className="mt-1 text-xs text-slate-500">Cần đặt trước giờ bay ít nhất {p.leadTimeHours} giờ.</p>
        </div>
      </section>

      <section className="card">
        <h3 className="mb-1 font-semibold">Số khách</h3>
        <Stepper label="Người lớn" hint={vnd(p.priceAdult)} value={counts.ADULT} min={1}
          max={MAX_PAX - totalPax + counts.ADULT} onChange={(v) => setCount('ADULT', v)} />
        <Stepper label="Trẻ em" hint={`2–11 tuổi · ${vnd(p.priceChild)}`} value={counts.CHILD} min={0}
          max={MAX_PAX - totalPax + counts.CHILD} onChange={(v) => setCount('CHILD', v)} />
        <Stepper label="Em bé" hint={`Dưới 2 tuổi · ${vnd(p.priceInfant)}`} value={counts.INFANT} min={0}
          max={Math.min(counts.ADULT, MAX_PAX - totalPax + counts.INFANT)} onChange={(v) => setCount('INFANT', v)} />
      </section>

      <section className="card space-y-3">
        <h3 className="font-semibold">Họ tên hành khách</h3>
        <p className="-mt-2 text-xs text-slate-500">Ghi đúng như trên giấy tờ tùy thân / hộ chiếu, không dấu.</p>
        {(['ADULT', 'CHILD', 'INFANT'] as PaxType[]).flatMap((type) =>
          names[type].map((value, i) => (
            <div key={`${type}-${i}`}>
              <label className="label">{paxLabel[type]} {i + 1}</label>
              <input className="input uppercase" required maxLength={80} value={value} placeholder="NGUYEN VAN A"
                onChange={(e) => setNames((n) => ({ ...n, [type]: n[type].map((x, j) => (j === i ? e.target.value : x)) }))} />
            </div>
          )),
        )}
      </section>

      <section className="card space-y-3">
        <h3 className="font-semibold">Liên hệ nhận voucher</h3>
        <input className="input" placeholder="Họ tên" required value={contact.name}
          onChange={(e) => setContact({ ...contact, name: e.target.value })} />
        <input className="input" placeholder="Số điện thoại" type="tel" required value={contact.phone}
          onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
        <input className="input" placeholder="Email" type="email" required value={contact.email}
          onChange={(e) => setContact({ ...contact, email: e.target.value })} />
      </section>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-slate-500">Tổng cộng ({totalPax} khách)</span>
          <span className="text-xl font-bold text-primary">{total.toLocaleString('vi-VN')}đ</span>
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Đang tạo đơn…' : 'Thanh toán'}
        </button>
      </div>
    </form>
  );
}

export function BookingForm({ product }: { product: Product }) {
  return <RequireSession>{(s) => <Form product={product} session={s} />}</RequireSession>;
}
