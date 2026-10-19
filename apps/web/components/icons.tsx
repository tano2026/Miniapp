import type { ProductType } from '@/lib/types';

export function ServiceIcon({ type, className = 'h-7 w-7' }: { type: ProductType; className?: string }) {
  return type === 'LOUNGE' ? (
    // Ghế sofa
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11V8a3 3 0 013-3h10a3 3 0 013 3v3" />
      <path d="M2 13a2 2 0 014 0v2h12v-2a2 2 0 014 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2z" />
      <path d="M5 19v2M19 19v2" />
    </svg>
  ) : (
    // Tia chớp / đi nhanh
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}
