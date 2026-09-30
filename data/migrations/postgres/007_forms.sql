-- Forms — sidebar ka naya "Forms" section. Sirf ek naam + ek link (jaise
-- Google Form ka URL); click karte hi wahi link naye tab me khul jaata hai.
-- Jaan-boojh kar itna hi simple rakha gaya hai — koi FMS-jaisa sync/config nahi.
CREATE TABLE IF NOT EXISTS forms (
  id serial,
  name text NOT NULL,
  link text NOT NULL,
  created_by int,
  created_at timestamp NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);
