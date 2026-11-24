import 'server-only';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

// Hesap parolaları yalnızca bcrypt hash'i olarak saklanır (düz metin asla).
export const hashPassword = (plain: string): string => bcrypt.hashSync(plain, 10);

// Karıştırılması kolay karakterler (0/O, 1/l/I) çıkarılmış rastgele geçici parola; öğretmen iletir.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomPassword(len = 10): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return s;
}

export const MIN_PASSWORD_LENGTH = 8;
export function checkNewPassword(p: string): string | null {
  if (typeof p !== 'string' || p.length < MIN_PASSWORD_LENGTH) return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
  if (p.length > 100) return 'Şifre en fazla 100 karakter olabilir.';
  if (/^(password123|12345678|123456789|qwertyui|11111111|00000000)$/i.test(p)) return 'Bu şifre çok kolay tahmin edilir; başka bir şifre seçin.';
  return null;
}

export const likeEscape = (s: string): string => s.replace(/[\\%_]/g, (c) => '\\' + c);
