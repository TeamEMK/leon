// Hostinger ke liye upload-ready package banata hai:
//
//   node hostinger/build-zip.js [outdir]        (default: ../leon-hostinger)
//
//   leon-hostinger/
//     leon-hostinger-app.zip      <- Hostinger Node.js app me upload (code, node_modules nahi)
//     database/leon-schema.sql    <- phpMyAdmin me pehle ye import
//     env.example                 <- Hostinger me Environment Variables ka template
//     README-HOSTINGER.md         <- step-by-step
//
// Data files (leon-data-XX.sql) alag hain: tools/export-postgres-to-mysql.js banata hai
// aur wo isi database/ folder me rakhni hain. Data zip ke andar jaan-boojh kar nahi hai —
// usme logon ke asli documents hote hain.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '..', 'leon-hostinger'));
const STAGE = fs.mkdtempSync(path.join(os.tmpdir(), 'leon-hostinger-'));
const APP = path.join(STAGE, 'leon');

function copy(rel, { skip } = {}) {
  const from = path.join(ROOT, rel), to = path.join(APP, rel);
  if (!fs.existsSync(from)) throw new Error('missing: ' + rel);
  fs.cpSync(from, to, { recursive: true, filter: (src) => !(skip && skip(path.relative(ROOT, src).split(path.sep).join('/'))) });
}

fs.mkdirSync(APP, { recursive: true });
copy('backend');
copy('frontend');
copy('brand.json');
copy('package.json');
copy('package-lock.json');
copy('data/db.js');
copy('data/db-mysql.js');
copy('data/scripts');
copy('data/migrations/mysql');
// Hostinger copy me sirf MySQL driver — default dialect isi se mysql ban jaata hai (data/db.js)
fs.copyFileSync(path.join(__dirname, 'env.example'), path.join(APP, 'env.example'));
fs.copyFileSync(path.join(__dirname, 'README-HOSTINGER.md'), path.join(APP, 'README-HOSTINGER.md'));

// ── database/leon-schema.sql = MySQL schema + migration log ──
fs.mkdirSync(path.join(OUT, 'database'), { recursive: true });
const schema = fs.readFileSync(path.join(ROOT, 'data/migrations/mysql/001_init.sql'), 'utf8');
fs.writeFileSync(path.join(OUT, 'database', 'leon-schema.sql'),
  schema +
  `\n-- App ko bata do ki 001_init.sql lag chuki hai (warna start par dobara chalane ki koshish karegi)
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename varchar(255) NOT NULL,
  applied_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO schema_migrations (filename) VALUES ('001_init.sql');
`);
fs.copyFileSync(path.join(__dirname, 'env.example'), path.join(OUT, 'env.example'));
fs.copyFileSync(path.join(__dirname, 'README-HOSTINGER.md'), path.join(OUT, 'README-HOSTINGER.md'));

// ── zip (Windows bsdtar: forward-slash paths, Linux par sahi khulta hai) ──
const zip = path.join(OUT, 'leon-hostinger-app.zip');
if (fs.existsSync(zip)) fs.unlinkSync(zip);
const tarExe = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'zip';
if (process.platform === 'win32') execFileSync(tarExe, ['-a', '-c', '-f', zip, '-C', APP, '.'], { stdio: 'inherit' });
else execFileSync('zip', ['-r', zip, '.'], { cwd: APP, stdio: 'inherit' });
fs.rmSync(STAGE, { recursive: true, force: true });

console.log('\n  Ready:', OUT);
console.log('   -', path.basename(zip), (fs.statSync(zip).size / 1024 / 1024).toFixed(1) + ' MB');
console.log('   - database/leon-schema.sql');
console.log('   - env.example, README-HOSTINGER.md\n');
