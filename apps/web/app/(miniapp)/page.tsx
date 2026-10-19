'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { ServiceIcon } from '@/components/icons';
import { useSession } from '@/components/session';
import { api } from '@/lib/api';
import type { Airport, ProductType } from '@/lib/types';

const AIRPORT_KEY = 'ms_airport';

const services: { type: ProductType; title: string; desc: string }[] = [
  { type: 'LOUNGE', title: 'Phòng chờ thương gia', desc: 'Nghỉ ngơi, ăn nhẹ, Wi-Fi trước giờ bay' },
  { type: 'FAST_TRACK', title: 'Fast Track', desc: 'Làn ưu tiên check-in, an ninh, xuất nhập cảnh' },
];

export default function Home() {
  const session = useSession();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airport, setAirport] = useState('SGN');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AIRPORT_KEY);
      if (saved) setAirport(saved);
    } catch {}
    api<Airport[]>('/airports').then(setAirports).catch(() => {});
  }, []);

  const pick = (code: string) => {
    setAirport(code);
    try {
      localStorage.setItem(AIRPORT_KEY, code);
    } catch {}
  };

  const name = session.status === 'ready' ? session.session.user.name : undefined;

  return (
    <>
      <Header title="Dịch vụ sân bay" back={false} />
      <div className="bg-primary px-4 pb-10 pt-2 text-white">
        <p className="text-sm opacity-90">
          {session.status === 'ready' ? session.session.partner.name : 'Tiện ích du lịch'}
        </p>
        <p className="text-xl font-semibold">{name ? `Xin chào, ${name}` : 'Bay nhẹ nhàng hơn'}</p>
      </div>

      <div className="-mt-6 space-y-4 px-4">
        <div className="card">
          <label className="label" htmlFor="airport">Sân bay</label>
          <select id="airport" className="input" value={airport} onChange={(e) => pick(e.target.value)}>
            {airports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code}) — {a.name}
              </option>
            ))}
          </select>
        </div>

        {services.map((s) => (
          <Link key={s.type} href={`/services/${s.type}?airport=${airport}`} className="card flex items-center gap-4 active:bg-slate-50">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ServiceIcon type={s.type} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-slate-500">{s.desc}</div>
            </div>
            <span className="text-slate-300">›</span>
          </Link>
        ))}

        <Link href="/orders" className="card flex items-center justify-between font-medium active:bg-slate-50">
          Đơn hàng của tôi <span className="text-slate-300">›</span>
        </Link>

        <ul className="space-y-1 px-1 text-sm text-slate-500">
          <li>✓ Thanh toán an toàn qua ứng dụng của bạn</li>
          <li>✓ Nhận mã voucher qua app, SMS và email</li>
          <li>✓ Hủy miễn phí trước giờ bay theo điều kiện từng dịch vụ</li>
        </ul>
      </div>
    </>
  );
}
