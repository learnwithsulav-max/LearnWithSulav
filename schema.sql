-- Run in phpMyAdmin (SQL tab) on your ProFreeHost database.
CREATE TABLE questions (
  qid VARCHAR(8) PRIMARY KEY,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT NOT NULL, option_d TEXT NOT NULL,
  correct CHAR(1) NOT NULL,
  flags VARCHAR(120) NULL
) CHARACTER SET utf8mb4;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(10) NOT NULL UNIQUE,   -- 10 digits, e.g. 98XXXXXXXX
  email VARCHAR(150) NULL,
  insurance_type VARCHAR(30) NULL,
  company VARCHAR(150) NULL,
  branch VARCHAR(60) NULL,
  txn_id VARCHAR(30) NULL UNIQUE,
  screenshot VARCHAR(80) NULL,
  pin CHAR(4) NOT NULL,
  status ENUM('Pending','Approved') NOT NULL DEFAULT 'Pending',
  fails TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4;

CREATE TABLE attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  started_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  score INT NULL,
  passed TINYINT NULL,
  INDEX (student_id)
) CHARACTER SET utf8mb4;

CREATE TABLE attempt_items (
  attempt_id INT NOT NULL,
  pos TINYINT NOT NULL,
  qid VARCHAR(8) NOT NULL,
  opt_order CHAR(4) NOT NULL,          -- shuffled order of A-D shown to the student
  answer CHAR(1) NULL,                 -- original option key the student picked
  PRIMARY KEY (attempt_id, pos)
) CHARACTER SET utf8mb4;

-- Test student (change phone/PIN):
-- INSERT INTO students (name, phone, pin, status) VALUES ('Test Student', '9800000000', '1234', 'Approved');
-- Then: Import tab > LearnWithSulav_Questions_Clean.csv into `questions`
-- (format CSV, skip 1 header row, columns in file order: qid, question, option_a..d, correct, flags).
