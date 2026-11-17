import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { bankSummaries } from '@/lib/data';
import { Stat } from '@/components/Stat';
import { pct } from '@/lib/labels';

export const metadata: Metadata = { title: 'Ana Sayfa' };

export default async function StudentHome() {
  const s = await requireStudent();
  const sb = await supabaseServer();
  const sum = (await bankSummaries(sb, s.studentId)).all;
  const first = (s.fullName || '').split(' ')[0];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Merhaba{first ? ', ' + first : ''}!</h1>
        <p className="text-sm text-slate-500">Yanlışların kaybolmasın: ekle, tekrar et, öğren.</p>
      </div>

      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <p className="text-sm text-indigo-100">Bugünkü tekrar programın</p>
        <p className="mt-1 text-3xl font-black">{sum.due} soru</p>
        <p className="text-sm text-indigo-100">{sum.due ? 'Tekrar zamanı gelen yanlış ve boş soruların.' : 'Bugün tekrar edilecek soru yok. Yeni yanlışlarını eklemeyi unutma.'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {sum.due > 0 && <Link href="/ogrenci/tekrar" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50">Tekrara başla</Link>}
          <Link href="/ogrenci/soru-ekle" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25">📷 Yanlış / boş soru ekle</Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Soru bankam" value={sum.total} sub={`${sum.wrong} yanlış · ${sum.blank} boş`} />
        <Stat label="Öğrenmeyi bekleyen" value={sum.waiting + sum.reviewedWrong} sub={`${sum.waiting} hiç tekrar edilmedi`} />
        <Stat label="Tekrarda yine yanlış" value={sum.reviewedWrong} tone="text-red-600 dark:text-red-400" />
        <Stat label="Öğrenilen" value={sum.learned} sub={`kalıcı ${sum.permanent} · tekrar başarısı ${pct(sum.reviewSuccess)}`} tone="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/ogrenci/soru-bankam?durum=wrong" className="card hover:border-indigo-400"><b>❌ Yanlış sorularım</b><p className="text-sm text-slate-500">{sum.wrong} soru</p></Link>
        <Link href="/ogrenci/soru-bankam?durum=blank" className="card hover:border-indigo-400"><b>⭕ Boş sorularım</b><p className="text-sm text-slate-500">{sum.blank} soru</p></Link>
        <Link href="/ogrenci/soru-bankam?ogrenme=tekrar_yanlis" className="card hover:border-indigo-400"><b>🔁 Tekrarda yine yanlış</b><p className="text-sm text-slate-500">{sum.reviewedWrong} soru</p></Link>
      </div>
      <p className="text-xs text-slate-500">Bir soru, farklı günlerde art arda en az iki kez doğru çözülünce &quot;öğrenildi&quot;, üç kez ve en az iki haftaya yayılınca &quot;kalıcı olarak öğrenildi&quot; sayılır.</p>
    </div>
  );
}
