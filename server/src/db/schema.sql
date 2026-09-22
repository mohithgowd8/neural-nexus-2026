-- Neural Nexus 2026 Database Schema
-- Clean production schema for randomized 100-question quiz platform

CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    status TEXT NOT NULL DEFAULT 'WAITING', -- WAITING, LIVE, COMPLETED
    started_at TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_questions INTEGER DEFAULT 100,
    question_time_seconds INTEGER DEFAULT 120,
    max_points INTEGER DEFAULT 10,
    speed_scoring_enabled INTEGER DEFAULT 1,
    leaderboard_visible INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL, -- A, B, C, D
    points INTEGER DEFAULT 10,
    image_url TEXT,
    category TEXT DEFAULT 'AI & Data Science',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY, -- Team Code: e.g. NN26-A7K4
    team_name TEXT UNIQUE NOT NULL,
    leader_name TEXT NOT NULL,
    leader_roll TEXT UNIQUE NOT NULL,
    member2_name TEXT NOT NULL,
    member2_roll TEXT NOT NULL,
    member3_name TEXT,
    member3_roll TEXT,
    member4_name TEXT,
    member4_roll TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    team_code TEXT NOT NULL UNIQUE,
    current_index INTEGER DEFAULT 0,
    question_started_at INTEGER, -- Server epoch milliseconds
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    total_score INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    total_time_ms INTEGER DEFAULT 0,
    last_active_at TEXT NOT NULL,
    FOREIGN KEY (team_code) REFERENCES teams (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS question_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    team_code TEXT NOT NULL,
    sequence_order INTEGER NOT NULL, -- 0 to 99
    question_id TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
    UNIQUE(session_id, sequence_order)
);

CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    team_code TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_option TEXT NOT NULL, -- A, B, C, D, or TIMEOUT
    is_correct INTEGER DEFAULT 0,
    time_taken_seconds REAL DEFAULT 0,
    score_awarded INTEGER DEFAULT 0,
    submitted_at INTEGER NOT NULL, -- Server epoch milliseconds
    UNIQUE(session_id, question_id),
    FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    team_code TEXT,
    details TEXT,
    timestamp TEXT NOT NULL
);
