-- Designated approver (is_leave_approver) khud apni hi leave approve nahi kar
-- sakta (self-approval already blocked) — aur ab tak uske baad koi fallback
-- nahi tha. Client ne maanga: Seema ki leave sirf Amit approve kare.
-- Per-user override: agar kisi applicant ka leave_approver_id set hai, to
-- uski leave SIRF wahi specific banda approve kar sakta hai — global
-- is_leave_approver flag wala bhi nahi (exclusive routing, no exception).
-- NULL (default) ka matlab: purana default behaviour, global flag wala approve kare.
ALTER TABLE users ADD COLUMN IF NOT EXISTS leave_approver_id INTEGER REFERENCES users(id);
