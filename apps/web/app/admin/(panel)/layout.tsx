'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminCtx, AdminUser } from './admin-context';

const NAV = [
  { href: '/admin', label: 'Tổng quan' },
  { href: '/admin/tasks', label: 'Hàng đợi xử lý' },
  { href: '/admin/orders', label: 'Đơn hàng' },
  { href: '/admin/products', label: 'Sản phẩm' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    api<{ user: AdminUser }>('/admin/auth/me')
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/admin/login');
      });
  }, [router]);

  if (!user) return <p className="p-8 text-center text-slate-400">Đang tải…</p>;

  const logout = async () => {
    await api('/admin/auth/logout', { body: {} });
    router.replace('/admin/login');
  };

  return (
    <AdminCtx.Provider value={user}>
      <div className="min-h-screen bg-slate-100">
        <nav className="flex flex-wrap items-center gap-1 bg-slate-900 px-4 py-2 text-sm text-slate-300">
          <span className="mr-4 font-bold text-white">Airport Services · Ops</span>
          {NAV.map((n) => {
            const active = n.href === '/admin' ? path === '/admin' : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-1.5 ${active ? 'bg-white/15 text-white' : 'hover:bg-white/10'}`}>
                {n.label}
              </Link>
            );
          })}
          <span className="ml-auto">{user.name} ({user.role})</span>
          <button onClick={logout} className="rounded-lg px-3 py-1.5 hover:bg-white/10">Đăng xuất</button>
        </nav>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </div>
    </AdminCtx.Provider>
  );
}
