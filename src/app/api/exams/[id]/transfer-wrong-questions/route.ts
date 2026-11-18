import { NextRequest, NextResponse } from 'next/server';
import { transferWrongQuestionsToBank } from '@/lib/pdfDocs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const body = await request.json().catch(() => ({}));
    const { studentId } = body;

    const result = await transferWrongQuestionsToBank(examId, studentId);

    return NextResponse.json({
      success: true,
      message: `${result.transferredCount} adet yanlış ve boş soru öğrencilerin kişisel soru bankalarına başarıyla aktarıldı.`,
      transferredCount: result.transferredCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error transferring wrong questions:', msg);
    return NextResponse.json({ error: 'Soru bankasına aktarma sırasında hata oluştu: ' + msg }, { status: 500 });
  }
}
