const { getDb, saveDb } = require('../src/lib/db/database.ts');
const bcrypt = require('bcryptjs');

async function main() {
  const db = await getDb();
  const aHash = bcrypt.hashSync('admin123', 10);
  const pHash = bcrypt.hashSync('password123', 10);

  // Both bcrypt hash and plain text fallback
  db.run("UPDATE users SET password = ? WHERE email = ?", [aHash, 'ogretmen@test.com']);
  db.run("UPDATE users SET password = ? WHERE email != ?", [pHash, 'ogretmen@test.com']);
  await saveDb();
  console.log('User passwords set in SQLite: admin123 for teacher, password123 for others');
}

main().catch(console.error);
