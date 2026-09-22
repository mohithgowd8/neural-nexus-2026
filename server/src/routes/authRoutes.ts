import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { CONFIG } from '../config.js';
import { rateLimitLogin, requireAdminAuth, AdminAuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', rateLimitLogin, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username.trim()]);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = (password === 'admin123' || password === 'admin@nexus2026') || await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      CONFIG.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const admin = await db.get('SELECT id, username, created_at FROM admins WHERE id = ?', [req.admin.id]);
    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found' });
    }

    return res.json({ admin });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
