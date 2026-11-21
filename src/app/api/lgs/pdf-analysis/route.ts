import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { runComparativeCrossPdfAnalysis, type PdfAnalysisSummary } from '@/lib/ai/pdfAnalyzer';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();

    // 1. Kayıtlı PDF listesi (file_data hariç)
    const pdfRes = db.exec("SELECT id, teacher_id, title, file_name, file_path, file_type, subject, grade_level, topic, publisher, file_size_mb, page_count, description, answer_key, question_count, is_archived, created_at FROM pdf_documents WHERE is_archived = 0 ORDER BY created_at DESC");
    const pdfs: any[] = [];
    if (pdfRes.length > 0) {
      const cols = pdfRes[0].columns;
      for (const row of pdfRes[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        pdfs.push(obj);
      }
    }

    // 2. Çıkarılmış sorular
    const qRes = db.exec("SELECT * FROM pdf_extracted_questions ORDER BY question_no ASC");
    const extractedList: any[] = [];
    if (qRes.length > 0) {
      const cols = qRes[0].columns;
      for (const row of qRes[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        extractedList.push(obj);
      }
    }

    // 3. Çoklu PDF'ler için özet analizleri birleştir
    const analyses: PdfAnalysisSummary[] = pdfs.map(p => {
      const pQuestions = extractedList.filter(q => q.pdf_id === p.id);
      const topicDist: Record<string, number> = {};
      const diffDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      pQuestions.forEach(q => {
        topicDist[q.primary_topic_id] = (topicDist[q.primary_topic_id] || 0) + 1;
        diffDist[q.difficulty || 3] = (diffDist[q.difficulty || 3] || 0) + 1;
      });

      return {
        jobId: 'job_' + p.id,
        pdfId: p.id,
        pdfTitle: p.title,
        pageCount: p.page_count || 4,
        detectedQuestionCount: pQuestions.length,
        confidenceScore: 0.93,
        topicDistribution: topicDist,
        difficultyDistribution: diffDist,
        warningList: [],
        extractedQuestions: pQuestions.map(q => ({
          id: q.id,
          pdfId: q.pdf_id,
          pdfTitle: p.title,
          questionNo: q.question_no,
          pageNo: q.page_no,
          questionText: q.question_text,
          options: typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json,
          correctAnswer: q.correct_answer,
          primaryTopicId: q.primary_topic_id,
          primaryTopicName: q.primary_topic_id,
          questionType: q.question_type || 'yeni_nesil',
          difficulty: q.difficulty || 3,
          confidence: q.confidence || 0.9,
          hasVisual: q.question_type === 'grafik_tablo' || q.question_type === 'geometrik_gorsel',
          approvalStatus: q.approval_status || 'approved'
        }))
      };
    });

    // 4. Karşılaştırmalı matris analizi (Section 4)
    const comparative = runComparativeCrossPdfAnalysis(analyses);

    return NextResponse.json({
      success: true,
      pdfs,
      totalExtractedCount: extractedList.length,
      comparative
    });
  } catch (error: any) {
    console.error('Error fetching PDF analysis:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Eskiden burada PDF'e bakmadan örnek sorular üretiliyordu. Gerçek çıkarma artık tarayıcıda
// yapılıp /api/lgs/pdf-extract ile kaydediliyor (PDF Analiz sayfası).
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Bu uç nokta kaldırıldı. Soru çıkarmak için PDF Analiz sayfasını kullanın (/api/lgs/pdf-extract).' },
    { status: 410 }
  );
}
