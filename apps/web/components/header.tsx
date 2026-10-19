'use client';

import { useRouter } from 'next/navigation';

export function Header({ title, back = true }: { title: string; back?: boolean }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-primary px-3 py-3 text-white shadow">
      {back && (
        <button aria-label="Quay lại" onClick={() => router.back()} className="rounded-lg p-1 active:bg-white/20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <h1 className="truncate text-lg font-semibold">{title}</h1>
    </header>
  );
}
