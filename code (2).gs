/**
 * MIXTAPE.CO — Backend Survei Musik Favorit
 * Tempel seluruh kode ini di Google Apps Script yang terhubung ke Spreadsheet Anda
 * (Extensions > Apps Script), lalu Deploy > New deployment > Web app.
 *   - Execute as : Me
 *   - Who has access : Anyone
 * Salin URL Web App (berakhiran /exec) ke CONFIG.SCRIPT_URL di app.js.
 */

const SHEET_NAME = 'Responses';
const HEADERS = ['Timestamp', 'Nama', 'Usia', 'Genre', 'Artis', 'Lagu', 'Platform', 'Waktu Dengar', 'Rating', 'Komentar'];

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'EDM', 'Dangdut', 'Jazz', 'Indie', 'K-Pop', 'Metal', 'Reggae', 'Klasik', 'Lainnya'];
const PLATFORMS = ['Spotify', 'YouTube Music', 'YouTube', 'Apple Music', 'JOOX', 'Lainnya'];
const TIMES = ['Pagi', 'Siang', 'Malam', 'Belajar / Kerja', 'Olahraga', 'Perjalanan'];
const AGES = ['<18', '18-24', '25-34', '35-44', '45+'];

const MAX_ROWS_FOR_STATS = 5000;

/* ---------- Helpers ---------- */

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Bersihkan teks + cegah formula injection di spreadsheet
function clean_(value, max) {
  let s = String(value === undefined || value === null ? '' : value).replace(/[\r\n\t]+/g, ' ').trim();
  if (s.length > max) s = s.slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function pick_(value, allowed, fallback) {
  const v = String(value || '').trim();
  return allowed.indexOf(v) !== -1 ? v : fallback;
}

function firstName_(name) {
  const n = String(name || '').replace(/^'/, '').trim().split(/\s+/)[0] || 'Anon';
  return n.slice(0, 16);
}

function tally_(map, key, display) {
  if (!key) return;
  if (!map[key]) map[key] = { name: display, count: 0 };
  map[key].count += 1;
}

function top_(map, limit) {
  return Object.keys(map)
    .map(function (k) { return map[k]; })
    .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); })
    .slice(0, limit);
}

function norm_(text) {
  return String(text || '').replace(/^'/, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/* ---------- POST: simpan jawaban ---------- */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'Data kosong.' });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return json_({ ok: false, error: 'Format data tidak valid.' });
    }

    // Honeypot: bot biasanya mengisi kolom ini
    if (data.website) return json_({ ok: true });

    const nama = clean_(data.nama, 40);
    const artis = clean_(data.artis, 60);
    const lagu = clean_(data.lagu, 80);
    const genre = pick_(data.genre, GENRES, '');
    const platform = pick_(data.platform, PLATFORMS, '');

    if (!nama || !artis || !lagu || !genre || !platform) {
      return json_({ ok: false, error: 'Mohon lengkapi semua kolom wajib.' });
    }

    const usia = pick_(data.usia, AGES, '');
    const waktu = pick_(data.waktu, TIMES, '');
    let rating = Math.round(Number(data.rating));
    if (!isFinite(rating)) rating = 5;
    rating = Math.min(10, Math.max(1, rating));
    const komentar = clean_(data.komentar, 200);

    getSheet_().appendRow([new Date(), nama, usia, genre, artis, lagu, platform, waktu, rating, komentar]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'Server sibuk, coba lagi sebentar.' });
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* abaikan */ }
  }
}

/* ---------- GET: statistik untuk halaman hasil ---------- */

function doGet() {
  try {
    return json_(buildStats_());
  } catch (err) {
    return json_({ ok: false, error: 'Gagal membaca data.' });
  }
}

function buildStats_() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();

  const empty = {
    ok: true, total: 0, avgRating: 0,
    genres: [], artists: [], songs: [], platforms: [], times: [], recent: []
  };
  if (last < 2) return empty;

  const start = Math.max(2, last - MAX_ROWS_FOR_STATS + 1);
  const rows = sheet.getRange(start, 1, last - start + 1, HEADERS.length).getValues();

  const genres = {}, artists = {}, songs = {}, platforms = {}, times = {};
  let ratingSum = 0, ratingN = 0;

  rows.forEach(function (r) {
    const genre = String(r[3] || '');
    const artis = String(r[4] || '').replace(/^'/, '').trim();
    const lagu = String(r[5] || '').replace(/^'/, '').trim();
    const platform = String(r[6] || '');
    const waktu = String(r[7] || '');
    const rating = Number(r[8]);

    tally_(genres, genre, genre);
    tally_(artists, norm_(artis), artis);
    tally_(songs, norm_(lagu) + '|' + norm_(artis), lagu + ' — ' + artis);
    tally_(platforms, platform, platform);
    tally_(times, waktu, waktu);
    if (isFinite(rating) && rating > 0) { ratingSum += rating; ratingN += 1; }
  });

  const recent = rows.slice(-8).reverse().map(function (r) {
    return {
      nama: firstName_(r[1]),
      genre: String(r[3] || ''),
      artis: String(r[4] || '').replace(/^'/, ''),
      lagu: String(r[5] || '').replace(/^'/, ''),
      waktu: String(r[7] || '')
    };
  });

  return {
    ok: true,
    total: rows.length,
    avgRating: ratingN ? Math.round((ratingSum / ratingN) * 10) / 10 : 0,
    genres: top_(genres, 8),
    artists: top_(artists, 5),
    songs: top_(songs, 5),
    platforms: top_(platforms, 6),
    times: top_(times, 6),
    recent: recent
  };
}
