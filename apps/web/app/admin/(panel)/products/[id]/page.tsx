'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAdmin } from '../../admin-context';

interface Supplier { id: string; name: string; mode: string }
interface Airport { code: string; name: string }

const EMPTY = {
  type: 'LOUNGE', airportCode: 'SGN', terminal: 'T1', scope: 'DOMESTIC', direction: 'DEPARTURE',
  name: '', shortDescription: '', description: '', amenities: [] as string[], imageUrl: '', openingHours: '',
  maxStayHours: 3 as number | null, supplierId: '', supplierProductCode: '',
  netAdult: 0, netChild: 0, netInfant: 0, priceAdult: 0, priceChild: 0, priceInfant: 0,
  leadTimeHours: 12, freeCancelHours: 24, active: true, sortOrder: 0,
};
type Form = typeof EMPTY;

const PRICE_FIELDS = [
  ['netAdult', 'Net người lớn'], ['netChild', 'Net trẻ em'], ['netInfant', 'Net em bé'],
  ['priceAdult', 'Bán người lớn'], ['priceChild', 'Bán trẻ em'], ['priceInfant', 'Bán em bé'],
] as const;

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const admin = useAdmin();
  const readOnly = admin.role !== 'ADMIN';
  const [f, setF] = useState<Form>(EMPTY);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<Supplier[]>('/admin/suppliers').then((s) => {
      setSuppliers(s);
      if (isNew && s[0]) setF((x) => ({ ...x, supplierId: s[0].id }));
    });
    api<Airport[]>('/admin/airports').then(setAirports);
    if (!isNew) {
      api<Form & { id: string }>(`/admin/products/${id}`).then((p) => {
        const { id: _id, createdAt, updatedAt, currency, ...rest } = p as Form & Record<string, unknown>;
        setF({ ...EMPTY, ...rest, imageUrl: p.imageUrl ?? '', openingHours: p.openingHours ?? '', supplierProductCode: p.supplierProductCode ?? '' });
      });
    }
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    const body = {
      ...f,
      imageUrl: f.imageUrl || null,
      openingHours: f.openingHours || null,
      supplierProductCode: f.supplierProductCode || null,
      maxStayHours: f.type === 'LOUNGE' ? f.maxStayHours : null,
      direction: f.type === 'LOUNGE' ? 'DEPARTURE' : f.direction,
    };
    try {
      if (isNew) {
        const p = await api<{ id: string }>('/admin/products', { body });
        router.replace(`/admin/products/${p.id}`);
      } else {
        await api(`/admin/products/${id}`, { method: 'PATCH', body });
      }
      setMsg('Đã lưu');
    } catch (err) {
      setMsg((err as Error).message);
    }
  };

  const field = 'input py-2';

  return (
    <form onSubmit={save} className="card max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">{isNew ? 'Thêm sản phẩm' : f.name}</h1>
      <fieldset disabled={readOnly} className="grid gap-3 md:grid-cols-3">
        <div><label className="label">Loại</label>
          <select className={field} value={f.type} onChange={(e) => set('type', e.target.value)}>
            <option value="LOUNGE">Phòng chờ</option><option value="FAST_TRACK">Fast Track</option>
          </select></div>
        <div><label className="label">Sân bay</label>
          <select className={field} value={f.airportCode} onChange={(e) => set('airportCode', e.target.value)}>
            {airports.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
          </select></div>
        <div><label className="label">Nhà ga</label><input className={field} required value={f.terminal} onChange={(e) => set('terminal', e.target.value)} /></div>
        <div><label className="label">Phạm vi chuyến</label>
          <select className={field} value={f.scope} onChange={(e) => set('scope', e.target.value)}>
            <option value="DOMESTIC">Nội địa</option><option value="INTERNATIONAL">Quốc tế</option>
          </select></div>
        {f.type === 'FAST_TRACK' && (
          <div><label className="label">Chiều</label>
            <select className={field} value={f.direction} onChange={(e) => set('direction', e.target.value)}>
              <option value="DEPARTURE">Khởi hành</option><option value="ARRIVAL">Đến / nhập cảnh</option>
            </select></div>
        )}
        <div><label className="label">Nhà cung cấp</label>
          <select className={field} value={f.supplierId} onChange={(e) => set('supplierId', e.target.value)}>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.mode})</option>)}
          </select></div>
        <div><label className="label">Mã SP phía NCC</label><input className={field} value={f.supplierProductCode} onChange={(e) => set('supplierProductCode', e.target.value)} /></div>

        <div className="md:col-span-3"><label className="label">Tên hiển thị</label><input className={field} required value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="md:col-span-3"><label className="label">Mô tả ngắn</label><input className={field} required value={f.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} /></div>
        <div className="md:col-span-3"><label className="label">Mô tả chi tiết & điều kiện</label><textarea className={field} rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
        <div className="md:col-span-3"><label className="label">Tiện ích (mỗi dòng một mục)</label>
          <textarea className={field} rows={3} value={f.amenities.join('\n')} onChange={(e) => set('amenities', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></div>
        <div><label className="label">Giờ mở cửa</label><input className={field} value={f.openingHours} onChange={(e) => set('openingHours', e.target.value)} /></div>
        {f.type === 'LOUNGE' && (
          <div><label className="label">Sử dụng tối đa (giờ)</label><input type="number" min={1} className={field} value={f.maxStayHours ?? ''} onChange={(e) => set('maxStayHours', e.target.value ? Number(e.target.value) : null)} /></div>
        )}

        {PRICE_FIELDS.map(([k, label]) => (
          <div key={k}><label className="label">{label} (đ)</label>
            <input type="number" min={0} step={1000} className={field} value={f[k]} onChange={(e) => set(k, Number(e.target.value))} /></div>
        ))}

        <div><label className="label">Đặt trước tối thiểu (giờ)</label><input type="number" min={0} className={field} value={f.leadTimeHours} onChange={(e) => set('leadTimeHours', Number(e.target.value))} /></div>
        <div><label className="label">Hủy miễn phí trước (giờ)</label><input type="number" min={0} className={field} value={f.freeCancelHours} onChange={(e) => set('freeCancelHours', Number(e.target.value))} /></div>
        <div><label className="label">Thứ tự hiển thị</label><input type="number" className={field} value={f.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Đang mở bán</label>
      </fieldset>
      {msg && <p className={msg === 'Đã lưu' ? 'text-emerald-700' : 'text-rose-600'}>{msg}</p>}
      {!readOnly && <button className="btn py-2 bg-slate-900 text-white">Lưu</button>}
      {readOnly && <p className="text-sm text-slate-500">Tài khoản OPS chỉ được xem. Liên hệ ADMIN để sửa giá/sản phẩm.</p>}
    </form>
  );
}
