-- Forms: optional "dedicated department". Agar kisi form par department set hai,
-- us department ke users (admin ko chhodkar) login karte hi SIRF wahi form
-- dekhte hain (full-screen), baaki app unke liye band — jaise Installation
-- team ke site supervisors ko sirf unka FMS form chahiye.
ALTER TABLE forms ADD COLUMN IF NOT EXISTS kiosk_department text;
