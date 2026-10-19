'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSession } from '@/components/session';
import { api } from '@/lib/api';

/**
 * Điểm vào từ app đối tác: https://<domain>/sso?token=<token SSO>&next=/services/LOUNGE
 * Token chỉ dùng một lần để đổi lấy cookie phiên.
 */
function Sso() {
  const params = useSearchParams();
  const router = useRouter();
  const session = useSession();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get('token');
    const next = params.get('next');
    // Chỉ cho phép chuyển tới đường dẫn nội bộ để tránh open redirect.
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    if (!token) return setError('Thiếu token đăng nhập');
    api('/partner-sso/exchange', { body: { token } })
      .then(() => {
        session.reload();
        router.replace(target);
      })
      .catch((e) => setError(e.message));
  }, [params, router, session]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      {error ? <p className="text-rose-600">{error}</p> : <p className="text-slate-500">Đang đăng nhập…</p>}
    </div>
  );
}

export default function SsoPage() {
  return (
    <Suspense>
      <Sso />
    </Suspense>
  );
}
