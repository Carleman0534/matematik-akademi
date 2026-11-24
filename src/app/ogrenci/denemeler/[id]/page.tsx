import { redirect } from 'next/navigation';

// Deneme adresi doğrudan çözüm ekranına gider (eski "deneme/[id]" sayfasına değil). Sorgu parametreleri korunur.
export default async function DenemelerIdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') qs.set(k, v);
  }
  const q = qs.toString();
  redirect(`/ogrenci/denemeler/${encodeURIComponent(id)}/coz${q ? `?${q}` : ''}`);
}
