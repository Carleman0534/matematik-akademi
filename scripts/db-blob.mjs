// İnternet sürümünün (Vercel) veritabanını bilgisayara indirir ya da bilgisayardakini oraya gönderir.
//
//   node scripts/db-blob.mjs indir      → buluttaki veritabanını data/app.db'ye indirir
//                                         (eski data/app.db, data/app.db.yedek-<tarih> olarak saklanır)
//   node scripts/db-blob.mjs gonder --evet
//                                       → data/app.db'yi buluta gönderir; sitedeki veri
//                                         TAMAMEN bu dosyayla değişir (geri alınamaz, önce "indir" ile yedek alın)
//
// Gerekli: BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob deposu → .env.local sekmesi).
// .env.local dosyasına yazarsanız script oradan okur.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, put, list } from '@vercel/blob';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = path.join(ROOT, 'data', 'app.db');
const PATHNAME = process.env.DB_BLOB_PATHNAME || 'db/app.db';

// .env.local içindeki değişkenleri yükle (yalnızca tanımlı değilse)
const envFile = path.join(ROOT, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN bulunamadı. Vercel → Storage → Blob deposu → ".env.local" sekmesindeki satırı .env.local dosyasına ekleyin.');
  process.exit(1);
}

const cmd = process.argv[2];

async function download() {
  const res = await get(PATHNAME, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200) {
    console.error('Bulutta henüz veritabanı yok (site ilk açıldığında oluşturulur).');
    process.exit(1);
  }
  const bytes = Buffer.from(await new Response(res.stream).arrayBuffer());
  if (fs.existsSync(DB_PATH)) {
    const backup = `${DB_PATH}.yedek-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.copyFileSync(DB_PATH, backup);
    console.log('Eski yerel kopya yedeklendi:', path.relative(ROOT, backup));
  }
  fs.writeFileSync(DB_PATH, bytes);
  console.log(`Buluttaki veritabanı indirildi (${(bytes.length / 1024 / 1024).toFixed(2)} MB, son güncelleme ${res.blob.uploadedAt.toLocaleString('tr-TR')}).`);
}

async function upload() {
  if (!process.argv.includes('--evet')) {
    console.error('Bu işlem sitedeki tüm veriyi data/app.db ile değiştirir. Eminseniz komutun sonuna --evet ekleyin.');
    process.exit(1);
  }
  const bytes = fs.readFileSync(DB_PATH);
  await put(PATHNAME, bytes, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/octet-stream',
    cacheControlMaxAge: 60,
  });
  console.log(`data/app.db buluta gönderildi (${(bytes.length / 1024 / 1024).toFixed(2)} MB). Site en geç birkaç saniye içinde yeni veriyi kullanır.`);
}

// Günlük otomatik yedekler (db/backups/app-YYYY-MM-DD.db)
async function listBackups() {
  const { blobs } = await list({ prefix: 'db/backups/', limit: 200 });
  if (!blobs.length) { console.log('Henüz yedek yok (ilk veri değişikliğinde günlük yedek alınır).'); return; }
  for (const b of blobs.sort((a, c) => a.pathname.localeCompare(c.pathname))) {
    console.log(`${b.pathname.replace('db/backups/', '')}  ${(b.size / 1024 / 1024).toFixed(2)} MB  ${b.uploadedAt.toLocaleString('tr-TR')}`);
  }
}

// Seçilen yedeği canlı veritabanı yapar (önce mevcut canlı kopya "geri-yukleme-oncesi" adıyla yedeklenir)
async function restore() {
  const name = process.argv[3];
  if (!name || !/^app-\d{4}-\d{2}-\d{2}\.db$/.test(name)) { console.error('Kullanım: node scripts/db-blob.mjs geri-yukle app-2026-01-31.db --evet'); process.exit(1); }
  if (!process.argv.includes('--evet')) { console.error('Canlı veri seçilen yedekle DEĞİŞİR. Eminseniz sonuna --evet ekleyin.'); process.exit(1); }
  const src = await get(`db/backups/${name}`, { access: 'private', useCache: false });
  if (!src || src.statusCode !== 200) { console.error('Yedek bulunamadı. "yedekler" komutuyla listeye bakın.'); process.exit(1); }
  const bytes = Buffer.from(await new Response(src.stream).arrayBuffer());
  const cur = await get(PATHNAME, { access: 'private', useCache: false });
  if (cur && cur.statusCode === 200) {
    const curBytes = Buffer.from(await new Response(cur.stream).arrayBuffer());
    await put(`db/backups/geri-yukleme-oncesi-${Date.now()}.db`, curBytes, { access: 'private', addRandomSuffix: false, contentType: 'application/octet-stream' });
  }
  await put(PATHNAME, bytes, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/octet-stream', cacheControlMaxAge: 60 });
  console.log(`${name} canlı veritabanı olarak geri yüklendi. Site birkaç saniye içinde bunu kullanır.`);
}

if (cmd === 'yedekler') await listBackups();
else if (cmd === 'geri-yukle') await restore();
else if (cmd === 'indir') await download();
else if (cmd === 'gonder') await upload();
else {
  console.log('Kullanım: node scripts/db-blob.mjs indir | gonder --evet | yedekler | geri-yukle <ad> --evet');
  process.exit(1);
}
