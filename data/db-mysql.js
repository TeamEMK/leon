// ══════════════════════════════════════════════════════
// MYSQL / MARIADB DRIVER  (Hostinger + phpMyAdmin)
// ══════════════════════════════════════════════════════
// App ke saare DB calls mysql2 ke andaz me likhe hain:
//
//   const [rows] = await db.query('SELECT ... WHERE id=?', [id]);
//   const [r]    = await db.query('INSERT ...');  r.insertId
//
// MySQL par ye seedhi chalti hai. Kuch cheezein Postgres wale SQL se aati hain
// jo MySQL nahi samajhta (TO_CHAR, ON CONFLICT ... EXCLUDED, ADD COLUMN IF NOT
// EXISTS, serial ...). Unhe ek jagah, neeche translate() me, badal dete hain —
// poore server.js me SQL dobara likhna nahi padta, aur Postgres wali copy
// (Railway) bina chhue chalti rehti hai.
//
// db.js ise tab load karti hai jab DB_KIND=mysql ho (ya DATABASE_URL mysql://).

const mysql = require('mysql2/promise');

// ── Postgres SQL -> MySQL SQL ─────────────────────────
// TO_CHAR ke format ke tokens (sirf wahi jo app me use hote hain)
const TO_CHAR_TOKENS = [
  ['YYYY', '%Y'], ['MM', '%m'], ['DD', '%d'],
  ['HH12', '%h'], ['HH24', '%H'], ['MI', '%i'], ['SS', '%s'], ['AM', '%p'],
];
function toCharFormat(fmt) {
  let out = fmt;
  for (const [pg, my] of TO_CHAR_TOKENS) out = out.split(pg).join(my);
  return out;
}

function translate(sql) {
  let s = String(sql);

  // TO_CHAR(expr, 'YYYY-MM-DD')  ->  DATE_FORMAT(expr, '%Y-%m-%d')
  if (/TO_CHAR\s*\(/i.test(s)) {
    s = s.replace(/TO_CHAR\s*\(/gi, 'DATE_FORMAT(');
    s = s.replace(/DATE_FORMAT\(([^;]*?),\s*'([^']*)'\s*\)/g,
      (m, expr, fmt) => `DATE_FORMAT(${expr}, '${toCharFormat(fmt)}')`);
  }

  // INSERT ... ON CONFLICT DO NOTHING  ->  INSERT IGNORE ...
  if (/ON\s+CONFLICT\s+DO\s+NOTHING/i.test(s)) {
    s = s.replace(/ON\s+CONFLICT\s+DO\s+NOTHING/i, '').replace(/^\s*INSERT\s+INTO/i, 'INSERT IGNORE INTO');
  }
  // ON CONFLICT (cols) DO UPDATE SET a=EXCLUDED.a  ->  ON DUPLICATE KEY UPDATE a=VALUES(a)
  s = s.replace(/ON\s+CONFLICT\s*\([^)]*\)\s*DO\s+UPDATE\s+SET/gi, 'ON DUPLICATE KEY UPDATE');
  s = s.replace(/EXCLUDED\.(\w+)/gi, 'VALUES($1)');

  // Postgres-only date helpers
  s = s.replace(/\(\s*date_trunc\(\s*'month'\s*,\s*CURRENT_DATE\s*\)\s*\+\s*interval\s*'1 month - 1 day'\s*\)\s*::\s*date/gi, 'LAST_DAY(CURRENT_DATE)');
  s = s.replace(/([A-Za-z_][\w.]*)\s*\+\s*make_interval\(\s*days\s*=>\s*\?\s*(?:::\s*int\s*)?\)/gi, 'DATE_ADD($1, INTERVAL ? DAY)');
  // INSERT ... RETURNING (xmax = 0) AS inserted — insert/update farak MySQL me affectedRows se (1 / 2)
  s = s.replace(/\s+RETURNING\s+\(\s*xmax\s*=\s*0\s*\)\s+AS\s+inserted/gi, '');

  // Postgres time-zone / cast idioms (session time zone already IST)
  s = s.replace(/\(\s*NOW\(\)\s+AT\s+TIME\s+ZONE\s+'[^']*'\s*\)\s*::\s*date/gi, 'CURRENT_DATE');
  s = s.replace(/\?\s*::\s*(date|int|integer|text|numeric)\b/gi, '?');

  // CREATE TABLE ke andar Postgres ke types
  if (/^\s*CREATE\s+TABLE/i.test(s)) {
    s = s.replace(/\bserial\b/gi, 'INT NOT NULL AUTO_INCREMENT')
         .replace(/\bbytea\b/gi, 'LONGBLOB')
         .replace(/\btimestamptz\b/gi, 'DATETIME')
         .replace(/\btimestamp\b/gi, 'DATETIME')            // time-zone conversion nahi chahiye
         // MySQL TEXT par DEFAULT nahi leta -> chhota VARCHAR
         .replace(/\bTEXT(\s+NOT\s+NULL)?(\s+DEFAULT\s+'[^']*')/gi, 'VARCHAR(50)$1$2')
         // CHECK (...) MySQL/MariaDB versions me alag chalta hai; app khud validate karta hai
         .replace(/\s+CHECK\s*\((?:[^()]|\([^()]*\))*\)/gi, '');
  }
  return s;
}

// ── MySQL 8 par "IF NOT EXISTS" wale ALTER/CREATE INDEX nahi hote (MariaDB par hote
// hain). Dono par chalane ke liye pehle information_schema me dekh lete hain.
async function ddlCompat(runner, sql) {
  let m = sql.match(/^\s*ALTER\s+TABLE\s+`?(\w+)`?\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+`?(\w+)`?/i);
  if (m) {
    const [rows] = await runner(
      'SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?', [m[1], m[2]]);
    if (rows.length) return [{ affectedRows: 0, insertId: 0 }, undefined];
    return runner(sql.replace(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i, 'ADD COLUMN'));
  }
  m = sql.match(/^\s*ALTER\s+TABLE\s+`?(\w+)`?\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+`?(\w+)`?/i);
  if (m) {
    const [rows] = await runner(
      'SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?', [m[1], m[2]]);
    if (!rows.length) return [{ affectedRows: 0, insertId: 0 }, undefined];
    return runner(sql.replace(/DROP\s+COLUMN\s+IF\s+EXISTS/i, 'DROP COLUMN'));
  }
  m = sql.match(/^\s*CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+`?(\w+)`?\s+ON\s+`?(\w+)`?/i);
  if (m) {
    const [rows] = await runner(
      'SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=? LIMIT 1', [m[3], m[2]]);
    if (rows.length) return [{ affectedRows: 0, insertId: 0 }, undefined];
    return runner(sql.replace(/INDEX\s+IF\s+NOT\s+EXISTS/i, 'INDEX'));
  }
  return null;
}

// Postgres ke error codes par app ke kuch except-blocks bane hain (week-plan, FMS schema,
// /api/me). MySQL ke codes ko unhi me badal dete hain, asli code `sqlCode` me rehta hai.
const ERR_MAP = {
  ER_NO_SUCH_TABLE: '42P01',
  ER_BAD_FIELD_ERROR: '42703',
  ER_DUP_FIELDNAME: '42701',
  ER_DUP_ENTRY: '23505',
};
function mapError(e) {
  if (e && e.code && ERR_MAP[e.code]) { e.sqlCode = e.code; e.code = ERR_MAP[e.code]; }
  return e;
}

module.exports = function createMysql() {
  const rawUrl = (process.env.DATABASE_URL || '').trim();
  if (rawUrl && !/^mysql:\/\//i.test(rawUrl)) {
    throw new Error(
      `DATABASE_URL theek nahi lag raha: "${rawUrl.slice(0, 24)}…"\n` +
      '  MySQL ke liye ye mysql://user:pass@host:3306/dbname jaisa hona chahiye,\n' +
      '  ya DATABASE_URL hata kar DB_HOST / DB_USER / DB_PASSWORD / DB_NAME bharo.'
    );
  }

  const common = {
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_MAX || '10', 10),
    queueLimit: 0,
    charset: 'utf8mb4',
    // App IST wall-clock hi store karta hai (columns DATETIME hain, time-zone conversion
    // nahi). Node ko bhi usi IST me padhna/likhna hai, chahe server ka TZ kuch bhi ho.
    timezone: '+05:30',
    // DATE ko 'YYYY-MM-DD' string hi rehne do (pg driver bhi aisa hi deta tha); DATETIME
    // JS Date banta hai.
    dateStrings: ['DATE'],
    // SUM()/AVG() DECIMAL aate hain — number chahiye, string nahi (warna 5 + 1 = "51").
    decimalNumbers: true,
    connectTimeout: 15000,
  };
  const pool = rawUrl
    ? mysql.createPool({ uri: rawUrl, ...common })
    : mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'task_manager',
        ...common,
      });

  // Har naye connection par: IST, aur Postgres jaisa SQL-mode —
  //   ANSI_QUOTES      "userName" jaise double-quoted aliases chalte hain
  //   PIPES_AS_CONCAT  a || b  string jodta hai
  // (ONLY_FULL_GROUP_BY jaan-boojh kar nahi: MySQL ka purana lenient GROUP BY.)
  pool.pool.on('connection', (conn) => {
    conn.query("SET time_zone = '+05:30', sql_mode = 'ANSI_QUOTES,PIPES_AS_CONCAT,NO_ENGINE_SUBSTITUTION,STRICT_TRANS_TABLES'");
  });
  pool.on('error', (err) => console.error('  ❌ MySQL pool error:', err.message));

  // runner: ek hi query chalao. query() (text protocol) use karte hain — arrays (IN (?)),
  // nested arrays (VALUES ?) aur LIMIT ? sab seedha chalte hain.
  const make = (target) => {
    const raw = (text, params) => target.query(text, params);
    const run = async (sql, params) => {
      try {
        const text = translate(sql);
        const compat = await ddlCompat(raw, text);
        if (compat) return compat;
        return await raw(text, params);
      } catch (e) { throw mapError(e); }
    };
    return run;
  };
  const poolRun = make(pool);

  return {
    kind: 'mysql',
    query: (sql, params) => poolRun(sql, params),
    execute: (sql, params) => poolRun(sql, params),

    async getConnection() {
      const conn = await pool.getConnection();
      const run = make(conn);
      return {
        query: (sql, params) => run(sql, params),
        execute: (sql, params) => run(sql, params),
        beginTransaction: () => conn.beginTransaction(),
        commit: () => conn.commit(),
        rollback: () => conn.rollback(),
        release: () => conn.release(),
      };
    },

    end: () => pool.end(),
    pool,
    _translate: translate, // tests ke liye
  };
};
