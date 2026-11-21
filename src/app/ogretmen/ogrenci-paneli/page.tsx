import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getVisibleStudentFeatures } from '@/lib/studentFeaturesDb';
import { FeatureForm } from './FeatureForm';

export const dynamic = 'force-dynamic';

export default async function OgrenciPaneliPage() {
  await requireAdmin();
  const visible = await getVisibleStudentFeatures();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Öğrenci Paneli Görünürlüğü</h1>
        <p className="mt-1 text-xs text-slate-500">
          İşaretli bölümler öğrencilerin menüsünde görünür. İşaretsiz bölümler sistemde kalır ama öğrenciye gizlenir;
          adrese doğrudan gidilse bile içerik açılmaz. Atanan denemeleri çözme ekranı her zaman açıktır.
        </p>
        <Link href="/ogrenci" className="mt-3 inline-flex text-xs font-bold text-indigo-600 hover:underline">
          Öğrenci panelini önizle →
        </Link>
      </div>
      <FeatureForm visible={visible} />
    </div>
  );
}
