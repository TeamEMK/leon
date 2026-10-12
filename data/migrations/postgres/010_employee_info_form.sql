-- Employee Personal Information Form — Forms section ke andar ek built-in
-- form (admin-added link-wale generic forms se alag): har employee apni
-- KYC/personal details ek hi record me bharta hai. Dobara submit = update,
-- naya record nahi (user_id UNIQUE). Sirf admin saari responses dekh sakta
-- hai; har employee sirf apna record dekh/edit kar sakta hai.
--
-- Aadhaar/cancelled-cheque photos base64 me seedha yahan store hoti hain —
-- proof-of-work photo wala hi pattern (006 migration se pehle se hai), chhoti
-- compressed images hain, isliye alag file-storage (Drive) setup nahi chahiye.
CREATE TABLE IF NOT EXISTS employee_info (
  id serial PRIMARY KEY,
  user_id int NOT NULL UNIQUE REFERENCES users(id),
  email text,
  full_name text,
  mobile_number text,
  alternate_phone text,
  gender text,
  dob date,
  current_address text,
  permanent_address text,
  blood_group text,
  about_me text,
  aadhaar_number text,
  aadhaar_photo_front text,
  aadhaar_photo_back text,
  cancelled_cheque_photo text,
  medical_info text,
  parent_name text,
  parent_contact text,
  spouse_sibling_name text,
  spouse_sibling_contact text,
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_primary text,
  emergency_contact_alternate text,
  emergency_contact_address text,
  friend_name text,
  friend_contact text,
  submitted_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);
