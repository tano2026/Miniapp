import { peekSsoPartner, signSsoToken, verifySsoToken } from './sso-token';

describe('sso token', () => {
  const secret = 'shh';
  const now = 1_800_000_000;
  const token = signSsoToken({ partner: 'DEMO', uid: 'u1', iat: now }, secret);

  it('round-trips a valid token', () => {
    expect(verifySsoToken(token, secret, now + 10)?.uid).toBe('u1');
    expect(peekSsoPartner(token)).toBe('DEMO');
  });
  it('rejects a wrong secret', () => {
    expect(verifySsoToken(token, 'other', now)).toBeNull();
  });
  it('rejects a tampered payload', () => {
    const [, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ partner: 'DEMO', uid: 'admin', iat: now })).toString('base64url');
    expect(verifySsoToken(`${forged}.${sig}`, secret, now)).toBeNull();
  });
  it('rejects an expired token', () => {
    expect(verifySsoToken(token, secret, now + 3600)).toBeNull();
  });
});
