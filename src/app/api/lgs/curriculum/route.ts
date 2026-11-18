import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { INITIAL_LGS_TOPICS, type CurriculumTopic } from '@/lib/ai/lgsCurriculum';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = 'SELECT * FROM curriculum_topics';
    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY sort_order ASC, name ASC';

    const res = db.exec(query);
    const flatTopics: any[] = [];
    if (res.length > 0) {
      const cols = res[0].columns;
      for (const row of res[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        flatTopics.push(obj);
      }
    }

    // Outcomes
    const outRes = db.exec('SELECT * FROM curriculum_outcomes ORDER BY sort_order ASC');
    const outcomes: any[] = [];
    if (outRes.length > 0) {
      const cols = outRes[0].columns;
      for (const row of outRes[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        outcomes.push(obj);
      }
    }

    // Ağaç yapısı oluştur (roots + subtopics)
    const topicMap = new Map<string, any>();
    const roots: any[] = [];

    flatTopics.forEach(t => {
      topicMap.set(t.id, { ...t, subtopics: [] });
    });

    topicMap.forEach(t => {
      if (t.parent_id && topicMap.has(t.parent_id)) {
        topicMap.get(t.parent_id).subtopics.push(t);
      } else if (!t.parent_id) {
        roots.push(t);
      }
    });

    return NextResponse.json({
      success: true,
      tree: roots,
      flat: flatTopics,
      outcomes
    });
  } catch (error: any) {
    console.error('Error fetching curriculum:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, parentId, gradeLevel = 8, description = '' } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Konu adı zorunludur' }, { status: 400 });
    }

    const db = await getDb();
    const id = 'top_' + Math.random().toString(36).substring(2, 10);
    const generatedCode = code || ('LGS_USR_' + Math.floor(Math.random() * 900 + 100));

    const stmt = db.prepare(`
      INSERT INTO curriculum_topics (id, code, name, parent_id, grade_level, sort_order, is_active, description)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);
    stmt.run([id, generatedCode, name.trim(), parentId || null, gradeLevel, 99, description]);
    stmt.free();

    saveDb(db);

    return NextResponse.json({
      success: true,
      topic: { id, code: generatedCode, name: name.trim(), parent_id: parentId || null }
    });
  } catch (error: any) {
    console.error('Error adding topic:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Konu kimliği belirtilmedi' }, { status: 400 });
    }

    const db = await getDb();
    if (name !== undefined) {
      db.run('UPDATE curriculum_topics SET name = ? WHERE id = ?', [name.trim(), id]);
    }
    if (sortOrder !== undefined) {
      db.run('UPDATE curriculum_topics SET sort_order = ? WHERE id = ?', [Number(sortOrder), id]);
    }
    if (isActive !== undefined) {
      db.run('UPDATE curriculum_topics SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
    }

    saveDb(db);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating topic:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Konu kimliği belirtilmedi' }, { status: 400 });
    }

    const db = await getDb();
    db.run('DELETE FROM curriculum_topics WHERE id = ? OR parent_id = ?', [id, id]);
    saveDb(db);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting topic:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
