import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();
router.use(requireAdminAuth);

function toCsvRow(items: any[]): string {
  return items.map(val => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }).join(',');
}

// GET /api/export/teams.csv
router.get('/teams.csv', async (req: Request, res: Response) => {
  try {
    const teams = await db.all('SELECT * FROM teams ORDER BY created_at ASC');
    const header = ['Team ID', 'Team Name', 'Leader Name', 'Leader Roll', 'Member 2', 'Roll 2', 'Member 3', 'Roll 3', 'Member 4', 'Roll 4', 'Disqualified', 'Finalist', 'Created At'];

    const rows = [toCsvRow(header)];
    for (const t of teams) {
      rows.push(toCsvRow([
        t.id, t.name, t.leader_name, t.leader_roll,
        t.member2_name, t.member2_roll, t.member3_name, t.member3_roll,
        t.member4_name, t.member4_roll, t.is_disqualified ? 'YES' : 'NO',
        t.is_finalist ? 'YES' : 'NO', t.created_at
      ]));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="neural_nexus_teams.csv"');
    return res.send(rows.join('\r\n'));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to export teams' });
  }
});

// GET /api/export/questions.csv
router.get('/questions.csv', async (req: Request, res: Response) => {
  try {
    const questions = await db.all('SELECT * FROM questions ORDER BY round_id ASC, question_order ASC');
    const header = ['Round ID', 'Question', 'Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Marks', 'Negative Marks', 'Explanation'];

    const rows = [toCsvRow(header)];
    for (const q of questions) {
      let opts: string[] = [];
      try { opts = JSON.parse(q.options_json); } catch (e) {}

      rows.push(toCsvRow([
        q.round_id, q.question_text, q.question_type,
        opts[0] || '', opts[1] || '', opts[2] || '', opts[3] || '',
        q.correct_answer, q.marks, q.negative_marks, q.explanation
      ]));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="neural_nexus_questions.csv"');
    return res.send(rows.join('\r\n'));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to export questions' });
  }
});

// GET /api/export/submissions.csv
router.get('/submissions.csv', async (req: Request, res: Response) => {
  try {
    const submissions = await db.all(`
      SELECT
        s.*, t.name as team_name, r.name as round_name
      FROM submissions s
      JOIN teams t ON t.id = s.team_id
      JOIN rounds r ON r.id = s.round_id
      ORDER BY s.submitted_at DESC
    `);

    const header = ['Submission ID', 'Team ID', 'Team Name', 'Round', 'Total Score', 'Correct', 'Wrong', 'Unanswered', 'Time (Seconds)', 'Submitted At'];
    const rows = [toCsvRow(header)];

    for (const s of submissions) {
      rows.push(toCsvRow([
        s.id, s.team_id, s.team_name, s.round_name, s.total_score,
        s.correct_count, s.wrong_count, s.unanswered_count,
        s.time_taken_seconds, s.submitted_at
      ]));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="neural_nexus_submissions.csv"');
    return res.send(rows.join('\r\n'));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to export submissions' });
  }
});

// GET /api/export/leaderboard.csv
router.get('/leaderboard.csv', async (req: Request, res: Response) => {
  try {
    const leaderboard = await db.all(`
      SELECT
        t.id as team_id,
        t.name as team_name,
        t.leader_name,
        COALESCE(SUM(s.total_score), 0) as total_score,
        COALESCE(SUM(s.time_taken_seconds), 0) as total_time_taken,
        COUNT(s.id) as rounds_submitted,
        t.is_finalist
      FROM teams t
      LEFT JOIN submissions s ON s.team_id = t.id
      WHERE t.is_disqualified = 0
      GROUP BY t.id, t.name, t.leader_name
      ORDER BY total_score DESC, total_time_taken ASC
    `);

    const header = ['Rank', 'Team ID', 'Team Name', 'Leader Name', 'Total Score', 'Total Time (Seconds)', 'Rounds Completed', 'Finalist'];
    const rows = [toCsvRow(header)];

    leaderboard.forEach((item, index) => {
      rows.push(toCsvRow([
        index + 1, item.team_id, item.team_name, item.leader_name,
        item.total_score, item.total_time_taken, item.rounds_submitted,
        item.is_finalist ? 'YES' : 'NO'
      ]));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="neural_nexus_final_leaderboard.csv"');
    return res.send(rows.join('\r\n'));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to export leaderboard' });
  }
});

// GET /api/export/backup.json
router.get('/backup.json', async (req: Request, res: Response) => {
  try {
    const event = await db.get('SELECT * FROM events WHERE id = ?', ['event-nn2026']);
    const rounds = await db.all('SELECT * FROM rounds');
    const questions = await db.all('SELECT * FROM questions');
    const teams = await db.all('SELECT * FROM teams');
    const submissions = await db.all('SELECT * FROM submissions');
    const awards = await db.all('SELECT * FROM special_awards');

    const backup = {
      exportedAt: new Date().toISOString(),
      event,
      rounds,
      questions,
      teams,
      submissions,
      awards
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="neural_nexus_backup.json"');
    return res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to export backup' });
  }
});

export default router;
