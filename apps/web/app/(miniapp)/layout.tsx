import { SessionProvider } from '@/components/session';

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-10 shadow-sm">{children}</div>
    </SessionProvider>
  );
}
