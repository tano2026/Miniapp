'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

/** Chỉ dùng khi dev: giả lập app ngân hàng mở mini-app kèm token SSO. */
export default function DemoLauncher() {
  const router = useRouter();
  const [form, setForm] = useState({ partner: 'DEMO', uid: 'user-001', name: 'NGUYEN VAN A', phone: '0901234567', email: 'demo@example.com' });
  const [error, setError] = useState('');

  if (process.env.NODE_ENV === 'production') return null;

  const launch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { token } = await api<{ token: string }>('/dev/partner-token', { body: form });
      router.push(`/sso?token=${encodeURIComponent(token)}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={launch} className="space-y-3 p-6">
      <h1 className="text-xl font-bold">Giả lập app đối tác</h1>
      <p className="text-sm text-slate-500">Trang này thay cho bước ngân hàng/ví ký token SSO rồi mở mini-app.</p>
      <label className="label">Đối tác</label>
      <select className="input" value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })}>
        <option value="DEMO">Ngân hàng Demo</option>
        <option value="WALLETX">Ví X</option>
      </select>
      {(['uid', 'name', 'phone', 'email'] as const).map((k) => (
        <div key={k}>
          <label className="label">{k}</label>
          <input className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        </div>
      ))}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button className="btn-primary w-full">Mở mini-app</button>
    </form>
  );
}
