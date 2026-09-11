# Railway par deploy

Ye app Railway par ek **normal long-running Node server** ki tarah chalti hai —
Vercel wali serverless copy se alag. Farak sirf itna hai ki yahan schedulers
process ke andar hi chalte hain (`setInterval`), isliye Vercel Cron ki zarurat
nahi padti.

Repo: `https://github.com/TeamEMK/leon`

**Abhi live setup (11 Sep 2026):**

| | |
|---|---|
| Railway project | `system leon` (`70a43ab3-8451-4874-ad70-2deb484827f9`) |
| Services | `leon` (app), `Postgres` |
| URL | https://leon-production-82b1.up.railway.app |
| Database | 29 tables, 5 migrations lagi hui |

Abhi tak set: `DB_KIND`, `DATABASE_URL`, `NODE_ENV`, `TZ`, `APP_URL`,
`SESSION_SECRET`. Baaki (SMTP, WhatsApp, Google) abhi khaali hain — wo features
band hain, app chalti hai.

---

## 1. Project aur database

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo**
   → `TeamEMK/leon` chuno.
2. Usi project (canvas) me **New** → **Database** → **Add PostgreSQL**.

Ab project me do service hain: app aur Postgres.

## 1.5. Deploy settings — haath se bharni padengi

Repo me `railway.json` hai, par **Railway use apply nahi kar raha** (11 Sep 2026
ko `railway config plan` par service ke `deploy.preDeployCommand`,
`healthcheckPath`, `startCommand` teenon `null` nikle, aur runtime logs me
nixpacks ka default `npm start` chal raha tha — `railway.json` ka
`node backend/server.js` nahi). Railway config-as-code ko deprecate kar raha hai
(CLI khud bolta hai: "Existing files keep working until 2026-12-01").

Isliye app service → **Settings → Deploy** me ye do field khud bharo:

| Field | Value |
|---|---|
| Pre-deploy Command | `npm run db:migrate` |
| Healthcheck Path | `/api/health` |

Pre-deploy wali line hi wo cheez hai jo har deploy par schema chadhati hai.
Bina iske naye environment par tables banti hi nahi — aur app boot par aadha
schema khud bana deti hai, jo aage jaakar migration todta hai (section 4 dekho).

**Replicas 1 hi rakhna** — wajah section 6 me hai.

`railway.json` repo me isliye chhodi hai ki Railway kabhi use padhne lage to
sahi values wahin likhi hain. Uska IaC wala naya tarika (`.railway/railway.ts`)
abhi is project ke liye theek nahi baithta: uska model "file hi poora sach hai"
hai, yaani `apply` karte hi wo sab variables aur GitHub source connection uda
deta hai jo file me likhe nahi — aur unhe file me likhne ka matlab hota
`SESSION_SECRET` repo me daalna.

## 2. Environment variables

App service → **Variables** tab. Ye bharo:

| Variable | Value | Kyun |
|---|---|---|
| `DB_KIND` | `postgres` | driver chunav |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Railway ka reference — type karke mat likho, "Add Reference" se lo |
| `NODE_ENV` | `production` | login cookie `Secure` tabhi lagti hai |
| `TZ` | `Asia/Kolkata` | **neeche section 5 padho — bina iske 12 PM wale email 5:30 PM ko jaate hain** |
| `SESSION_SECRET` | koi lamba random string | JWT isi se sign hota hai |
| `APP_URL` | `https://<tumhara-domain>` | emails me "Open app" link |
| `ADMIN_EMAIL` | pehle admin ka email | seed script ke liye |
| `ADMIN_PASSWORD` | strong password | seed script ke liye |

Railway ka Postgres `postgres-ssl` image use karta hai, isliye private network
par bhi TLS chalta hai — `PGSSL_DISABLE` set karne ki zarurat nahi. App khud
`rejectUnauthorized: false` lagati hai, jo self-signed cert ke liye chahiye hota
hai. Sirf agar kabhi "server does not support SSL connections" aaye tabhi
`PGSSL_DISABLE=true` daalna.

Baaki optional (feature band rehta hai agar na do) — `.env.example` me poori list hai:
`SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME` (reminder emails),
`WAUMFY_*` + `WA_SCHEDULER_ENABLED` (WhatsApp passes),
`GOOGLE_CREDENTIALS_B64`, `APPS_SCRIPT_*`, `GDRIVE_VIDEO_FOLDER_ID` (Drive/Sheets).

**`PORT` mat set karna.** Railway khud inject karta hai; app `process.env.PORT`
utha leti hai. Manually set karoge to healthcheck galat port par jayega.

`CRON_SECRET` ki bhi zarurat nahi — wo sirf Vercel Cron ke HTTP endpoints ke
liye tha. Chhod dene par `/api/cron/*` fail-closed (503) rehte hain, jo yahan
theek hai kyunki wahi kaam in-process scheduler kar raha hota hai.

## 3. Domain

App service → **Settings** → **Networking** → **Generate Domain**.
Jo URL mile wahi `APP_URL` me daalo aur redeploy karo.

## 4. Migrations aur pehla admin

### Pehle migrations, phir app ka pehla boot

Ye kram ulta pad jaye to migration fail hoti hai. Wajah: `server.js` boot par
khud kuch tables bana deta hai (`FMS schema ready`, `Queries table ready`) —
`CREATE TABLE IF NOT EXISTS` se. Par `001_init.sql` me plain `CREATE TABLE` hai.
To agar app pehle boot ho gayi, migration `relation "fms_extra_rows" already
exists` par ruk jaati hai aur `users` jaisi asli tables banti hi nahi.

Sahi kram:

1. Pehle Variables bharo (section 2) — khaas kar `DATABASE_URL`.
2. Pre-deploy Command set karo (section 1.5). Deploy par migration khud chalegi.
3. Uske baad app boot hogi to uska schema setup no-op ho jayega.

Agar app pehle hi boot ho chuki hai aur migration atak rahi hai, to un khaali
auto-bani tables ko hatana padta hai. **Pehle count check karo** — 0 rows hon
tabhi:

```sql
DROP TABLE IF EXISTS fms_extra_rows, fms_sheets, fms_step_doers,
                     fms_steps, queries, schema_migrations CASCADE;
```

Phir migration chalao. Theek chalne par 29 tables banti hain.

### Migration haath se chalani ho (tunnel se)

Database ka `DATABASE_URL` private domain (`postgres.railway.internal`) par hota
hai — laptop se reachable nahi. Public Access on kiye bina Railway ka encrypted
tunnel use karo:

```bash
npm i -g @railway/cli
railway login
railway link -p <project-id> -e production -s leon

ssh-keygen -t ed25519            # sirf pehli baar
railway ssh keys add             # key Railway account par register karo

railway connect Postgres --tunnel-only
```

Aakhri command `127.0.0.1:<port>` par tunnel kholti hai aur poora URL print
karti hai. Use alag terminal me chalne do, aur dusre me:

```bash
DB_KIND=postgres DATABASE_URL="<tunnel-url>" npm run db:migrate
```

Windows note: `railway ssh keys add -k <path>` "Key not found" deta hai. Bina
`-k` ke chalao — auto-detect kaam karta hai.

### Pehla admin

`railway run npm run db:seed-admin` **kaam nahi karega** — `railway run` command
local machine par chalati hai, aur wahan private `DATABASE_URL` reachable nahi
hai. Tunnel khula rakh kar ye chalao:

```bash
ADMIN_EMAIL=you@company.com ADMIN_PASSWORD=<strong>   DB_KIND=postgres DATABASE_URL="<tunnel-url>" npm run db:seed-admin
```

Ab `https://<domain>` par usi email/password se login ho jayega. Dobara chalane
par maujooda admin ka password reset ho jaata hai.

## 5. Timezone — ye wala step chhodna mat

Container UTC me chalta hai. Do schedulers hain aur dono ek jaise nahi sochte:

- **WhatsApp scheduler** khud IST nikalta hai (`lib/dates.js` → `Intl`), server
  ka timezone kuch bhi ho — sahi chalta hai.
- **Email reminder scheduler** server ke local ghante dekhta hai
  (`new Date().getHours() >= 12`). TZ set na ho to wo 12:00 **UTC** par firega,
  yaani 5:30 PM IST — koi error nahi aayega, bas mail roz der se jayenge.

Isliye `TZ=Asia/Kolkata` variables me hona zaroori hai. Logs bhi isse IST me
padhne layak ho jaate hain.

## 6. Replicas 1 hi rakhna

App service → **Settings → Deploy → Replicas** ko 1 par hi rehne do.

WhatsApp pass to do replicas par bhi safe hai — `_claimDay()` ek atomic UPDATE se
din claim karta hai, duplicate nahi jaate. Par email reminder ka "aaj chal chuka"
wala nishan sirf **memory me** hai (`_lastReminderRunDate`), DB me nahi. Do
replicas = har user ko do reminder email. Scale karna ho to pehle us flag ko
`app_state` table me le jaana padega, jaise WhatsApp wala hai.

## 7. Deploy ke baad check karo

```bash
curl https://<domain>/api/health      # {"status":"ok"}
```

Logs me boot par ye dikhna chahiye:

```
✅ Gmail SMTP Ready
✦ Leon: http://localhost:<port>
✅ Delegation reminder scheduler started (fires daily at 12:00 PM)
✅ WhatsApp scheduler running — auto-send currently ENABLED
```

Jo credentials nahi diye, unke liye `⚠️ … skipped` aayega — wo normal hai.

## 8. Aam dikkatein

**migration par `relation "..." already exists`** — app migration se pehle boot
ho gayi thi aur usne kuch tables khud bana di. Section 4 dekho.

**Tables banti hi nahi, deploy fir bhi SUCCESS** — Pre-deploy Command set nahi
hai. Section 1.5 dekho; `railway.json` par bharosa mat karo.

**`SASL: client password must be a string`** — `DATABASE_URL` khaali hai ya
reference theek se nahi juda. Variables me jaake dobara "Add Reference" se lo.

**`The server does not support SSL connections`** — database bina SSL wale image
par hai; tab `PGSSL_DISABLE=true` set karo. Railway ke default `postgres-ssl`
image par ye nahi aana chahiye.

**`self signed certificate`** — `PGSSL_DISABLE` hata do. App khud
`rejectUnauthorized: false` lagati hai, jo Railway ke self-signed cert ke liye
sahi hai.

**Healthcheck fail, par logs me koi error nahi** — port par kuch aur baitha hai ya
listen fail hua. Note: `server.js` ka `uncaughtException` handler crash ko sirf
log karta hai, process zinda rehta hai — isliye "app chal rahi hai par sun nahi
rahi" ho sakta hai. Logs me `EADDRINUSE`/`listen` dhoondo.

**Login hota hai par turant logout** — `NODE_ENV=production` hai par domain HTTPS
nahi, ya `APP_URL` galat hai. Dono ek hi https domain par hone chahiye.

## Vercel ka kya hua

`vercel.json` aur `api/index.js` repo me hain — Railway unhe ignore karta hai.
Dono jagah deploy chalti rahe to koi takraar nahi, bas dhyan rakhna ki
`_claimDay()` wala nishan **database me** hai: agar dono deploy ek hi Postgres se
jude hon, to WhatsApp pass jo pehle claim kar lega wahi bhejega. Email reminders
ka aisa koi guard nahi — do jagah chalengi to do mail jayenge.
