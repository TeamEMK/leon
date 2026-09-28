-- Leave approval ab role/department se nahi, ek dedicated per-user flag se
-- control hota hai. Pehle admin, HOD (apne department ki) aur "HR" department
-- ka koi bhi user leave approve kar sakta tha — client ne maanga ki sirf ek
-- khaas banda (jise admin yahan flag karega) approve kare, aur kisi aur ke
-- paas ye na jaaye.
--
-- Admin phir bhi universal override rakhta hai (poori app me yahi pattern
-- hai), baaki sab (HOD, HR department) ab is flag ke bina kuch nahi kar sakte.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_leave_approver BOOLEAN NOT NULL DEFAULT false;
