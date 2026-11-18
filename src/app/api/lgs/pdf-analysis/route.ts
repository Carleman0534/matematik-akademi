import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { analyzePdfDocument, runComparativeCrossPdfAnalysis, type PdfAnalysisSummary } from '@/lib/ai/pdfAnalyzer';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();

    // 1. Kayıtlı PDF listesi
    const pdfRes = db.exec("SELECT * FROM pdf_documents WHERE is_archived = 0 ORDER BY created_at DESC");
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pdfIds } = body;

    const db = await getDb();
    const targetPdfIds: string[] = Array.isArray(pdfIds) && pdfIds.length > 0
      ? pdfIds
      : ['pdf-1', 'pdf-2'];

    const newExtractedCount = [];

    for (const pid of targetPdfIds) {
      // PDF detayını bul
      const pRes = db.exec(`SELECT * FROM pdf_documents WHERE id = '${pid}'`);
      const pTitle = pRes.length > 0 ? String(pRes[0].values[0][pRes[0].columns.indexOf('title')]) : 'LGS Denemesi';
      const pPages = pRes.length > 0 ? Number(pRes[0].values[0][pRes[0].columns.indexOf('page_count')] || 4) : 4;

      // PDF'i analiz et
      const analysis = analyzePdfDocument(pid, pTitle, pPages, 10);

      // Görevi kaydet
      const jobStmt = db.prepare(`
        INSERT OR REPLACE INTO pdf_analysis_jobs 
        (id, pdf_id, teacher_id, status, page_count, detected_question_count, summary_json, confidence_score, completed_at)
        VALUES (?, ?, 'teacher-admin', 'completed', ?, ?, ?, ?, datetime('now'))
      `);
      jobStmt.run([
        analysis.jobId,
        pid,
        analysis.pageCount,
        analysis.detectedQuestionCount,
        JSON.stringify(analysis.topicDistribution),
        analysis.confidenceScore
      ]);
      jobStmt.free();

      // Soruları kaydet
      const qStmt = db.prepare(`
        INSERT OR REPLACE INTO pdf_extracted_questions 
        (id, job_id, pdf_id, question_no, page_no, question_text, options_json, correct_answer, primary_topic_id, question_type, difficulty, confidence, approval_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `);

      for (const q of analysis.extractedQuestions) {
        qStmt.run([
          q.id,
          analysis.jobId,
          pid,
          q.questionNo,
          q.pageNo,
          q.questionText,
          JSON.stringify(q.options),
          q.correctAnswer || 'A',
          q.primaryTopicId,
          q.questionType,
          q.difficulty,
          q.confidence
        ]);
      }
      qStmt.free();

      newExtractedCount.push({ pdfId: pid, questions: analysis.extractedQuestions.length });
    }

    saveDb(db);

    return NextResponse.json({
      success: true,
      message: `${targetPdfIds.length} adet PDF analiz edildi ve sorular sisteme aktarıldı.`,
      details: newExtractedCount
    });
  } catch (error: any) {
    console.error('Error analyzing PDFs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
