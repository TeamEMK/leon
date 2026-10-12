// ══════════════════════════════════════════════════════
// EMPLOYEE PERSONAL INFORMATION FORM
// ══════════════════════════════════════════════════════
// Forms section ke andar ek built-in form (admin-added link-wale generic
// forms se alag) — har employee apni KYC/personal details ek hi record me
// bharta hai (dobara submit = update, naya record nahi, user_id UNIQUE).
// Apna record har koi dekh/bhar sakta hai; SAARI responses sirf admin
// dekh sakta hai.

// In fields ke bina form submit nahi hoga — baaki sab optional (jaise
// user ne khud "Emergency Contact Address (Optional)" bola tha).
const REQUIRED_FIELDS = [
  'full_name', 'mobile_number', 'gender', 'dob', 'current_address',
  'permanent_address', 'blood_group', 'aadhaar_number',
  'emergency_contact_name', 'emergency_contact_relation', 'emergency_contact_primary',
];

// DB columns, insert/update order — frontend isi naam se body me bhejta hai.
const ALL_FIELDS = [
  'email', 'full_name', 'mobile_number', 'alternate_phone', 'gender', 'dob',
  'current_address', 'permanent_address', 'blood_group', 'about_me',
  'aadhaar_number', 'aadhaar_photo_front', 'aadhaar_photo_back', 'cancelled_cheque_photo',
  'medical_info', 'parent_name', 'parent_contact', 'spouse_sibling_name', 'spouse_sibling_contact',
  'emergency_contact_name', 'emergency_contact_relation', 'emergency_contact_primary',
  'emergency_contact_alternate', 'emergency_contact_address', 'friend_name', 'friend_contact',
];

const PHOTO_FIELDS = ['aadhaar_photo_front', 'aadhaar_photo_back', 'cancelled_cheque_photo'];

module.exports = function registerEmployeeInfoRoutes(app, ctx) {
  const { db, requireAuth, requireAdmin } = ctx;

  // Apna record — form khulte hi pre-fill karne ke liye (pehli baar null)
  app.get('/api/employee-info/me', requireAuth, async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM employee_info WHERE user_id=?', [req.session.userId]);
      res.json(rows[0] || null);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });

  // Submit / update — sirf apna record, upsert. Har baar poora form bhejta
  // hai (modal single Save button), isliye blind overwrite safe hai.
  app.post('/api/employee-info', requireAuth, async (req, res) => {
    try {
      const body = req.body || {};
      for (const f of REQUIRED_FIELDS) {
        if (!String(body[f] ?? '').trim()) {
          return res.status(400).json({ error: `Please fill in all required fields (missing: ${f.replace(/_/g, ' ')})` });
        }
      }
      for (const f of PHOTO_FIELDS) {
        if (body[f] && !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(body[f])) {
          return res.status(400).json({ error: 'Photos must be uploaded as images' });
        }
      }
      const vals = ALL_FIELDS.map(c => {
        const v = body[c];
        if (v == null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
      });
      const placeholders = ALL_FIELDS.map(() => '?').join(',');
      const setClause = ALL_FIELDS.map(c => `${c}=EXCLUDED.${c}`).join(',');
      await db.query(
        `INSERT INTO employee_info (user_id,${ALL_FIELDS.join(',')},updated_at)
         VALUES (?,${placeholders},NOW())
         ON CONFLICT (user_id) DO UPDATE SET ${setClause},updated_at=NOW()`,
        [req.session.userId, ...vals]);
      res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });

  // Admin — saari responses ki list (photos/bade fields chhodkar, taaki
  // list jaldi load ho; poora detail alag route se)
  app.get('/api/employee-info', requireAuth, requireAdmin, async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT ei.id, ei.user_id, u.name AS "userName", u.department,
                ei.full_name, ei.email, ei.mobile_number,
                TO_CHAR(ei.submitted_at,'YYYY-MM-DD') AS submitted_at,
                TO_CHAR(ei.updated_at,'YYYY-MM-DD') AS updated_at
         FROM employee_info ei JOIN users u ON ei.user_id=u.id
         ORDER BY u.name ASC`);
      res.json(rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });

  // Admin — ek submission ka poora detail (photos samet)
  app.get('/api/employee-info/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT ei.*, u.name AS "userName", u.department
         FROM employee_info ei JOIN users u ON ei.user_id=u.id WHERE ei.id=?`, [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); }
  });
};
