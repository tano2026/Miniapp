'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Session } from '@/lib/types';

type State = { status: 'loading' } | { status: 'anonymous' } | { status: 'ready'; session: Session };

const Ctx = createContext<State & { reload: () => void }>({ status: 'loading', reload: () => {} });

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [n, setN] = useState(0);

  useEffect(() => {
    api<Session>('/partner-sso/me')
      .then((session) => {
        const rgb = hexToRgb(session.partner.primaryColor);
        if (rgb) document.documentElement.style.setProperty('--primary', rgb);
        setState({ status: 'ready', session });
      })
      .catch(() => setState({ status: 'anonymous' }));
  }, [n]);

  return <Ctx.Provider value={{ ...state, reload: () => setN((x) => x + 1) }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);

/** Bọc các trang cần phiên đăng nhập từ app đối tác. */
export function RequireSession({ children }: { children: (s: Session) => React.ReactNode }) {
  const s = useSession();
  if (s.status === 'loading') return <div className="p-8 text-center text-slate-400">Đang tải…</div>;
  if (s.status === 'anonymous') {
    return (
      <div className="card m-4 text-center">
        <p className="font-semibold">Phiên làm việc đã hết hạn</p>
        <p className="mt-1 text-sm text-slate-500">Vui lòng mở lại dịch vụ từ ứng dụng ngân hàng / ví của bạn.</p>
        {process.env.NODE_ENV !== 'production' && (
          <Link href="/demo" className="btn-primary mt-4 w-full">
            Mở bản demo (dev)
          </Link>
        )}
      </div>
    );
  }
  return <>{children(s.session)}</>;
}
