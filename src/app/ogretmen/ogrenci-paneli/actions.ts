'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { setVisibleStudentFeatures } from '@/lib/studentFeaturesDb';

export interface FeatureState { error?: string; ok?: string }

// Öğrenci panelinde görünür bölümleri kaydeder. Yalnızca yönetici.
export async function saveStudentFeatures(_prev: FeatureState, form: FormData): Promise<FeatureState> {
  const s = await getSession();
  if (!s?.isAdmin) return { error: 'Yalnızca yönetici bu ayarı değiştirebilir.' };
  const keys = form.getAll('feature').map(String);
  await setVisibleStudentFeatures(keys);
  revalidatePath('/ogrenci', 'layout');
  revalidatePath('/ogretmen/ogrenci-paneli');
  return { ok: 'Kaydedildi. Öğrenciler değişikliği sayfayı yenileyince görür.' };
}
