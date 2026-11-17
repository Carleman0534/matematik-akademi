import { DEFAULT_STUDENT_EMAIL_DOMAIN } from './usernames.ts';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const STUDENT_EMAIL_DOMAIN = process.env.STUDENT_EMAIL_DOMAIN || DEFAULT_STUDENT_EMAIL_DOMAIN;
export const IMAGE_BUCKET = 'question-images';
export const EXAM_PAGE_BUCKET = 'exam-pages';

// .env.local doldurulmadan açılırsa çökmek yerine kurulum ekranı gösterilir
export const isConfigured = (): boolean => /^https:\/\/.+/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
