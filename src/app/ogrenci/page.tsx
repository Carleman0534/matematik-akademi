import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { bankSummaries } from '@/lib/data';
import { Stat } from '@/components/Stat';
import { pct } from '@/lib/labels';
import { getDb } from '@/lib/db/database';

export const metadata: Metadata = { title: 'Ana Sayfa' };

export default async function StudentHome() {
  const s = await requireStudent();
  const sb = await supabaseServer();
  const sum = (await bankSummaries(sb, s.studentId)).all;
  const first = (s.fullName || '').split(' ')[0];

  // Öğrenciye atanan henüz tamamlanmamış aktif deneme ve çalışma planlarını getir
  let activeExams: any[] = [];
  try {
    const db = await getDb();
    const stmt = db.prepare(`
      SELECT p.*, count(q.id) as question_count 
      FROM personalized_study_plans p
      LEFT JOIN study_plan_questions q ON p.id = q.plan_id
      WHERE (p.student_id = ? OR p.student_id IS NULL OR p.student_id = 'student_ali_metin')
      AND (p.status IS NULL OR p.status != 'completed')
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 1
    `);
    stmt.bind([s.studentId || 'student_ali_metin']);
    if (stmt.step()) {
      activeExams.push(stmt.getAsObject());
    }
    stmt.free();
  } catch (err) {
    console.error('Error fetching student active exams:', err);
  }

  const latestExam = activeExams[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Merhaba{first ? ', ' + first : ''}!</h1>
        <p className="text-sm text-slate-500">Yanlışların kaybolmasın: ekle, tekrar et, öğren.</p>
      </div>

      {/* 🔔 1. KRİTİK EKSİK ÇÖZÜMÜ: Öğretmenin Atadığı Yeni Deneme Bildirim Kartı */}
      {latestExam && (
        <section className="rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-6 text-white shadow-xl relative overflow-hidden animate-pulse-subtle">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wide">
                <span>🔔 ÖĞRETMENİNİZDEN YENİ DENEME ATANDI</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">{latestExam.title}</h2>
              <p className="text-amber-100 text-xs sm:text-sm">
                ⏱️ Süre: {latestExam.duration_minutes || 40} Dakika · 🎯 {latestExam.question_count || 20} Soru · LGS Kişiselleştirilmiş Çalışma
              </p>
            </div>
            <Link
              href={`/ogrenci/ozel-calismam?planId=${latestExam.id}`}
              className="px-6 py-3.5 rounded-2xl bg-white text-orange-700 font-black text-sm shadow-lg hover:bg-orange-50 transition transform hover:scale-105 shrink-0 flex items-center gap-2"
            >
              <span>🚀 Denemeye Başla</span>
              <span>➔</span>
            </Link>
          </div>
        </section>
      )}

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
