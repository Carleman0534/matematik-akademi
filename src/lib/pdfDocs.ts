import { getDb, saveDb } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';

export interface PdfDocument {
  id: string;
  teacher_id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_type: 'deneme' | 'soru_bankasi' | 'cevap_anahtari' | 'cozum' | 'calisma_foyu' | 'diger';
  subject: string;
  grade_level: string;
  topic?: string;
  publisher?: string;
  file_size_mb?: number;
  page_count?: number;
  description?: string;
  answer_key?: string;
  question_count?: number;
  file_data?: string;
  is_archived?: boolean | number;
  created_at: string;
}

export interface ExamAssignment {
  id: string;
  exam_id: string;
  student_id: string;
  assigned_by: string;
  assigned_at: string;
  starts_at?: string;
  due_at?: string;
  duration_min: number;
  extra_time_min: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
}

export async function getPdfDocuments(options: {
  teacherId?: string;
  fileType?: string;
  gradeLevel?: string;
  search?: string;
  isArchived?: boolean;
} = {}): Promise<PdfDocument[]> {
  const db = await getDb();
  let query = 'SELECT * FROM pdf_documents WHERE 1=1';
  const params: (string | number)[] = [];

  if (options.fileType && options.fileType !== 'ALL') {
    query += ' AND file_type = ?';
    params.push(options.fileType);
  }

  if (options.gradeLevel && options.gradeLevel !== 'ALL') {
    query += ' AND grade_level = ?';
    params.push(options.gradeLevel);
  }

  if (options.isArchived !== undefined) {
    query += ' AND is_archived = ?';
    params.push(options.isArchived ? 1 : 0);
  } else {
    query += ' AND is_archived = 0';
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  stmt.bind(params);

  const docs: PdfDocument[] = [];
  while (stmt.step()) {
    docs.push(stmt.getAsObject() as unknown as PdfDocument);
  }
  stmt.free();

  if (options.search) {
    const s = options.search.toLowerCase();
    return docs.filter(
      d =>
        d.title?.toLowerCase().includes(s) ||
        d.description?.toLowerCase().includes(s) ||
        d.topic?.toLowerCase().includes(s) ||
        d.publisher?.toLowerCase().includes(s)
    );
  }

  return docs;
}

export async function getPdfDocument(id: string): Promise<PdfDocument | null> {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM pdf_documents WHERE id = ?');
  stmt.bind([id]);
  let doc: PdfDocument | null = null;
  if (stmt.step()) {
    doc = stmt.getAsObject() as unknown as PdfDocument;
  }
  stmt.free();
  return doc;
}

export async function createPdfDocument(data: Omit<PdfDocument, 'id' | 'created_at'> & { id?: string }): Promise<PdfDocument> {
  const db = await getDb();
  const id = data.id || uuidv4();
  db.run(
    `INSERT INTO pdf_documents (id, teacher_id, title, file_name, file_path, file_type, subject, grade_level, topic, publisher, file_size_mb, page_count, description, answer_key, question_count, file_data, is_archived)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.teacher_id,
      data.title,
      data.file_name,
      data.file_path,
      data.file_type || 'deneme',
      data.subject || 'Matematik',
      data.grade_level || 'TYT',
      data.topic || '',
      data.publisher || '',
      data.file_size_mb || 0,
      data.page_count || 1,
      data.description || '',
      data.answer_key || '',
      data.question_count || 40,
      data.file_data || null,
      data.is_archived ? 1 : 0,
    ]
  );
  saveDb();
  return (await getPdfDocument(id))!;
}

export async function deletePdfDocument(id: string): Promise<boolean> {
  const db = await getDb();
  db.run('DELETE FROM pdf_documents WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function archivePdfDocument(id: string, isArchived: boolean = true): Promise<boolean> {
  const db = await getDb();
  db.run('UPDATE pdf_documents SET is_archived = ? WHERE id = ?', [isArchived ? 1 : 0, id]);
  saveDb();
  return true;
}

// TOPLU DENEME ATAMA
export async function batchAssignExamToStudents(params: {
  examId: string;
  studentIds: string[];
  assignedBy: string;
  startsAt?: string;
  dueAt?: string;
  durationMin?: number;
}): Promise<{ success: boolean; assignedCount: number }> {
  const db = await getDb();
  let count = 0;
  const duration = params.durationMin || 60;

  for (const studentId of params.studentIds) {
    const assignId = uuidv4();
    db.run(
      `INSERT INTO exam_assignments (id, exam_id, student_id, assigned_by, starts_at, due_at, duration_min, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'assigned')
       ON CONFLICT(exam_id, student_id) DO UPDATE SET
         starts_at = excluded.starts_at,
         due_at = excluded.due_at,
         duration_min = excluded.duration_min,
         status = 'assigned'`,
      [assignId, params.examId, studentId, params.assignedBy, params.startsAt || null, params.dueAt || null, duration]
    );

    // Oturum (exam_sessions) kaydını da hazırla
    const sessionId = uuidv4();
    const deadline = params.dueAt || new Date(Date.now() + duration * 60000).toISOString();
    db.run(
      `INSERT OR IGNORE INTO exam_sessions (id, exam_id, student_id, deadline, current_q)
       VALUES (?, ?, ?, ?, 1)`,
      [sessionId, params.examId, studentId, deadline]
    );

    count++;
  }

  // Event audit log
  const eventId = uuidv4();
  db.run(
    `INSERT INTO exam_events (id, exam_id, performed_by, event_type, details)
     VALUES (?, ?, ?, 'assigned', ?)`,
    [eventId, params.examId, params.assignedBy, JSON.stringify({ student_count: count, duration })]
  );

  saveDb();
  return { success: true, assignedCount: count };
}

export interface StudentExamItem {
  assignment_id: string;
  exam_id: string;
  assignment_status: string;
  starts_at?: string | null;
  due_at?: string | null;
  duration_min: number;
  extra_time_min: number;
  exam_title: string;
  instructions?: string | null;
  question_count: number;
  default_duration: number;
  session_id?: string | null;
  started_at?: string | null;
  deadline?: string | null;
  submitted_at?: string | null;
  pdf_url?: string | null;
  page_count?: number | null;
}

// ÖĞRENCİNİN DENEMELERİ (Yaklaşan, Devam Eden, Tamamlanan, Süresi Dolan)
export async function getStudentExamList(studentId: string) {
  const db = await getDb();
  const query = `
    SELECT 
      ea.id as assignment_id,
      ea.exam_id,
      ea.status as assignment_status,
      ea.starts_at,
      ea.due_at,
      ea.duration_min,
      ea.extra_time_min,
      e.title as exam_title,
      e.instructions,
      e.question_count,
      e.duration_min as default_duration,
      es.id as session_id,
      es.started_at,
      es.deadline,
      es.submitted_at,
      p.file_path as pdf_url,
      p.page_count
    FROM exam_assignments ea
    JOIN exams e ON e.id = ea.exam_id
    LEFT JOIN exam_sessions es ON es.exam_id = ea.exam_id AND es.student_id = ea.student_id
    LEFT JOIN pdf_documents p ON p.id = e.id OR p.title = e.title
    WHERE ea.student_id = ?
    ORDER BY ea.assigned_at DESC
  `;

  const stmt = db.prepare(query);
  stmt.bind([studentId]);

  const exams: StudentExamItem[] = [];
  while (stmt.step()) {
    exams.push(stmt.getAsObject() as unknown as StudentExamItem);
  }
  stmt.free();

  const now = new Date().getTime();

  return {
    active: exams.filter(e => !e.submitted_at && (!e.deadline || new Date(e.deadline).getTime() > now) && (!e.starts_at || new Date(e.starts_at).getTime() <= now)),
    upcoming: exams.filter(e => !!(e.starts_at && new Date(e.starts_at).getTime() > now && !e.submitted_at)),
    completed: exams.filter(e => !!e.submitted_at),
    expired: exams.filter(e => !e.submitted_at && !!e.deadline && new Date(e.deadline).getTime() <= now),
  };
}

// CEVAP ANAHTARI DEĞİŞİNCE GEÇMİŞ DENEMELERİ YENİDEN DEĞERLENDİRME (RE-EVALUATE)
export async function recalculateExamResults(examId: string, performedBy?: string) {
  const db = await getDb();

  // Deneme ayarları
  const eStmt = db.prepare('SELECT question_count, penalty_divisor FROM exams WHERE id = ?');
  eStmt.bind([examId]);
  let questionCount = 40;
  let penaltyDivisor = 4;
  if (eStmt.step()) {
    const eRow = eStmt.getAsObject() as { question_count?: number; penalty_divisor?: number };
    questionCount = eRow.question_count || 40;
    penaltyDivisor = eRow.penalty_divisor ?? 4;
  }
  eStmt.free();

  // Güncel cevap anahtarı
  const keyStmt = db.prepare('SELECT question_no, correct FROM exam_key WHERE exam_id = ?');
  keyStmt.bind([examId]);
  const correctKey = new Map<number, string>();
  while (keyStmt.step()) {
    const row = keyStmt.getAsObject() as { question_no: number; correct: string };
    if (row.correct) correctKey.set(row.question_no, row.correct);
  }
  keyStmt.free();

  // Tamamlanmış tüm oturumlar
  const sStmt = db.prepare('SELECT id, student_id FROM exam_sessions WHERE exam_id = ? AND submitted_at IS NOT NULL');
  sStmt.bind([examId]);
  const sessions: { id: string; student_id: string }[] = [];
  while (sStmt.step()) {
    sessions.push(sStmt.getAsObject() as unknown as { id: string; student_id: string });
  }
  sStmt.free();

  let recalculatedCount = 0;

  for (const sess of sessions) {
    const ansStmt = db.prepare('SELECT question_no, answer FROM exam_answers WHERE session_id = ?');
    ansStmt.bind([sess.id]);
    const studentAnswers = new Map<number, string>();
    while (ansStmt.step()) {
      const aRow = ansStmt.getAsObject() as { question_no: number; answer: string };
      if (aRow.answer) studentAnswers.set(aRow.question_no, aRow.answer);
    }
    ansStmt.free();

    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;

    for (let q = 1; q <= questionCount; q++) {
      const studentAns = studentAnswers.get(q);
      const correctAns = correctKey.get(q);
      if (!studentAns) {
        blankCount++;
      } else if (correctAns && studentAns === correctAns) {
        correctCount++;
      } else {
        wrongCount++;
      }
    }

    const netScore = penaltyDivisor > 0
      ? parseFloat((correctCount - wrongCount / penaltyDivisor).toFixed(2))
      : correctCount;

    // Eski sonucu alıp loglayalım
    const oldResStmt = db.prepare('SELECT net_score FROM exam_results WHERE exam_id = ? AND student_id = ?');
    oldResStmt.bind([examId, sess.student_id]);
    let oldNet: number | null = null;
    if (oldResStmt.step()) {
      const r = oldResStmt.getAsObject() as { net_score?: number };
      oldNet = r.net_score ?? null;
    }
    oldResStmt.free();

    const resultId = uuidv4();
    db.run(
      `INSERT OR REPLACE INTO exam_results (id, exam_id, student_id, correct_count, wrong_count, blank_count, net_score, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [resultId, examId, sess.student_id, correctCount, wrongCount, blankCount, netScore]
    );

    db.run(
      `INSERT INTO exam_events (id, exam_id, session_id, student_id, performed_by, event_type, details)
       VALUES (?, ?, ?, ?, ?, 'recalculated', ?)`,
      [
        uuidv4(),
        examId,
        sess.id,
        sess.student_id,
        performedBy || 'teacher-admin',
        JSON.stringify({ oldNet, newNet: netScore, correctCount, wrongCount, blankCount })
      ]
    );

    recalculatedCount++;
  }

  saveDb();
  return { success: true, recalculatedCount };
}

// SINAV SÜRESİ UZATMA
export async function extendStudentExamTime(sessionId: string, extraMinutes: number, performedBy?: string) {
  const db = await getDb();
  const sStmt = db.prepare('SELECT * FROM exam_sessions WHERE id = ?');
  sStmt.bind([sessionId]);
  if (!sStmt.step()) {
    sStmt.free();
    throw new Error('Oturum bulunamadı.');
  }
  const sess = sStmt.getAsObject() as { id: string; exam_id: string; student_id: string; deadline: string };
  sStmt.free();

  const currentDeadline = new Date(sess.deadline).getTime();
  const baseTime = Math.max(Date.now(), isNaN(currentDeadline) ? Date.now() : currentDeadline);
  const newDeadline = new Date(baseTime + extraMinutes * 60000).toISOString();

  db.run('UPDATE exam_sessions SET deadline = ?, submitted_at = NULL WHERE id = ?', [newDeadline, sessionId]);
  db.run('UPDATE exam_assignments SET extra_time_min = extra_time_min + ?, status = "in_progress" WHERE exam_id = ? AND student_id = ?', [extraMinutes, sess.exam_id, sess.student_id]);

  db.run(
    `INSERT INTO exam_events (id, exam_id, session_id, student_id, performed_by, event_type, details)
     VALUES (?, ?, ?, ?, ?, 'time_extended', ?)`,
    [uuidv4(), sess.exam_id, sessionId, sess.student_id, performedBy || 'teacher-admin', JSON.stringify({ extraMinutes, newDeadline })]
  );

  saveDb();
  return { success: true, newDeadline };
}

// SINAVI YENİDEN AÇMA
export async function reopenStudentExam(sessionId: string, extraMinutes: number = 30, performedBy?: string) {
  const db = await getDb();
  const sStmt = db.prepare('SELECT * FROM exam_sessions WHERE id = ?');
  sStmt.bind([sessionId]);
  if (!sStmt.step()) {
    sStmt.free();
    throw new Error('Oturum bulunamadı.');
  }
  const sess = sStmt.getAsObject() as { id: string; exam_id: string; student_id: string };
  sStmt.free();

  const newDeadline = new Date(Date.now() + extraMinutes * 60000).toISOString();
  db.run('UPDATE exam_sessions SET deadline = ?, submitted_at = NULL WHERE id = ?', [newDeadline, sessionId]);
  db.run('UPDATE exam_assignments SET status = "in_progress", extra_time_min = extra_time_min + ? WHERE exam_id = ? AND student_id = ?', [extraMinutes, sess.exam_id, sess.student_id]);

  db.run(
    `INSERT INTO exam_events (id, exam_id, session_id, student_id, performed_by, event_type, details)
     VALUES (?, ?, ?, ?, ?, 'reopened', ?)`,
    [uuidv4(), sess.exam_id, sessionId, sess.student_id, performedBy || 'teacher-admin', JSON.stringify({ extraMinutes, newDeadline })]
  );

  saveDb();
  return { success: true, newDeadline };
}

// YANLIŞ VE BOŞ SORULARI KİŞİSEL SORU BANKASINA AKTARMA
export async function transferWrongQuestionsToBank(examId: string, studentId?: string) {
  const db = await getDb();

  // Deneme bilgisi
  const eStmt = db.prepare('SELECT title, question_count FROM exams WHERE id = ?');
  eStmt.bind([examId]);
  let examTitle = 'PDF Deneme Sınavı';
  let questionCount = 40;
  if (eStmt.step()) {
    const e = eStmt.getAsObject() as { title?: string; question_count?: number };
    examTitle = e.title || examTitle;
    questionCount = e.question_count || 40;
  }
  eStmt.free();

  // Cevap anahtarı
  const keyStmt = db.prepare('SELECT question_no, correct, topic_id FROM exam_key WHERE exam_id = ?');
  keyStmt.bind([examId]);
  const correctKey = new Map<number, { correct: string; topic_id?: string }>();
  while (keyStmt.step()) {
    const row = keyStmt.getAsObject() as { question_no: number; correct: string; topic_id?: string };
    if (row.correct) correctKey.set(row.question_no, { correct: row.correct, topic_id: row.topic_id });
  }
  keyStmt.free();

  // Oturumları bul
  let sessionQuery = 'SELECT id, student_id FROM exam_sessions WHERE exam_id = ? AND submitted_at IS NOT NULL';
  const sParams: string[] = [examId];
  if (studentId) {
    sessionQuery += ' AND student_id = ?';
    sParams.push(studentId);
  }
  const sStmt = db.prepare(sessionQuery);
  sStmt.bind(sParams);
  const sessions: { id: string; student_id: string }[] = [];
  while (sStmt.step()) {
    sessions.push(sStmt.getAsObject() as unknown as { id: string; student_id: string });
  }
  sStmt.free();

  let transferredCount = 0;

  for (const sess of sessions) {
    const ansStmt = db.prepare('SELECT question_no, answer FROM exam_answers WHERE session_id = ?');
    ansStmt.bind([sess.id]);
    const answers = new Map<number, string>();
    while (ansStmt.step()) {
      const a = ansStmt.getAsObject() as { question_no: number; answer: string };
      if (a.answer) answers.set(a.question_no, a.answer);
    }
    ansStmt.free();

    for (let q = 1; q <= questionCount; q++) {
      const studentAns = answers.get(q);
      const keyObj = correctKey.get(q);
      const isBlank = !studentAns;
      const isWrong = !isBlank && (!keyObj?.correct || studentAns !== keyObj.correct);

      if (isBlank || isWrong) {
        const qId = uuidv4();
        const initialStatus = isBlank ? 'blank' : 'wrong';

        db.run(
          `INSERT INTO questions (id, student_id, topic_id, question_no, question_text, correct_answer, student_answer, question_type, initial_status, learning_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'))`,
          [
            qId,
            sess.student_id,
            keyObj?.topic_id || null,
            String(q),
            `${examTitle} - Soru ${q}`,
            keyObj?.correct || null,
            studentAns || null,
            initialStatus,
            initialStatus
          ]
        );

        // İlk deneme kaydını at
        db.run(
          `INSERT INTO question_attempts (id, question_id, result, notes, attempted_at)
           VALUES (?, ?, ?, ?, datetime('now'))`,
          [uuidv4(), qId, initialStatus, `${examTitle} sınavından aktarıldı`]
        );

        transferredCount++;
      }
    }

    db.run("UPDATE exam_sessions SET transferred_at = datetime('now') WHERE id = ?", [sess.id]);
  }

  saveDb();
  return { success: true, transferredCount };
}
