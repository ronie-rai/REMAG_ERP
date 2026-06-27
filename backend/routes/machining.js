import express from 'express';
import sql, { getConnection } from '../config/database.js';
import { generateBillNumber } from '../utils/numberGenerator.js';
import { requireAuth, requireModuleAccess } from '../utils/auth.js';
import { auditMiddleware } from '../utils/audit.js';

const router = express.Router();

router.use(requireAuth, requireModuleAccess('production'));
router.use(auditMiddleware('production'));

const generateMachiningIndentNo = async (pool) => {
  const res = await pool.request().query(`
    SELECT TOP 1 machining_indent_no
    FROM machining
    WHERE machining_indent_no IS NOT NULL
    ORDER BY id DESC
  `);

  const last = res.recordset?.[0]?.machining_indent_no ? String(res.recordset[0].machining_indent_no) : '';
  const m = last.match(/(\d+)$/);
  const next = (m ? Number(m[1]) : 0) + 1;
  const padded = String(next).padStart(5, '0');
  return `MI-${padded}`;
};

// Get all machining records
router.get('/machining', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        m.*,
        ab.id AS advance_bill_id,
        ab.bill_number AS advance_bill_number,
        ab.bill_date AS advance_bill_date,
        ab.bill_value AS advance_bill_value,
        fb.id AS final_bill_id,
        fb.bill_number AS final_bill_number,
        fb.bill_date AS final_bill_date,
        fb.bill_value AS final_bill_value
      FROM machining m
      OUTER APPLY (
        SELECT TOP 1 *
        FROM bills
        WHERE reference_type = 'machining' AND reference_id = m.id AND bill_stage = 'advance'
        ORDER BY id DESC
      ) ab
      OUTER APPLY (
        SELECT TOP 1 *
        FROM bills
        WHERE reference_type = 'machining' AND reference_id = m.id AND bill_stage = 'final'
        ORDER BY id DESC
      ) fb
      ORDER BY m.id DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching machining records:', error);
    res.status(500).json({ error: error.message });
  }
});

const loadMachiningRowOr404 = async (pool, id) => {
  const r = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM machining WHERE id = @id');
  if (!r.recordset?.length) return null;
  return r.recordset[0];
};

const getLinkedBill = async (pool, machiningId, stage) => {
  const r = await pool.request()
    .input('reference_id', sql.Int, machiningId)
    .input('bill_stage', sql.VarChar(20), stage)
    .query(`
      SELECT TOP 1 *
      FROM bills
      WHERE reference_type = 'machining' AND reference_id = @reference_id AND bill_stage = @bill_stage
      ORDER BY id DESC
    `);
  return r.recordset?.[0] || null;
};

const createAdvanceBillIfNeeded = async (pool, machiningId, billDate, totalNum, advanceNum) => {
  if (!Number.isFinite(advanceNum) || advanceNum <= 0) return null;
  const existing = await getLinkedBill(pool, machiningId, 'advance');
  if (existing) return existing;

  const billNumber = await generateBillNumber();
  const inserted = await pool.request()
    .input('reference_type', sql.VarChar(50), 'machining')
    .input('reference_id', sql.Int, machiningId)
    .input('bill_stage', sql.VarChar(20), 'advance')
    .input('bill_number', sql.VarChar(100), billNumber)
    .input('bill_date', sql.Date, billDate)
    .input('bill_value', sql.Decimal(18, 2), advanceNum)
    .input('advance_payment', sql.Decimal(18, 2), 0)
    .input('payable_value', sql.Decimal(18, 2), advanceNum)
    .input('eway_bill_number', sql.VarChar(100), null)
    .query(`
      INSERT INTO bills (
        po_id,
        job_sheet_id,
        reference_type,
        reference_id,
        bill_stage,
        bill_number,
        bill_date,
        bill_value,
        advance_payment,
        payable_value,
        eway_bill_number,
        status,
        created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        NULL,
        NULL,
        @reference_type,
        @reference_id,
        @bill_stage,
        @bill_number,
        @bill_date,
        @bill_value,
        @advance_payment,
        @payable_value,
        @eway_bill_number,
        'Pending',
        GETDATE()
      )
    `);
  return inserted.recordset[0];
};

// Create advance bill for outsourced machining item
router.post('/machining/:id/bills/advance', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid machining id' });

    const row = await loadMachiningRowOr404(pool, id);
    if (!row) return res.status(404).json({ error: 'Machining record not found' });

    if (String(row.status || '').toLowerCase() !== 'outsourced') {
      return res.status(400).json({ error: 'Advance bill can be created only for outsourced machining' });
    }

    const existing = await getLinkedBill(pool, id, 'advance');
    if (existing) {
      return res.status(400).json({ error: 'Advance bill already exists for this machining item', bill: existing });
    }

    const total = req.body?.total_bill_value;
    const advance = req.body?.advance_amount;
    const billDate = req.body?.bill_date;

    const totalNum = Number(total);
    const advanceNum = Number(advance);
    if (!Number.isFinite(totalNum) || totalNum <= 0) return res.status(400).json({ error: 'total_bill_value is required' });
    if (!Number.isFinite(advanceNum) || advanceNum <= 0) return res.status(400).json({ error: 'advance_amount is required' });
    if (advanceNum > totalNum) return res.status(400).json({ error: 'advance_amount cannot be greater than total_bill_value' });
    if (!billDate) return res.status(400).json({ error: 'bill_date is required' });

    await pool.request()
      .input('id', sql.Int, id)
      .input('total_bill_value', sql.Decimal(18, 2), totalNum)
      .input('advance_required', sql.Bit, 1)
      .input('advance_amount', sql.Decimal(18, 2), advanceNum)
      .query(`
        UPDATE machining
        SET total_bill_value = @total_bill_value,
            advance_required = @advance_required,
            advance_amount = @advance_amount,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    const billNumber = await generateBillNumber();
    const inserted = await pool.request()
      .input('reference_type', sql.VarChar(50), 'machining')
      .input('reference_id', sql.Int, id)
      .input('bill_stage', sql.VarChar(20), 'advance')
      .input('bill_number', sql.VarChar(100), billNumber)
      .input('bill_date', sql.Date, billDate)
      .input('bill_value', sql.Decimal(18, 2), advanceNum)
      .input('advance_payment', sql.Decimal(18, 2), 0)
      .input('payable_value', sql.Decimal(18, 2), advanceNum)
      .input('eway_bill_number', sql.VarChar(100), req.body?.eway_bill_number || null)
      .query(`
        INSERT INTO bills (
          po_id,
          job_sheet_id,
          reference_type,
          reference_id,
          bill_stage,
          bill_number,
          bill_date,
          bill_value,
          advance_payment,
          payable_value,
          eway_bill_number,
          status,
          created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          NULL,
          NULL,
          @reference_type,
          @reference_id,
          @bill_stage,
          @bill_number,
          @bill_date,
          @bill_value,
          @advance_payment,
          @payable_value,
          @eway_bill_number,
          'Pending',
          GETDATE()
        )
      `);

    res.json({ machining_id: id, bill: inserted.recordset[0] });
  } catch (error) {
    console.error('Error creating advance machining bill:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create final bill for outsourced machining item (allowed only after receive)
router.post('/machining/:id/bills/final', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid machining id' });

    const row = await loadMachiningRowOr404(pool, id);
    if (!row) return res.status(404).json({ error: 'Machining record not found' });

    if (String(row.status || '').toLowerCase() !== 'outsourced') {
      return res.status(400).json({ error: 'Final bill can be created only for outsourced machining' });
    }

    if (!row.received_at) {
      return res.status(400).json({ error: 'Final bill can be created only after material is received' });
    }

    const existing = await getLinkedBill(pool, id, 'final');
    if (existing) {
      return res.status(400).json({ error: 'Final bill already exists for this machining item', bill: existing });
    }

    const advanceBill = await getLinkedBill(pool, id, 'advance');

    const totalNum = Number(req.body?.total_bill_value ?? row.total_bill_value);
    const advanceNum = Number(req.body?.advance_amount ?? row.advance_amount ?? (advanceBill ? advanceBill.bill_value : null));
    const billDate = req.body?.bill_date;

    if (!Number.isFinite(totalNum) || totalNum <= 0) return res.status(400).json({ error: 'total_bill_value is required' });
    if (!Number.isFinite(advanceNum) || advanceNum < 0) return res.status(400).json({ error: 'advance_amount is required' });
    if (advanceNum > totalNum) return res.status(400).json({ error: 'advance_amount cannot be greater than total_bill_value' });
    if (!billDate) return res.status(400).json({ error: 'bill_date is required' });

    const finalAmount = Number((totalNum - advanceNum).toFixed(2));
    if (finalAmount <= 0) {
      return res.status(400).json({ error: 'Final amount is zero. Nothing to bill.' });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('total_bill_value', sql.Decimal(18, 2), totalNum)
      .input('advance_required', sql.Bit, advanceNum > 0 ? 1 : 0)
      .input('advance_amount', sql.Decimal(18, 2), advanceNum)
      .query(`
        UPDATE machining
        SET total_bill_value = @total_bill_value,
            advance_required = @advance_required,
            advance_amount = @advance_amount,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    const billNumber = await generateBillNumber();
    const inserted = await pool.request()
      .input('reference_type', sql.VarChar(50), 'machining')
      .input('reference_id', sql.Int, id)
      .input('bill_stage', sql.VarChar(20), 'final')
      .input('bill_number', sql.VarChar(100), billNumber)
      .input('bill_date', sql.Date, billDate)
      .input('bill_value', sql.Decimal(18, 2), finalAmount)
      .input('advance_payment', sql.Decimal(18, 2), 0)
      .input('payable_value', sql.Decimal(18, 2), finalAmount)
      .input('eway_bill_number', sql.VarChar(100), req.body?.eway_bill_number || null)
      .query(`
        INSERT INTO bills (
          po_id,
          job_sheet_id,
          reference_type,
          reference_id,
          bill_stage,
          bill_number,
          bill_date,
          bill_value,
          advance_payment,
          payable_value,
          eway_bill_number,
          status,
          created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          NULL,
          NULL,
          @reference_type,
          @reference_id,
          @bill_stage,
          @bill_number,
          @bill_date,
          @bill_value,
          @advance_payment,
          @payable_value,
          @eway_bill_number,
          'Pending',
          GETDATE()
        )
      `);

    res.json({ machining_id: id, bill: inserted.recordset[0], computed: { final_amount: finalAmount } });
  } catch (error) {
    console.error('Error creating final machining bill:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get machining indent details by indent number
router.get('/machining/indent/:indentNo', async (req, res) => {
  try {
    const indentNo = String(req.params.indentNo || '').trim();
    if (!indentNo) return res.status(400).json({ error: 'Indent number is required' });

    const pool = await getConnection();
    const result = await pool.request()
      .input('indentNo', sql.VarChar(30), indentNo)
      .query(`
        SELECT *
        FROM machining
        WHERE machining_indent_no = @indentNo
        ORDER BY id ASC
      `);

    const rows = result.recordset || [];
    if (rows.length === 0) return res.status(404).json({ error: 'Indent not found' });

    const first = rows[0] || {};
    const vendors = Array.from(new Set(rows.map((r) => r?.outsourced_to).filter((v) => v !== null && v !== undefined && String(v).trim() !== '')));
    const receivedCount = rows.filter((r) => r?.received_at).length;
    res.json({
      machining_indent_no: indentNo,
      job_number: first.job_number ?? null,
      vendors,
      received_count: receivedCount,
      items_count: rows.length,
      rows,
    });
  } catch (error) {
    console.error('Error fetching machining indent details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single machining record
router.get('/machining/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid machining id' });

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          m.*,
          ab.id AS advance_bill_id,
          ab.bill_number AS advance_bill_number,
          fb.id AS final_bill_id,
          fb.bill_number AS final_bill_number
        FROM machining m
        OUTER APPLY (
          SELECT TOP 1 *
          FROM bills
          WHERE reference_type = 'machining' AND reference_id = m.id AND bill_stage = 'advance'
          ORDER BY id DESC
        ) ab
        OUTER APPLY (
          SELECT TOP 1 *
          FROM bills
          WHERE reference_type = 'machining' AND reference_id = m.id AND bill_stage = 'final'
          ORDER BY id DESC
        ) fb
        WHERE m.id = @id
      `);

    if (!result.recordset?.length) return res.status(404).json({ error: 'Machining record not found' });
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching machining record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create machining record
router.post('/machining', async (req, res) => {
  try {
    const pool = await getConnection();

    const toSqlDate = (value) => {
      if (!value) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (rows && rows.length > 0) {
      const indentNo = req.body?.machining_indent_no || (await generateMachiningIndentNo(pool));
      const inserted = [];
      const createdBills = [];
      for (const r of rows) {
        const status = r.status;
        const isOutsourced = String(status || '').toLowerCase() === 'outsourced';
        const totalNum = isOutsourced ? Number(r.total_bill_value) : null;
        const advanceNum = isOutsourced ? Number(r.advance_amount || 0) : 0;
        if (isOutsourced && (!Number.isFinite(totalNum) || totalNum <= 0)) {
          return res.status(400).json({ error: 'total_bill_value is required for outsourced machining' });
        }
        if (isOutsourced && (!Number.isFinite(advanceNum) || advanceNum < 0)) {
          return res.status(400).json({ error: 'advance_amount must be a number (0 or more)' });
        }
        if (isOutsourced && advanceNum > totalNum) {
          return res.status(400).json({ error: 'advance_amount cannot be greater than total_bill_value' });
        }

        const result = await pool.request()
          .input('machining_indent_no', sql.VarChar(30), indentNo)
          .input('job_number', sql.Int, r.job_number ?? req.body.job_number ?? null)
          .input('indent_id', sql.Int, r.indent_id ?? req.body.indent_id ?? null)
          .input('particulars', sql.NVarChar(sql.MAX), r.particulars ?? null)
          .input('status', sql.VarChar(30), status)
          .input('outsourced_date', sql.Date, toSqlDate(r.outsourced_date))
          .input('outsourced_to', sql.VarChar(200), r.outsourced_to ?? null)
          .input('expected_delivery', sql.Date, toSqlDate(r.expected_delivery))
          .input('total_bill_value', sql.Decimal(18, 2), isOutsourced ? totalNum : null)
          .input('advance_required', sql.Bit, isOutsourced ? (advanceNum > 0 ? 1 : 0) : null)
          .input('advance_amount', sql.Decimal(18, 2), isOutsourced ? advanceNum : null)
          .query(`
            INSERT INTO machining (
              machining_indent_no,
              job_number,
              indent_id,
              particulars,
              status,
              outsourced_date,
              outsourced_to,
              expected_delivery,
              total_bill_value,
              advance_required,
              advance_amount,
              created_at,
              updated_at
            )
            OUTPUT INSERTED.*
            VALUES (
              @machining_indent_no,
              @job_number,
              @indent_id,
              @particulars,
              @status,
              @outsourced_date,
              @outsourced_to,
              @expected_delivery,
              @total_bill_value,
              @advance_required,
              @advance_amount,
              GETDATE(),
              GETDATE()
            )
          `);
        const insertedRow = result.recordset[0];
        inserted.push(insertedRow);

        if (isOutsourced && advanceNum > 0) {
          const billDate = toSqlDate(r.outsourced_date) || new Date();
          const bill = await createAdvanceBillIfNeeded(pool, insertedRow.id, billDate, totalNum, advanceNum);
          if (bill) createdBills.push(bill);
        }
      }
      return res.json({ inserted, created_bills: createdBills, count: inserted.length, machining_indent_no: indentNo });
    }

    const indentNo = req.body?.machining_indent_no || (await generateMachiningIndentNo(pool));
    const status = req.body.status;
    const isOutsourced = String(status || '').toLowerCase() === 'outsourced';
    const totalNum = isOutsourced ? Number(req.body.total_bill_value) : null;
    const advanceNum = isOutsourced ? Number(req.body.advance_amount || 0) : 0;
    if (isOutsourced && (!Number.isFinite(totalNum) || totalNum <= 0)) {
      return res.status(400).json({ error: 'total_bill_value is required for outsourced machining' });
    }
    if (isOutsourced && (!Number.isFinite(advanceNum) || advanceNum < 0)) {
      return res.status(400).json({ error: 'advance_amount must be a number (0 or more)' });
    }
    if (isOutsourced && advanceNum > totalNum) {
      return res.status(400).json({ error: 'advance_amount cannot be greater than total_bill_value' });
    }

    const single = await pool.request()
      .input('machining_indent_no', sql.VarChar(30), indentNo)
      .input('job_number', sql.Int, req.body.job_number ?? null)
      .input('indent_id', sql.Int, req.body.indent_id ?? null)
      .input('particulars', sql.NVarChar(sql.MAX), req.body.particulars ?? null)
      .input('status', sql.VarChar(30), status)
      .input('outsourced_date', sql.Date, toSqlDate(req.body.outsourced_date))
      .input('outsourced_to', sql.VarChar(200), req.body.outsourced_to ?? null)
      .input('expected_delivery', sql.Date, toSqlDate(req.body.expected_delivery))
      .input('total_bill_value', sql.Decimal(18, 2), isOutsourced ? totalNum : null)
      .input('advance_required', sql.Bit, isOutsourced ? (advanceNum > 0 ? 1 : 0) : null)
      .input('advance_amount', sql.Decimal(18, 2), isOutsourced ? advanceNum : null)
      .query(`
        INSERT INTO machining (
          machining_indent_no,
          job_number,
          indent_id,
          particulars,
          status,
          outsourced_date,
          outsourced_to,
          expected_delivery,
          total_bill_value,
          advance_required,
          advance_amount,
          created_at,
          updated_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @machining_indent_no,
          @job_number,
          @indent_id,
          @particulars,
          @status,
          @outsourced_date,
          @outsourced_to,
          @expected_delivery,
          @total_bill_value,
          @advance_required,
          @advance_amount,
          GETDATE(),
          GETDATE()
        )
      `);

    const insertedRow = single.recordset[0];
    let createdBill = null;
    if (isOutsourced && advanceNum > 0) {
      const billDate = toSqlDate(req.body.outsourced_date) || new Date();
      createdBill = await createAdvanceBillIfNeeded(pool, insertedRow.id, billDate, totalNum, advanceNum);
    }

    res.json({ ...insertedRow, machining_indent_no: indentNo, created_bill: createdBill });
  } catch (error) {
    console.error('Error creating machining record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update machining record
router.put('/machining/:id', async (req, res) => {
  try {
    const pool = await getConnection();

    const readonlyFields = new Set(['id', 'created_at', 'updated_at', 'received_at']);
    const updateKeys = Object.keys(req.body || {}).filter((k) => !readonlyFields.has(k));
    if (updateKeys.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const toSqlDate = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const fields = updateKeys.map((k) => `[${k}] = @${k}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);

    updateKeys.forEach((key) => {
      const value = req.body[key];

      if (key === 'job_number') {
        const n = Number(value);
        request.input(key, sql.Int, Number.isNaN(n) ? null : n);
        return;
      }

      if (key === 'indent_id') {
        const n = Number(value);
        request.input(key, sql.Int, Number.isNaN(n) ? null : n);
        return;
      }

      if (key === 'outsourced_date' || key === 'expected_delivery') {
        request.input(key, sql.Date, toSqlDate(value));
        return;
      }

      if (key === 'total_bill_value') {
        const n = Number(value);
        request.input(key, sql.Decimal(18, 2), Number.isNaN(n) ? null : n);
        return;
      }

      if (key === 'advance_amount') {
        const n = Number(value);
        request.input(key, sql.Decimal(18, 2), Number.isNaN(n) ? null : n);
        return;
      }

      if (key === 'advance_required') {
        const b = value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
        request.input(key, sql.Bit, b ? 1 : 0);
        return;
      }

      if (value === null || value === undefined || value === '') {
        request.input(key, sql.NVarChar, null);
        return;
      }

      request.input(key, sql.NVarChar, value);
    });

    const result = await request.query(`
      UPDATE machining SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Machining record not found' });
    }

    const updated = result.recordset[0];
    const isOutsourced = String(updated?.status || '').toLowerCase() === 'outsourced';
    const totalNum = Number(updated?.total_bill_value);
    const advanceNum = Number(updated?.advance_amount || 0);

    if (isOutsourced && advanceNum > 0) {
      const billDate = updated?.outsourced_date ? new Date(updated.outsourced_date) : new Date();
      await createAdvanceBillIfNeeded(pool, Number(updated.id), billDate, totalNum, advanceNum);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating machining record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Receive outsourced item
router.put('/machining/:id/receive', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        UPDATE machining
        SET received_at = GETDATE(), status = 'Completed', updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Machining record not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error receiving machining record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete machining record
router.delete('/machining/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM machining OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Machining record not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting machining record:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
