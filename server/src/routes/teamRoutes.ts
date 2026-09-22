import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';

const router = Router();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NN26-${code}`;
}

// GET /api/teams/generate-code
router.get('/generate-code', async (req: Request, res: Response) => {
  try {
    let teamCode = generateCode();
    let existing = await db.get('SELECT id FROM teams WHERE id = ?', [teamCode]);
    let attempts = 0;
    while (existing && attempts < 20) {
      teamCode = generateCode();
      existing = await db.get('SELECT id FROM teams WHERE id = ?', [teamCode]);
      attempts++;
    }
    return res.json({ teamCode });
  } catch (err) {
    console.error('Failed to generate team code:', err);
    return res.status(500).json({ error: 'Failed to generate unique team code' });
  }
});

// POST /api/teams/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      team_code,
      leader_name,
      leader_roll,
      member2_name,
      member2_roll,
      member3_name,
      member3_roll,
      member4_name,
      member4_roll
    } = req.body;
    const team_name = req.body.team_name || req.body.name;

    // 1. Basic validation
    if (!team_name || typeof team_name !== 'string' || !team_name.trim()) {
      return res.status(400).json({ error: 'Team Name is required' });
    }
    if (!leader_name || typeof leader_name !== 'string' || !leader_name.trim()) {
      return res.status(400).json({ error: 'Team Leader Name is required' });
    }
    if (!leader_roll || typeof leader_roll !== 'string' || !leader_roll.trim()) {
      return res.status(400).json({ error: 'Team Leader Roll Number is required' });
    }
    if (!member2_name || typeof member2_name !== 'string' || !member2_name.trim()) {
      return res.status(400).json({ error: 'Member 2 Name is required' });
    }
    if (!member2_roll || typeof member2_roll !== 'string' || !member2_roll.trim()) {
      return res.status(400).json({ error: 'Member 2 Roll Number is required' });
    }

    const trimmedName = team_name.trim();
    const trimmedLeaderName = leader_name.trim();
    const trimmedLeaderRoll = leader_roll.trim().toUpperCase();
    const m2Name = member2_name.trim();
    const m2Roll = member2_roll.trim().toUpperCase();

    const m3Name = member3_name ? member3_name.trim() : null;
    const m3Roll = member3_roll ? member3_roll.trim().toUpperCase() : null;
    const m4Name = member4_name ? member4_name.trim() : null;
    const m4Roll = member4_roll ? member4_roll.trim().toUpperCase() : null;

    // Check duplicate roll numbers within this team
    const rollsInTeam = [trimmedLeaderRoll, m2Roll];
    if (m3Roll) rollsInTeam.push(m3Roll);
    if (m4Roll) rollsInTeam.push(m4Roll);

    const uniqueRolls = new Set(rollsInTeam);
    if (uniqueRolls.size !== rollsInTeam.length) {
      return res.status(400).json({ error: 'Duplicate roll numbers found within the team.' });
    }

    // Check if team name already exists
    const existingTeam = await db.get('SELECT id FROM teams WHERE LOWER(team_name) = LOWER(?)', [trimmedName]);
    if (existingTeam) {
      return res.status(400).json({ error: 'This Team Name is already taken. Please choose another.' });
    }

    // Check if any roll number already registered
    const registeredTeams = await db.all('SELECT leader_roll, member2_roll, member3_roll, member4_roll FROM teams');
    for (const roll of rollsInTeam) {
      const duplicate = registeredTeams.some((t: any) =>
        t.leader_roll === roll ||
        t.member2_roll === roll ||
        t.member3_roll === roll ||
        t.member4_roll === roll
      );
      if (duplicate) {
        return res.status(400).json({ error: `Roll number ${roll} is already registered with another team.` });
      }
    }

    // Determine or validate team code
    let finalCode = (team_code && typeof team_code === 'string' && team_code.trim()) ? team_code.trim().toUpperCase() : generateCode();
    let existingCode = await db.get('SELECT id FROM teams WHERE id = ?', [finalCode]);
    while (existingCode) {
      finalCode = generateCode();
      existingCode = await db.get('SELECT id FROM teams WHERE id = ?', [finalCode]);
    }

    const now = new Date().toISOString();

    // Insert Team
    await db.run(
      `INSERT INTO teams (
        id, team_name, leader_name, leader_roll,
        member2_name, member2_roll, member3_name, member3_roll,
        member4_name, member4_roll, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalCode, trimmedName, trimmedLeaderName, trimmedLeaderRoll,
        m2Name, m2Roll, m3Name, m3Roll, m4Name, m4Roll, now
      ]
    );

    // Create unique session ID
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // Insert Session
    await db.run(
      `INSERT INTO sessions (
        session_id, team_code, current_index, question_started_at,
        completed, total_score, correct_count, total_time_ms, last_active_at
      ) VALUES (?, ?, 0, NULL, 0, 0, 0, 0, ?)`,
      [sessionId, finalCode, now]
    );

    // Get event state
    const eventState = await db.get('SELECT * FROM event_state WHERE id = 1');

    // Log event
    await db.run(
      'INSERT INTO event_logs (event_type, team_code, details, timestamp) VALUES (?, ?, ?, ?)',
      ['TEAM_REGISTERED', finalCode, `Team ${trimmedName} (${finalCode}) registered`, now]
    );

    const team = await db.get('SELECT * FROM teams WHERE id = ?', [finalCode]);

    return res.status(201).json({
      message: 'Registration successful',
      teamCode: finalCode,
      sessionId,
      team,
      eventState: eventState?.status || 'WAITING'
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// GET /api/teams/session/:teamCode
router.get('/session/:teamCode', async (req: Request, res: Response) => {
  try {
    const { teamCode } = req.params;
    if (!teamCode) {
      return res.status(400).json({ error: 'Team code is required' });
    }

    const cleanCode = teamCode.trim().toUpperCase();
    const team = await db.get('SELECT * FROM teams WHERE id = ?', [cleanCode]);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const session = await db.get('SELECT * FROM sessions WHERE team_code = ?', [cleanCode]);
    const eventState = await db.get('SELECT * FROM event_state WHERE id = 1');
    const settings = await db.get('SELECT * FROM quiz_settings WHERE id = 1');

    return res.json({
      team,
      session,
      eventState: eventState?.status || 'WAITING',
      settings
    });
  } catch (err: any) {
    console.error('Session lookup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
