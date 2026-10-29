-- Forms: ek form ab kisi FMS ke in-app "New Record" (intake) form ko point kar
-- sakta hai (link ke bajaye). Dedicated Department ke saath mil kar ye us team
-- ko login par sirf wahi native form deta hai (language switch + English save).
ALTER TABLE forms ADD COLUMN IF NOT EXISTS fms_id int;
