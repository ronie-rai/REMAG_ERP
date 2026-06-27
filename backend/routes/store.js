import express from 'express';
import sql, { getConnection } from '../config/database.js';
import { requireAuth, requireModuleAccess } from '../utils/auth.js';
import { auditMiddleware } from '../utils/audit.js';

const router = express.Router();

router.use(requireAuth, requireModuleAccess('store'));
router.use(auditMiddleware('store'));

// Create SKU
router.post('/skus', async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input('sku_code', sql.VarChar(100), req.body.sku_code)
      .input('item_name', sql.VarChar(200), req.body.item_name)
      .input('size_type', sql.VarChar(200), req.body.size_type)
      .input('category', sql.VarChar(100), req.body.category)
      .input('unit', sql.VarChar(50), req.body.unit)
      .input('max_level', sql.Float, req.body.max_level ?? null)
      .query(`INSERT INTO store_skus (sku_code, item_name, size_type, category, unit, max_level, created_at, updated_at)
              OUTPUT INSERTED.*
              VALUES (@sku_code, @item_name, @size_type, @category, @unit, @max_level, GETDATE(), GETDATE())`);

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating SKU:', error);
    res.status(500).json({ error: error.message });
  }
});

// List reservations (Advance Booking)
router.get('/reservations', async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      IF OBJECT_ID('dbo.store_reservations', 'U') IS NULL
      BEGIN
        SELECT TOP 0
          CAST(NULL AS INT) AS id,
          CAST(NULL AS VARCHAR(200)) AS reserved_for,
          CAST(NULL AS DATE) AS reserve_date,
          CAST(NULL AS NVARCHAR(MAX)) AS remarks,
          CAST(NULL AS VARCHAR(50)) AS status,
          CAST(NULL AS DATETIME) AS created_at,
          CAST(0 AS FLOAT) AS reserved_qty;
      END
      ELSE
      BEGIN
        IF COL_LENGTH('dbo.store_reservations', 'status') IS NULL
        BEGIN
          ALTER TABLE store_reservations ADD status VARCHAR(50) NULL;
        END

        SELECT
          r.id,
          r.reserved_for,
          r.reserve_date,
          r.remarks,
          ISNULL(r.status, 'Reserved') AS status,
          r.created_at,
          ISNULL(x.reserved_qty, 0) AS reserved_qty
        FROM store_reservations r
        LEFT JOIN (
          SELECT ref_id, SUM(CASE WHEN txn_type='RESERVE' THEN qty WHEN txn_type='UNRESERVE' THEN -qty ELSE 0 END) AS reserved_qty
          FROM store_stock_ledger
          WHERE ref_type='RESERVATION'
          GROUP BY ref_id
        ) x ON x.ref_id = r.id
        ORDER BY r.id DESC
      END
    `);

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single reservation details with lines
router.get('/reservations/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid reservation id' });

    const pool = await getConnection();

    const txRes = await pool.request().input('id', sql.Int, id).query(`
      IF OBJECT_ID('dbo.store_reservations', 'U') IS NULL
      BEGIN
        SELECT TOP 0 * FROM store_reservations;
      END
      ELSE
      BEGIN
        IF COL_LENGTH('dbo.store_reservations', 'status') IS NULL
        BEGIN
          ALTER TABLE store_reservations ADD status VARCHAR(50) NULL;
        END
        SELECT * FROM store_reservations WHERE id = @id;
      END
    `);

    if (!txRes.recordset || txRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const linesRes = await pool.request().input('ref_id', sql.Int, id).query(`
      SELECT
        l.sku_id,
        s.sku_code,
        s.item_name,
        SUM(CASE WHEN l.txn_type='RESERVE' THEN l.qty WHEN l.txn_type='UNRESERVE' THEN -l.qty ELSE 0 END) AS reserved_qty
      FROM store_stock_ledger l
      LEFT JOIN store_skus s ON s.id = l.sku_id
      WHERE l.ref_type='RESERVATION' AND l.ref_id=@ref_id
        AND l.txn_type IN ('RESERVE','UNRESERVE')
      GROUP BY l.sku_id, s.sku_code, s.item_name
      HAVING SUM(CASE WHEN l.txn_type='RESERVE' THEN l.qty WHEN l.txn_type='UNRESERVE' THEN -l.qty ELSE 0 END) <> 0
      ORDER BY s.item_name ASC
    `);

    res.json({ ...txRes.recordset[0], lines: linesRes.recordset || [] });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update reservation (edit header and adjust quantities via delta ledger entries)
router.put('/reservations/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid reservation id' });

    const { reserved_for, reserve_date, remarks, items } = req.body || {};

    const desired = Array.isArray(items)
      ? items
          .map((it) => ({ sku_id: Number(it?.sku_id), qty: Number(it?.qty) }))
          .filter((it) => Number.isFinite(it.sku_id) && Number.isFinite(it.qty) && it.qty >= 0)
      : null;

    const pool = await getConnection();
    const txn = new sql.Transaction(pool);
    await txn.begin();
    try {
      await new sql.Request(txn).query(`
        IF OBJECT_ID('dbo.store_reservations', 'U') IS NOT NULL
        BEGIN
          IF COL_LENGTH('dbo.store_reservations', 'status') IS NULL
          BEGIN
            ALTER TABLE store_reservations ADD status VARCHAR(50) NULL;
          END
        END
      `);

      if (reserved_for !== undefined || reserve_date !== undefined || remarks !== undefined) {
        const fields = [];
        const rq = new sql.Request(txn).input('id', sql.Int, id);

        if (reserved_for !== undefined) {
          fields.push('reserved_for = @reserved_for');
          rq.input('reserved_for', sql.VarChar(200), reserved_for);
        }
        if (reserve_date !== undefined) {
          fields.push('reserve_date = @reserve_date');
          rq.input('reserve_date', sql.Date, reserve_date);
        }
        if (remarks !== undefined) {
          fields.push('remarks = @remarks');
          rq.input('remarks', sql.NVarChar(sql.MAX), remarks);
        }

        if (fields.length > 0) {
          const upd = await rq.query(`
            UPDATE store_reservations SET ${fields.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @id
          `);
          if (!upd.recordset || upd.recordset.length === 0) {
            throw new Error('Reservation not found');
          }
        }
      }

      if (desired) {
        const currentRes = await new sql.Request(txn).input('ref_id', sql.Int, id).query(`
          SELECT sku_id, SUM(CASE WHEN txn_type='RESERVE' THEN qty WHEN txn_type='UNRESERVE' THEN -qty ELSE 0 END) AS reserved_qty
          FROM store_stock_ledger
          WHERE ref_type='RESERVATION' AND ref_id=@ref_id AND txn_type IN ('RESERVE','UNRESERVE')
          GROUP BY sku_id
        `);

        const currentMap = new Map((currentRes.recordset || []).map((r) => [Number(r.sku_id), Number(r.reserved_qty) || 0]));
        const desiredMap = new Map(desired.map((d) => [d.sku_id, d.qty]));

        const skuIds = new Set([...currentMap.keys(), ...desiredMap.keys()]);
        for (const skuId of skuIds) {
          const cur = currentMap.get(skuId) || 0;
          const next = desiredMap.get(skuId) || 0;
          const delta = next - cur;
          if (delta === 0) continue;

          if (delta > 0) {
            // need to reserve more => ensure available stock
            const availRes = await new sql.Request(txn)
              .input('sku_id', sql.Int, skuId)
              .query(`
                SELECT
                  ISNULL(stock.current_stock, 0) AS current_stock,
                  ISNULL(reserved.reserved_qty, 0) AS reserved_qty,
                  ISNULL(stock.current_stock, 0) - ISNULL(reserved.reserved_qty, 0) AS available_qty
                FROM store_skus s
                LEFT JOIN (
                  SELECT sku_id,
                    SUM(CASE
                      WHEN txn_type IN ('IN', 'PURCHASE_IN', 'ADJUSTMENT_IN') THEN qty
                      WHEN txn_type IN ('OUT', 'ISSUE_OUT', 'ADJUSTMENT_OUT') THEN -qty
                      ELSE 0
                    END) AS current_stock
                  FROM store_stock_ledger
                  WHERE sku_id = @sku_id
                  GROUP BY sku_id
                ) stock ON stock.sku_id = s.id
                LEFT JOIN (
                  SELECT sku_id,
                    SUM(CASE
                      WHEN txn_type IN ('RESERVE') THEN qty
                      WHEN txn_type IN ('UNRESERVE') THEN -qty
                      ELSE 0
                    END) AS reserved_qty
                  FROM store_stock_ledger
                  WHERE sku_id = @sku_id
                  GROUP BY sku_id
                ) reserved ON reserved.sku_id = s.id
                WHERE s.id = @sku_id
              `);

            const availableQty = Number(availRes.recordset?.[0]?.available_qty) || 0;
            if (delta > availableQty) {
              throw new Error(`Insufficient available stock for SKU ${skuId}. Available: ${availableQty}`);
            }

            await new sql.Request(txn)
              .input('sku_id', sql.Int, skuId)
              .input('qty', sql.Float, delta)
              .input('ref_type', sql.VarChar(50), 'RESERVATION')
              .input('ref_id', sql.Int, id)
              .input('txn_date', sql.Date, new Date())
              .input('remarks', sql.NVarChar(sql.MAX), 'Reservation adjusted (increase)')
              .query(`
                INSERT INTO store_stock_ledger (sku_id, txn_type, qty, ref_type, ref_id, txn_date, remarks, created_at)
                VALUES (@sku_id, 'RESERVE', @qty, @ref_type, @ref_id, @txn_date, @remarks, GETDATE());
              `);
          } else {
            await new sql.Request(txn)
              .input('sku_id', sql.Int, skuId)
              .input('qty', sql.Float, Math.abs(delta))
              .input('ref_type', sql.VarChar(50), 'RESERVATION')
              .input('ref_id', sql.Int, id)
              .input('txn_date', sql.Date, new Date())
              .input('remarks', sql.NVarChar(sql.MAX), 'Reservation adjusted (decrease)')
              .query(`
                INSERT INTO store_stock_ledger (sku_id, txn_type, qty, ref_type, ref_id, txn_date, remarks, created_at)
                VALUES (@sku_id, 'UNRESERVE', @qty, @ref_type, @ref_id, @txn_date, @remarks, GETDATE());
              `);
          }
        }
      }

      await txn.commit();
      res.json({ success: true });
    } catch (e) {
      await txn.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete reservation: release all qty and mark status Deleted
router.delete('/reservations/:id', async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    if (!Number.isFinite(reservationId)) {
      return res.status(400).json({ error: 'Invalid reservation id' });
    }

    const pool = await getConnection();
    const txn = new sql.Transaction(pool);
    await txn.begin();
    try {
      const rows = await new sql.Request(txn)
        .input('ref_id', sql.Int, reservationId)
        .query(`
          SELECT sku_id, SUM(qty) AS qty
          FROM store_stock_ledger
          WHERE ref_type = 'RESERVATION' AND ref_id = @ref_id AND txn_type = 'RESERVE'
          GROUP BY sku_id
        `);

      for (const r of rows.recordset || []) {
        const qty = Number(r.qty) || 0;
        if (qty <= 0) continue;
        await new sql.Request(txn)
          .input('sku_id', sql.Int, r.sku_id)
          .input('qty', sql.Float, qty)
          .input('ref_type', sql.VarChar(50), 'RESERVATION')
          .input('ref_id', sql.Int, reservationId)
          .input('txn_date', sql.Date, new Date())
          .input('remarks', sql.NVarChar(sql.MAX), 'Reservation deleted')
          .query(`
            INSERT INTO store_stock_ledger (sku_id, txn_type, qty, ref_type, ref_id, txn_date, remarks, created_at)
            VALUES (@sku_id, 'UNRESERVE', @qty, @ref_type, @ref_id, @txn_date, @remarks, GETDATE());
          `);
      }

      await new sql.Request(txn)
        .input('id', sql.Int, reservationId)
        .query(`
          IF OBJECT_ID('dbo.store_reservations', 'U') IS NOT NULL
          BEGIN
            IF COL_LENGTH('dbo.store_reservations', 'status') IS NULL
            BEGIN
              ALTER TABLE store_reservations ADD status VARCHAR(50) NULL;
            END
            UPDATE store_reservations SET status = 'Deleted' WHERE id = @id;
          END
        `);

      await txn.commit();
      res.json({ success: true });
    } catch (e) {
      await txn.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// List issue transactions with totals and outstanding qty
router.get('/issues', async (req, res) => {
  try {
    const pool = await getConnection();

    await pool.request().query(`
      IF OBJECT_ID('dbo.store_issue_transactions', 'U') IS NOT NULL
      BEGIN
        IF COL_LENGTH('dbo.store_issue_transactions', 'status') IS NULL
        BEGIN
          ALTER TABLE store_issue_transactions ADD status VARCHAR(50) NULL;
        END
      END
    `);

    const result = await pool.request().query(`
      IF OBJECT_ID('dbo.store_issue_transactions', 'U') IS NULL
      BEGIN
        SELECT TOP 0
          CAST(NULL AS INT) AS id,
          CAST(NULL AS VARCHAR(200)) AS issued_to,
          CAST(NULL AS DATE) AS issue_date,
          CAST(NULL AS NVARCHAR(MAX)) AS remarks,
          CAST(NULL AS DATETIME) AS created_at,
          CAST(NULL AS VARCHAR(50)) AS status,
          CAST(0 AS FLOAT) AS issued_qty,
          CAST(0 AS FLOAT) AS returned_qty,
          CAST(0 AS FLOAT) AS outstanding_qty;
      END
      ELSE
      BEGIN
        SELECT
          t.id,
          t.issued_to,
          t.issue_date,
          t.remarks,
          t.created_at,
          ISNULL(t.status, 'Active') AS status,
          ISNULL(iss.issued_qty, 0) AS issued_qty,
          ISNULL(ret.returned_qty, 0) AS returned_qty,
          ISNULL(iss.issued_qty, 0) - ISNULL(ret.returned_qty, 0) AS outstanding_qty
        FROM store_issue_transactions t
        LEFT JOIN (
          SELECT ref_id, SUM(qty) AS issued_qty
          FROM store_stock_ledger
          WHERE ref_type = 'ISSUE' AND txn_type = 'ISSUE_OUT'
          GROUP BY ref_id
        ) iss ON iss.ref_id = t.id
        LEFT JOIN (
          SELECT ref_id, SUM(qty) AS returned_qty
          FROM store_stock_ledger
          WHERE ref_type = 'ISSUE' AND txn_type = 'ADJUSTMENT_IN'
            AND (remarks LIKE 'Return from issue:%' OR remarks LIKE 'Void issue:%' OR remarks LIKE 'Adjust issue:%')
          GROUP BY ref_id
        ) ret ON ret.ref_id = t.id
        ORDER BY t.id DESC
      END
    `);

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get issue details (lines per SKU with issued/returned/outstanding)
router.get('/issues/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid issue id' });

    const pool = await getConnection();

    await pool.request().query(`
      IF OBJECT_ID('dbo.store_issue_transactions', 'U') IS NOT NULL
      BEGIN
        IF COL_LENGTH('dbo.store_issue_transactions', 'status') IS NULL
        BEGIN
          ALTER TABLE store_issue_transactions ADD status VARCHAR(50) NULL;
        END
      END
    `);

    const txRes = await pool.request().input('id', sql.Int, id).query(`
      IF OBJECT_ID('dbo.store_issue_transactions', 'U') IS NULL
      BEGIN
        SELECT TOP 0 * FROM store_issue_transactions;
      END
      ELSE
      BEGIN
        SELECT * FROM store_issue_transactions WHERE id = @id;
      END
    `);

    if (!txRes.recordset || txRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const linesRes = await pool.request().input('ref_id', sql.Int, id).query(`
      WITH issued AS (
        SELECT sku_id, SUM(qty) AS issued_qty
        FROM store_stock_ledger
        WHERE ref_type = 'ISSUE' AND ref_id = @ref_id AND txn_type = 'ISSUE_OUT'
        GROUP BY sku_id
      ), returned AS (
        SELECT sku_id, SUM(qty) AS returned_qty
        FROM store_stock_ledger
        WHERE ref_type = 'ISSUE' AND ref_id = @ref_id AND txn_type = 'ADJUSTMENT_IN'
          AND (remarks LIKE 'Return from issue:%' OR remarks LIKE 'Void issue:%' OR remarks LIKE 'Adjust issue:%')
        GROUP BY sku_id
      )
      SELECT
        i.sku_id,
        s.sku_code,
        s.item_name,
        ISNULL(i.issued_qty, 0) AS issued_qty,
        ISNULL(r.returned_qty, 0) AS returned_qty,
        ISNULL(i.issued_qty, 0) - ISNULL(r.returned_qty, 0) AS outstanding_qty
      FROM issued i
      LEFT JOIN returned r ON r.sku_id = i.sku_id
      LEFT JOIN store_skus s ON s.id = i.sku_id
      ORDER BY s.item_name ASC
    `);

    res.json({ ...txRes.recordset[0], lines: linesRes.recordset || [] });
  } catch (error) {
    console.error('Error fetching issue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Return unused qty back to store for an issue
router.post('/issues/:id/return', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid issue id' });

    const { return_date, remarks, items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items is required' });
    }

    const normalizedItems = items
      .map((it) => ({ sku_id: Number(it?.sku_id), qty: Number(it?.qty) }))
      .filter((it) => Number.isFinite(it.sku_id) && Number.isFinite(it.qty) && it.qty > 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ error: 'No valid items provided' });
    }

    const pool = await getConnection();
    const txn = new sql.Transaction(pool);
    await txn.begin();
    try {
      for (const it of normalizedItems) {
        const outstandingRes = await new sql.Request(txn)
          .input('ref_id', sql.Int, id)
          .input('sku_id', sql.Int, it.sku_id)
          .query(`
            SELECT
              ISNULL(issued.issued_qty, 0) - ISNULL(ret.returned_qty, 0) AS outstanding_qty
            FROM (SELECT SUM(qty) AS issued_qty FROM store_stock_ledger WHERE ref_type='ISSUE' AND ref_id=@ref_id AND sku_id=@sku_id AND txn_type='ISSUE_OUT') issued
            OUTER APPLY (SELECT SUM(qty) AS returned_qty FROM store_stock_ledger WHERE ref_type='ISSUE' AND ref_id=@ref_id AND sku_id=@sku_id AND txn_type='ADJUSTMENT_IN'
              AND (remarks LIKE 'Return from issue:%' OR remarks LIKE 'Void issue:%' OR remarks LIKE 'Adjust issue:%')) ret
          `);

        const outstandingQty = Number(outstandingRes.recordset?.[0]?.outstanding_qty) || 0;
        if (it.qty > outstandingQty) {
          throw new Error(`Return qty exceeds outstanding qty for SKU ${it.sku_id}. Outstanding: ${outstandingQty}`);
        }

        await new sql.Request(txn)
          .input('sku_id', sql.Int, it.sku_id)
          .input('qty', sql.Float, it.qty)
          .input('ref_type', sql.VarChar(50), 'ISSUE')
          .input('ref_id', sql.Int, id)
          .input('txn_date', sql.Date, return_date || new Date())
          .input('remarks', sql.NVarChar(sql.MAX), `Return from issue: ${id}${remarks ? ` | ${remarks}` : ''}`)
          .query(`
            INSERT INTO store_stock_ledger (sku_id, txn_type, qty, ref_type, ref_id, txn_date, remarks, created_at)
            VALUES (@sku_id, 'ADJUSTMENT_IN', @qty, @ref_type, @ref_id, @txn_date, @remarks, GETDATE());
          `);
      }

      await txn.commit();
      res.json({ success: true });
    } catch (e) {
      await txn.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error returning issue qty:', error);
    res.status(500).json({ error: error.message });
  }
});

// Adjust an issue: set final issued quantities per SKU by applying delta ledger entries
router.put('/issues/:id/adjust', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid issue id' });

    const { adjust_date, remarks, items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items is required' });
    }

    const desired = items
      .map((it) => ({ sku_id: Number(it?.sku_id), qty: Number(it?.qty) }))
      .filter((it) => Number.isFinite(it.sku_id) && Number.isFinite(it.qty) && it.qty >= 0);

    if (desired.length === 0) {
      return res.status(400).json({ error: 'No valid items provided' });
    }

    const pool = await getConnection();
    const txn = new sql.Transaction(pool);
    await txn.begin();
    try {
      for (const it of desired) {
        const curRes = await new sql.Request(txn)
          .input('ref_id', sql.Int, id)
          .input('sku_id', sql.Int, it.sku_id)
          .query(`
            SELECT
              ISNULL(issued.issued_qty, 0) AS issued_qty,
              ISNULL(ret.returned_qty, 0) AS returned_qty
            FROM (SELECT SUM(qty) AS issued_qty FROM store_stock_ledger WHERE ref_type='ISSUE' AND ref_id=@ref_id AND sku_id=@sku_id AND txn_type='ISSUE_OUT') issued
            OUTER APPLY (SELECT SUM(qty) AS returned_qty FROM store_stock_ledger WHERE ref_type='ISSUE' AND ref_id=@ref_id AND sku_id=@sku_id AND txn_type='ADJUSTMENT_IN'
              AND (remarks LIKE 'Return from issue:%' OR remarks LIKE 'Void issue:%' OR remarks LIKE 'Adjust issue:%')) ret
          `);

        const currentIssued = Number(curRes.recordset?.[0]?.issued_qty) || 0;
        const alreadyReturned = Number(curRes.recordset?.[0]?.returned_qty) || 0;
        const minAllowed = alreadyReturned;
        if (it.qty < minAllowed) {
          throw new Error(`Cannot set issued qty below already returned qty for SKU ${it.sku_id}. Returned: ${alreadyReturned}`);
        }

        const delta = it.qty - currentIssued;
        if (delta === 0) continue;

        if (delta > 0) {
          const availRes = await new sql.Request(txn)
            .input('sku_id', sql.Int, it.sku_id)
            .query(`
              SELECT
                ISNULL(stock.current_stock, 0) AS current_stock,
                ISNULL(reserved.reserved_qty, 0) AS reserved_qty,
                ISNULL(stock.current_stock, 0) - ISNULL(reserved.reserved_qty, 0) AS available_qty
              FROM store_skus s
              LEFT JOIN (
                SELECT sku_id,
                  SUM(CASE
                    WHEN txn_type IN ('IN', 'PURCHASE_IN', 'ADJUSTMENT_IN') THEN qty
                    WHEN txn_type IN ('OUT', 'ISSUE_OUT', 'ADJUSTMENT_OUT') THEN -qty
                    ELSE 0
                  END) AS current_stock
                FROM store_stock_ledger
                WHERE sku_id = @sku_id
                GROUP BY sku_id
              ) stock ON stock.sku_id = s.id
              LEFT JOIN (
                SELECT sku_id,
                  SUM(CASE
                    WHEN txn_type IN ('RESERVE') THEN qty
                    WHEN txn_type IN ('UNRESERVE') THEN -qty
                    ELSE 0
                  END) AS reserved_qty
                FROM store_stock_ledger
                WHERE sku_id = @sku_id
                GROUP BY sku_id
              ) reserved ON reserved.sku_id = s.id
              WHERE s.id = @sku_id
            `);

          const availableQty = Number(availRes.recordset?.[0]?.available_qty) || 0;
          if (delta > availableQty) {
            throw new Error(`Insufficient available stock for SKU ${it.sku_id}. Available: ${availableQty}`);
          }

          await new sql.Request(txn)
            .input('sku_id', sql.Int, it.sku_id)
            .input('qty', sql.Float, delta)
            .input('ref_type', sql.VarChar(50), 'ISSUE')
            .input('ref_id', sql.Int, id)
            .input('txn_date', sql.Date, adjust_date || new Date())
            .input('remarks', sql.NVarChar(sql.MAX), `Adjust issue: ${id} | Increase${remarks ? ` | ${remarks}` : ''}`)
            .query(`
              INSERT INTO store_stock_ledger (sku_id, txn_type, qty, ref_type, ref_id, txn_date, remarks, created_at)
              VALUES (@sku_id, 'ISSUE_OUT', @qty, @ref_type, @ref_id, @txn_date, @remarks, GETDATE());
            `);
        } else {
          await new sql.Request(txn)
            .input('sku_id', sql.Int, it.sku_id)
            .input('qty', sql.Float, Math.abs(delta))
            .input('ref_type', sql.VarChar(50), 'ISSUE')
            .input('ref_id', sql.Int, id)
            .input('txn_date', sql.Date, adjust_date || new Date())
            .input('remarks', sql.NVarChar(sql.MAX), `Adjust issue: ${id} | Decrease${remarks ? ` | ${remarks}` : ''}`)
            .query(`
              INSERT INTO store_stock_ledger (sku_id, txn_type, qty, ref_type, ref_id, txn_date, remarks, created_at)
              VALUES (@sku_id, 'ADJUSTMENT_IN', @qty, @ref_type, @ref_id, @txn_date, @remarks, GETDATE());
            `);
        }
      }

      await txn.commit();
      res.json({ success: true });
    } catch (e) {
      await txn.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error adjusting issue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Void an issue: return all outstanding qty back to store
router.post('/issues/:id/void', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid issue id' });

    const { void_date, remarks } = req.body || {};
    const pool = await getConnection();
    const txn = new sql.Transaction(pool);
    await txn.begin();
    try {
      const outstandingRows = await new sql.Request(txn)
        .input('ref_id', sql.Int, id)
        .query(`
          WITH issued AS (
            SELECT sku_id, SUM(qty) AS issued_qty
            FROM store_stock_ledger
            WHERE ref_type='ISSUE' AND ref_id=@ref_id AND txn_type='ISSUE_OUT'
            GROUP BY sku_id
          ), returned AS (
            SELECT sku_id, SUM(qty) AS returned_qty
            FROM store_stock_ledger
            WHERE ref_type='ISSUE' AND ref_id=@ref_id AND txn_type='ADJUSTMENT_IN'
              AND (remarks LIKE 'Return from issue:%' OR remarks LIKE 'Void issue:%' OR remarks LIKE 'Adjust issue:%')
            GROUP BY sku_id
          )
          SELECT i.sku_id, (ISNULL(i.issued_qty, 0) - ISNULL(r.returned_qty, 0)) AS outstanding_qty
          FROM issued i
          LEFT JOIN returned r ON r.sku_id = i.sku_id
        `);

      for (const r of outstandingRows.recordset || []) {
        const qty = Number(r.outstanding_qty) || 0;
        if (qty <= 0) continue;
        await new sql.Request(txn)
          .input('sku_id', sql.Int, r.sku_id)
          .input('qty', sql.Float, qty)
          .input('ref_type', sql.VarChar(50), 'ISSUE')
          .input('ref_id', sql.Int, id)
          .input('txn_date', sql.Date, void_date || new Date())
          .input('remarks', sql.NVarChar(sql.MAX), `Void issue: ${id}${remarks ? ` | ${remarks}` : ''}`)
          .query(`
            INSERT INTO store_stock_ledger (sku_id, txn_type, qty, ref_type, ref_id, txn_date, remarks, created_at)
            VALUES (@sku_id, 'ADJUSTMENT_IN', @qty, @ref_type, @ref_id, @txn_date, @remarks, GETDATE());
          `);
      }

      await new sql.Request(txn)
        .input('id', sql.Int, id)
        .query(`
          IF OBJECT_ID('dbo.store_issue_transactions', 'U') IS NOT NULL
          BEGIN
            IF COL_LENGTH('dbo.store_issue_transactions', 'status') IS NULL
            BEGIN
              ALTER TABLE store_issue_transactions ADD status VARCHAR(50) NULL;
            END
            UPDATE store_issue_transactions SET status = 'Voided' WHERE id = @id;
          END
        `);

      await txn.commit();
      res.json({ success: true });
    } catch (e) {
      await txn.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error voiding issue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all SKUs (with computed current_stock + latest_rate)
router.get('/skus', async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT
        s.*, 
        ISNULL(stock.current_stock, 0) AS current_stock,
        ISNULL(reserved.reserved_qty, 0) AS reserved_qty,
        ISNULL(stock.current_stock, 0) - ISNULL(reserved.reserved_qty, 0) AS available_qty,
        rate.latest_rate AS latest_rate,
        rate.latest_rate_date AS latest_rate_date
      FROM store_skus s
      LEFT JOIN (
        SELECT
          sku_id,
          SUM(CASE
            WHEN txn_type IN ('IN', 'PURCHASE_IN', 'ADJUSTMENT_IN') THEN qty
            WHEN txn_type IN ('OUT', 'ISSUE_OUT', 'ADJUSTMENT_OUT') THEN -qty
            ELSE 0
          END) AS current_stock
        FROM store_stock_ledger
        GROUP BY sku_id
      ) stock ON stock.sku_id = s.id
      LEFT JOIN (
        SELECT
          sku_id,
          SUM(CASE
            WHEN txn_type IN ('RESERVE') THEN qty
            WHEN txn_type IN ('UNRESERVE') THEN -qty
            ELSE 0
          END) AS reserved_qty
        FROM store_stock_ledger
        GROUP BY sku_id
      ) reserved ON reserved.sku_id = s.id
      OUTER APPLY (
        SELECT TOP 1
          l.rate AS latest_rate,
          l.txn_date AS latest_rate_date
        FROM store_stock_ledger l
        WHERE l.sku_id = s.id
          AND l.rate IS NOT NULL
          AND l.txn_type IN ('IN', 'PURCHASE_IN', 'ADJUSTMENT_IN')
        ORDER BY l.txn_date DESC, l.id DESC
      ) rate
      ORDER BY s.item_name ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching SKUs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk issue SKUs in one transaction
router.post('/issues/bulk', async (req, res) => {
  try {
    const { issued_to, issue_date, remarks, items } = req.body || {};

    if (!issued_to || typeof issued_to !== 'string') {
      return res.status(400).json({ error: 'issued_to is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items is required' });
    }

    const normalizedItems = items
      .map((it) => ({ sku_id: Number(it?.sku_id), qty: Number(it?.qty) }))
      .filter((it) => Number.isFinite(it.sku_id) && Number.isFinite(it.qty) && it.qty > 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ error: 'No valid items provided' });
    }

    const pool = await getConnection();

    const txn = new sql.Transaction(pool);
    await txn.begin();
    try {
      const txReq = new sql.Request(txn);
      const txRes = await txReq
        .input('issued_to', sql.VarChar(200), issued_to)
        .input('remarks', sql.NVarChar(sql.MAX), remarks || null)
        .input('issue_date', sql.Date, issue_date || new Date())
        .query(`
          IF OBJECT_ID('dbo.store_issue_transactions', 'U') IS NULL
          BEGIN
            CREATE TABLE store_issue_transactions (
              id INT IDENTITY(1,1) PRIMARY KEY,
              issued_to VARCHAR(200) NOT NULL,
              issue_date DATE NOT NULL,
              remarks NVARCHAR(MAX) NULL,
              status VARCHAR(50) NULL,
              created_at DATETIME DEFAULT GETDATE()
            );
          END

          IF COL_LENGTH('dbo.store_issue_transactions', 'status') IS NULL
          BEGIN
            ALTER TABLE store_issue_transactions ADD status VARCHAR(50) NULL;
          END

          INSERT INTO store_issue_transactions (issued_to, issue_date, remarks, status, created_at)
          OUTPUT INSERTED.*
          VALUES (@issued_to, @issue_date, @remarks, 'Active', GETDATE());
        `);

      const transactionId = txRes.recordset?.[0]?.id;

      for (const it of normalizedItems) {
        const availRes = await new sql.Request(txn)
          .input('sku_id', sql.Int, it.sku_id)
          .query(`
            SELECT
              ISNULL(stock.current_stock, 0) AS current_stock,
              ISNULL(reserved.reserved_qty, 0) AS reserved_qty,
              ISNULL(stock.current_stock, 0) - ISNULL(reserved.reserved_qty, 0) AS available_qty
            FROM store_skus s
            LEFT JOIN (
              SELECT sku_id,
                SUM(CASE
                  WHEN txn_type IN ('IN', 'PURCHASE_IN', 'ADJUSTMENT_IN') THEN qty
                  WHEN txn_type IN ('OUT', 'ISSUE_OUT', 'ADJUSTMENT_OUT') THEN -qty
                  ELSE 0
                END) AS current_stock
              FROM store_stock_ledger
              WHERE sku_id = @sku_id
              GROUP BY sku_id
            ) stock ON stock.sku_id = s.id
            LEFT JOIN (
              SELECT sku_id,
                SUM(CASE
                  WHEN txn_type IN ('RESERVE') THEN qty
                  WHEN txn_type IN ('UNRESERVE') THEN -qty
                  ELSE 0
                END) AS reserved_qty
              FROM store_stock_ledger
              WHERE sku_id = @sku_id
              GROUP BY sku_id
            ) reserved ON reserved.sku_id = s.id
            WHERE s.id = @sku_id
          `);

        if (availRes.recordset.length === 0) {
          throw new Error(`SKU not found: ${it.sku_id}`);
        }

        const availableQty = Number(availRes.recordset[0].available_qty) || 0;
        if (it.qty > availableQty) {
          throw new Error(`Insufficient available stock for SKU ${it.sku_id}. Available: ${availableQty}`);
        }

        await new sql.Request(txn)
          .input('sku_id', sql.Int, it.sku_id)
          .input('qty', sql.Float, it.qty)
          .input('ref_type', sql.VarChar(50), 'ISSUE')
          .input('ref_id', sql.Int, transactionId || null)
          .input('txn_date', sql.Date, issue_date || new Date())
          .input('remarks', sql.NVarChar(sql.MAX), `Issued to: ${issued_to}${remarks ? ` | ${remarks}` : ''}`)
          .query(`
            INSERT INTO store_stock_ledger (sku_id, txn_type, qty, ref_type, ref_id, txn_date, remarks, created_at)
            VALUES (@sku_id, 'ISSUE_OUT', @qty, @ref_type, @ref_id, @txn_date, @remarks, GETDATE());
          `);
      }

      await txn.commit();
      res.json({ success: true, transaction_id: transactionId });
    } catch (e) {
      await txn.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error bulk issuing SKUs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reserve (book) SKUs for future without decreasing physical stock
router.post('/reservations', async (req, res) => {
  try {
    const { reserved_for, reserve_date, remarks, items } = req.body || {};

    if (!reserved_for || typeof reserved_for !== 'string') {
      return res.status(400).json({ error: 'reserved_for is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items is required' });
    }

    const normalizedItems = items
      .map((it) => ({ sku_id: Number(it?.sku_id), qty: Number(it?.qty) }))
      .filter((it) => Number.isFinite(it.sku_id) && Number.isFinite(it.qty) && it.qty > 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ error: 'No valid items provided' });
    }

    const pool = await getConnection();
    const txn = new sql.Transaction(pool);
    await txn.begin();
    try {
      const txReq = new sql.Request(txn);
      const txRes = await txReq
        .input('reserved_for', sql.VarChar(200), reserved_for)
        .input('remarks', sql.NVarChar(sql.MAX), remarks || null)
        .input('reserve_date', sql.Date, reserve_date || new Date())
        .query(`
          IF OBJECT_ID('dbo.store_reservations', 'U') IS NULL
          BEGIN
            CREATE TABLE store_reservations (
              id INT IDENTITY(1,1) PRIMARY KEY,
              reserved_for VARCHAR(200) NOT NULL,
              reserve_date DATE NOT NULL,
              remarks NVARCHAR(MAX) NULL,
              status VARCHAR(50) DEFAULT 'Reserved',
              created_at DATETIME DEFAULT GETDATE()
            );
          END

          INSERT INTO store_reservations (reserved_for, reserve_date, remarks, status, created_at)
          OUTPUT INSERTED.*
          VALUES (@reserved_for, @reserve_date, @remarks, 'Reserved', GETDATE());
        `);

      const reservationId = txRes.recordset?.[0]?.id;

      for (const it of normalizedItems) {
        const availRes = await new sql.Request(txn)
          .input('sku_id', sql.Int, it.sku_id)
          .query(`
            SELECT
              ISNULL(stock.current_stock, 0) AS current_stock,
              ISNULL(reserved.reserved_qty, 0) AS reserved_qty,
              ISNULL(stock.current_stock, 0) - ISNULL(reserved.reserved_qty, 0) AS available_qty
            FROM store_skus s
            LEFT JOIN (
              SELECT sku_id,
                SUM(CASE
                  WHEN txn_type IN ('IN', 'PURCHASE_IN', 'ADJUSTMENT_IN') THEN qty
                  WHEN txn_type IN ('OUT', 'ISSUE_OUT', 'ADJUSTMENT_OUT') THEN -qty
                  ELSE 0
                END) AS current_stock
              FROM store_stock_ledger
              WHERE sku_id = @sku_id
              GROUP BY sku_id
            ) stock ON stock.sku_id = s.id
            LEFT JOIN (
              SELECT sku_id,
                SUM(CASE
                  WHEN txn_type IN ('RESERVE') THEN qty
                  WHEN txn_type IN ('UNRESERVE') THEN -qty
                  ELSE 0
                END) AS reserved_qty
              FROM store_stock_ledger
              WHERE sku_id = @sku_id
              GROUP BY sku_id
            ) reserved ON reserved.sku_id = s.id
            WHERE s.id = @sku_id
          `);

        if (availRes.recordset.length === 0) {
          throw new Error(`SKU not found: ${it.sku_id}`);
        }

        const availableQty = Number(availRes.recordset[0].available_qty) || 0;
        if (it.qty > availableQty) {
          throw new Error(`Insufficient available stock for SKU ${it.sku_id}. Available: ${availableQty}`);
        }

        await new sql.Request(txn)
          .input('sku_id', sql.Int, it.sku_id)
          .input('qty', sql.Float, it.qty)
          .input('ref_type', sql.VarChar(50), 'RESERVATION')
          .input('ref_id', sql.Int, reservationId || null)
          .input('txn_date', sql.Date, reserve_date || new Date())
          .input('remarks', sql.NVarChar(sql.MAX), `Reserved for: ${reserved_for}${remarks ? ` | ${remarks}` : ''}`)
          .query(`
            INSERT INTO store_stock_ledger (sku_id, txn_type, qty, ref_type, ref_id, txn_date, remarks, created_at)
            VALUES (@sku_id, 'RESERVE', @qty, @ref_type, @ref_id, @txn_date, @remarks, GETDATE());
          `);
      }

      await txn.commit();
      res.json({ success: true, reservation_id: reservationId });
    } catch (e) {
      await txn.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error reserving SKUs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Release reservation (unreserve all ledger entries for a reservation)
router.post('/reservations/:id/release', async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    if (!Number.isFinite(reservationId)) {
      return res.status(400).json({ error: 'Invalid reservation id' });
    }

    const pool = await getConnection();
    const txn = new sql.Transaction(pool);
    await txn.begin();
    try {
      const rows = await new sql.Request(txn)
        .input('ref_id', sql.Int, reservationId)
        .query(`
          SELECT sku_id, SUM(qty) AS qty
          FROM store_stock_ledger
          WHERE ref_type = 'RESERVATION' AND ref_id = @ref_id AND txn_type = 'RESERVE'
          GROUP BY sku_id
        `);

      for (const r of rows.recordset) {
        await new sql.Request(txn)
          .input('sku_id', sql.Int, r.sku_id)
          .input('qty', sql.Float, Number(r.qty) || 0)
          .input('ref_type', sql.VarChar(50), 'RESERVATION')
          .input('ref_id', sql.Int, reservationId)
          .input('txn_date', sql.Date, new Date())
          .input('remarks', sql.NVarChar(sql.MAX), 'Reservation released')
          .query(`
            INSERT INTO store_stock_ledger (sku_id, txn_type, qty, ref_type, ref_id, txn_date, remarks, created_at)
            VALUES (@sku_id, 'UNRESERVE', @qty, @ref_type, @ref_id, @txn_date, @remarks, GETDATE());
          `);
      }

      await new sql.Request(txn)
        .input('id', sql.Int, reservationId)
        .query(`
          IF OBJECT_ID('dbo.store_reservations', 'U') IS NOT NULL
          BEGIN
            UPDATE store_reservations SET status = 'Released' WHERE id = @id;
          END
        `);

      await txn.commit();
      res.json({ success: true });
    } catch (e) {
      await txn.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error releasing reservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single SKU
router.get('/skus/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM store_skus WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching SKU:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update SKU
router.put('/skus/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const fields = Object.keys(req.body).filter(f => f !== 'id').map(key => `${key} = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);

    Object.keys(req.body).filter(f => f !== 'id').forEach((key) => {
      const value = req.body[key];
      if (key === 'max_level') {
        request.input('max_level', sql.Float, value === '' || value === undefined || value === null ? null : Number(value));
        return;
      }

      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });

    const result = await request.query(`
      UPDATE store_skus SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating SKU:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete SKU
router.delete('/skus/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM store_skus OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting SKU:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
