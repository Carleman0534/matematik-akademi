import { DEFAULT_STUDENT_EMAIL_DOMAIN } from './usernames.ts';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const STUDENT_EMAIL_DOMAIN = process.env.STUDENT_EMAIL_DOMAIN || DEFAULT_STUDENT_EMAIL_DOMAIN;
export const IMAGE_BUCKET = 'question-images';
export const EXAM_PAGE_BUCKET = 'exam-pages';

// Yerel mod kontrolü (Supabase bulut hesabı olmadan yerel SQLite ile çalışma)
export const isLocalMode = (): boolean => 
  process.env.LOCAL_MODE === 'true' || 
  SUPABASE_URL.includes('localhost') || 
  SUPABASE_URL.includes('127.0.0.1');

// .env.local doldurulmadan açılırsa çökmek yerine kurulum ekranı gösterilir
export const isConfigured = (): boolean => 
  isLocalMode() || (/^https:\/\/.+/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20);
