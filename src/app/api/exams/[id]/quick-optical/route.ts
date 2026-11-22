import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';
import { examExists } from '@/lib/pdfDocs';
import { getPdfExamSessionState } from '@/lib/pdfExamSession';
import { scoreAndStorePdfExam } from '@/lib/pdfExamSubmit';

export const dynamic = 'force-dynamic';

// POST: Öğretmenin, öğrencinin kâğıt/ekran üzerindeki cevaplarını onun adına kaydetmesi.
// Puanlama, öğrencinin kendi gönderimiyle aynı yoldan yapılır: PDF'in cevap anahtarı, LGS net formülü
// (3 yanlış 1 doğruyu götürür), yanlış havuzu ve konu başarısı. Süre dakika olarak girilir (0/boş = bilinmiyor).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Bu işlem yalnızca öğretmene açıktır.' }, { status: 403 });
    }

    const { id: examId } = await params;
    const body = await request.json().catch(() => ({}));
    const studentId = String(body?.studentId || '');
    const answers: Record<string, string> = body?.answers && typeof body.answers === 'object' ? body.answers : {};
    const durationMin = Number(body?.durationMin);
    const overwrite = body?.overwrite === true;

    if (!examId || !studentId || Object.keys(answers).length === 0) {
      return NextResponse.json({ error: 'Eksik veri: deneme, öğrenci ve en az bir cevap zorunludur.' }, { status: 400 });
    }
    if (!(await examExists(examId))) {
      return NextResponse.json({ error: 'Bu deneme sistemde bulunamadı.' }, { status: 404 });
    }

    const db = await getDb();
    const st = db.prepare('SELECT 1 FROM students WHERE id = ?');
    st.bind([studentId]);
    const studentFound = st.step();
    st.free();
    if (!studentFound) {
      return NextResponse.json({ error: 'Öğrenci bulunamadı.' }, { status: 404 });
    }

    // Öğrencinin bu denemede zaten kayıtlı sonucu varsa, açıkça onay olmadan üzerine yazılmaz
    const state = getPdfExamSessionState(db, examId, studentId);
    if (state.submittedAt && !overwrite) {
      return NextResponse.json({
        error: 'Bu öğrencinin bu denemede zaten kayıtlı bir sonucu var. Üzerine yazmak için onay verin.',
        existing: state.result,
      }, { status: 409 });
    }

    const durationSeconds = Number.isFinite(durationMin) && durationMin > 0 ? Math.round(durationMin * 60) : 0;

    const out = await scoreAndStorePdfExam(request, db, {
      examId,
      studentId,
      answers,
      durationSeconds,
      startedAtIso: state.startedAt,
    });
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });

    return NextResponse.json({
      success: true,
      message: 'Cevaplar kaydedildi ve puanlandı.',
      result: out.result,
      gradedCount: out.gradedCount,
      questionCount: out.questionCount,
      details: out.details,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Quick optical save error:', msg);
    return NextResponse.json({ error: 'Cevaplar kaydedilemedi: ' + msg }, { status: 500 });
  }
}
