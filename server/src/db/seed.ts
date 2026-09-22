import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';
import { getDb, db, persistDb } from './database.js';
import { NEXUS_100_QUESTIONS } from '../data/questions100.js';

export async function resetDatabase(loadQuestions: boolean = false) {
  console.log('🔄 Initializing clean Neural Nexus 2026 Database...');

  // Delete existing database file to start 100% fresh if requested
  if (fs.existsSync(CONFIG.DB_PATH)) {
    fs.unlinkSync(CONFIG.DB_PATH);
    console.log('🗑️ Purged old database file:', CONFIG.DB_PATH);
  }

  // Force re-initialization
  await getDb();

  // Ensure clean tables
  await db.exec('DELETE FROM answers');
  await db.exec('DELETE FROM question_sequences');
  await db.exec('DELETE FROM sessions');
  await db.exec('DELETE FROM teams');
  await db.exec('DELETE FROM questions');
  await db.exec('DELETE FROM event_logs');

  await db.run("UPDATE event_state SET status = 'WAITING', started_at = NULL, completed_at = NULL, updated_at = ?", [new Date().toISOString()]);
  await db.run("UPDATE quiz_settings SET total_questions = 100, question_time_seconds = 120, max_points = 10, speed_scoring_enabled = 1, leaderboard_visible = 0, updated_at = ?", [new Date().toISOString()]);

  if (loadQuestions) {
    console.log(`📥 Loading ${NEXUS_100_QUESTIONS.length} official competition questions...`);
    for (const q of NEXUS_100_QUESTIONS) {
      await db.run(
        `INSERT INTO questions (id, question_text, option_a, option_b, option_c, option_d, correct_answer, points, image_url, category, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.points, q.image_url || null, q.category, q.is_active, new Date().toISOString()]
      );
    }
    console.log(`✅ Loaded ${NEXUS_100_QUESTIONS.length} questions.`);
  }

  persistDb();

  const qCount = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM questions'))?.c || 0;
  const tCount = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM teams'))?.c || 0;
  const aCount = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM answers'))?.c || 0;

  console.log(`✨ Database reset complete.`);
  console.log(`📊 Current Counts -> Questions: ${qCount}, Teams: ${tCount}, Answers: ${aCount}`);
}

// Check CLI flags
const args = process.argv.slice(2);
const shouldLoad = args.includes('--load-100');

resetDatabase(shouldLoad).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Database reset failed:', err);
  process.exit(1);
});
