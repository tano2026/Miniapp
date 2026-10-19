import { itemStatusLabel, orderStatusLabel } from '@/lib/format';

const tone: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-sky-100 text-sky-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  PARTIALLY_CONFIRMED: 'bg-teal-100 text-teal-800',
  FAILED: 'bg-rose-100 text-rose-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
  EXPIRED: 'bg-slate-200 text-slate-700',
};

export function StatusBadge({ status, item = false }: { status: string; item?: boolean }) {
  const label = (item ? itemStatusLabel : orderStatusLabel)[status] ?? status;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[status] ?? 'bg-slate-100'}`}>
      {label}
    </span>
  );
}
