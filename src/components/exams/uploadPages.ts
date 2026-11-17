'use client';
import { supabaseBrowser } from '@/lib/supabase/client';
import { EXAM_PAGE_BUCKET } from '@/lib/env';
import { addPages } from '@/app/ogretmen/denemeler/actions';
import { filesToPages } from '@/lib/pdfPages';

// Dosyaları sayfa görsellerine çevirip denemenin klasörüne yükler (depolama kuralı: yalnızca denemenin öğretmeni)
export async function uploadExamFiles(examId: string, files: File[], onProgress: (m: string) => void, already = 0): Promise<string | null> {
  const pages = await filesToPages(files, onProgress, already);
  const sb = supabaseBrowser();
  const saved: { path: string; width: number; height: number }[] = [];
  for (let i = 0; i < pages.length; i++) {
    onProgress(`Yükleniyor: ${i + 1}/${pages.length} sayfa`);
    const path = `${examId}/${crypto.randomUUID()}.jpg`;
    const { error } = await sb.storage.from(EXAM_PAGE_BUCKET).upload(path, pages[i].blob, { contentType: 'image/jpeg', upsert: false });
    if (error) {
      if (saved.length) await addPages(examId, saved);
      return `Sayfa ${i + 1} yüklenemedi: ${error.message}`;
    }
    saved.push({ path, width: pages[i].width, height: pages[i].height });
  }
  const r = await addPages(examId, saved);
  return r.error || null;
}
