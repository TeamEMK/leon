# Railway par deploy

Ye app Railway par ek **normal long-running Node server** ki tarah chalti hai —
Vercel wali serverless copy se alag. Farak sirf itna hai ki yahan schedulers
process ke andar hi chalte hain (`setInterval`), isliye Vercel Cron ki zarurat
nahi padti.

Repo: `https://github.com/TeamEMK/leon`

---

## 1. Project aur database

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo**
   → `TeamEMK/leon` chuno. Railway `railway.json` khud padh lega.
2. Usi project (canvas) me **New** → **Database** → **Add PostgreSQL**.

Ab project me do service hain: app aur Postgres.

## 2. Environment variables

App service → **Variables** tab. Ye bharo:

| Variable | Value | Kyun |
|---|---|---|
| `DB_KIND` | `postgres` | driver chunav |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Railway ka reference — type karke mat likho, "Add Reference" se lo |
| `PGSSL_DISABLE` | `true` | private network (`postgres.railway.internal`) par TLS nahi hota |
| `NODE_ENV` | `production` | login cookie `Secure` tabhi lagti hai |
| `TZ` | `Asia/Kolkata` | **neeche section 5 padho — bina iske 12 PM wale email 5:30 PM ko jaate hain** |
| `SESSION_SECRET` | koi lamba random string | JWT isi se sign hota hai |
| `APP_URL` | `https://<tumhara-domain>` | emails me "Open app" link |
| `ADMIN_EMAIL` | pehle admin ka email | seed script ke liye |
| `ADMIN_PASSWORD` | strong password | seed script ke liye |

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

## 4. Pehla admin banao

Migrations apne aap chalti hain — `railway.json` me `preDeployCommand` har deploy
se pehle `npm run db:migrate` chalata hai (pehle se lagi migrations skip ho jaati
hain, isliye baar-baar chalna safe hai).

Admin sirf ek baar banana hai. Railway CLI se:

```bash
npm i -g @railway/cli
railway login
railway link          # project + app service chuno
railway run npm run db:seed-admin
```

CLI na chahiye to app service ke **Settings → Deploy → Custom Start Command** me
ek baar `npm run db:seed-admin && node backend/server.js` rakh kar deploy karo,
phir wapas hata do.

Ab `https://<domain>` par `ADMIN_EMAIL` / `ADMIN_PASSWORD` se login ho jayega.

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

`railway.json` me `numReplicas: 1` jaan-boojh kar hai.

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

**`SASL: client password must be a string`** — `DATABASE_URL` khaali hai ya
reference theek se nahi juda. Variables me jaake dobara "Add Reference" se lo.

**`The server does not support SSL connections`** — `PGSSL_DISABLE=true` set karo.

**`self signed certificate`** — public proxy URL (`…proxy.rlwy.net`) use ho raha
hai; wahan `PGSSL_DISABLE` hata do (app khud `rejectUnauthorized: false` lagati hai).

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
