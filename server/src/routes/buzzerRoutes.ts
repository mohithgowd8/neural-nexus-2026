import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { broadcastBuzzerEvent } from '../sockets/socketManager.js';
import { requireAdminAuth, AdminAuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/buzzer/state - Current buzzer status
router.get('/state', async (req: Request, res: Response) => {
  try {
    const roundId = (req.query.roundId as string) || 'round-7';
    let session = await db.get('SELECT * FROM buzzer_sessions WHERE round_id = ?', [roundId]);

    if (!session) {
      const id = `buzz-${roundId}`;
      await db.run(
        'INSERT INTO buzzer_sessions (id, round_id, is_active, status, history_json, updated_at) VALUES (?, ?, 0, "IDLE", "[]", ?)',
        [id, roundId, new Date().toISOString()]
      );
      session = await db.get('SELECT * FROM buzzer_sessions WHERE round_id = ?', [roundId]);
    }

    return res.json({ session });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch buzzer state' });
  }
});

// POST /api/buzzer/buzz - Student presses the buzzer
router.post('/buzz', async (req: Request, res: Response) => {
  try {
    const { roundId = 'round-7', teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID required' });
    }

    const team = await db.get('SELECT id, name, is_disqualified FROM teams WHERE id = ?', [teamId]);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    if (team.is_disqualified) {
      return res.status(403).json({ error: 'Disqualified teams cannot buzz' });
    }

    const session = await db.get('SELECT * FROM buzzer_sessions WHERE round_id = ?', [roundId]);
    if (!session || !session.is_active || session.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'BUZZER_NOT_ACTIVE', message: 'Buzzer is currently locked or not active' });
    }

    // Server-authoritative: First buzz locks the buzzer
    const serverTimestamp = new Date().toISOString();
    let history: any[] = [];
    try {
      history = JSON.parse(session.history_json || '[]');
    } catch (e) {
      history = [];
    }

    history.push({
      teamId: team.id,
      teamName: team.name,
      timestamp: serverTimestamp
    });

    await db.run(
      `UPDATE buzzer_sessions SET
        buzzed_team_id = ?,
        buzzed_team_name = ?,
        buzzed_at = ?,
        status = 'LOCKED',
        history_json = ?,
        updated_at = ?
      WHERE id = ? AND status = 'ACTIVE'`,
      [team.id, team.name, serverTimestamp, JSON.stringify(history), serverTimestamp, session.id]
    );

    // Fetch updated session
    const updatedSession = await db.get('SELECT * FROM buzzer_sessions WHERE id = ?', [session.id]);

    // Broadcast to all devices
    broadcastBuzzerEvent('BUZZER_LOCKED', {
      teamId: team.id,
      teamName: team.name,
      buzzedAt: serverTimestamp,
      questionId: session.question_id
    });

    return res.json({
      success: true,
      buzzedFirst: updatedSession.buzzed_team_id === team.id,
      session: updatedSession
    });
  } catch (err: any) {
    console.error('Buzzer error:', err);
    return res.status(500).json({ error: 'Failed to record buzz' });
  }
});

// Admin Buzzer Controls:
// POST /api/buzzer/activate - Admin opens buzzer for answers
router.post('/activate', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { roundId = 'round-7', questionId, questionText } = req.body;
    const now = new Date().toISOString();

    let session = await db.get('SELECT * FROM buzzer_sessions WHERE round_id = ?', [roundId]);
    if (!session) {
      await db.run(
        `INSERT INTO buzzer_sessions (id, round_id, question_id, question_text, is_active, status, history_json, updated_at)
         VALUES (?, ?, ?, ?, 1, 'ACTIVE', '[]', ?)`,
        [`buzz-${roundId}`, roundId, questionId || null, questionText || null, now]
      );
    } else {
      await db.run(
        `UPDATE buzzer_sessions SET
          question_id = ?,
          question_text = ?,
          is_active = 1,
          buzzed_team_id = NULL,
          buzzed_team_name = NULL,
          buzzed_at = NULL,
          status = 'ACTIVE',
          history_json = '[]',
          updated_at = ?
        WHERE id = ?`,
        [questionId || session.question_id, questionText || session.question_text, now, session.id]
      );
    }

    const updated = await db.get('SELECT * FROM buzzer_sessions WHERE round_id = ?', [roundId]);
    broadcastBuzzerEvent('BUZZER_ACTIVATED', {
      roundId,
      questionId: updated.question_id,
      questionText: updated.question_text
    });

    return res.json({ session: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to activate buzzer' });
  }
});

// POST /api/buzzer/decision - Host decides: ACCEPT or WRONG
router.post('/decision', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { roundId = 'round-7', decision, marks = 20, penalty = 10 } = req.body;
    const session = await db.get('SELECT * FROM buzzer_sessions WHERE round_id = ?', [roundId]);

    if (!session || !session.buzzed_team_id) {
      return res.status(400).json({ error: 'No team has currently buzzed' });
    }

    const teamId = session.buzzed_team_id;
    const now = new Date().toISOString();

    // Adjust team score for the buzzer round
    let submission = await db.get('SELECT * FROM submissions WHERE team_id = ? AND round_id = ?', [teamId, roundId]);
    if (!submission) {
      const subId = `sub-${Date.now()}-${teamId}-${roundId}`;
      await db.run(
        'INSERT INTO submissions (id, team_id, round_id, total_score, correct_count, wrong_count, unanswered_count, time_taken_seconds, submitted_at) VALUES (?, ?, ?, 0, 0, 0, 0, 0, ?)',
        [subId, teamId, roundId, now]
      );
      submission = await db.get('SELECT * FROM submissions WHERE id = ?', [subId]);
    }

    if (decision === 'ACCEPT') {
      const newScore = submission.total_score + Number(marks);
      await db.run(
        'UPDATE submissions SET total_score = ?, correct_count = correct_count + 1 WHERE id = ?',
        [newScore, submission.id]
      );
      await db.run(
        'UPDATE buzzer_sessions SET status = "ACCEPTED", is_active = 0, updated_at = ? WHERE id = ?',
        [now, session.id]
      );
    } else {
      const newScore = submission.total_score - Number(penalty);
      await db.run(
        'UPDATE submissions SET total_score = ?, wrong_count = wrong_count + 1 WHERE id = ?',
        [newScore, submission.id]
      );
      await db.run(
        'UPDATE buzzer_sessions SET status = "WRONG", updated_at = ? WHERE id = ?',
        [now, session.id]
      );
    }

    const updatedSession = await db.get('SELECT * FROM buzzer_sessions WHERE id = ?', [session.id]);
    broadcastBuzzerEvent('BUZZER_DECISION', {
      decision,
      teamId,
      teamName: session.buzzed_team_name,
      session: updatedSession
    });

    return res.json({ success: true, session: updatedSession });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to record decision' });
  }
});

// POST /api/buzzer/reset - Reset buzzer for next team or next question
router.post('/reset', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { roundId = 'round-7', unlockForRemaining = false } = req.body;
    const session = await db.get('SELECT * FROM buzzer_sessions WHERE round_id = ?', [roundId]);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const now = new Date().toISOString();
    if (unlockForRemaining) {
      // Re-enable buzzer for remaining teams without clearing previous history
      await db.run(
        `UPDATE buzzer_sessions SET
          status = 'ACTIVE',
          is_active = 1,
          buzzed_team_id = NULL,
          buzzed_team_name = NULL,
          buzzed_at = NULL,
          updated_at = ?
        WHERE id = ?`,
        [now, session.id]
      );
    } else {
      // Complete reset
      await db.run(
        `UPDATE buzzer_sessions SET
          status = 'IDLE',
          is_active = 0,
          buzzed_team_id = NULL,
          buzzed_team_name = NULL,
          buzzed_at = NULL,
          history_json = '[]',
          updated_at = ?
        WHERE id = ?`,
        [now, session.id]
      );
    }

    const updated = await db.get('SELECT * FROM buzzer_sessions WHERE id = ?', [session.id]);
    broadcastBuzzerEvent('BUZZER_RESET', {
      roundId,
      status: updated.status,
      isActive: updated.is_active
    });

    return res.json({ session: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reset buzzer' });
  }
});

export default router;
