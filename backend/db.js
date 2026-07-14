// db.js — खरा SQLite डेटाबेस. Mobile App व Desktop Software दोन्ही याच फाईलला वाचतात/लिहितात
// (कारण दोन्ही एकाच सर्व्हरला जोडलेले असतात) — त्यामुळे डेटा नेहमी एकच व लाईव्ह असतो.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'jiaveri.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  category TEXT DEFAULT '',
  location TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',           -- pending | approved | blocked
  membership_active INTEGER DEFAULT 0,
  membership_expiry TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  category TEXT DEFAULT '',
  experience TEXT DEFAULT '',
  resume_path TEXT,
  membership_active INTEGER DEFAULT 0,
  membership_expiry TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT '',
  location TEXT DEFAULT '',
  salary TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',           -- pending | approved | rejected
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  candidate_id INTEGER NOT NULL,
  status TEXT DEFAULT 'applied',           -- applied | interview | selected | rejected
  interview_date TEXT,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, candidate_id),
  FOREIGN KEY(job_id) REFERENCES jobs(id),
  FOREIGN KEY(candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type TEXT NOT NULL,                 -- company | candidate
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT,
  status TEXT DEFAULT 'success',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type TEXT NOT NULL,                 -- company | candidate | admin
  user_id INTEGER,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  unread INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;
