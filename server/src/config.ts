import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

const defaultDbPath = path.resolve(__dirname, '..', 'data', 'neural_nexus.db');
const resolvedDbPath = process.env.DATABASE_PATH
  ? (path.isAbsolute(process.env.DATABASE_PATH)
      ? process.env.DATABASE_PATH
      : path.resolve(__dirname, '..', process.env.DATABASE_PATH))
  : defaultDbPath;

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'neural_nexus_2026_super_secure_jwt_secret_key_ds_event',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '#25me1a5476',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@neuralnexus.edu',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  DB_PATH: resolvedDbPath
};

