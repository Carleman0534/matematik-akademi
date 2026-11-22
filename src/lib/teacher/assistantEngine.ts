import type { Database } from 'sql.js';

export interface AssistantInsight {
  query: string;
  directAnswer: string;
  supportingData: any[];
  proposedActions?: Array<{
    actionType: 'create_study_plan' | 'assign_homework' | 'schedule_lesson' | 'send_parent_note';
    title: string;
    studentId?: string;
    topicId?: string;
    payload: any;
  }>;
}

/**
 * Matematik Akademi Asistanı - Veritabanına Dayalı Akıllı Analiz Motoru
 */
export function analyzeTeacherQuery(db: Database, queryText: string, teacherId?: string): AssistantInsight {
  const q = queryText.toLowerCase();

  // 1. "hangi öğrencilerimle çarpanlar ve katlar çalışmalıyım" / "çarpanlar ve katlar zorlananlar"
  if (q.includes('çarpanlar') || q.includes('ebob') || q.includes('ekok')) {
    const res = db.exec(`
      SELECT s.id as student_id, u.name as student_name, p.mastery_score, p.status, p.wrong_count
      FROM student_topic_performance p
      JOIN students s ON p.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN curriculum_topics t ON p.topic_id = t.id
      WHERE t.id = 'top_carpanlar_katlar' OR t.parent_id = 'top_carpanlar_katlar'
      ORDER BY p.mastery_score ASC
      LIMIT 5
    `);

    const students: any[] = [];
    if (res.length > 0) {
      const cols = res[0].columns;
      for (const row of res[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        students.push(obj);
      }
    }

    const names = students.map(s => `${s.student_name} (%${s.mastery_score || 0} başarı)`).join(', ');

    return {
      query: queryText,
      directAnswer: students.length > 0 
        ? `Çarpanlar ve Katlar (EBOB-EKOK) konusunda en çok desteğe ihtiyaç duyan öğrencileriniz: ${names}. Bu öğrencilerle özellikle yeni nesil problem modelleme adımlarını pekiştirmeniz önerilir.`
        : 'Çarpanlar ve Katlar konusunda şu anda kritik eksikliği olan öğrenci tespit edilmedi.',
      supportingData: students,
      proposedActions: students.slice(0, 2).map(s => ({
        actionType: 'create_study_plan',
        title: `${s.student_name} için EBOB-EKOK Destek Seti Hazırla (20 Soru)`,
        studentId: s.student_id,
        topicId: 'top_carpanlar_katlar',
        payload: { questionCount: 20, difficulty: 3, focus: 'EBOB-EKOK Problemleri' }
      }))
    };
  }

  // 2. "neti düşen" / "deneme netleri gerileyenler"
  if (q.includes('düşen') || q.includes('gerileyen') || q.includes('net')) {
    const res = db.exec(`
      SELECT s.id as student_id, u.name as student_name,
             er.net_score, er.completed_at as created_at, e.title as exam_title
      FROM exam_results er
      JOIN students s ON er.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN exams e ON er.exam_id = e.id
      ORDER BY er.completed_at DESC
      LIMIT 50
    `);

    const sessions: any[] = [];
    if (res.length > 0) {
      const cols = res[0].columns;
      for (const row of res[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        sessions.push(obj);
      }
    }

    // Her öğrencinin son iki denemesi arasındaki net farkı (gerçek sonuçlardan)
    const byStudent = new Map<string, any[]>();
    for (const s of sessions) {
      const list = byStudent.get(s.student_id) || [];
      list.push(s);
      byStudent.set(s.student_id, list);
    }
    const changes = Array.from(byStudent.values())
      .filter(list => list.length >= 2)
      .map(list => ({
        student_id: list[0].student_id,
        student_name: list[0].student_name,
        last: Number(list[0].net_score) || 0,
        diff: (Number(list[0].net_score) || 0) - (Number(list[1].net_score) || 0),
      }));
    const falling = changes.filter(c => c.diff < 0).sort((a, b) => a.diff - b.diff);
    const fmt = (n: number) => n.toFixed(2);

    let directAnswer: string;
    if (sessions.length === 0) directAnswer = 'Henüz tamamlanmış deneme sonucu yok.';
    else if (changes.length === 0) directAnswer = 'Karşılaştırma için en az iki denemesi olan öğrenci yok.';
    else if (falling.length === 0) directAnswer = 'Son iki denemesinde neti düşen öğrenci yok.';
    else directAnswer = `Son iki denemesinde neti düşen öğrenciler: ${falling.map(c => `${c.student_name} (${fmt(c.diff)} net, son: ${fmt(c.last)})`).join(', ')}.`;

    return {
      query: queryText,
      directAnswer,
      supportingData: sessions.slice(0, 10),
      proposedActions: falling.slice(0, 2).map(c => ({
        actionType: 'schedule_lesson' as const,
        title: `${c.student_name} ile Deneme Hata Analizi Dersi Planla`,
        studentId: c.student_id,
        payload: { durationMin: 45, topic: 'Deneme Hata Analizi' }
      }))
    };
  }

  // 3. "tekrar çalışması yapmamış" / "aralıklı tekrar aksatanlar"
  if (q.includes('tekrar') || q.includes('unutma')) {
    const res = db.exec(`
      SELECT s.id as student_id, u.name as student_name, COUNT(sr.id) as pending_review_count
      FROM spaced_repetition_items sr
      JOIN students s ON sr.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE datetime(sr.next_review_at) <= datetime('now')
      GROUP BY s.id, u.name
      ORDER BY pending_review_count DESC
    `);

    const overdueList: any[] = [];
    if (res.length > 0) {
      const cols = res[0].columns;
      for (const row of res[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        overdueList.push(obj);
      }
    }

    return {
      query: queryText,
      directAnswer: overdueList.length > 0
        ? `Günü gelmiş tekrar sorularını henüz çözmemiş öğrencileriniz: ${overdueList.map(o => `${o.student_name} (${o.pending_review_count} bekleyen tekrar)`).join(', ')}. Ebbinghaus eğrisine göre gecikme arttıkça unutma riski artmaktadır.`
        : 'Tüm öğrencilerinizin aralıklı tekrar kuyruğu güncel durumdadır.',
      supportingData: overdueList,
      proposedActions: overdueList.map(o => ({
        actionType: 'send_parent_note',
        title: `${o.student_name} Velisine Tekrar Hatırlatması Gönder`,
        studentId: o.student_id,
        payload: { note: 'Öğrencimizin hafıza tazeleme amaçlı birkaç adet aralıklı tekrar sorusu bulunmaktadır.' }
      }))
    };
  }

  // 4. "ödev" / "ödevini yapmayanlar"
  if (q.includes('ödev') || q.includes('görev')) {
    const res = db.exec(`
      SELECT h.*, u.name as student_name
      FROM student_homework_assignments h
      JOIN students s ON h.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE h.status != 'completed'
      ORDER BY h.due_date ASC
    `);

    const hwList: any[] = [];
    if (res.length > 0) {
      const cols = res[0].columns;
      for (const row of res[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        hwList.push(obj);
      }
    }

    return {
      query: queryText,
      directAnswer: hwList.length > 0
        ? `Tamamlanmamış ${hwList.length} ödev var: ${Array.from(new Set(hwList.map(h => h.student_name))).join(', ')}.`
        : 'Tamamlanmamış ödev yok.',
      supportingData: hwList
    };
  }

  // 5. Genel özet (gerçek verilerden)
  const one = (sql: string) => { const r = db.exec(sql); return r.length && r[0].values.length ? r[0].values[0][0] : null; };
  const activeCount = Number(one(`SELECT COUNT(DISTINCT s.id) FROM students s JOIN users u ON u.id = s.user_id WHERE COALESCE(s.status, 'active') = 'active'`)) || 0;
  const avgMastery = one(`SELECT ROUND(AVG(p.mastery_score), 1) FROM student_topic_performance p JOIN students s ON s.id = p.student_id`);
  const weakRes = db.exec(`
    SELECT COALESCE(t.name, p.topic_id) AS name, ROUND(AVG(p.mastery_score)) AS avg
    FROM student_topic_performance p JOIN students s ON s.id = p.student_id
    LEFT JOIN curriculum_topics t ON t.id = p.topic_id
    GROUP BY p.topic_id ORDER BY avg ASC LIMIT 2
  `);
  const weak = weakRes.length ? weakRes[0].values.map(v => `${v[0]} (%${v[1]})`) : [];
  const activePlans = Number(one(`SELECT COUNT(*) FROM personalized_study_plans WHERE status = 'active'`)) || 0;

  return {
    query: queryText,
    directAnswer: avgMastery === null
      ? `${activeCount} aktif öğrenciniz var. Henüz konu performans verisi oluşmadı; öğrenciler deneme çözdükçe öneriler burada görünecek.`
      : `${activeCount} aktif öğrencinizin konu ortalaması %${avgMastery}.${weak.length ? ` En zayıf konular: ${weak.join(', ')}.` : ''}`,
    supportingData: [
      { metric: 'Aktif Öğrenci', value: activeCount },
      { metric: 'Ortalama Konu Başarısı', value: avgMastery === null ? '—' : `%${avgMastery}` },
      { metric: 'Aktif Çalışma Planı', value: activePlans }
    ],
    proposedActions: []
  };
}
