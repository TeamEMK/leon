// ══════════════════════════════════════════════════════
// FORMS — naam + link ki chhoti list, sidebar ke "Forms" section ke liye
// ══════════════════════════════════════════════════════
// Jaan-boojh kar bahut simple: koi FMS jaisa Google Sheet sync ya config
// nahi — bas ek naam aur ek link. Click karte hi wahi link naye tab me
// khulta hai (frontend me). Add/Edit/Delete sirf admin; dekhna aur kholna
// sab logged-in users kar sakte hain.
//
// Optional extra (admin set karta hai):
//   kiosk_department — us department ke users (admin ke alawa) login par
//                      SIRF ye form dekhte hain (full-screen)

module.exports = function registerFormsRoutes(app, ctx) {
  const { db, requireAuth, requireAdmin } = ctx;

  // Body se name/link/kiosk_department nikaalo + validate.
  function parseForm(body) {
    const name = (body?.name || '').trim();
    const link = (body?.link || '').trim();
    const kioskDept = (body?.kiosk_department || '').trim() || null;
    if (!name || !link) return { error: 'Name and link are required' };
    if (!/^https?:\/\//i.test(link)) return { error: 'Link must start with http:// or https://' };
    return { name, link, kioskDept };
  }

  app.get('/api/forms', requireAuth, async (req, res) => {
    try {
      const [rows] = await db.query('SELECT id,name,link,kiosk_department FROM forms ORDER BY name ASC');
      res.json(rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });

  app.post('/api/forms', requireAuth, requireAdmin, async (req, res) => {
    try {
      const f = parseForm(req.body);
      if (f.error) return res.status(400).json({ error: f.error });
      await db.query('INSERT INTO forms (name,link,created_by,kiosk_department) VALUES (?,?,?,?)',
        [f.name, f.link, req.session.userId, f.kioskDept]);
      res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });

  app.put('/api/forms/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const f = parseForm(req.body);
      if (f.error) return res.status(400).json({ error: f.error });
      await db.query('UPDATE forms SET name=?,link=?,kiosk_department=? WHERE id=?',
        [f.name, f.link, f.kioskDept, req.params.id]);
      res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });

  app.delete('/api/forms/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      await db.query('DELETE FROM forms WHERE id=?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });
};
