import { Router, Request, Response } from 'express';
import { db, persistDb } from '../db/database.js';
import { requireAdminAuth, AdminAuthRequest } from '../middleware/authMiddleware.js';
import { broadcastEventStatus, broadcastLeaderboardUpdate, getSocketIO } from '../sockets/socketManager.js';
import { NEXUS_100_QUESTIONS } from '../data/questions100.js';

const router = Router();

// Require admin authentication for all admin routes
router.use(requireAdminAuth);

// GET /api/admin/dashboard - Live monitor statistics
router.get('/dashboard', async (req: AdminAuthRequest, res: Response) => {
  try {
    const totalTeamsRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM teams');
    const totalTeams = totalTeamsRow ? totalTeamsRow.count : 0;

    const activeSessionsRow = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM sessions WHERE completed = 0 AND current_index > 0'
    );
    const activeSessions = activeSessionsRow ? activeSessionsRow.count : 0;

    const completedSessionsRow = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM sessions WHERE completed = 1'
    );
    const completedSessions = completedSessionsRow ? completedSessionsRow.count : 0;

    const totalAnswersRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM answers');
    const totalAnswers = totalAnswersRow ? totalAnswersRow.count : 0;

    const totalQuestionsRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    const totalQuestions = totalQuestionsRow ? totalQuestionsRow.count : 0;

    const activeQuestionsRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM questions WHERE is_active = 1');
    const activeQuestions = activeQuestionsRow ? activeQuestionsRow.count : 0;

    const avgScoreRow = await db.get<{ avg: number }>('SELECT AVG(total_score) as avg FROM sessions WHERE current_index > 0');
    const avgScore = avgScoreRow && avgScoreRow.avg ? Math.round(avgScoreRow.avg * 10) / 10 : 0;

    const eventState = await db.get('SELECT * FROM event_state WHERE id = 1');
    const settings = await db.get('SELECT * FROM quiz_settings WHERE id = 1');
    const recentLogs = await db.all('SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT 15');

    return res.json({
      totalTeams,
      activeSessions,
      completedSessions,
      waitingTeams: Math.max(0, totalTeams - activeSessions - completedSessions),
      totalAnswers,
      totalQuestions,
      activeQuestions,
      avgScore,
      eventStatus: eventState?.status || 'WAITING',
      eventState,
      settings,
      recentLogs
    });
  } catch (err: any) {
    console.error('Admin dashboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/admin/settings
router.get('/settings', async (req: AdminAuthRequest, res: Response) => {
  try {
    const settings = await db.get('SELECT * FROM quiz_settings WHERE id = 1');
    const eventState = await db.get('SELECT * FROM event_state WHERE id = 1');
    return res.json({ settings, eventState });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings
router.put('/settings', async (req: AdminAuthRequest, res: Response) => {
  try {
    const {
      total_questions,
      question_time_seconds,
      max_points,
      speed_scoring_enabled,
      leaderboard_visible
    } = req.body;

    const current = await db.get('SELECT * FROM quiz_settings WHERE id = 1');
    const totalQ = total_questions !== undefined ? Number(total_questions) : (current?.total_questions || 100);
    const qTime = question_time_seconds !== undefined ? Number(question_time_seconds) : (current?.question_time_seconds || 120);
    const maxP = max_points !== undefined ? Number(max_points) : (current?.max_points || 10);
    const speedEnabled = speed_scoring_enabled !== undefined ? (speed_scoring_enabled ? 1 : 0) : (current?.speed_scoring_enabled ?? 1);
    const lbVisible = leaderboard_visible !== undefined ? (leaderboard_visible ? 1 : 0) : (current?.leaderboard_visible ?? 0);

    await db.run(
      `UPDATE quiz_settings SET
        total_questions = ?,
        question_time_seconds = ?,
        max_points = ?,
        speed_scoring_enabled = ?,
        leaderboard_visible = ?,
        updated_at = ?
      WHERE id = 1`,
      [totalQ, qTime, maxP, speedEnabled, lbVisible, new Date().toISOString()]
    );

    const updated = await db.get('SELECT * FROM quiz_settings WHERE id = 1');
    return res.json({ message: 'Settings updated successfully', settings: updated });
  } catch (err) {
    console.error('Failed to update settings:', err);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/admin/event/status - Set event state (WAITING, LIVE, COMPLETED)
router.post('/event/status', async (req: AdminAuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['WAITING', 'LIVE', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid event status. Must be WAITING, LIVE, or COMPLETED' });
    }

    const now = new Date().toISOString();
    let startedAtClause = '';
    let completedAtClause = '';

    if (status === 'LIVE') {
      startedAtClause = `, started_at = COALESCE(started_at, '${now}')`;
    } else if (status === 'COMPLETED') {
      completedAtClause = `, completed_at = '${now}'`;
    }

    await db.run(
      `UPDATE event_state SET status = ?, updated_at = ? ${startedAtClause} ${completedAtClause} WHERE id = 1`,
      [status, now]
    );

    await db.run(
      'INSERT INTO event_logs (event_type, details, timestamp) VALUES (?, ?, ?)',
      ['EVENT_STATUS_CHANGED', `Event status set to ${status}`, now]
    );

    // Broadcast to all connected clients & participants
    broadcastEventStatus(status);

    const updated = await db.get('SELECT * FROM event_state WHERE id = 1');
    return res.json({ message: `Event status updated to ${status}`, eventState: updated });
  } catch (err) {
    console.error('Failed to update event status:', err);
    return res.status(500).json({ error: 'Failed to update event status' });
  }
});

// POST /api/admin/event/reset - Reset event data (clears teams and answers, keeps questions)
router.post('/event/reset', async (req: AdminAuthRequest, res: Response) => {
  try {
    await db.exec('DELETE FROM answers');
    await db.exec('DELETE FROM question_sequences');
    await db.exec('DELETE FROM sessions');
    await db.exec('DELETE FROM teams');
    await db.exec('DELETE FROM event_logs');

    const now = new Date().toISOString();
    await db.run(
      "UPDATE event_state SET status = 'WAITING', started_at = NULL, completed_at = NULL, updated_at = ? WHERE id = 1",
      [now]
    );

    await db.run(
      'INSERT INTO event_logs (event_type, details, timestamp) VALUES (?, ?, ?)',
      ['EVENT_RESET', 'Event reset by admin. All teams, answers, and scores cleared.', now]
    );

    broadcastEventStatus('WAITING');

    return res.json({ message: 'Event successfully reset. Ready for new registrations.' });
  } catch (err) {
    console.error('Event reset error:', err);
    return res.status(500).json({ error: 'Failed to reset event' });
  }
});

// ==================== QUESTION BANK ====================

// GET /api/admin/questions - List all questions
router.get('/questions', async (req: AdminAuthRequest, res: Response) => {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const category = ((req.query.category as string) || '').trim();

    let sql = 'SELECT * FROM questions WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (LOWER(question_text) LIKE ? OR LOWER(id) LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY id ASC';

    const questions = await db.all(sql, params);
    const categories = await db.all<{ category: string }>('SELECT DISTINCT category FROM questions ORDER BY category ASC');

    return res.json({
      total: questions.length,
      questions,
      categories: categories.map(c => c.category)
    });
  } catch (err) {
    console.error('Fetch questions error:', err);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// POST /api/admin/questions - Add single question
router.post('/questions', async (req: AdminAuthRequest, res: Response) => {
  try {
    const {
      id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      points,
      image_url,
      category,
      is_active
    } = req.body;

    if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
      return res.status(400).json({ error: 'All question fields and options A-D are required' });
    }

    const cleanAnswer = correct_answer.trim().toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(cleanAnswer)) {
      return res.status(400).json({ error: 'Correct answer must be A, B, C, or D' });
    }

    // Auto-generate question ID if not provided
    let qId = id ? id.trim() : '';
    if (!qId) {
      const count = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM questions'))?.c || 0;
      qId = `Q${String(count + 1).padStart(3, '0')}`;
    }

    const existing = await db.get('SELECT id FROM questions WHERE id = ?', [qId]);
    if (existing) {
      return res.status(400).json({ error: `Question with ID ${qId} already exists` });
    }

    await db.run(
      `INSERT INTO questions (
        id, question_text, option_a, option_b, option_c, option_d,
        correct_answer, points, image_url, category, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        qId,
        question_text.trim(),
        option_a.trim(),
        option_b.trim(),
        option_c.trim(),
        option_d.trim(),
        cleanAnswer,
        points !== undefined ? Number(points) : 10,
        image_url ? image_url.trim() : null,
        category ? category.trim() : 'AI & Data Science',
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        new Date().toISOString()
      ]
    );

    const question = await db.get('SELECT * FROM questions WHERE id = ?', [qId]);
    return res.status(201).json({ message: 'Question created successfully', question });
  } catch (err) {
    console.error('Add question error:', err);
    return res.status(500).json({ error: 'Failed to add question' });
  }
});

// PUT /api/admin/questions/:id - Update question
router.put('/questions/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      points,
      image_url,
      category,
      is_active
    } = req.body;

    const current = await db.get('SELECT * FROM questions WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ error: 'Question not found' });
    }

    let cleanAnswer = current.correct_answer;
    if (correct_answer) {
      cleanAnswer = correct_answer.trim().toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(cleanAnswer)) {
        return res.status(400).json({ error: 'Correct answer must be A, B, C, or D' });
      }
    }

    await db.run(
      `UPDATE questions SET
        question_text = ?,
        option_a = ?,
        option_b = ?,
        option_c = ?,
        option_d = ?,
        correct_answer = ?,
        points = ?,
        image_url = ?,
        category = ?,
        is_active = ?
      WHERE id = ?`,
      [
        question_text !== undefined ? question_text.trim() : current.question_text,
        option_a !== undefined ? option_a.trim() : current.option_a,
        option_b !== undefined ? option_b.trim() : current.option_b,
        option_c !== undefined ? option_c.trim() : current.option_c,
        option_d !== undefined ? option_d.trim() : current.option_d,
        cleanAnswer,
        points !== undefined ? Number(points) : current.points,
        image_url !== undefined ? (image_url ? image_url.trim() : null) : current.image_url,
        category !== undefined ? category.trim() : current.category,
        is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM questions WHERE id = ?', [id]);
    return res.json({ message: 'Question updated successfully', question: updated });
  } catch (err) {
    console.error('Update question error:', err);
    return res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /api/admin/questions/:id - Delete question
router.delete('/questions/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM questions WHERE id = ?', [id]);
    return res.json({ message: `Question ${id} deleted successfully` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete question' });
  }
});

// PATCH /api/admin/questions/:id/toggle - Toggle active status
router.patch('/questions/:id/toggle', async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const current = await db.get<{ is_active: number }>('SELECT is_active FROM questions WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const nextState = current.is_active === 1 ? 0 : 1;
    await db.run('UPDATE questions SET is_active = ? WHERE id = ?', [nextState, id]);
    return res.json({ id, is_active: nextState, message: `Question ${id} ${nextState ? 'enabled' : 'disabled'}` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle question status' });
  }
});

// POST /api/admin/questions/load-100 - Load the 100 AI/DS competition questions
router.post('/questions/load-100', async (req: AdminAuthRequest, res: Response) => {
  try {
    let count = 0;
    for (const q of NEXUS_100_QUESTIONS) {
      await db.run(
        `INSERT OR REPLACE INTO questions (
          id, question_text, option_a, option_b, option_c, option_d,
          correct_answer, points, image_url, category, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          q.id,
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_answer,
          q.points,
          q.image_url || null,
          q.category,
          q.is_active,
          new Date().toISOString()
        ]
      );
      count++;
    }

    persistDb();

    return res.json({
      message: `Successfully loaded ${count} official AI & Data Science competition questions!`,
      count
    });
  } catch (err) {
    console.error('Failed to load 100 questions:', err);
    return res.status(500).json({ error: 'Failed to load question pack' });
  }
});

// POST /api/admin/questions/bulk - Bulk upload questions
router.post('/questions/bulk', async (req: AdminAuthRequest, res: Response) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required' });
    }

    let inserted = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d || !q.correct_answer) {
        continue;
      }

      const qId = q.id ? q.id.trim() : `Q${String(i + 1).padStart(3, '0')}`;
      const cleanAnswer = q.correct_answer.trim().toUpperCase();

      await db.run(
        `INSERT OR REPLACE INTO questions (
          id, question_text, option_a, option_b, option_c, option_d,
          correct_answer, points, image_url, category, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          qId,
          q.question_text.trim(),
          q.option_a.trim(),
          q.option_b.trim(),
          q.option_c.trim(),
          q.option_d.trim(),
          cleanAnswer,
          q.points !== undefined ? Number(q.points) : 10,
          q.image_url ? q.image_url.trim() : null,
          q.category ? q.category.trim() : 'General AI & DS',
          q.is_active !== undefined ? (q.is_active ? 1 : 0) : 1,
          new Date().toISOString()
        ]
      );
      inserted++;
    }

    persistDb();
    return res.json({ message: `Successfully imported ${inserted} questions`, count: inserted });
  } catch (err) {
    console.error('Bulk upload error:', err);
    return res.status(500).json({ error: 'Failed to bulk upload questions' });
  }
});

// DELETE /api/admin/questions/purge - Clear all questions
router.delete('/questions/purge', async (req: AdminAuthRequest, res: Response) => {
  try {
    await db.exec('DELETE FROM questions');
    persistDb();
    return res.json({ message: 'All questions purged from Question Bank' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to purge questions' });
  }
});

// ==================== TEAMS ====================

// GET /api/admin/teams - List all teams
router.get('/teams', async (req: AdminAuthRequest, res: Response) => {
  try {
    const teams = await db.all(
      `SELECT
        t.*,
        s.session_id,
        s.current_index,
        s.total_score,
        s.correct_count,
        s.total_time_ms,
        s.completed,
        s.completed_at,
        s.last_active_at
      FROM teams t
      LEFT JOIN sessions s ON s.team_code = t.id
      ORDER BY s.total_score DESC, t.created_at ASC`
    );

    return res.json({ total: teams.length, teams });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// DELETE /api/admin/teams/:teamCode - Delete a team
router.delete('/teams/:teamCode', async (req: AdminAuthRequest, res: Response) => {
  try {
    const { teamCode } = req.params;
    const cleanCode = teamCode.trim().toUpperCase();

    await db.run('DELETE FROM answers WHERE team_code = ?', [cleanCode]);
    await db.run('DELETE FROM question_sequences WHERE team_code = ?', [cleanCode]);
    await db.run('DELETE FROM sessions WHERE team_code = ?', [cleanCode]);
    await db.run('DELETE FROM teams WHERE id = ?', [cleanCode]);

    persistDb();
    return res.json({ message: `Team ${cleanCode} deleted successfully` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete team' });
  }
});

// GET /api/admin/export - Export results
router.get('/export', async (req: AdminAuthRequest, res: Response) => {
  try {
    const format = (req.query.format as string) || 'json';

    const rows = await db.all(
      `SELECT
        t.id as team_code,
        t.team_name,
        t.leader_name,
        t.leader_roll,
        t.member2_name,
        t.member2_roll,
        t.member3_name,
        t.member3_roll,
        t.member4_name,
        t.member4_roll,
        s.current_index as questions_answered,
        s.correct_count,
        s.total_score,
        s.completed,
        s.completed_at,
        (s.total_time_ms / CASE WHEN s.current_index > 0 THEN s.current_index ELSE 1 END / 1000.0) as avg_time_sec
      FROM teams t
      JOIN sessions s ON s.team_code = t.id
      ORDER BY s.total_score DESC, s.completed_at ASC`
    );

    if (format === 'csv') {
      const headers = [
        'Rank', 'Team Code', 'Team Name', 'Score', 'Correct', 'Answered',
        'Accuracy %', 'Avg Time (s)', 'Completed', 'Leader Name', 'Leader Roll', 'Member 2', 'Member 2 Roll'
      ];
      const lines = [headers.join(',')];

      rows.forEach((r, idx) => {
        const accuracy = r.questions_answered > 0 ? Math.round((r.correct_count / r.questions_answered) * 100) : 0;
        const line = [
          idx + 1,
          `"${r.team_code}"`,
          `"${r.team_name}"`,
          r.total_score,
          r.correct_count,
          r.questions_answered,
          `${accuracy}%`,
          (Math.round(r.avg_time_sec * 10) / 10).toFixed(1),
          r.completed ? 'YES' : 'NO',
          `"${r.leader_name}"`,
          `"${r.leader_roll}"`,
          `"${r.member2_name || ''}"`,
          `"${r.member2_roll || ''}"`
        ];
        lines.push(line.join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="neural_nexus_2026_results.csv"');
      return res.send(lines.join('\n'));
    }

    return res.json({ results: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to export results' });
  }
});

export default router;
