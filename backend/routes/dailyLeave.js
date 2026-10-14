// ══════════════════════════════════════════════════════
// DAILY LEAVE UPDATE
// ══════════════════════════════════════════════════════
// Dashboard ka section: Admin roz employees ka leave status (sick leave
// samet) daalta hai, poori team dekhti hai. Approval flow (leave_requests)
// se alag — yahan koi approve/reject nahi, sirf Admin ki seedhi entry.
// Dekhna sab logged-in users; add/delete sirf Admin.

const TYPES = ['sick_leave', 'full_day', 'half_day', 'early_go', 'long_leave', 'work_from_home', 'other'];

module.exports = function registerDailyLeaveRoutes(app, ctx) {
  const { db, requireAuth, requireAdmin } = ctx;

  // Aaj ki (IST) entries
  app.get('/api/daily-leave', requireAuth, async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT d.id, d.user_id, u.name AS "userName", u.department, d.leave_type, d.note,
                TO_CHAR(d.leave_date,'YYYY-MM-DD') AS leave_date
         FROM daily_leave_updates d JOIN users u ON u.id=d.user_id
         WHERE d.leave_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         ORDER BY u.name ASC`);
      res.json(rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });

  app.post('/api/daily-leave', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { user_id, leave_type } = req.body || {};
      const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 300) : '';
      const date = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.leave_date || '') ? req.body.leave_date : null;
      if (!user_id) return res.status(400).json({ error: 'Select an employee' });
      if (!TYPES.includes(leave_type)) return res.status(400).json({ error: 'Invalid leave type' });
      const [u] = await db.query('SELECT id FROM users WHERE id=?', [user_id]);
      if (!u[0]) return res.status(404).json({ error: 'Employee not found' });
      await db.query(
        `INSERT INTO daily_leave_updates (user_id, leave_date, leave_type, note, created_by)
         VALUES (?, COALESCE(?::date, (NOW() AT TIME ZONE 'Asia/Kolkata')::date), ?, ?, ?)`,
        [user_id, date, leave_type, note || null, req.session.userId]);
      res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });

  app.delete('/api/daily-leave/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      await db.query('DELETE FROM daily_leave_updates WHERE id=?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });
};
