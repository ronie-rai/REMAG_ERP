import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql, { getConnection } from '../config/database.js';
import { requireAuth, requireRole, signToken } from '../utils/auth.js';

const router = express.Router();

router.get('/bootstrap-status', async (req, res) => {
  try {
    const pool = await getConnection();
    const usersCount = await pool.request().query('SELECT COUNT(1) AS cnt FROM users');
    const totalUsers = Number(usersCount.recordset?.[0]?.cnt) || 0;
    res.json({ hasUsers: totalUsers > 0 });
  } catch (error) {
    console.error('Error checking bootstrap status:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/users', requireAuth, requireRole('chairman'), async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT id, username, role, permissions_json, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    const users = (result.recordset || []).map((u) => {
      let parsedPerms = null;
      try {
        parsedPerms = u.permissions_json ? JSON.parse(u.permissions_json) : null;
      } catch (e) {
        parsedPerms = null;
      }

      return {
        id: u.id,
        username: u.username,
        role: u.role,
        permissions: parsedPerms,
        created_at: u.created_at,
        updated_at: u.updated_at,
      };
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', requireAuth, requireRole('chairman'), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const { role, permissions } = req.body || {};

    if (role !== undefined && !['user', 'chairman'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const pool = await getConnection();

    const permsJson = permissions === undefined ? undefined : (permissions ? JSON.stringify(permissions) : null);

    const request = pool.request().input('id', sql.Int, userId);
    const updates = [];

    if (role !== undefined) {
      updates.push('role = @role');
      request.input('role', sql.VarChar(50), role);
    }

    if (permissions !== undefined) {
      updates.push('permissions_json = @permissions_json');
      request.input('permissions_json', sql.NVarChar(sql.MAX), permsJson);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const result = await request.query(`
      UPDATE users
      SET ${updates.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.id, INSERTED.username, INSERTED.role, INSERTED.permissions_json, INSERTED.created_at, INSERTED.updated_at
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = result.recordset[0];
    let parsedPerms = null;
    try {
      parsedPerms = u.permissions_json ? JSON.parse(u.permissions_json) : null;
    } catch (e) {
      parsedPerms = null;
    }

    res.json({
      user: {
        id: u.id,
        username: u.username,
        role: u.role,
        permissions: parsedPerms,
        created_at: u.created_at,
        updated_at: u.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, role, permissions } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const userRole = role || 'user';
    if (!['user', 'chairman'].includes(userRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const pool = await getConnection();

    const usersCount = await pool.request().query('SELECT COUNT(1) AS cnt FROM users');
    const totalUsers = Number(usersCount.recordset?.[0]?.cnt) || 0;

    // Bootstrap: allow creating the first user without auth.
    // After that: only a chairman can create users.
    if (totalUsers > 0) {
      const authHeader = req.headers.authorization || '';
      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ error: 'JWT_SECRET is not set' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, secret);
      } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (decoded?.role !== 'chairman') {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const existing = await pool.request()
      .input('username', sql.VarChar(100), username)
      .query('SELECT id FROM users WHERE username = @username');

    if (existing.recordset.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const permissionsJson = permissions ? JSON.stringify(permissions) : null;

    const result = await pool.request()
      .input('username', sql.VarChar(100), username)
      .input('password_hash', sql.VarChar(255), password_hash)
      .input('role', sql.VarChar(50), userRole)
      .input('permissions_json', sql.NVarChar(sql.MAX), permissionsJson)
      .query(`INSERT INTO users (username, password_hash, role, permissions_json, created_at, updated_at)
              OUTPUT INSERTED.id, INSERTED.username, INSERTED.role, INSERTED.permissions_json
              VALUES (@username, @password_hash, @role, @permissions_json, GETDATE(), GETDATE())`);

    const user = result.recordset[0];
    let parsedPerms = null;
    try {
      parsedPerms = user.permissions_json ? JSON.parse(user.permissions_json) : null;
    } catch (e) {
      parsedPerms = null;
    }

    const token = signToken({ id: user.id, username: user.username, role: user.role, permissions: parsedPerms });

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, permissions: parsedPerms } });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('username', sql.VarChar(100), username)
      .query('SELECT id, username, password_hash, role, permissions_json FROM users WHERE username = @username');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let parsedPerms = null;
    try {
      parsedPerms = user.permissions_json ? JSON.parse(user.permissions_json) : null;
    } catch (e) {
      parsedPerms = null;
    }

    const token = signToken({ id: user.id, username: user.username, role: user.role, permissions: parsedPerms });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, permissions: parsedPerms } });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
