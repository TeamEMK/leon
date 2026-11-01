# Leon Task Manager — moving from Railway to Hostinger

This package runs the **same app** on **Node.js + MySQL (phpMyAdmin)**.
Every user keeps the **same login and password** (the password hashes are copied as they are).

You need a Hostinger plan that supports **Node.js Web Apps** (Business / Cloud) and a MySQL database.

```
leon-hostinger/
  leon-hostinger-app.zip      the application (upload to the Node.js app)
  database/
    leon-schema.sql           1) import this first
    leon-data-01.sql ...      2) then these, in number order  (your old data)
  env.example                 settings to paste into Hostinger
  README-HOSTINGER.md         this file
```

---

## 1. Create the database
hPanel → **Databases → MySQL Databases** → create a database + user.
Write down the **database name, user name, password**.
(On Hostinger they look like `u123456789_leon`.)

## 2. Import the database in phpMyAdmin
hPanel → **Databases → phpMyAdmin → Enter** → click your database on the left.

1. **Import** tab → choose `database/leon-schema.sql` → **Import**.  
   (You will now see 32 tables, all empty.)
2. **Import** again, one by one, in order: `leon-data-01.sql`, `leon-data-02.sql`, …  
   Format = SQL. Leave the other options as they are.

If an import stops with a size or time-out error, tell me the file name — the files are
already split to about 24 MB each, but some plans allow less.

## 3. Create the Node.js app
hPanel → **Websites → Add website → Node.js Apps**:

| Setting | Value |
|---|---|
| Upload | `leon-hostinger-app.zip` |
| Node version | 20 or newer (22 is fine) |
| Install command | `npm install` |
| Start / entry file | `backend/server.js`  (or start command `npm start`) |

Then open **Environment variables** and fill them from `env.example`:

* `DB_NAME`, `DB_USER`, `DB_PASSWORD` — from step 1. `DB_HOST` is normally `localhost`
  (if the app cannot connect, try `127.0.0.1`).
* `SESSION_SECRET` — copy the **same value that Railway uses** (Railway → your app →
  Variables). This keeps everybody logged in. A different value is fine too: people just
  have to log in once more, passwords do not change.
* `APP_URL` — your new address, e.g. `https://tasks.yourcompany.com`.
* Copy the rest of the Railway variables as they are (Google, Drive, SMTP, WhatsApp …).

Press **Deploy / Restart**. The first start also checks the database by itself
(`001_init.sql` is already marked as done by the schema file, so nothing is changed).

Open `https://<your domain>/api/health` — it must show `{"status":"ok"}`.
Then open the site and log in with an existing user.

### Deploying from GitHub instead of the zip
Node.js Apps → **Import Git Repository** → `TeamEMK/leon`, branch `main`.
Entry file `backend/server.js`, install command `npm install`.
**You must set `DB_KIND=mysql`** (the repo also contains the Postgres code used on Railway)
together with the other variables from `env.example`. The schema in
`data/migrations/mysql/001_init.sql` is applied automatically on the first start; import
your old data (`leon-data-XX.sql`) after that first start, or import `leon-schema.sql` first.

## 4. Point your domain
Add the domain in the Node.js app → turn on the free SSL.
If your DNS is somewhere else, point the `A` record to the IP that Hostinger shows.

## 5. Final switch (do it in this order, so no data is lost)
1. Tell the team: about 15 minutes break.
2. Stop the Railway app (do **not** delete the Railway database yet).
3. Take a **fresh** export (see below) and import it on an **empty** database
   (phpMyAdmin → database → **Check all → Drop**, then import schema + data again).
4. Check the login, the dashboard, one FMS and one task.
5. Switch the domain / tell the team the new link.
6. Keep Railway (stopped) for about a week as a backup.

### How to take a fresh data export
On the computer that has the project folder:
`hostinger\Export-Railway-Data.bat` → paste the Railway **DATABASE_PUBLIC_URL**
(Railway → Postgres → Variables). It creates `export\leon-data-01.sql` …

## 6. Good to know
* **Passwords / logins:** unchanged. Hashes are copied, nothing is reset.
* **Photos & documents** (Aadhaar, proof photos) are inside the database, so they move with the data.
  Videos and FMS files are on Google Drive and stay there.
* **Time:** the app stores India time. Keep `TZ=Asia/Kolkata`.
* **Backups:** Hostinger → Backups, or phpMyAdmin → Export, regularly.
* **Updates later:** upload the new zip, press Restart. New database changes are applied
  automatically when the app starts (`AUTO_MIGRATE=false` switches that off).
* **Google Apps Script forms** that call this app (logout link etc.) must use the new domain.
