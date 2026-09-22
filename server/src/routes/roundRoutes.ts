import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { SafeQuestion } from '../types/index.js';

const router = Router();

// GET /api/rounds/current
router.get('/current', async (req: Request, res: Response) => {
  try {
    const liveRound = await db.get('SELECT * FROM rounds WHERE status = "LIVE" LIMIT 1');

    if (!liveRound) {
      // Find next ready round
      const nextRound = await db.get('SELECT * FROM rounds WHERE status = "READY" ORDER BY order_index ASC LIMIT 1');
      return res.json({
        round: nextRound || null,
        serverTime: new Date().toISOString(),
        isLive: false,
        remainingSeconds: 0
      });
    }

    // Calculate server remaining seconds
    let remainingSeconds = liveRound.duration_minutes * 60;
    if (liveRound.start_time) {
      const startTimeMs = new Date(liveRound.start_time).getTime();
      const elapsedSeconds = Math.floor((Date.now() - startTimeMs) / 1000);
      remainingSeconds = Math.max(0, (liveRound.duration_minutes * 60) - elapsedSeconds);
    }

    return res.json({
      round: liveRound,
      serverTime: new Date().toISOString(),
      isLive: true,
      remainingSeconds,
      isExpired: remainingSeconds <= 0
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch current round' });
  }
});

// GET /api/rounds/:id/questions
router.get('/:id/questions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teamId = (req.headers['x-team-id'] as string) || (req.query.teamId as string);

    const round = await db.get('SELECT * FROM rounds WHERE id = ?', [id]);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // If final round, verify team is a finalist
    if (round.is_final_round && teamId) {
      const team = await db.get('SELECT is_finalist, is_disqualified FROM teams WHERE id = ?', [teamId]);
      if (team) {
        if (team.is_disqualified) {
          return res.status(403).json({ error: 'Your team has been disqualified from participating in this round.' });
        }
        if (!team.is_finalist) {
          return res.status(403).json({
            error: 'FINALIST_ONLY',
            message: 'Thank you for participating. Please follow the auditorium stage screen for final round updates!'
          });
        }
      }
    }

    // Check if round is LIVE (or admin is inspecting)
    const isAdmin = req.headers['x-admin-request'] === 'true';
    if (!isAdmin && round.status !== 'LIVE') {
      return res.status(400).json({ error: `This round is currently ${round.status}. Questions are only accessible when the round is LIVE.` });
    }

    // Calculate server remaining seconds
    let remainingSeconds = round.duration_minutes * 60;
    if (round.start_time) {
      const startTimeMs = new Date(round.start_time).getTime();
      const elapsedSeconds = Math.floor((Date.now() - startTimeMs) / 1000);
      remainingSeconds = Math.max(0, (round.duration_minutes * 60) - elapsedSeconds);
    }

    // Fetch active questions
    const rawQuestions = await db.all(
      'SELECT id, round_id, question_text, question_type, image_url, options_json, marks, negative_marks, question_order FROM questions WHERE round_id = ? AND is_active = 1 ORDER BY question_order ASC',
      [id]
    );

    // Format safe questions for student browser
    const safeQuestions: SafeQuestion[] = rawQuestions.map((q: any) => {
      let parsedOptions: string[] = [];
      try {
        parsedOptions = JSON.parse(q.options_json);
      } catch (e) {
        parsedOptions = [];
      }

      return {
        id: q.id,
        round_id: q.round_id,
        question_text: q.question_text,
        question_type: q.question_type,
        image_url: q.image_url,
        options: parsedOptions,
        marks: q.marks,
        negative_marks: q.negative_marks,
        question_order: q.question_order
      };
    });

    return res.json({
      round: {
        id: round.id,
        name: round.name,
        subtitle: round.subtitle,
        description: round.description,
        type: round.type,
        durationMinutes: round.duration_minutes,
        marksPerQuestion: round.marks_per_question,
        negativeMarking: round.negative_marking,
        allowBackwardNav: round.allow_backward_nav,
        allowUnanswered: round.allow_unanswered,
        remainingSeconds,
        serverTime: new Date().toISOString()
      },
      questions: safeQuestions
    });
  } catch (err: any) {
    console.error('Error fetching round questions:', err);
    return res.status(500).json({ error: 'Failed to fetch round questions' });
  }
});

export default router;
