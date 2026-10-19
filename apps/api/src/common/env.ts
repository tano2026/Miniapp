function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Thiếu biến môi trường ${name}`);
  return v;
}

const isProd = process.env.NODE_ENV === 'production';

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 4000),
  webUrl: required('WEB_URL', 'http://localhost:3000'),
  // Production bắt buộc khai báo secret, dev dùng giá trị mặc định cho tiện.
  sessionSecret: required('SESSION_JWT_SECRET', isProd ? undefined : 'dev-session-secret'),
  adminSecret: required('ADMIN_JWT_SECRET', isProd ? undefined : 'dev-admin-secret'),
  mockPaySecret: required('MOCK_PAY_SECRET', isProd ? undefined : 'dev-mock-pay-secret'),
  paymentTtlMinutes: Number(process.env.ORDER_PAYMENT_TTL_MINUTES ?? 15),
};
