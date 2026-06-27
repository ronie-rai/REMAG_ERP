import express from 'express';
import sql, { getConnection } from '../config/database.js';
import { requireAuth } from '../utils/auth.js';

const router = express.Router();

router.get('/logs', requireAuth, async (req, res) => {
  try {
    const pool = await getConnection();

    const limitRaw = req.query.limit;
    const limit = limitRaw ? Math.min(Math.max(Number(limitRaw), 1), 200) : 100;

    const onlyMine = String(req.query.onlyMine || '').toLowerCase() === 'true';
    const role = req.user?.role;

    // Default behavior:
    // - chairman can see all logs
    // - non-chairman see only their logs unless onlyMine=false is provided AND role is chairman
    const shouldRestrictToUser = role !== 'chairman' || onlyMine;

    const request = pool.request()
      .input('limit', sql.Int, limit);

    let where = '';
    if (shouldRestrictToUser) {
      request.input('user_id', sql.Int, req.user?.id ?? null);
      where = 'WHERE user_id = @user_id';
    }

    const result = await request.query(`
      SELECT TOP (@limit)
        id,
        created_at,
        user_id,
        username,
        module,
        action,
        method,
        path,
        status_code,
        entity_id,
        details_json
      FROM audit_logs
      ${where}
      ORDER BY created_at DESC
    `);

    const logs = (result.recordset || []).map((row) => {
      const createdAt = row?.created_at;
      const createdAtIso = createdAt instanceof Date ? createdAt.toISOString() : null;
      return { ...row, created_at_iso: createdAtIso };
    });

    res.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
