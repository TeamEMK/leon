// ══════════════════════════════════════════════════════
// POSTGRES (Railway)  ->  MySQL (Hostinger / phpMyAdmin)  DATA EXPORT
// ══════════════════════════════════════════════════════
// Purane database ka poora data (users + unke bcrypt password hash, tasks, leaves,
// FMS config, photos ... sab) ek ya zyada .sql files me nikaalta hai jo phpMyAdmin
// me seedha Import ho jaati hain.
//
//   DATABASE_URL="postgresql://..." node tools/export-postgres-to-mysql.js [outdir]
//
// DATABASE_URL = Railway -> Postgres service -> Variables -> DATABASE_PUBLIC_URL
// (internal "postgres.railway.internal" wala bahar se nahi chalta).
//
// Passwords ka kuch nahi karna padta: users.password me bcrypt hash hai, wo jyon ka
// tyon copy hota hai — isliye har user ka purana password naye server par bhi chalega.
//
// Schema ka source data/migrations/mysql/001_init.sql hai — sirf wahi tables/columns
// export hote hain jo MySQL schema me hain (purane/bekaar columns apne aap chhoot
// jaate hain, aur kya chhoota wo end me bata diya jaata hai).

const fs = require('fs');
const path = require('path');
try { require('dotenv').config(); } catch (_) {}
const { Client, types } = require('pg');

const OUT_DIR = path.resolve(process.argv[2] || path.join(process.cwd(), 'export'));
const SCHEMA_FILE = path.join(__dirname, '..', 'data', 'migrations', 'mysql', '001_init.sql');
const MAX_FILE_BYTES = 24 * 1024 * 1024;   // phpMyAdmin upload limit se bahut neeche
const MAX_STMT_BYTES = 1024 * 1024;        // ek INSERT ki size (bade photo wali ek row isse badi ho sakti hai)
const PAGE = 200;

// Sab kuch raw string me — Date objects ke time-zone ke jhanjhat se bachne ke liye
for (const oid of [1082, 1083, 1114, 1184, 20, 1700]) types.setTypeParser(oid, v => v);

// ── MySQL schema se table -> columns ──────────────────
function parseSchema(sql) {
  const tables = {};
  const re = /CREATE TABLE (\w+) \(\n([\s\S]*?)\n\) ENGINE/g;
  let m;
  while ((m = re.exec(sql.split('\r\n').join('\n')))) {
    const cols = [];
    for (const line of m[2].split('\n')) {
      const c = line.match(/^  (\w+) (?!KEY\b)/);
      if (c && !/^(PRIMARY|UNIQUE|KEY|CONSTRAINT)$/i.test(c[1])) cols.push(c[1]);
    }
    tables[m[1]] = cols;
  }
  return tables;
}

// ── value -> MySQL literal ────────────────────────────
function esc(s) {
  return "'" + String(s)
    .replace(/\\/g, '\\\\').replace(/\0/g, '\\0').replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r').replace(/'/g, "\\'").replace(/\x1a/g, '\\Z') + "'";
}
function lit(v, pgType) {
  if (v === null || v === undefined) return 'NULL';
  if (Buffer.isBuffer(v)) return v.length ? '0x' + v.toString('hex') : "''";
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (pgType === 'timestamp without time zone' || pgType === 'timestamp with time zone')
    return esc(String(v).slice(0, 19));            // fraction chhod do, IST wall-clock jyon ka tyon
  if (pgType === 'date') return esc(String(v).slice(0, 10));
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'object') return esc(JSON.stringify(v));
  const s = String(v);
  if ((pgType === 'integer' || pgType === 'bigint' || pgType === 'smallint' || pgType === 'numeric') && /^-?\d+(\.\d+)?$/.test(s)) return s;
  return esc(s);
}

(async () => {
  const url = (process.env.DATABASE_URL || '').trim();
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    console.error('\n  DATABASE_URL nahi mila. Railway -> Postgres -> Variables -> DATABASE_PUBLIC_URL copy karke do:\n' +
      '  DATABASE_URL="postgresql://..." node tools/export-postgres-to-mysql.js\n');
    process.exit(1);
  }
  const schema = parseSchema(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) if (/^leon-data-\d+\.sql$/.test(f)) fs.unlinkSync(path.join(OUT_DIR, f));

  const pg = new Client({ connectionString: url, ssl: process.env.PGSSL_DISABLE === 'true' ? false : { rejectUnauthorized: false } });
  await pg.connect();
  console.log('  Postgres se connected.');

  let fileNo = 0, fileBytes = 0, fd = null;
  const files = [];
  const header = '-- Leon data export\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET UNIQUE_CHECKS=0;\nSET SQL_MODE=\'NO_AUTO_VALUE_ON_ZERO\';\n\n';
  function openFile() {
    if (fd) { fs.writeSync(fd, '\nSET FOREIGN_KEY_CHECKS=1;\nSET UNIQUE_CHECKS=1;\n'); fs.closeSync(fd); }
    fileNo++;
    const name = `leon-data-${String(fileNo).padStart(2, '0')}.sql`;
    files.push(name);
    fd = fs.openSync(path.join(OUT_DIR, name), 'w');
    fs.writeSync(fd, header);
    fileBytes = header.length;
  }
  function write(text) {
    if (!fd || fileBytes + text.length > MAX_FILE_BYTES) openFile();
    fs.writeSync(fd, text);
    fileBytes += Buffer.byteLength(text);
  }

  const summary = [], notes = [];
  // users pehle (padhne me aasan), baaki naam ke kram me
  const order = Object.keys(schema).sort((a, b) => (a === 'users' ? -1 : b === 'users' ? 1 : a.localeCompare(b)));
  for (const t of order) {
    const exists = (await pg.query('SELECT to_regclass($1) AS r', ['public.' + t])).rows[0].r;
    if (!exists) { summary.push({ t, n: 0, skipped: 'table Postgres me nahi hai' }); continue; }
    const colInfo = (await pg.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t])).rows;
    const pgCols = colInfo.map(c => c.column_name);
    const typeOf = Object.fromEntries(colInfo.map(c => [c.column_name, c.data_type]));
    const cols = schema[t].filter(c => pgCols.includes(c));
    const dropped = pgCols.filter(c => !schema[t].includes(c));
    if (dropped.length) notes.push(`${t}: Postgres ke ye columns MySQL schema me nahi hain, isliye nahi gaye: ${dropped.join(', ')}`);
    const orderBy = pgCols.includes('id') ? 'id' : cols[0];
    const total = Number((await pg.query(`SELECT COUNT(*)::bigint AS n FROM "${t}"`)).rows[0].n);
    if (!total) { summary.push({ t, n: 0 }); continue; }

    write(`-- ${t} (${total} rows)\n`);
    const colList = cols.map(c => '`' + c + '`').join(',');
    let batch = [], batchBytes = 0, done = 0;
    const flush = () => {
      if (!batch.length) return;
      write(`INSERT INTO \`${t}\` (${colList}) VALUES\n${batch.join(',\n')};\n`);
      batch = []; batchBytes = 0;
    };
    for (let off = 0; off < total; off += PAGE) {
      const rows = (await pg.query(
        `SELECT ${cols.map(c => '"' + c + '"').join(',')} FROM "${t}" ORDER BY "${orderBy}" LIMIT ${PAGE} OFFSET ${off}`)).rows;
      for (const r of rows) {
        const row = '(' + cols.map(c => lit(r[c], typeOf[c])).join(',') + ')';
        if (batch.length && batchBytes + row.length > MAX_STMT_BYTES) flush();
        batch.push(row); batchBytes += row.length; done++;
      }
      process.stdout.write(`\r  ${t}: ${done}/${total}   `);
    }
    flush();
    write('\n');
    process.stdout.write(`\r  ${t}: ${done}/${total} ✓   \n`);
    summary.push({ t, n: done });
  }
  if (fd) { fs.writeSync(fd, '\nSET FOREIGN_KEY_CHECKS=1;\nSET UNIQUE_CHECKS=1;\n'); fs.closeSync(fd); }
  await pg.end();

  fs.writeFileSync(path.join(OUT_DIR, 'export-report.txt'),
    summary.map(s => `${s.t.padEnd(24)} ${String(s.n).padStart(8)} rows${s.skipped ? '  (' + s.skipped + ')' : ''}`).join('\n') +
    (notes.length ? '\n\nNOTES\n' + notes.join('\n') : '') + '\n');
  console.log('\n  ── Export ho gaya ──');
  for (const s of summary) console.log(`  ${s.t.padEnd(24)} ${String(s.n).padStart(8)} rows${s.skipped ? '  (' + s.skipped + ')' : ''}`);
  if (notes.length) { console.log('\n  Dhyan do:'); notes.forEach(n => console.log('  - ' + n)); }
  console.log(`\n  Files (${OUT_DIR}):\n   ${files.join('\n   ')}\n`);
})().catch(e => { console.error('\n  Export fail:', e.message); process.exit(1); });
