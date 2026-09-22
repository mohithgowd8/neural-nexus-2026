import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../config.js';

let dbInstance: SqlJsDatabase | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();
  const dbDir = path.dirname(CONFIG.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(CONFIG.DB_PATH)) {
    const fileBuffer = fs.readFileSync(CONFIG.DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Load and apply schema
  const schemaPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'schema.sql');
  let schemaSql = '';
  if (fs.existsSync(schemaPath)) {
    schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  } else {
    const fallbackPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    if (fs.existsSync(fallbackPath)) {
      schemaSql = fs.readFileSync(fallbackPath, 'utf-8');
    }
  }

  if (schemaSql) {
    dbInstance.exec(schemaSql);
  }

  // Initialize event_state if missing
  const eventStateRes = dbInstance.exec("SELECT id FROM event_state WHERE id = 1");
  if (!eventStateRes || eventStateRes.length === 0 || !eventStateRes[0].values.length) {
    dbInstance.run(
      "INSERT OR REPLACE INTO event_state (id, status, started_at, completed_at, updated_at) VALUES (1, 'WAITING', NULL, NULL, ?)",
      [new Date().toISOString()]
    );
  }

  // Initialize quiz_settings if missing
  const settingsRes = dbInstance.exec("SELECT id FROM quiz_settings WHERE id = 1");
  if (!settingsRes || settingsRes.length === 0 || !settingsRes[0].values.length) {
    dbInstance.run(
      "INSERT OR REPLACE INTO quiz_settings (id, total_questions, question_time_seconds, max_points, speed_scoring_enabled, leaderboard_visible, updated_at) VALUES (1, 100, 120, 10, 1, 0, ?)",
      [new Date().toISOString()]
    );
  }

  // Initialize default admin or sync password
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(CONFIG.ADMIN_PASSWORD, salt);
  dbInstance.run(
    "INSERT OR REPLACE INTO admins (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
    ['admin-1', CONFIG.ADMIN_USERNAME, hash, new Date().toISOString()]
  );

  // Persist initial state
  persistDb();

  return dbInstance;
}

export function persistDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const dbDir = path.dirname(CONFIG.DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG.DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

export function schedulePersist(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    persistDb();
  }, 100);
}

// Database helper functions
export const db = {
  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const database = await getDb();
    const stmt = database.prepare(sql);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      if (stmt.step()) {
        const row = stmt.getAsObject() as T;
        return row;
      }
      return null;
    } finally {
      stmt.free();
    }
  },

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const database = await getDb();
    const stmt = database.prepare(sql);
    const results: T[] = [];
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  },

  async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
    const database = await getDb();
    database.run(sql, params);
    schedulePersist();
    return { changes: database.getRowsModified() };
  },

  async exec(sql: string): Promise<void> {
    const database = await getDb();
    database.exec(sql);
    persistDb();
  }
};
