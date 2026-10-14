-- Daily Leave Update — dashboard ka section jahan Admin roz employees ka
-- leave status (sick leave samet) daal sakta hai, taaki poori team ko pata
-- rahe aaj kaun available nahi hai. Ye leave_requests (apply/approve flow)
-- se alag hai: yahan koi approval nahi, Admin seedha entry karta hai.
CREATE TABLE IF NOT EXISTS daily_leave_updates (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_date date NOT NULL,
  leave_type text NOT NULL,
  note text,
  created_by int,
  created_at timestamp NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS daily_leave_updates_date_idx ON daily_leave_updates (leave_date);
