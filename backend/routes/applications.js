const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Candidate: apply to a job — requires active membership at the moment of applying
router.post('/', requireAuth('candidate'), (req, res) => {
  const cand = db.prepare('SELECT membership_active FROM candidates WHERE id = ?').get(req.user.id);
  if (!cand.membership_active) {
    return res.status(402).json({ error: 'Apply करण्यासाठी आधी सदस्यत्व सक्रिय करा (₹99).', membership_required: true });
  }
  const { job_id } = req.body;
  const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND status = 'approved'").get(job_id);
  if (!job) return res.status(404).json({ error: 'व्हॅकन्सी सापडली नाही.' });
  const already = db.prepare('SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?').get(job_id, req.user.id);
  if (already) return res.status(409).json({ error: 'तुम्ही आधीच अर्ज केला आहे.' });

  db.prepare('INSERT INTO applications (job_id, candidate_id) VALUES (?,?)').run(job_id, req.user.id);
  const c = db.prepare('SELECT name FROM candidates WHERE id = ?').get(req.user.id);
 db.prepare(`INSERT INTO notifications (user_type, user_id, title, body) VALUES ('company', ?, ?, ?)`)
     .run(job.company_id, 'नवीन अर्ज', `${c.name} यांनी ${job.title} साठी अर्ज केला.`);
    res.json({ ok: true });
  });
  // Candidate: my applications (with job + company info)
router.get('/mine', requireAuth('candidate'), (req, res) => {
  const rows = db.prepare(`
    SELECT applications.*, jobs.title as job_title, companies.name as company_name
    FROM applications
    JOIN jobs ON jobs.id = applications.job_id
    JOIN companies ON companies.id = jobs.company_id
    WHERE applications.candidate_id = ?
    ORDER BY applications.applied_at DESC
  `).all(req.user.id);
  res.json(rows);
});

// Company: view applications for one of my jobs — full candidate profile shown
// (this is exactly the moment gating allows access: candidate has applied to THIS company's job)
router.get('/job/:jobId', requireAuth('company'), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);
  if (!job || job.company_id !== req.user.id) return res.status(404).json({ error: 'व्हॅकन्सी सापडली नाही.' });
  const rows = db.prepare(`
    SELECT applications.id as application_id, applications.status, applications.interview_date, applications.applied_at,
           candidates.id as candidate_id, candidates.name, candidates.category, candidates.experience,
           candidates.phone, candidates.resume_path
    FROM applications JOIN candidates ON candidates.id = applications.candidate_id
    WHERE applications.job_id = ?
    ORDER BY applications.applied_at DESC
  `).all(req.params.jobId);
  res.json(rows);
});

// Company: candidate directory — THE PRIVACY GATE.
// Every candidate is listed, but phone/resume are only included if that candidate
// has applied to ANY job posted by this company. This check happens server-side,
// so it cannot be bypassed from the browser.
// Company: candidate directory — matches only candidates in the same category as this company's jobs, and only if membership is active
router.get('/directory', requireAuth('company'), (req, res) => {
  const co = db.prepare('SELECT membership_active FROM companies WHERE id = ?').get(req.user.id);
  if (!co.membership_active) {
    return res.status(402).json({ error: 'उमेदवार डेटाबेस बघण्यासाठी आधी सदस्यत्व सक्रिय करा (₹200).', membership_required: true });
  }

  const companyJobs = db.prepare('SELECT DISTINCT category FROM jobs WHERE company_id = ?').all(req.user.id);
  const categories = companyJobs.map(j => j.category);
  if (categories.length === 0) return res.json([]);
  const placeholders = categories.map(() => '?').join(',');
  const candidates = db.prepare('SELECT id, name, category, experience FROM candidates WHERE category IN (' + placeholders + ')').all(...categories);

  const appliedRows = db.prepare(`
    SELECT DISTINCT applications.candidate_id
    FROM applications JOIN jobs ON jobs.id = applications.job_id
    WHERE jobs.company_id = ?
  `).all(req.user.id);
  const appliedIds = new Set(appliedRows.map(r => r.candidate_id));

  const result = candidates.map(c => {
    const unlocked = appliedIds.has(c.id);
    if (!unlocked) return { id: c.id, name: c.name, category: c.category, experience: c.experience, unlocked: false };
    const full = db.prepare('SELECT phone, resume_path FROM candidates WHERE id = ?').get(c.id);
    return { id: c.id, name: c.name, category: c.category, experience: c.experience, unlocked: true, phone: full.phone, resume_path: full.resume_path };
  });
  res.json(result);
});
// Company: schedule interview / change application status
router.put('/:id', requireAuth('company'), (req, res) => {
  const app = db.prepare(`
    SELECT applications.*, jobs.company_id, jobs.title as job_title
    FROM applications JOIN jobs ON jobs.id = applications.job_id
    WHERE applications.id = ?
  `).get(req.params.id);
  if (!app || app.company_id !== req.user.id) return res.status(404).json({ error: 'अर्ज सापडला नाही.' });

  const { status, interview_date } = req.body;
  db.prepare('UPDATE applications SET status = COALESCE(?, status), interview_date = COALESCE(?, interview_date) WHERE id = ?')
    .run(status || null, interview_date || null, app.id);

  if (status) {
    const labels = { interview: 'इंटरव्ह्यू निश्चित झाला', selected: 'तुमची निवड झाली आहे', rejected: 'अर्ज नाकारला गेला' };
    if (labels[status]) {
      db.prepare(`INSERT INTO notifications (user_type, user_id, title, body) VALUES ('candidate', ?, ?, ?)`)
        .run(app.candidate_id, labels[status], `${app.job_title} साठी: ${labels[status]}.${interview_date ? ' तारीख: ' + interview_date : ''}`);
    }
  }
  res.json({ ok: true });
});

module.exports = router;
