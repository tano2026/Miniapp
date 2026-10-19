import { randomInt } from 'crypto';

// Bỏ các ký tự dễ nhầm (0/O, 1/I/L) để khách đọc mã qua điện thoại.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export const newOrderCode = () => `TS${randomCode(6)}`;
