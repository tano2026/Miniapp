'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Info {
  ref: string;
  amount: number;
  status: string;
  orderCode: string;
  partnerName: string;
  expiresAt: string;
}

/** Màn hình giả lập cổng thanh toán của ngân hàng (chỉ dev). */
export default function MockPay() {
  const { ref } = useParams<{ ref: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Info>(`/payments/mock/${ref}`).then(setInfo).catch((e) => setError(e.message));
  }, [ref]);

  const pay = async (success: boolean) => {
    setBusy(true);
    try {
      const { orderCode } = await api<{ orderCode: string }>(`/payments/mock/${ref}/simulate`, { body: { success } });
      router.replace(`/orders/${orderCode}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-900 p-6 text-white">
      <div className="text-sm uppercase tracking-widest text-slate-400">Cổng thanh toán giả lập</div>
      {error && <p className="mt-6 text-rose-400">{error}</p>}
      {info && (
        <>
          <div className="mt-6 text-slate-300">{info.partnerName}</div>
          <div className="mt-1 text-4xl font-bold">{info.amount.toLocaleString('vi-VN')}đ</div>
          <div className="mt-2 text-sm text-slate-400">Đơn {info.orderCode} · Mã GD {info.ref}</div>
          {info.status !== 'PENDING' && <p className="mt-6 text-amber-300">Giao dịch đã xử lý: {info.status}</p>}
          <div className="mt-auto space-y-3">
            <button disabled={busy || info.status !== 'PENDING'} onClick={() => pay(true)}
              className="btn w-full bg-emerald-500 text-white">Xác nhận thanh toán</button>
            <button disabled={busy || info.status !== 'PENDING'} onClick={() => pay(false)}
              className="btn w-full border border-slate-600 text-slate-300">Hủy giao dịch</button>
          </div>
        </>
      )}
    </div>
  );
}
