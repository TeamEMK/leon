-- Leave Type dropdown me do naye options chahiye the: "Early Go" aur
-- "Long Leave" (Full Day/Half Day pehle se hain). Postgres me CHECK
-- constraint me seedha value nahi jodi ja sakti — poora constraint
-- drop karke, naye allowed set ke saath dobara banana padta hai.
-- Purane values (work_from_home, extra_working) bhi rakhe hain — wo
-- ab apply karne ke liye dropdown me nahi hain, par purani rows abhi
-- bhi unhi values ke saath maujood hain.
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_chk;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_chk
  CHECK (leave_type IS NULL OR leave_type IN ('full_day','half_day','work_from_home','extra_working','early_go','long_leave'));
