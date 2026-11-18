import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics } from '@/lib/data';
import { activeOnly } from '@/lib/topics';
import { KIND_LABEL, type Kind } from '@/lib/studyEngine';
import { PlanBuilder } from '@/components/study/PlanBuilder';

export const metadata: Metadata = { title: 'Yeni çalışma planı' };
export const dynamic = 'force-dynamic';

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTeacher();
  const sp = await searchParams;
  const grade = Number(sp.sinif) || 8;
  const sb = await supabaseServer();
  const [topics, { data: st }, { data: pdfs }, { count: approved }] = await Promise.all([
    getTopics(sb),
    sb.from('students').select('id, full_name, classes(name)').eq('teacher_id', me.userId).eq('is_active', true).order('full_name'),
    sb.from('pdf_documents').select('id, title').eq('teacher_id', me.userId).neq('analysis_status', 'none').order('created_at', { ascending: false }),
    sb.from('pool_questions').select('id', { count: 'exact', head: true }).eq('teacher_id', me.userId).eq('status', 'approved').not('correct', 'is', null).not('topic_id', 'is', null),
  ]);
  const units = activeOnly(topics).filter(t => !t.parent_id && t.grade_level === grade).sort((a, b) => a.sort_order - b.sort_order).map(t => ({ id: t.id, name: t.name }));
  const students = ((st || []) as unknown as { id: string; full_name: string; classes: { name: string } | { name: string }[] | null }[]).map(s => ({ id: s.id, name: s.full_name, cls: (Array.isArray(s.classes) ? s.classes[0] : s.classes)?.name ?? null }));
  const kind = (sp.tur && sp.tur in KIND_LABEL ? sp.tur : 'karma') as Kind;

  return (
    <div className="space-y-5">
      <Link href="/ogretmen/ogrenme-planlari" className="text-sm text-slate-500 hover:underline">← Öğrenme planları</Link>
      <div>
        <h1 className="text-2xl font-black">Yeni çalışma planı</h1>
        <p className="text-sm text-slate-500">Sistem her öğrencinin konu başarısına bakar, zayıf konulara daha çok soru ayırır, düzeyine uygun zorlukta ve daha önce görmediği sorulardan bir liste hazırlar. Siz önizleyip düzenler, onaylayınca öğrenciye atarsınız.
          Havuzda <b>{approved ?? 0}</b> uygun (onaylı, konulu, cevaplı) soru var.</p>
      </div>
      {(approved ?? 0) === 0 ? <p className="card text-sm text-amber-700 dark:text-amber-300">Havuzda uygun soru yok. <Link href="/ogretmen/pdf-arsivi" className="font-semibold underline">PDF Analiz Merkezi</Link>&rsquo;nde bir PDF analiz edip soruların konusunu verip onaylayın.</p> : (
        <PlanBuilder students={students} units={units} pdfs={(pdfs || []) as { id: string; title: string }[]} grade={grade}
          initial={{ students: (sp.ogrenci || '').split(',').filter(Boolean), units: (sp.konu || '').split(',').filter(Boolean), kind, count: Math.min(60, Math.max(3, Number(sp.adet) || 10)), rec: /^[0-9a-f-]{36}$/i.test(sp.oneri || '') ? sp.oneri : undefined }} />
      )}
    </div>
  );
}
