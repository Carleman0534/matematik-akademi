import 'server-only';
import { getDb, commitDb } from '@/lib/db/database';
import { parseVisibleFeatures, STUDENT_FEATURES } from '@/lib/studentFeatures';

const SETTING_KEY = 'student_visible_features';

// Öğrenci panelinde görünür bölümler (ayar yoksa varsayılan)
export async function getVisibleStudentFeatures(): Promise<string[]> {
  try {
    const db = await getDb();
    const st = db.prepare('SELECT value FROM app_settings WHERE key = ?');
    st.bind([SETTING_KEY]);
    const raw = st.step() ? String((st.getAsObject() as { value: string }).value) : null;
    st.free();
    return parseVisibleFeatures(raw);
  } catch {
    return parseVisibleFeatures(null);
  }
}

export async function setVisibleStudentFeatures(keys: string[]): Promise<string[]> {
  const known = new Set(STUDENT_FEATURES.map(f => f.key));
  const clean = Array.from(new Set(keys.filter(k => known.has(k))));
  const db = await getDb();
  db.run(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [SETTING_KEY, JSON.stringify(clean)]
  );
  await commitDb();
  return clean;
}
