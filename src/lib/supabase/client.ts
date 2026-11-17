'use client';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

// Tarayıcı istemcisi: yalnızca anon anahtarı kullanır; erişimi veritabanındaki RLS kuralları sınırlar
export const supabaseBrowser = () => createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
