import jwt from 'jsonwebtoken';
import sql, { getConnection } from '../config/database.js';

export const signToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

export const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET is not set' });
    }

    const decoded = jwt.verify(token, secret);

    // Always load latest role/permissions from DB so access changes apply immediately.
    // Fall back to token payload if DB lookup fails.
    (async () => {
      try {
        const userId = Number(decoded?.id);
        if (!Number.isFinite(userId)) {
          req.user = decoded;
          return next();
        }

        const pool = await getConnection();
        const result = await pool.request()
          .input('id', sql.Int, userId)
          .query('SELECT id, username, role, permissions_json FROM users WHERE id = @id');

        if ((result.recordset || []).length === 0) {
          req.user = decoded;
          return next();
        }

        const u = result.recordset[0];
        let parsedPerms = null;
        try {
          parsedPerms = u.permissions_json ? JSON.parse(u.permissions_json) : null;
        } catch {
          parsedPerms = null;
        }

        req.user = {
          ...decoded,
          id: u.id,
          username: u.username,
          role: u.role,
          permissions: parsedPerms,
        };
        return next();
      } catch {
        req.user = decoded;
        return next();
      }
    })();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export const requireRole = (roles) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

export const hasPermission = (user, moduleKey, action) => {
  if (!user) return false;
  if (user.role === 'chairman') return true;

  const perms = user.permissions;
  if (!perms || typeof perms !== 'object') return false;

  const modulePerms = perms[moduleKey];
  if (!modulePerms || typeof modulePerms !== 'object') return false;

  return modulePerms[action] === true;
};

const resolvePageKey = (moduleKey, reqPath) => {
  const raw = (reqPath || '').toString();
  const firstSegment = raw.split('?')[0].split('/').filter(Boolean)[0] || '';

  const seg = firstSegment.toLowerCase();

  if (moduleKey === 'sales') {
    if (seg === 'enquiries') return 'enquiries';
    if (seg === 'quotations') return 'quotations';
    if (seg === 'work-orders') return 'work_orders';
    if (seg === 'clients') return 'clients';
    if (seg === 'billing') return 'billing';
    if (seg === 'payment-received') return 'payment_received';
  }

  if (moduleKey === 'production') {
    if (seg === 'job-entries') return 'job_entries';
    if (seg === 'job-sheets') return 'checklists';
    if (seg === 'ac-motor-data-sheets') return 'ac_data_sheets';
    if (seg === 'dc-motor-data-sheets') return 'dc_data_sheets';
    if (seg === 'test-reports') return 'test_reports';
  }

  if (moduleKey === 'procurement') {
    if (seg === 'indents') return 'indents';
    if (seg === 'purchase-orders') return 'purchase_orders';
    if (seg === 'grns') return 'grns';
    if (seg === 'vendors') return 'vendors';
    if (seg === 'quotations') return 'quotations';
  }

  if (moduleKey === 'store') {
    if (seg === 'skus') return 'skus';
    if (seg === 'issues') return 'issues';
    if (seg === 'reservations') return 'advance_booking';
  }

  if (moduleKey === 'accounting') {
    if (seg === 'bills') return 'bills';
    if (seg === 'payments') return 'payments';
    if (seg === 'security-deposits') return 'security_deposits';
  }

  return null;
};

export const hasPagePermission = (user, moduleKey, pageKey, action) => {
  if (!user) return false;
  if (user.role === 'chairman') return true;
  if (!pageKey) return hasPermission(user, moduleKey, action);

  const perms = user.permissions;
  if (!perms || typeof perms !== 'object') return false;

  const modulePerms = perms[moduleKey];
  if (!modulePerms || typeof modulePerms !== 'object') return false;

  const pages = modulePerms.pages;
  if (!pages || typeof pages !== 'object') {
    return hasPermission(user, moduleKey, action);
  }

  const pagePerms = pages[pageKey];
  if (!pagePerms || typeof pagePerms !== 'object') return false;

  if (pagePerms[action] === true) return true;
  return false;
};

export const requirePermission = (moduleKey, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pageKey = resolvePageKey(moduleKey, req.path || '');
    if (!hasPagePermission(req.user, moduleKey, pageKey, action)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

export const requireModuleAccess = (moduleKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const method = (req.method || '').toUpperCase();
    const path = req.path || '';
    const isApproveEndpoint = method === 'PUT' && /\/approve\/?$/i.test(path);
    const action = method === 'GET'
      ? 'view'
      : method === 'POST'
        ? 'create'
        : isApproveEndpoint
          ? 'approve'
          : (method === 'PUT' || method === 'PATCH')
            ? 'edit'
          : method === 'DELETE'
            ? 'delete'
            : null;

    if (!action) {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!hasPermission(req.user, moduleKey, action)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};
