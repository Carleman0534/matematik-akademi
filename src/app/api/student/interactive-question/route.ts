import { NextResponse } from 'next/server';
import { getDb, commitDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const body = await req.json();
    const { questionId, questionText, solutionExplanation, action, topicId } = body;

    // 1. Düşündürücü İpucu (Hint)
    if (action === 'get_hint') {
      let hint = 'İpucu: Soruda bütünden parçaya mı (EBOB) yoksa parçadan bütüne mi (EKOK) gidildiğine dikkat edin. Verilen sayıların asal çarpanlarını ayırarak ortak bölenleri belirleyin.';
      if (questionText && questionText.toLowerCase().includes('üs')) {
        hint = 'İpucu: Tabanları aynı olan üslü ifadeler çarpılırken üsler toplanır, bölünürken çıkarılır. Ortak paranteze almayı deneyin.';
      } else if (questionText && questionText.toLowerCase().includes('kök')) {
        hint = 'İpucu: Kök içindeki sayıyı a√b biçiminde yazarak tam kare olan çarpanı kök dışına çıkarın.';
      }
      return NextResponse.json({ success: true, hint });
    }

    // 2. İlk Çözüm Adımı (First Step)
    if (action === 'first_step') {
      const step = '1. Adım: Verilen sayıları ve istenen kısıtları listeleyin. Örneğin 24 ve 36 sayılarının ortak bölenlerini bulmak için asal çarpan algoritmasını başlatın: 24 = 2³ · 3, 36 = 2² · 3². Ortak çarpanların en küçük üslerini alarak EBOB değerine ulaşın.';
      return NextResponse.json({ success: true, step });
    }

    // 3. Detaylı Çözüm (Full Solution)
    if (action === 'full_solution') {
      const solution = solutionExplanation || 'Detaylı Çözüm: Problemin çözümünde ilk olarak ortak bölen hesaplanır. EBOB(24, 36) = 12 bulunur. Dikdörtgenin çevresi 2 · (24 + 36) = 120 birimdir. İki ağaç arası mesafe 12 birim olduğundan toplam ağaç sayısı 120 / 12 = 10 olarak hesaplanır.';
      return NextResponse.json({ success: true, solution });
    }

    // 4. Benzer Soru Çöz (Similar Question)
    if (action === 'similar_question') {
      return NextResponse.json({
        success: true,
        similarQuestion: {
          id: 'sim-' + Date.now(),
          text: 'Kenar uzunlukları 45 m ve 75 m olan dikdörtgen şeklindeki bir bahçe eşit büyüklükte kare parsellere ayrılacaktır. En az kaç parsel elde edilir?',
          options: { A: '12', B: '15', C: '18', D: '20' },
          correctAnswer: 'B',
          explanation: 'EBOB(45, 75) = 15 m. Parsel sayısı = (45 · 75) / (15 · 15) = 3 · 5 = 15 parsel.'
        }
      });
    }

    // 5. Aralıklı Tekrar Listeme Ekle (Add to Review)
    if (action === 'add_to_review') {
      const studentId = session.studentId || session.userId;
      const db = await getDb();
      const id = 'sr-user-' + Date.now();

      db.run(`
        INSERT INTO spaced_repetition_items (
          id, student_id, topic_id, source_type, source_id, question_text,
          repetition_level, interval_days, next_review_at, forgetting_risk
        ) VALUES (?, ?, ?, 'question', ?, ?, 1, 1, datetime('now', '+1 day'), 'orta')
      `, [
        id,
        studentId,
        topicId || 'top_carpanlar_katlar',
        questionId || 'manual-q',
        questionText || 'Öğrencinin tekrar listesine eklediği pekiştirme sorusu'
      ]);

      await commitDb();
      return NextResponse.json({ success: true, message: 'Soru aralıklı tekrar kuyruğunuza eklendi! Yarın yeniden çözmek üzere hatırlatılacaktır.' });
    }

    // 6. Soru Çözüm Denemesini Kaydet (Record Attempt & Mistakes)
    if (action === 'record_attempt') {
      const targetStudentId = body.studentId || session.studentId || session.userId;
      const isCorrect = Boolean(body.isCorrect);
      const db = await getDb();
      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      if (!isCorrect) {
        // Yanlış soruyu öğrencinin yanlış havuzuna ekle
        db.run(`
          INSERT OR REPLACE INTO questions (
            id, student_id, question_number, difficulty, question_type,
            correct_answer, student_answer, solution, teacher_note, student_note, learning_status, created_at, updated_at
          ) VALUES (?, ?, 1, 'medium', 'wrong', ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))
        `, [
          attemptId,
          targetStudentId,
          body.correctAnswer || 'A',
          body.studentAnswer || 'B',
          body.solutionExplanation || 'Çözüm hazır.',
          `İpucuyla Soru Çöz: ${body.topicName || 'Matematik'}`,
          body.questionText || ''
        ]);

        // Akıllı yanlış analizine ekle (Öğretmen panelinde doğrudan gözüksün)
        db.run(`
          INSERT OR REPLACE INTO smart_mistake_analyses (
            id, student_id, question_id, topic_id, student_answer, correct_answer,
            primary_error_type, ai_probability, ai_reasoning_explanation, teacher_note, verified_by_teacher, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'dikkat_eksikligi', 0.88, ?, ?, 0, datetime('now'))
        `, [
          `sma_${attemptId}`,
          targetStudentId,
          questionId || attemptId,
          topicId || 'top_carpanlar_katlar',
          body.studentAnswer || 'B',
          body.correctAnswer || 'A',
          `${body.topicName || 'LGS'} konusunda dikkat hatası yapıldı. Çözüm adımlarını tekrar inceleyiniz.`,
          `Etkileşimli Soru Çözümü: ${body.topicName || 'Matematik'}`
        ]);
      }

      await commitDb();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Geçersiz etkileşim işlemi' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'İşlem başarısız' }, { status: 500 });
  }
}
