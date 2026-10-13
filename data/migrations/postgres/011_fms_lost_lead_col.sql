-- FMS: "Lost Lead" column per step. Client ki dikkat: ek lead kisi step
-- (jaise "Schedule design call") par Lost mark ho chuki hoti hai (ek column
-- me "Lost" likha hota hai), par wo lead AAGE ke steps me bhi pending dikhti
-- rehti thi — kyunki pending-list sirf us step ke apne plan/actual column
-- dekhti thi, lead "lost" hai ya nahi ye kahin check hi nahi hota tha.
--
-- Ab admin kisi bhi step par (jahan "Lost" status likha jaata hai) ek column
-- + uski "lost" value set kar sakta hai. Jis row me wo column us value se
-- match kare, wo row FMS ke KISI BHI step ki pending list me nahi dikhegi —
-- plan_col/actual_col jaisa hi naam-se-heal pattern (sheet me column
-- jod/hata do tab bhi letter khud theek ho jaata hai).
ALTER TABLE fms_steps ADD COLUMN IF NOT EXISTS lost_col VARCHAR(10) DEFAULT '';
ALTER TABLE fms_steps ADD COLUMN IF NOT EXISTS lost_col_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE fms_steps ADD COLUMN IF NOT EXISTS lost_value VARCHAR(255) DEFAULT NULL;
