import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

const router = Router();

// GET /api/leaderboard - Live/Final leaderboard
router.get('/', async (req: Request, res: Response) => {
  try {
    const eventState = await db.get('SELECT * FROM event_state WHERE id = 1');
    const settings = await db.get('SELECT * FROM quiz_settings WHERE id = 1');

    const isAdmin = req.headers['x-admin-request'] === 'true' || !!req.headers['authorization'];
    const isCompleted = eventState?.status === 'COMPLETED';
    const isVisible = settings?.leaderboard_visible === 1;

    // Check visibility for non-admins
    if (!isAdmin && !isCompleted && !isVisible) {
      return res.json({
        showLeaderboard: false,
        eventStatus: eventState?.status || 'WAITING',
        message: 'The live leaderboard is hidden during the quiz. It will be revealed once all teams finish.'
      });
    }

    // Query all teams joined with their sessions
    const rows = await db.all(
      `SELECT
        t.id as team_code,
        t.team_name,
        s.current_index as questions_completed,
        s.correct_count,
        s.total_score,
        s.total_time_ms,
        s.completed,
        s.completed_at
      FROM teams t
      JOIN sessions s ON s.team_code = t.id
      ORDER BY
        s.total_score DESC,
        s.completed DESC,
        s.completed_at ASC,
        (s.total_time_ms / CASE WHEN s.current_index > 0 THEN s.current_index ELSE 1 END) ASC`
    );

    const totalQuestionsConfig = settings?.total_questions || 100;

    const leaderboard = rows.map((item: any, index: number) => {
      const qCompleted = item.questions_completed || 0;
      const correct = item.correct_count || 0;
      const accuracy = qCompleted > 0 ? Math.round((correct / qCompleted) * 100) : 0;
      const avgTime = qCompleted > 0
        ? Math.round((item.total_time_ms / qCompleted) / 100) / 10
        : 0;

      return {
        rank: index + 1,
        teamCode: item.team_code,
        teamName: item.team_name,
        questionsCompleted: qCompleted,
        totalQuestions: totalQuestionsConfig,
        correctAnswers: correct,
        totalScore: item.total_score || 0,
        averageAnswerTime: avgTime,
        accuracy: `${accuracy}%`,
        accuracyNum: accuracy,
        completed: item.completed === 1,
        completedAt: item.completed_at
      };
    });

    return res.json({
      showLeaderboard: true,
      eventStatus: eventState?.status || 'WAITING',
      leaderboard
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
