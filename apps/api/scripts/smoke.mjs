// Kiểm thử end-to-end luồng chính trên API đang chạy (cần đã seed).
// Chạy: node scripts/smoke.mjs [http://localhost:4000]
const BASE = (process.argv[2] ?? 'http://localhost:4000') + '/api';

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inHours = (h) => new Date(Date.now() + h * 3_600_000).toISOString();

async function waitStatus(code, token, statuses) {
  for (let i = 0; i < 20; i++) {
    const o = await call('GET', `/orders/${code}`, null, token);
    if (statuses.includes(o.status)) return o;
    await sleep(300);
  }
  throw new Error(`Order ${code} never reached ${statuses}`);
}

console.log('1. Partner SSO');
const { token: sso } = await call('POST', '/dev/partner-token', { partner: 'DEMO', uid: 'smoke-user', name: 'Nguyen Van A' });
const { token } = await call('POST', '/partner-sso/exchange', { token: sso });
const me = await call('GET', '/partner-sso/me', null, token);
assert(me.partner.code === 'DEMO', 'session belongs to DEMO partner');

console.log('2. Catalog');
const lounges = await call('GET', '/products?type=LOUNGE&airport=SGN');
const manualLounge = lounges.find((p) => !p.instantConfirm);
const ftArr = (await call('GET', '/products?type=FAST_TRACK&airport=SGN&direction=ARRIVAL'))[0];
assert(manualLounge && ftArr?.instantConfirm, 'found a manual lounge and an instant fast track');
assert(manualLounge.netAdult === undefined, 'net price is not exposed');

console.log('3. Booking rules');
const contact = { name: 'Nguyen Van A', phone: '0901234567', email: 'a@example.com' };
const pax = [{ fullName: 'Nguyen Van A', type: 'ADULT' }, { fullName: 'Nguyen Be', type: 'CHILD' }];
let rejected = false;
try {
  await call('POST', '/orders', {
    contact,
    items: [{ productId: manualLounge.id, flightNumber: 'VN213', serviceTime: inHours(2), adults: 1, children: 1, infants: 0, passengers: pax }],
  }, token);
} catch (e) {
  rejected = /422/.test(e.message);
}
assert(rejected, 'order inside lead time is rejected with 422');

console.log('4. Create combo order (manual lounge + API fast track)');
const created = await call('POST', '/orders', {
  contact,
  items: [
    { productId: manualLounge.id, flightNumber: 'vn 213', serviceTime: inHours(48), adults: 1, children: 1, infants: 0, passengers: pax },
    { productId: ftArr.id, flightNumber: 'VN30', serviceTime: inHours(120), adults: 1, children: 0, infants: 0, passengers: [pax[0]] },
  ],
}, token);
const expected = manualLounge.priceAdult + manualLounge.priceChild + ftArr.priceAdult;
assert(created.totalAmount === expected, `server-side total = ${expected}`);

console.log('5. Pay via mock gateway');
const ref = created.paymentUrl.split('/').pop();
await call('POST', `/payments/mock/${ref}/simulate`, { success: true });
let order = await waitStatus(created.code, token, ['PROCESSING']);
await sleep(800);
order = await call('GET', `/orders/${created.code}`, null, token);
const ftItem = order.items.find((i) => i.product.type === 'FAST_TRACK');
const loungeItem = order.items.find((i) => i.product.type === 'LOUNGE');
assert(ftItem.status === 'CONFIRMED' && ftItem.voucherCode, 'API item confirmed instantly with voucher');
assert(loungeItem.status === 'PROCESSING' && !loungeItem.voucherCode, 'manual item waits for ops');

console.log('6. Duplicate IPN is idempotent');
await call('POST', `/payments/mock/${ref}/simulate`, { success: true });
assert((await call('GET', `/orders/${created.code}`, null, token)).status === 'PROCESSING', 'status unchanged');

console.log('7. Ops completes manual task');
const loginRes = await fetch(BASE + '/admin/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'ops@demo.vn', password: 'Ops@12345' }),
});
const adminCookie = loginRes.headers.get('set-cookie').split(';')[0];
const adminToken = adminCookie.split('=')[1];
const tasks = await call('GET', '/admin/tasks', null, adminToken);
const task = tasks.find((t) => t.item.order.code === created.code);
assert(task, 'task is in the ops queue');
await call('POST', `/admin/tasks/${task.id}/claim`, {}, adminToken);
await call('POST', `/admin/tasks/${task.id}/complete`, { voucherCode: 'LNG-889900', supplierRef: 'SUP-1' }, adminToken);
order = await call('GET', `/orders/${created.code}`, null, token);
assert(order.status === 'CONFIRMED', 'order CONFIRMED once all items are confirmed');

console.log('8. Failed manual task triggers partial refund');
const o2 = await call('POST', '/orders', {
  contact,
  items: [
    { productId: manualLounge.id, flightNumber: 'VJ120', serviceTime: inHours(30), adults: 1, children: 0, infants: 0, passengers: [pax[0]] },
    { productId: ftArr.id, flightNumber: 'VJ121', serviceTime: inHours(30), adults: 1, children: 0, infants: 0, passengers: [pax[0]] },
  ],
}, token);
await call('POST', `/payments/mock/${o2.paymentUrl.split('/').pop()}/simulate`, { success: true });
await sleep(1000);
const t2 = (await call('GET', '/admin/tasks', null, adminToken)).find((t) => t.item.order.code === o2.code);
await call('POST', `/admin/tasks/${t2.id}/fail`, { reason: 'Phòng chờ đóng cửa bảo trì' }, adminToken);
const o2Final = await call('GET', `/orders/${o2.code}`, null, token);
assert(o2Final.status === 'PARTIALLY_CONFIRMED', 'order partially confirmed');
assert(o2Final.refundAmount === manualLounge.priceAdult, 'failed item amount refunded');

console.log('9. Admin cancel with refund');
await call('POST', `/admin/orders/${created.code}/cancel`, { refund: true, reason: 'Khách đổi lịch bay' }, adminToken);
const cancelled = await call('GET', `/orders/${created.code}`, null, token);
assert(cancelled.status === 'CANCELLED' && cancelled.paymentStatus === 'REFUNDED', 'cancelled and fully refunded');

console.log('10. Stats');
const stats = await call('GET', '/admin/stats', null, adminToken);
assert(typeof stats.today.revenue === 'number', `stats ok (today revenue ${stats.today.revenue})`);

console.log('\nAll smoke checks passed.');
