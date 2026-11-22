// Verilen kullanıcılara rastgele parola üretir, bcrypt hash'ini data/app.db'ye yazar
// ve açık parolaları data/yerel-parolalar.txt dosyasına ekler (git'e girmez).
// Kullanım (sunucu kapalıyken): node scripts/set-passwords.js <kullanici_id> [<kullanici_id> ...]
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'app.db');
const OUT_PATH = path.join(ROOT, 'data', 'yerel-parolalar.txt');

// Karıştırılması kolay harfler (0/O, 1/l/I) çıkarıldı.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomPassword(len = 12) {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return s;
}

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error('Kullanım: node scripts/set-passwords.js <kullanici_id> [...]');
    process.exit(1);
  }
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const lines = [];
  for (const id of ids) {
    const r = db.exec('SELECT email, name FROM users WHERE id = ?', [id]);
    if (!r.length || !r[0].values.length) {
      console.error(`Kullanıcı bulunamadı: ${id}`);
      process.exit(1);
    }
    const [email, name] = r[0].values[0];
    const password = randomPassword();
    db.run('UPDATE users SET password = ? WHERE id = ?', [bcrypt.hashSync(password, 10), id]);
    lines.push(`${name}\tgiriş: ${String(email).split('@')[0]} (ya da ${email})\tparola: ${password}`);
  }
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  fs.appendFileSync(OUT_PATH, `# ${new Date().toISOString()}\n${lines.join('\n')}\n`, 'utf8');
  console.log(`${ids.length} hesabın parolası güncellendi; parolalar ${path.relative(ROOT, OUT_PATH)} dosyasında.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
