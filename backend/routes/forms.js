// ══════════════════════════════════════════════════════
// FORMS — naam + link ki chhoti list, sidebar ke "Forms" section ke liye
// ══════════════════════════════════════════════════════
// Jaan-boojh kar bahut simple: koi FMS jaisa Google Sheet sync ya config
// nahi — bas ek naam aur ek link. Click karte hi wahi link naye tab me
// khulta hai (frontend me). Add/Edit/Delete sirf admin; dekhna aur kholna
// sab logged-in users kar sakte hain.

module.exports = function registerFormsRoutes(app, ctx) {
  const { db, requireAuth, requireAdmin } = ctx;

  app.get('/api/forms', requireAuth, async (req, res) => {
    try {
      const [rows] = await db.query('SELECT id,name,link FROM forms ORDER BY name ASC');
      res.json(rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });

  app.post('/api/forms', requireAuth, requireAdmin, async (req, res) => {
    try {
      const name = (req.body?.name || '').trim();
      const link = (req.body?.link || '').trim();
      if (!name || !link) return res.status(400).json({ error: 'Name and link are required' });
      if (!/^https?:\/\//i.test(link)) return res.status(400).json({ error: 'Link must start with http:// or https://' });
      await db.query('INSERT INTO forms (name,link,created_by) VALUES (?,?,?)', [name, link, req.session.userId]);
      res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });

  app.put('/api/forms/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const name = (req.body?.name || '').trim();
      const link = (req.body?.link || '').trim();
      if (!name || !link) return res.status(400).json({ error: 'Name and link are required' });
      if (!/^https?:\/\//i.test(link)) return res.status(400).json({ error: 'Link must start with http:// or https://' });
      await db.query('UPDATE forms SET name=?,link=? WHERE id=?', [name, link, req.params.id]);
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
