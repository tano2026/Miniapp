'use client';

export function Stepper({
  label, hint, value, min, max, onChange,
}: {
  label: string; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="font-medium">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Giảm ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}
          className="h-8 w-8 rounded-full border border-slate-300 text-lg leading-none disabled:opacity-30">−</button>
        <span className="w-5 text-center font-semibold tabular-nums">{value}</span>
        <button type="button" aria-label={`Tăng ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}
          className="h-8 w-8 rounded-full border border-primary text-lg leading-none text-primary disabled:opacity-30">+</button>
      </div>
    </div>
  );
}
