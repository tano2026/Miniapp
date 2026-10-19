export const PARTNER_COOKIE = 'ms_session';
export const ADMIN_COOKIE = 'ms_admin';

export interface PartnerSession {
  sub: string; // partnerUserId
  pid: string; // partner.id
  pcode: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface AdminSession {
  sub: string;
  email: string;
  name: string;
  role: string;
}
