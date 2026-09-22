import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { getSocketIO } from '../sockets/socketManager.js';

const router = Router();

// Fisher-Yates in-place shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Calculate speed score based on elapsed seconds
function calculateSpeedScore(
  isCorrect: boolean,
  timeTakenSeconds: number,
  maxPoints: number = 10,
  speedScoringEnabled: boolean = true
): number {
  if (!isCorrect) return 0;
  if (!speedScoringEnabled) return maxPoints;

  // Exact bands from specifications:
  // 0–20 seconds: 10 points
  // 21–40 seconds: 9 points
  // 41–60 seconds: 8 points
  // 61–80 seconds: 7 points
  // 81–100 seconds: 6 points
  // 101–120 seconds: 5 points
  // > 120 seconds: 0 points
  if (timeTakenSeconds <= 20) return 10;
  if (timeTakenSeconds <= 40) return 9;
  if (timeTakenSeconds <= 60) return 8;
  if (timeTakenSeconds <= 80) return 7;
  if (timeTakenSeconds <= 100) return 6;
  if (timeTakenSeconds <= 120) return 5;
  return 0;
}

// Helper to notify admin dashboard
async function broadcastAdminUpdate() {
  try {
    const io = getSocketIO();
    if (!io) return;

    // Quick stats
    const totalTeams = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM teams'))?.c || 0;
    const activeSessions = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM sessions WHERE completed = 0 AND current_index > 0'))?.c || 0;
    const completedSessions = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM sessions WHERE completed = 1'))?.c || 0;
    const totalAnswers = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM answers'))?.c || 0;
    const avgScore = (await db.get<{ a: number }>('SELECT AVG(total_score) as a FROM sessions WHERE current_index > 0'))?.a || 0;

    io.emit('admin:monitor:update', {
      totalTeams,
      activeSessions,
      completedSessions,
      totalAnswers,
      avgScore: Math.round(avgScore * 10) / 10
    });

    // Also trigger leaderboard refresh
    io.emit('leaderboard:refresh');
  } catch (err) {
    // Socket emit failure is non-fatal
  }
}

// Initialize randomized question sequence for a session if not already generated
async function ensureSequence(sessionId: string, teamCode: string): Promise<number> {
  const existingCount = (await db.get<{ c: number }>(
    'SELECT COUNT(*) as c FROM question_sequences WHERE session_id = ?',
    [sessionId]
  ))?.c || 0;

  if (existingCount > 0) {
    return existingCount;
  }

  // Fetch all active questions
  const questions = await db.all<{ id: string }>(
    'SELECT id FROM questions WHERE is_active = 1'
  );

  if (!questions || questions.length === 0) {
    return 0;
  }

  const settings = await db.get('SELECT * FROM quiz_settings WHERE id = 1');
  const targetCount = settings ? Math.min(questions.length, settings.total_questions || 100) : questions.length;

  // Independent per-team Fisher-Yates shuffle
  const shuffled = shuffleArray(questions).slice(0, targetCount);

  for (let i = 0; i < shuffled.length; i++) {
    await db.run(
      'INSERT INTO question_sequences (session_id, team_code, sequence_order, question_id) VALUES (?, ?, ?, ?)',
      [sessionId, teamCode, i, shuffled[i].id]
    );
  }

  return shuffled.length;
}

// GET /api/quiz/current
router.get('/current', async (req: Request, res: Response) => {
  try {
    const teamCode = ((req.headers['x-team-code'] as string) || (req.query.teamCode as string) || '').trim().toUpperCase();
    const sessionId = ((req.headers['x-session-id'] as string) || (req.query.sessionId as string) || '').trim();

    if (!teamCode) {
      return res.status(400).json({ error: 'Team Code is required' });
    }

    const team = await db.get('SELECT * FROM teams WHERE id = ?', [teamCode]);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    let session = await db.get('SELECT * FROM sessions WHERE team_code = ?', [teamCode]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found for team' });
    }

    const eventState = await db.get('SELECT * FROM event_state WHERE id = 1');
    const settings = await db.get('SELECT * FROM quiz_settings WHERE id = 1');
    const questionTime = settings?.question_time_seconds || 120;

    // Check event state
    if (eventState?.status === 'WAITING') {
      return res.json({
        eventState: 'WAITING',
        teamCode,
        teamName: team.team_name,
        message: 'Quiz is waiting to start. Admin will launch shortly.'
      });
    }

    if (eventState?.status === 'COMPLETED') {
      return res.json({
        eventState: 'COMPLETED',
        teamCode,
        teamName: team.team_name,
        completed: true,
        message: 'The quiz event has ended.'
      });
    }

    // Ensure shuffled sequence exists
    const totalQuestions = await ensureSequence(session.session_id, teamCode);
    if (totalQuestions === 0) {
      return res.status(400).json({
        error: 'No active questions found in Question Bank. Please contact the administrator.'
      });
    }

    // Check if session is already completed
    if (session.completed === 1 || session.current_index >= totalQuestions) {
      if (session.completed === 0) {
        await db.run(
          'UPDATE sessions SET completed = 1, completed_at = ? WHERE session_id = ?',
          [new Date().toISOString(), session.session_id]
        );
        session.completed = 1;
      }

      const accuracy = totalQuestions > 0 ? Math.round((session.correct_count / totalQuestions) * 100) : 0;
      const avgTime = session.correct_count > 0 || session.current_index > 0
        ? Math.round((session.total_time_ms / Math.max(1, session.current_index)) / 100) / 10
        : 0;

      return res.json({
        eventState: 'LIVE',
        completed: true,
        teamCode,
        teamName: team.team_name,
        totalScore: session.total_score,
        correctCount: session.correct_count,
        totalQuestions,
        accuracy,
        avgAnswerTime: avgTime
      });
    }

    // Server-Authoritative Timer & Question Loop (handles auto-advancing expired questions)
    let currentIdx = session.current_index;
    while (currentIdx < totalQuestions) {
      const seqItem = await db.get<{ question_id: string }>(
        'SELECT question_id FROM question_sequences WHERE session_id = ? AND sequence_order = ?',
        [session.session_id, currentIdx]
      );

      if (!seqItem) {
        break;
      }

      const qId = seqItem.question_id;

      // Check if question timer was started
      if (!session.question_started_at) {
        const nowMs = Date.now();
        await db.run(
          'UPDATE sessions SET question_started_at = ?, last_active_at = ? WHERE session_id = ?',
          [nowMs, new Date().toISOString(), session.session_id]
        );
        session.question_started_at = nowMs;
      }

      const elapsedSeconds = (Date.now() - session.question_started_at) / 1000;

      // Has the 2-minute timer expired?
      if (elapsedSeconds >= questionTime) {
        // Record as TIMEOUT if not answered
        const existingAns = await db.get(
          'SELECT id FROM answers WHERE session_id = ? AND question_id = ?',
          [session.session_id, qId]
        );

        if (!existingAns) {
          await db.run(
            `INSERT INTO answers (
              session_id, team_code, question_id, selected_option,
              is_correct, time_taken_seconds, score_awarded, submitted_at
            ) VALUES (?, ?, ?, 'TIMEOUT', 0, ?, 0, ?)`,
            [session.session_id, teamCode, qId, questionTime, Date.now()]
          );
        }

        // Advance to next question
        currentIdx++;
        const nextStart = Date.now();
        const isDone = currentIdx >= totalQuestions ? 1 : 0;
        await db.run(
          `UPDATE sessions SET
            current_index = ?,
            question_started_at = ?,
            completed = ?,
            completed_at = ?,
            last_active_at = ?
          WHERE session_id = ?`,
          [
            currentIdx,
            isDone ? null : nextStart,
            isDone,
            isDone ? new Date().toISOString() : null,
            new Date().toISOString(),
            session.session_id
          ]
        );

        session.current_index = currentIdx;
        session.question_started_at = nextStart;

        if (isDone) {
          session.completed = 1;
          break;
        }
      } else {
        // Current question is still within timer!
        const question = await db.get(
          `SELECT id, question_text, option_a, option_b, option_c, option_d,
                  points, image_url, category
           FROM questions WHERE id = ?`,
          [qId]
        );

        const timeRemaining = Math.max(0, questionTime - elapsedSeconds);

        const savedAnswer = await db.get(
          'SELECT selected_option FROM answers WHERE session_id = ? AND question_id = ?',
          [session.session_id, qId]
        );

        return res.json({
          eventState: 'LIVE',
          completed: false,
          teamCode,
          teamName: team.team_name,
          currentIndex: currentIdx + 1,
          totalQuestions,
          timeRemainingSeconds: Math.ceil(timeRemaining),
          totalDurationSeconds: questionTime,
          totalScore: session.total_score,
          selectedOption: savedAnswer?.selected_option || null,
          question: {
            id: question.id,
            question_text: question.question_text,
            option_a: question.option_a,
            option_b: question.option_b,
            option_c: question.option_c,
            option_d: question.option_d,
            image_url: question.image_url,
            category: question.category,
            points: question.points
          }
        });
      }
    }

    // If reached here, all questions have been completed
    const accuracy = totalQuestions > 0 ? Math.round((session.correct_count / totalQuestions) * 100) : 0;
    const avgTime = session.current_index > 0
      ? Math.round((session.total_time_ms / session.current_index) / 100) / 10
      : 0;

    return res.json({
      eventState: 'LIVE',
      completed: true,
      teamCode,
      teamName: team.team_name,
      totalScore: session.total_score,
      correctCount: session.correct_count,
      totalQuestions,
      accuracy,
      avgAnswerTime: avgTime
    });
  } catch (err: any) {
    console.error('Fetch current question error:', err);
    return res.status(500).json({ error: 'Failed to retrieve current question' });
  }
});

// POST /api/quiz/submit-answer
router.post('/submit-answer', async (req: Request, res: Response) => {
  try {
    const { teamCode, sessionId, selectedOption } = req.body;

    if (!teamCode || !selectedOption) {
      return res.status(400).json({ error: 'Team Code and selected option are required' });
    }

    const cleanCode = teamCode.trim().toUpperCase();
    const session = await db.get('SELECT * FROM sessions WHERE team_code = ?', [cleanCode]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.completed === 1) {
      return res.status(400).json({ error: 'Quiz has already been completed by this team' });
    }

    const settings = await db.get('SELECT * FROM quiz_settings WHERE id = 1');
    const questionTime = settings?.question_time_seconds || 120;
    const speedEnabled = settings?.speed_scoring_enabled === 1;

    // Get the current question id from question_sequences
    const seqItem = await db.get<{ question_id: string }>(
      'SELECT question_id FROM question_sequences WHERE session_id = ? AND sequence_order = ?',
      [session.session_id, session.current_index]
    );

    if (!seqItem) {
      return res.status(400).json({ error: 'No active question found at current sequence position' });
    }

    const qId = seqItem.question_id;

    // Check if already answered to prevent double submission
    const existingAnswer = await db.get(
      'SELECT id FROM answers WHERE session_id = ? AND question_id = ?',
      [session.session_id, qId]
    );

    if (existingAnswer) {
      return res.status(400).json({ error: 'Answer already submitted for this question' });
    }

    // Calculate server elapsed time
    const startMs = session.question_started_at || Date.now();
    const nowMs = Date.now();
    const timeTaken = Math.min(questionTime, Math.max(0.1, (nowMs - startMs) / 1000));

    // Fetch actual question from DB (including correct_answer for evaluation)
    const question = await db.get(
      'SELECT correct_answer, points FROM questions WHERE id = ?',
      [qId]
    );

    if (!question) {
      return res.status(404).json({ error: 'Question not found in database' });
    }

    const cleanOption = selectedOption.trim().toUpperCase();
    const isCorrect = cleanOption === question.correct_answer ? 1 : 0;
    const pointsAwarded = calculateSpeedScore(isCorrect === 1, timeTaken, question.points || 10, speedEnabled);

    // Save answer
    await db.run(
      `INSERT INTO answers (
        session_id, team_code, question_id, selected_option,
        is_correct, time_taken_seconds, score_awarded, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.session_id,
        cleanCode,
        qId,
        cleanOption,
        isCorrect,
        Math.round(timeTaken * 10) / 10,
        pointsAwarded,
        nowMs
      ]
    );

    // Count total questions in sequence
    const totalCount = (await db.get<{ c: number }>(
      'SELECT COUNT(*) as c FROM question_sequences WHERE session_id = ?',
      [session.session_id]
    ))?.c || 100;

    // Advance session
    const nextIndex = session.current_index + 1;
    const isCompleted = nextIndex >= totalCount ? 1 : 0;
    const newScore = session.total_score + pointsAwarded;
    const newCorrect = session.correct_count + isCorrect;
    const newTotalTime = session.total_time_ms + Math.round(timeTaken * 1000);
    const nextStartMs = isCompleted ? null : Date.now();

    await db.run(
      `UPDATE sessions SET
        current_index = ?,
        question_started_at = ?,
        completed = ?,
        completed_at = ?,
        total_score = ?,
        correct_count = ?,
        total_time_ms = ?,
        last_active_at = ?
      WHERE session_id = ?`,
      [
        nextIndex,
        nextStartMs,
        isCompleted,
        isCompleted ? new Date().toISOString() : null,
        newScore,
        newCorrect,
        newTotalTime,
        new Date().toISOString(),
        session.session_id
      ]
    );

    // Broadcast admin live statistics asynchronously
    broadcastAdminUpdate();

    return res.json({
      success: true,
      pointsAwarded,
      isCorrect: isCorrect === 1,
      totalScore: newScore,
      nextIndex: nextIndex + 1,
      completed: isCompleted === 1
    });
  } catch (err: any) {
    console.error('Submit answer error:', err);
    return res.status(500).json({ error: 'Failed to record answer' });
  }
});

// POST /api/quiz/timeout
router.post('/timeout', async (req: Request, res: Response) => {
  try {
    const { teamCode, selectedOption } = req.body;
    if (!teamCode) {
      return res.status(400).json({ error: 'Team Code is required' });
    }

    const cleanCode = teamCode.trim().toUpperCase();
    const session = await db.get('SELECT * FROM sessions WHERE team_code = ?', [cleanCode]);
    if (!session || session.completed === 1) {
      return res.status(400).json({ error: 'Active session not found' });
    }

    // Call submit-answer internally with whatever was selected or TIMEOUT
    req.body.selectedOption = selectedOption || 'TIMEOUT';
    req.body.sessionId = session.session_id;

    // Forward to submit answer handler logic
    const seqItem = await db.get<{ question_id: string }>(
      'SELECT question_id FROM question_sequences WHERE session_id = ? AND sequence_order = ?',
      [session.session_id, session.current_index]
    );

    if (!seqItem) {
      return res.status(400).json({ error: 'No question at current index' });
    }

    const qId = seqItem.question_id;
    const settings = await db.get('SELECT * FROM quiz_settings WHERE id = 1');
    const questionTime = settings?.question_time_seconds || 120;

    const question = await db.get(
      'SELECT correct_answer, points FROM questions WHERE id = ?',
      [qId]
    );

    const cleanOption = (selectedOption || 'TIMEOUT').trim().toUpperCase();
    const isCorrect = (question && cleanOption === question.correct_answer) ? 1 : 0;
    // Timeout at 120s gets 5 points if correct, 0 if wrong
    const pointsAwarded = isCorrect ? 5 : 0;

    await db.run(
      `INSERT OR REPLACE INTO answers (
        session_id, team_code, question_id, selected_option,
        is_correct, time_taken_seconds, score_awarded, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.session_id,
        cleanCode,
        qId,
        cleanOption,
        isCorrect,
        questionTime,
        pointsAwarded,
        Date.now()
      ]
    );

    const totalCount = (await db.get<{ c: number }>(
      'SELECT COUNT(*) as c FROM question_sequences WHERE session_id = ?',
      [session.session_id]
    ))?.c || 100;

    const nextIndex = session.current_index + 1;
    const isCompleted = nextIndex >= totalCount ? 1 : 0;
    const newScore = session.total_score + pointsAwarded;
    const newCorrect = session.correct_count + isCorrect;
    const newTotalTime = session.total_time_ms + (questionTime * 1000);
    const nextStartMs = isCompleted ? null : Date.now();

    await db.run(
      `UPDATE sessions SET
        current_index = ?,
        question_started_at = ?,
        completed = ?,
        completed_at = ?,
        total_score = ?,
        correct_count = ?,
        total_time_ms = ?,
        last_active_at = ?
      WHERE session_id = ?`,
      [
        nextIndex,
        nextStartMs,
        isCompleted,
        isCompleted ? new Date().toISOString() : null,
        newScore,
        newCorrect,
        newTotalTime,
        new Date().toISOString(),
        session.session_id
      ]
    );

    broadcastAdminUpdate();

    return res.json({
      success: true,
      timedOut: true,
      pointsAwarded,
      isCorrect: isCorrect === 1,
      totalScore: newScore,
      nextIndex: nextIndex + 1,
      completed: isCompleted === 1
    });
  } catch (err) {
    console.error('Timeout handler error:', err);
    return res.status(500).json({ error: 'Failed to process question timeout' });
  }
});

// GET /api/quiz/results/:teamCode
router.get('/results/:teamCode', async (req: Request, res: Response) => {
  try {
    const { teamCode } = req.params;
    if (!teamCode) {
      return res.status(400).json({ error: 'Team Code is required' });
    }

    const cleanCode = teamCode.trim().toUpperCase();
    const team = await db.get('SELECT * FROM teams WHERE id = ?', [cleanCode]);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const session = await db.get('SELECT * FROM sessions WHERE team_code = ?', [cleanCode]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const totalCount = (await db.get<{ c: number }>(
      'SELECT COUNT(*) as c FROM question_sequences WHERE session_id = ?',
      [session.session_id]
    ))?.c || 100;

    const accuracy = totalCount > 0 ? Math.round((session.correct_count / totalCount) * 100) : 0;
    const avgTime = session.current_index > 0
      ? Math.round((session.total_time_ms / session.current_index) / 100) / 10
      : 0;

    return res.json({
      teamCode: cleanCode,
      teamName: team.team_name,
      leaderName: team.leader_name,
      totalScore: session.total_score,
      correctAnswers: session.correct_count,
      totalQuestions: totalCount,
      accuracy,
      avgAnswerTimeSeconds: avgTime,
      completed: session.completed === 1,
      completedAt: session.completed_at
    });
  } catch (err) {
    console.error('Results fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
});

export default router;
