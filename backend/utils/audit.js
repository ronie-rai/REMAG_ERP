import sql, { getConnection } from '../config/database.js';

export const ensureAuditLogsSchema = async () => {
  const pool = await getConnection();

  await pool.request().query(`
    IF OBJECT_ID('dbo.audit_logs', 'U') IS NULL
    BEGIN
      CREATE TABLE audit_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
        user_id INT NULL,
        username VARCHAR(100) NULL,
        module VARCHAR(50) NULL,
        action VARCHAR(50) NULL,
        method VARCHAR(10) NULL,
        path NVARCHAR(300) NULL,
        status_code INT NULL,
        entity_id INT NULL,
        details_json NVARCHAR(MAX) NULL
      );
    END
  `);
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const inferAction = (req) => {
  const method = (req.method || '').toUpperCase();
  const path = req.path || '';

  if (method === 'POST') return 'create';
  if (method === 'DELETE') return 'delete';

  if (method === 'PUT' || method === 'PATCH') {
    if (/\/approve\/?$/i.test(path)) return 'approve';
    return 'edit';
  }

  return null;
};

export const auditMiddleware = (moduleKey) => {
  return (req, res, next) => {
    const method = (req.method || '').toUpperCase();
    const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

    if (!isMutating) {
      return next();
    }

    res.on('finish', async () => {
      try {
        if (res.statusCode >= 400) return;

        const action = inferAction(req);
        if (!action) return;

        const user = req.user || null;
        const entityIdRaw = req.params?.id;
        const entityId = entityIdRaw !== undefined && entityIdRaw !== null && entityIdRaw !== ''
          ? Number(entityIdRaw)
          : null;

        const details = {
          params: req.params || null,
          body: req.body || null,
          query: req.query || null,
        };

        const pool = await getConnection();
        await pool.request()
          .input('user_id', sql.Int, user?.id ?? null)
          .input('username', sql.VarChar(100), user?.username ?? null)
          .input('module', sql.VarChar(50), moduleKey ?? null)
          .input('action', sql.VarChar(50), action)
          .input('method', sql.VarChar(10), method)
          .input('path', sql.NVarChar(300), req.originalUrl || req.path)
          .input('status_code', sql.Int, res.statusCode)
          .input('entity_id', sql.Int, Number.isFinite(entityId) ? entityId : null)
          .input('details_json', sql.NVarChar(sql.MAX), safeJsonStringify(details))
          .query(`
            INSERT INTO audit_logs (created_at, user_id, username, module, action, method, path, status_code, entity_id, details_json)
            VALUES (GETUTCDATE(), @user_id, @username, @module, @action, @method, @path, @status_code, @entity_id, @details_json)
          `);
      } catch (e) {
        // Do not block the request on audit logging failures.
        console.error('Audit log write failed:', e);
      }
    });

    next();
  };
};
