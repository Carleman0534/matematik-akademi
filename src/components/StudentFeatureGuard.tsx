'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { featureForPath, firstVisibleHref, isStudentPathAllowed } from '@/lib/studentFeatures';

// Öğrenci panelinde gizlenen bir bölümün adresine doğrudan gidilirse içeriği göstermez.
// Yönetici önizlemesinde (previewAll) içerik görünür, üstte "öğrencilere gizli" uyarısı çıkar.
export function StudentFeatureGuard({
  visible,
  previewAll,
  children,
}: {
  visible: string[];
  previewAll: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname() || '/ogrenci';
  const router = useRouter();
  const allowed = isStudentPathAllowed(path, visible);
  const home = firstVisibleHref(visible);
  const feature = featureForPath(path);

  // Ana sayfa gizliyse öğrenciyi doğrudan açık olan ilk bölüme götür (giriş sonrası /ogrenci'ye gelir)
  useEffect(() => {
    if (!previewAll && !allowed && feature?.key === 'home') router.replace(home);
  }, [previewAll, allowed, feature?.key, home, router]);

  if (previewAll) {
    return (
      <>
        {!allowed && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            👁️ Bu bölüm ({feature?.label}) şu an öğrencilere gizli. Yalnızca yönetici önizlemesinde görüyorsunuz.{' '}
            <Link href="/ogretmen/ogrenci-paneli" className="underline">Görünürlüğü değiştir</Link>
          </div>
        )}
        {children}
      </>
    );
  }

  if (allowed) return <>{children}</>;
  if (feature?.key === 'home') return null; // yönlendiriliyor

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-3xl">🔒</div>
      <h1 className="mt-2 text-base font-bold text-slate-900 dark:text-white">Bu bölüm şu an kapalı</h1>
      <p className="mt-1 text-xs text-slate-500">Öğretmenin bu bölümü henüz açmadı. Sana atanan denemelere buradan ulaşabilirsin.</p>
      <Link href={home} className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
        Denemelerime git
      </Link>
    </div>
  );
}
