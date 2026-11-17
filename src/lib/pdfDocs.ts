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
  const params: any[] = [];

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
    docs.push(stmt.getAsObject() as any);
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
    doc = stmt.getAsObject() as any;
  }
  stmt.free();
  return doc;
}

export async function createPdfDocument(data: Omit<PdfDocument, 'id' | 'created_at'>): Promise<PdfDocument> {
  const db = await getDb();
  const id = uuidv4();
  db.run(
    `INSERT INTO pdf_documents (id, teacher_id, title, file_name, file_path, file_type, subject, grade_level, topic, publisher, file_size_mb, page_count, description, answer_key, question_count, is_archived)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  const exams: any[] = [];
  while (stmt.step()) {
    exams.push(stmt.getAsObject());
  }
  stmt.free();

  const now = new Date().getTime();

  return {
    active: exams.filter(e => !e.submitted_at && (!e.deadline || new Date(e.deadline).getTime() > now) && (!e.starts_at || new Date(e.starts_at).getTime() <= now)),
    upcoming: exams.filter(e => e.starts_at && new Date(e.starts_at).getTime() > now && !e.submitted_at),
    completed: exams.filter(e => !!e.submitted_at),
    expired: exams.filter(e => !e.submitted_at && e.deadline && new Date(e.deadline).getTime() <= now),
  };
}
