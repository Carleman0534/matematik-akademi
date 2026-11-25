-- Uygulama veritabanı ve dosyaları için Supabase deposu (Vercel Blob'un ücretsiz yerine geçeni).
-- Supabase → SQL Editor'de bir kez çalıştırılır. Tekrar çalıştırmak zararsızdır.

-- 1) Veritabanı: her ad alanı (canlı: "live") için tek satır; data = SQLite dosyasının base64'ü
create table if not exists public.app_db_state (
  id text primary key,
  version bigint not null default 1,
  data text not null,
  updated_at timestamptz not null default now()
);

-- 2) Günlük yedekler (son 14 gün tutulur)
create table if not exists public.app_db_backups (
  id text not null,
  day date not null,
  data text not null,
  created_at timestamptz not null default now(),
  primary key (id, day)
);

-- Tablolara yalnızca sunucu (service_role) erişir; tarayıcı anahtarları (anon) hiçbir şey göremez
alter table public.app_db_state enable row level security;
alter table public.app_db_backups enable row level security;

-- Okuma: istemcinin bildiği sürüm güncelse veriyi göndermez (ucuz kontrol)
create or replace function public.app_db_get(p_id text, p_known bigint)
returns table(version bigint, data text)
language sql
security definer
set search_path = public
as $$
  select s.version, case when s.version = p_known then null else s.data end
  from public.app_db_state s
  where s.id = p_id
$$;

-- Yazma: p_expected verilirse yalnızca sürüm hâlâ o ise yazar; verilmezse yalnızca satır hiç yoksa oluşturur.
-- Başarılıysa yeni sürümü, çakışmada NULL döner.
create or replace function public.app_db_put(p_id text, p_expected bigint, p_data text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v bigint;
begin
  if p_expected is null then
    insert into public.app_db_state (id, version, data) values (p_id, 1, p_data)
    on conflict (id) do nothing
    returning version into v;
    return v;
  end if;
  update public.app_db_state
     set version = version + 1, data = p_data, updated_at = now()
   where id = p_id and version = p_expected
  returning version into v;
  return v;
end
$$;

revoke all on function public.app_db_get(text, bigint) from public, anon, authenticated;
revoke all on function public.app_db_put(text, bigint, text) from public, anon, authenticated;
grant execute on function public.app_db_get(text, bigint) to service_role;
grant execute on function public.app_db_put(text, bigint, text) to service_role;

-- 3) Dosyalar için özel (herkese kapalı) depolama kovası; tek dosya en fazla 50 MB
insert into storage.buckets (id, name, public, file_size_limit)
values ('app-files', 'app-files', false, 52428800)
on conflict (id) do nothing;
