import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'neural_nexus_2026_super_secure_jwt_secret_key_ds_event',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '#25me1a5476',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@neuralnexus.edu',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  DB_PATH: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'neural_nexus.db')
};
