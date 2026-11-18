import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { recalculateExamResults } from '@/lib/pdfDocs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const session = await getSession();
    const teacherId = session?.userId || 'teacher-admin';

    const result = await recalculateExamResults(examId, teacherId);

    return NextResponse.json({
      success: true,
      message: `${result.recalculatedCount} öğrencinin sınav sonucu güncellenen cevap anahtarına göre yeniden hesaplandı.`,
      recalculatedCount: result.recalculatedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error recalculating exam results:', msg);
    return NextResponse.json({ error: 'Yeniden hesaplama başarısız: ' + msg }, { status: 500 });
  }
}
