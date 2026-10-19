import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Token SSO do đối tác (ngân hàng/ví) ký khi mở mini-app:
 *   base64url(JSON payload) + "." + base64url(HMAC-SHA256(ssoSecret, payloadB64))
 * Payload tối thiểu: { partner, uid, iat } — iat tính bằng giây.
 */
export interface SsoPayload {
  partner: string;
  uid: string;
  name?: string;
  phone?: string;
  email?: string;
  iat: number;
}

export const SSO_MAX_AGE_SECONDS = 300;

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest();

export function signSsoToken(payload: SsoPayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${b64url(hmac(secret, body))}`;
}

/** Chỉ đọc payload (chưa xác thực) để biết token thuộc đối tác nào. */
export function peekSsoPartner(token: string): string | null {
  try {
    return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()).partner ?? null;
  } catch {
    return null;
  }
}

export function verifySsoToken(token: string, secret: string, nowSec: number): SsoPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = hmac(secret, body);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let payload: SsoPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch {
    return null;
  }
  if (!payload.uid || typeof payload.iat !== 'number') return null;
  // Chặn token cũ (replay) và token có iat ở tương lai quá xa.
  if (Math.abs(nowSec - payload.iat) > SSO_MAX_AGE_SECONDS) return null;
  return payload;
}
