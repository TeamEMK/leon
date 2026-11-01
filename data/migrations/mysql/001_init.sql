-- MySQL / MariaDB schema (phpMyAdmin / Hostinger).
-- Postgres migrations 001-014 ka FINAL state ek file me — naye database par yahi ek file
-- chahiye. Kuch jaan-boojh kar alag hai:
--   * timestamp -> DATETIME: phpMyAdmin import par time-zone ka jhanjhat nahi (app IST
--     wall-clock hi store karta hai).
--   * enum jaisi text columns -> VARCHAR (CHECK constraints nahi: MySQL/MariaDB versions me
--     alag chalte hain; app khud validate karta hai).
--   * photos / lambe text -> MEDIUMTEXT / LONGBLOB (base64 photo 64KB se bahut badi hoti hai).
--   * utf8mb4_unicode_ci: MySQL 5.7/8 aur MariaDB, dono par chalta hai.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE app_settings (
  key_name varchar(100) NOT NULL,
  value mediumtext,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE app_state (
  k varchar(64) NOT NULL,
  v varchar(255) DEFAULT NULL,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (k)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cc_cards (
  id int NOT NULL AUTO_INCREMENT,
  bank_name varchar(50) NOT NULL,
  card_number varchar(50) NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY cc_cards_uq_card_uq (bank_name,card_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cc_departments (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(100) NOT NULL,
  sort_order int DEFAULT 0,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY cc_departments_name_uq (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cc_statements (
  id int NOT NULL AUTO_INCREMENT,
  card_id int NOT NULL,
  statement_date date DEFAULT NULL,
  payment_due_date date DEFAULT NULL,
  payable_amount decimal(12,2) DEFAULT '0.00',
  min_amount_due decimal(12,2) DEFAULT '0.00',
  statement_period varchar(150) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pdf_data longblob,
  drive_file_id varchar(200) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY cc_statements_uq_stmt_uq (card_id,statement_date),
  CONSTRAINT cc_statements_cc_statements_ibfk_1 FOREIGN KEY (card_id) REFERENCES cc_cards (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cc_transactions (
  id int NOT NULL AUTO_INCREMENT,
  statement_id int NOT NULL,
  txn_date date DEFAULT NULL,
  description varchar(500) DEFAULT NULL,
  amount decimal(12,2) DEFAULT '0.00',
  txn_type varchar(50) DEFAULT 'debit',
  expenses varchar(200) DEFAULT NULL,
  department varchar(100) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bill_drive_id varchar(200) DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT cc_transactions_cc_transactions_ibfk_1 FOREIGN KEY (statement_id) REFERENCES cc_statements (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE checklist_tasks (
  id int NOT NULL AUTO_INCREMENT,
  description mediumtext NOT NULL,
  assigned_to int NOT NULL,
  assigned_by int NOT NULL,
  due_date date DEFAULT NULL,
  status varchar(50) DEFAULT 'pending',
  priority varchar(50) DEFAULT 'low',
  remarks mediumtext,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at datetime NULL DEFAULT NULL,
  proof_replaced smallint NOT NULL DEFAULT 0,
  proof_image mediumtext,
  frequency varchar(20) DEFAULT NULL,
  proof_video_id varchar(100) DEFAULT NULL,
  proof_video_mime varchar(50) DEFAULT NULL,
  proof_video_replaced smallint NOT NULL DEFAULT 0,
  doer_remark mediumtext,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delegation_tasks (
  id int NOT NULL AUTO_INCREMENT,
  description mediumtext NOT NULL,
  assigned_to int NOT NULL,
  assigned_by int NOT NULL,
  due_date date DEFAULT NULL,
  status varchar(50) DEFAULT 'pending',
  priority varchar(50) DEFAULT 'low',
  approval varchar(50) DEFAULT 'no',
  waiting_approval smallint DEFAULT 0,
  awaiting_due_date smallint DEFAULT 0,
  remarks mediumtext,
  url varchar(2048) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at datetime NULL DEFAULT NULL,
  proof_replaced smallint NOT NULL DEFAULT 0,
  proof_image mediumtext,
  proof_video_id varchar(100) DEFAULT NULL,
  proof_video_mime varchar(50) DEFAULT NULL,
  proof_video_replaced smallint NOT NULL DEFAULT 0,
  doer_remark mediumtext,
  last_reminder_date date NULL DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fms_extra_rows (
  id int NOT NULL AUTO_INCREMENT,
  step_id int NOT NULL,
  row_label varchar(255) DEFAULT '',
  col_letter varchar(10) DEFAULT '',
  field_type varchar(20) DEFAULT 'text',
  dropdown_options mediumtext,
  required smallint DEFAULT 1,
  col_name varchar(255) NULL DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fms_sheets (
  id int NOT NULL AUTO_INCREMENT,
  fms_name varchar(255) DEFAULT '',
  sheet_name varchar(255) NOT NULL,
  sheet_id varchar(255) NOT NULL,
  header_row int DEFAULT 1,
  total_steps int DEFAULT 0,
  intake_config mediumtext,
  created_by int DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fms_step_doers (
  id int NOT NULL AUTO_INCREMENT,
  step_id int NOT NULL,
  user_id int NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fms_steps (
  id int NOT NULL AUTO_INCREMENT,
  fms_id int NOT NULL,
  step_order int NOT NULL,
  step_name varchar(255) NOT NULL,
  plan_col varchar(10) DEFAULT '',
  plan_col_name varchar(255) DEFAULT NULL,
  actual_col varchar(10) DEFAULT '',
  actual_col_name varchar(255) DEFAULT NULL,
  extra_input varchar(10) DEFAULT 'no',
  extra_col varchar(10) DEFAULT '',
  show_cols mediumtext,
  show_col_names mediumtext,
  delay_reason_col varchar(10) DEFAULT '',
  delay_reason_col_name varchar(255) DEFAULT NULL,
  doer_name_col varchar(10) DEFAULT '',
  doer_name_col_name varchar(255) DEFAULT NULL,
  lost_col varchar(10) NULL DEFAULT '',
  lost_col_name varchar(255) NULL DEFAULT NULL,
  lost_value varchar(255) NULL DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE holidays (
  id int NOT NULL AUTO_INCREMENT,
  holiday_date date NOT NULL,
  name varchar(255) NOT NULL,
  created_by int DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY holidays_holiday_date_uq (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hrm_candidates (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  phone varchar(50) NOT NULL,
  profile_position varchar(255) DEFAULT '',
  interview_date date DEFAULT NULL,
  interview_time varchar(20) DEFAULT '',
  status varchar(50) DEFAULT 'Scheduled',
  reschedule_date date DEFAULT NULL,
  reschedule_time varchar(20) DEFAULT '',
  joining_date date DEFAULT NULL,
  offer_sent smallint DEFAULT 0,
  salary varchar(100) DEFAULT '',
  notes mediumtext,
  meeting_link varchar(1024) DEFAULT '',
  interviewer_phone varchar(50) DEFAULT '',
  created_by int DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reschedule_reason mediumtext,
  offer_drive_id varchar(500) DEFAULT NULL,
  offer_token varchar(64) DEFAULT NULL,
  offer_html mediumtext,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hrm_message_log (
  id int NOT NULL AUTO_INCREMENT,
  candidate_id int DEFAULT NULL,
  candidate_name varchar(255) DEFAULT '',
  phone varchar(50) DEFAULT '',
  action varchar(255) DEFAULT '',
  type varchar(50) DEFAULT 'text',
  status varchar(50) DEFAULT 'Failed',
  error_detail mediumtext,
  payload_json mediumtext,
  retry_count int DEFAULT 0,
  last_retry_at datetime NULL DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_assignments (
  id int NOT NULL AUTO_INCREMENT,
  item_id int NOT NULL,
  user_id int NOT NULL,
  assigned_by int NOT NULL,
  assigned_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  returned_at datetime NULL DEFAULT NULL,
  handover_status varchar(50) DEFAULT 'active',
  handover_notes mediumtext,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_items (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  type varchar(50) NOT NULL,
  brand varchar(255) DEFAULT '',
  model varchar(255) DEFAULT '',
  serial_number varchar(255) DEFAULT '',
  photo mediumtext,
  item_condition varchar(50) DEFAULT 'good',
  status varchar(50) DEFAULT 'available',
  notes mediumtext,
  created_by int DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leave_requests (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  leave_type varchar(50) NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  dates_json mediumtext,
  reason mediumtext NOT NULL,
  status varchar(50) DEFAULT 'pending',
  approver_id int DEFAULT NULL,
  approver_note mediumtext,
  decided_at datetime NULL DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE meeting_attendees (
  id int NOT NULL AUTO_INCREMENT,
  meeting_id int NOT NULL,
  user_id int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY meeting_attendees_uq_meeting_user_uq (meeting_id,user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_requests (
  id int NOT NULL AUTO_INCREMENT,
  submitted_by int NOT NULL,
  name varchar(100) NOT NULL,
  bank_name varchar(50) NOT NULL,
  card_number varchar(50) NOT NULL,
  amount decimal(12,2) DEFAULT '0.00',
  reason mediumtext NOT NULL,
  status varchar(50) DEFAULT 'pending',
  payment_done smallint DEFAULT 0,
  payment_done_at datetime NULL DEFAULT NULL,
  reviewed_at datetime NULL DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pr_cards (
  id int NOT NULL AUTO_INCREMENT,
  bank_name varchar(50) NOT NULL,
  card_number varchar(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY pr_cards_uq_pr_card_uq (bank_name,card_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE queries (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  message mediumtext NOT NULL,
  answer mediumtext,
  status varchar(50) NOT NULL DEFAULT 'open',
  answered_by int DEFAULT NULL,
  answered_at datetime NULL DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_approvals (
  id int NOT NULL AUTO_INCREMENT,
  task_id int NOT NULL,
  task_type varchar(20) NOT NULL,
  requested_by int NOT NULL,
  requested_to int NOT NULL,
  action_type varchar(50) DEFAULT NULL,
  new_date date DEFAULT NULL,
  status varchar(50) DEFAULT 'pending',
  note mediumtext,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_comments (
  id int NOT NULL AUTO_INCREMENT,
  task_id int NOT NULL,
  task_type varchar(20) NOT NULL,
  user_id int NOT NULL,
  comment mediumtext NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_subtasks (
  id int NOT NULL AUTO_INCREMENT,
  task_id int NOT NULL,
  description mediumtext NOT NULL,
  priority varchar(50) DEFAULT 'low',
  status varchar(50) DEFAULT 'pending',
  created_by int NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at datetime NULL DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_transfers (
  id int NOT NULL AUTO_INCREMENT,
  task_id int NOT NULL,
  task_type varchar(20) NOT NULL,
  from_user int NOT NULL,
  to_user int NOT NULL,
  requested_by int NOT NULL,
  status varchar(50) DEFAULT 'pending',
  note mediumtext,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  notification_email varchar(255) DEFAULT '',
  password varchar(255) NOT NULL,
  role varchar(50) DEFAULT 'user',
  view_only smallint NOT NULL DEFAULT 0,
  user_role varchar(50) DEFAULT NULL,
  phone varchar(50) DEFAULT NULL,
  department varchar(255) DEFAULT '',
  week_off varchar(50) DEFAULT '',
  extra_off mediumtext,
  exclude_from_reminder smallint DEFAULT 0,
  extra_access mediumtext,
  user_permissions mediumtext,
  profile_image mediumtext,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  birthday date DEFAULT NULL,
  joining_date date DEFAULT NULL,
  session_version int NOT NULL DEFAULT 1,
  staff_type varchar(50) NOT NULL DEFAULT 'office',
  is_leave_approver tinyint(1) NOT NULL DEFAULT 0,
  leave_approver_id int NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_uq (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE week_plans (
  id int NOT NULL AUTO_INCREMENT,
  employee_id int NOT NULL,
  hod_id int DEFAULT NULL,
  start_date date NOT NULL,
  target_count int DEFAULT 0,
  improvement_pct decimal(5,2) DEFAULT '0.00',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_committed_score decimal(5,1) DEFAULT NULL,
  user_committed_at datetime NULL DEFAULT NULL,
  checkin_skipped_until date DEFAULT NULL,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY week_plans_emp_week_uq (employee_id,start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE forms (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  link text NOT NULL,
  created_by int NULL DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  kiosk_department varchar(255) NULL DEFAULT NULL,
  fms_id int NULL DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE employee_info (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  email varchar(255) NULL DEFAULT NULL,
  full_name varchar(255) NULL DEFAULT NULL,
  mobile_number varchar(50) NULL DEFAULT NULL,
  alternate_phone varchar(50) NULL DEFAULT NULL,
  gender varchar(30) NULL DEFAULT NULL,
  dob date NULL DEFAULT NULL,
  current_address mediumtext,
  permanent_address mediumtext,
  blood_group varchar(20) NULL DEFAULT NULL,
  about_me mediumtext,
  aadhaar_number varchar(50) NULL DEFAULT NULL,
  aadhaar_photo_front longtext,
  aadhaar_photo_back longtext,
  cancelled_cheque_photo longtext,
  medical_info mediumtext,
  parent_name varchar(255) NULL DEFAULT NULL,
  parent_contact varchar(100) NULL DEFAULT NULL,
  spouse_sibling_name varchar(255) NULL DEFAULT NULL,
  spouse_sibling_contact varchar(100) NULL DEFAULT NULL,
  emergency_contact_name varchar(255) NULL DEFAULT NULL,
  emergency_contact_relation varchar(100) NULL DEFAULT NULL,
  emergency_contact_primary varchar(100) NULL DEFAULT NULL,
  emergency_contact_alternate varchar(100) NULL DEFAULT NULL,
  emergency_contact_address mediumtext,
  friend_name varchar(255) NULL DEFAULT NULL,
  friend_contact varchar(100) NULL DEFAULT NULL,
  submitted_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY employee_info_user_uq (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE daily_leave_updates (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  leave_date date NOT NULL,
  leave_type varchar(50) NOT NULL,
  note mediumtext,
  created_by int NULL DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY daily_leave_updates_date_idx (leave_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes
CREATE INDEX cc_transactions_statement_id ON cc_transactions (statement_id);
CREATE INDEX fms_extra_rows_idx_step ON fms_extra_rows (step_id);
CREATE INDEX fms_step_doers_idx_step ON fms_step_doers (step_id);
CREATE INDEX fms_step_doers_idx_user ON fms_step_doers (user_id);
CREATE INDEX fms_steps_idx_fms ON fms_steps (fms_id);
CREATE INDEX holidays_idx_date ON holidays (holiday_date);
CREATE INDEX hrm_candidates_idx_status ON hrm_candidates (status);
CREATE INDEX hrm_candidates_idx_interview_date ON hrm_candidates (interview_date);
CREATE INDEX hrm_message_log_idx_candidate ON hrm_message_log (candidate_id);
CREATE INDEX hrm_message_log_idx_status ON hrm_message_log (status);
CREATE INDEX inventory_assignments_idx_item ON inventory_assignments (item_id);
CREATE INDEX inventory_assignments_idx_user ON inventory_assignments (user_id);
CREATE INDEX inventory_assignments_idx_handover ON inventory_assignments (handover_status);
CREATE INDEX inventory_items_idx_status ON inventory_items (status);
CREATE INDEX inventory_items_idx_type ON inventory_items (type);
CREATE INDEX leave_requests_idx_user ON leave_requests (user_id);
CREATE INDEX leave_requests_idx_status ON leave_requests (status);
CREATE INDEX leave_requests_idx_approver ON leave_requests (approver_id);
CREATE INDEX leave_requests_idx_from ON leave_requests (from_date);
CREATE INDEX meeting_attendees_idx_meeting ON meeting_attendees (meeting_id);
CREATE INDEX meeting_attendees_idx_user ON meeting_attendees (user_id);
CREATE INDEX queries_idx_user ON queries (user_id);
CREATE INDEX queries_idx_status ON queries (status);
CREATE INDEX task_approvals_idx_task ON task_approvals (task_id,task_type);
CREATE INDEX task_approvals_idx_requested_to ON task_approvals (requested_to);
CREATE INDEX task_comments_idx_task ON task_comments (task_id,task_type);
CREATE INDEX task_subtasks_idx_task ON task_subtasks (task_id);
CREATE INDEX week_plans_idx_employee ON week_plans (employee_id);
CREATE INDEX week_plans_idx_start ON week_plans (start_date);
CREATE INDEX checklist_tasks_idx_doer_status_due ON checklist_tasks (assigned_to,status,due_date);
CREATE INDEX checklist_tasks_idx_status_due ON checklist_tasks (status,due_date);
CREATE INDEX delegation_tasks_idx_doer_status_due ON delegation_tasks (assigned_to,status,due_date);
CREATE INDEX delegation_tasks_idx_status_due ON delegation_tasks (status,due_date);
CREATE INDEX week_plans_idx_start_date ON week_plans (start_date);

SET FOREIGN_KEY_CHECKS = 1;
