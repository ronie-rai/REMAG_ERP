import express from 'express';
import sql, { getConnection } from '../config/database.js';
import { generateEnquiryNo, generateSalesQuotationNo, generateInvoiceNumber } from '../utils/numberGenerator.js';
import { generateSalesQuotationPDF, generateInvoicePDF } from '../utils/pdfGenerator.js';
import { requireAuth, requireModuleAccess } from '../utils/auth.js';
import { auditMiddleware } from '../utils/audit.js';

const router = express.Router();

router.use(requireAuth, requireModuleAccess('sales'));
router.use(auditMiddleware('sales'));

const toSqlDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(d.getTime())) return null;
  return d;
};

const toSqlDecimal = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
};

const inferStateCodeFromGstin = (gstin) => {
  if (!gstin) return null;
  const s = String(gstin).trim();
  const m = s.match(/^(\d{2})/);
  if (!m) return null;
  return m[1];
};

const computeTaxSplit = ({ taxableAmount, billToGstin, cgstPercent: cgstPercentInput, igstPercent: igstPercentInput }) => {
  const taxable = Number(taxableAmount);
  const base = Number.isFinite(taxable) ? taxable : 0;

  const stateCode = inferStateCodeFromGstin(billToGstin);

  // Rule:
  // - Odisha (22): CGST 18%, IGST 0%
  // - Other: CGST 9%, IGST 9%
  let cgstPercent = stateCode === '22' ? 18 : 9;
  let igstPercent = stateCode === '22' ? 0 : 9;

  // Allow explicit override if needed (optional)
  const cIn = toSqlDecimal(cgstPercentInput);
  const iIn = toSqlDecimal(igstPercentInput);
  if (cIn !== null && cIn >= 0 && cIn <= 100) cgstPercent = cIn;
  if (iIn !== null && iIn >= 0 && iIn <= 100) igstPercent = iIn;

  const cgstAmount = Number(((base * cgstPercent) / 100).toFixed(2));
  const igstAmount = Number(((base * igstPercent) / 100).toFixed(2));
  const totalAmount = Number((base + cgstAmount + igstAmount).toFixed(2));
  const gstAmount = Number((cgstAmount + igstAmount).toFixed(2));
  const gstPercent = Number((cgstPercent + igstPercent).toFixed(2));

  return {
    state_code: stateCode,
    invoice_amount: Number(base.toFixed(2)),
    cgst_percent: cgstPercent,
    cgst_amount: cgstAmount,
    igst_percent: igstPercent,
    igst_amount: igstAmount,
    gst_percent: gstPercent,
    gst_amount: gstAmount,
    total_amount: totalAmount,
  };
};

// Create Enquiry
router.post('/enquiries', async (req, res) => {
  try {
    const pool = await getConnection();
    const enquiryNo = await generateEnquiryNo();

    const statusRaw = req.body?.status;
    const status = statusRaw === null || statusRaw === undefined || statusRaw === '' ? 'Update Status' : String(statusRaw);
    const allowed = new Set(['Update Status', 'Quoted', 'Enquiry Cancelled']);
    if (!allowed.has(status)) {
      return res.status(400).json({ error: 'For new enquiry, status must be Update Status, Quoted or Enquiry Cancelled' });
    }

    
    const quotedValueRaw = req.body?.quoted_value;
    const quotedValueNum = quotedValueRaw === '' || quotedValueRaw === null || quotedValueRaw === undefined ? NaN : Number(quotedValueRaw);
    if (quotedValueRaw !== '' && quotedValueRaw !== null && quotedValueRaw !== undefined) {
      if (!Number.isFinite(quotedValueNum) || quotedValueNum < 0) {
        return res.status(400).json({ error: 'quoted_value must be a valid number (>= 0)' });
      }
    }
    
    const result = await pool.request()
      .input('enquiry_no', sql.VarChar(50), enquiryNo)
      .input('input_channel', sql.VarChar(50), req.body.input_channel)
      .input('client_id', sql.Int, req.body.client_id || null)
      .input('customer_name', sql.VarChar(200), req.body.customer_name)
      .input('particulars', sql.Text, req.body.particulars)
      .input('job_scope', sql.VarChar(50), req.body.job_scope)
      .input('due_date', sql.Date, req.body.due_date || null)
      .input('reference', sql.VarChar(200), req.body.reference)
      .input('website_link', sql.VarChar(500), req.body.website_link)
      .input('contact_number', sql.VarChar(20), req.body.contact_number)
      .input('status', sql.VarChar(50), status)
      .input('quoted_value', sql.Decimal(18, 2), Number.isFinite(quotedValueNum) ? quotedValueNum : null)
      .query(`INSERT INTO enquiries (enquiry_no, input_channel, client_id, customer_name, particulars, 
              job_scope, due_date, reference, website_link, contact_number, status, quoted_value, created_at, updated_at)
              OUTPUT INSERTED.*
              VALUES (@enquiry_no, @input_channel, @client_id, @customer_name, @particulars, 
              @job_scope, @due_date, @reference, @website_link, @contact_number, @status, @quoted_value, GETDATE(), GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating enquiry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Enquiries
router.get('/enquiries', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        e.*,
        CASE WHEN EXISTS (
          SELECT 1
          FROM sales_quotations q
          WHERE q.enquiry_id = e.id AND q.status = 'Submitted'
        ) THEN 1 ELSE 0 END AS has_submitted_quotation
      FROM enquiries e
      ORDER BY e.id DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enquiry Timeline (audit-based)
router.get('/enquiries/:id/timeline', async (req, res) => {
  try {
    const pool = await getConnection();
    const enquiryId = Number(req.params.id);
    if (!Number.isFinite(enquiryId)) {
      return res.status(400).json({ error: 'Invalid enquiry id' });
    }

    const result = await pool.request()
      .input('enquiry_id', sql.Int, enquiryId)
      .query(`
        SELECT
          a.id,
          a.created_at,
          a.user_id,
          a.username,
          a.module,
          a.action,
          a.method,
          a.path,
          a.status_code,
          a.entity_id,
          a.details_json,
          q.id AS quotation_id,
          q.quotation_no,
          q.status AS quotation_status,
          q.enquiry_id AS quotation_enquiry_id
        FROM audit_logs a
        LEFT JOIN sales_quotations q
          ON a.entity_id = q.id
          AND a.path LIKE '%/sales/quotations%'
        WHERE
          a.module = 'sales'
          AND (
            (a.entity_id = @enquiry_id AND a.path LIKE '%/sales/enquiries%')
            OR (q.enquiry_id = @enquiry_id)
            OR (a.path LIKE '%/sales/quotations%' AND a.details_json LIKE '%"enquiry_id":' + CAST(@enquiry_id AS NVARCHAR(20)) + '%')
          )
        ORDER BY a.created_at ASC
      `);

    const rows = result.recordset || [];
    const timeline = rows.map((row) => {
      let details = null;
      try {
        details = row.details_json ? JSON.parse(row.details_json) : null;
      } catch {
        details = null;
      }

      const body = details?.body || null;
      let kind = 'activity';
      let message = `${row.action || row.method || 'action'}`;

      const path = String(row.path || '');
      if (/\/enquiries\/(\d+)\/status\b/i.test(path)) {
        kind = 'status';
        if (body?.status) message = `Status changed to ${body.status}`;
      } else if (/\/enquiries\/(\d+)\/quoted-value\b/i.test(path)) {
        kind = 'quoted_value';
        if (body?.quoted_value !== undefined) message = `Quoted value set to ${body.quoted_value}`;
      } else if (/\/sales\/quotations\b/i.test(path)) {
        kind = 'quotation';
        const qStatus = body?.status || row.quotation_status || null;
        const qNo = body?.quotation_no || row.quotation_no || null;
        if (row.method === 'POST') {
          message = `Quotation created${qNo ? ` (${qNo})` : ''}${qStatus ? ` - ${qStatus}` : ''}`;
        } else if (row.method === 'PUT' || row.method === 'PATCH') {
          message = `Quotation updated${qNo ? ` (${qNo})` : ''}${qStatus ? ` - ${qStatus}` : ''}`;
        } else if (row.method === 'DELETE') {
          message = `Quotation deleted${qNo ? ` (${qNo})` : ''}`;
        }
      }

      const createdAtIso = row.created_at instanceof Date ? row.created_at.toISOString() : null;
      return {
        id: row.id,
        created_at_iso: createdAtIso,
        user_id: row.user_id,
        username: row.username,
        kind,
        message,
        raw: {
          action: row.action,
          method: row.method,
          path: row.path,
          status_code: row.status_code,
          entity_id: row.entity_id,
        },
      };
    });

    res.json({ enquiry_id: enquiryId, timeline });
  } catch (error) {
    console.error('Error fetching enquiry timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Enquiries Pending Work Order (no work order created yet)
router.get('/enquiries/pending-work-orders', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT e.*
      FROM enquiries e
      LEFT JOIN work_orders w ON w.enquiry_id = e.id
      WHERE w.id IS NULL
      ORDER BY e.id DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching enquiries pending work orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Enquiry
router.get('/enquiries/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM enquiries WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching enquiry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Enquiry
router.put('/enquiries/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('input_channel', sql.VarChar(50), req.body.input_channel)
      .input('client_id', sql.Int, req.body.client_id || null)
      .input('customer_name', sql.VarChar(200), req.body.customer_name)
      .input('particulars', sql.Text, req.body.particulars)
      .input('job_scope', sql.VarChar(50), req.body.job_scope)
      .input('due_date', sql.Date, req.body.due_date || null)
      .input('reference', sql.VarChar(200), req.body.reference)
      .input('website_link', sql.VarChar(500), req.body.website_link)
      .input('contact_number', sql.VarChar(20), req.body.contact_number)
      .query(`UPDATE enquiries SET 
              input_channel = @input_channel,
              client_id = @client_id,
              customer_name = @customer_name,
              particulars = @particulars,
              job_scope = @job_scope,
              due_date = @due_date,
              reference = @reference,
              website_link = @website_link,
              contact_number = @contact_number,
              updated_at = GETDATE()
              OUTPUT INSERTED.*
              WHERE id = @id`);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating enquiry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Enquiry
router.delete('/enquiries/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM enquiries OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Sales Quotation
router.post('/quotations', async (req, res) => {
  try {
    const pool = await getConnection();

    const enquiryId = Number(req.body?.enquiry_id);
    if (!Number.isFinite(enquiryId)) {
      return res.status(400).json({ error: 'Invalid enquiry_id' });
    }

    const enquiryCheck = await pool.request()
      .input('enquiry_id', sql.Int, enquiryId)
      .query('SELECT id FROM enquiries WHERE id = @enquiry_id');
    if (enquiryCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const quotationNo = req.body?.quotation_no ? String(req.body.quotation_no) : await generateSalesQuotationNo();

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const headerRes = await new sql.Request(tx)
        .input('enquiry_id', sql.Int, enquiryId)
        .input('quotation_no', sql.VarChar(100), quotationNo)
        .input('quotation_date', sql.Date, toSqlDate(req.body.quotation_date))
        .input('to_name', sql.VarChar(200), req.body.to_name)
        .input('to_address', sql.Text, req.body.to_address)
        .input('subject', sql.Text, req.body.subject)
        .input('ref_no', sql.VarChar(200), req.body.ref_no)
        .input('dear', sql.VarChar(200), req.body.dear)
        .input('intro_text', sql.Text, req.body.intro_text)
        .input('terms_text', sql.Text, req.body.terms_text)
        .input('term_price', sql.Text, req.body.term_price)
        .input('term_escalation', sql.Text, req.body.term_escalation)
        .input('term_transportation', sql.Text, req.body.term_transportation)
        .input('term_taxes', sql.Text, req.body.term_taxes)
        .input('term_inspection', sql.Text, req.body.term_inspection)
        .input('term_delivery', sql.Text, req.body.term_delivery)
        .input('term_payment', sql.Text, req.body.term_payment)
        .input('term_guarantee', sql.Text, req.body.term_guarantee)
        .input('term_scope', sql.Text, req.body.term_scope)
        .input('term_validity', sql.Text, req.body.term_validity)
        .input('term_note', sql.Text, req.body.term_note)
        .input('notes_text', sql.Text, req.body.notes_text)
        .input('status', sql.VarChar(50), req.body.status || 'Draft')
        .query(`INSERT INTO sales_quotations (
                  enquiry_id, quotation_no, quotation_date, to_name, to_address, subject, ref_no, dear,
                  intro_text, terms_text,
                  term_price, term_escalation, term_transportation, term_taxes, term_inspection, term_delivery,
                  term_payment, term_guarantee, term_scope, term_validity, term_note,
                  notes_text, status, created_at, updated_at
                )
                OUTPUT INSERTED.*
                VALUES (
                  @enquiry_id, @quotation_no, @quotation_date, @to_name, @to_address, @subject, @ref_no, @dear,
                  @intro_text, @terms_text,
                  @term_price, @term_escalation, @term_transportation, @term_taxes, @term_inspection, @term_delivery,
                  @term_payment, @term_guarantee, @term_scope, @term_validity, @term_note,
                  @notes_text, @status, GETDATE(), GETDATE()
                )`);

      const quotation = headerRes.recordset[0];

      let quotedValueTotal = 0;

      for (let i = 0; i < items.length; i++) {
        const it = items[i] || {};
        const qty = it.quantity === '' || it.quantity === null || it.quantity === undefined ? null : Number(it.quantity);
        const rate = it.rate === '' || it.rate === null || it.rate === undefined ? null : Number(it.rate);
        const amount = it.amount === '' || it.amount === null || it.amount === undefined ? null : Number(it.amount);

        const lineAmount = Number.isFinite(amount)
          ? amount
          : (Number.isFinite(qty) && Number.isFinite(rate) ? qty * rate : 0);
        quotedValueTotal += Number.isFinite(lineAmount) ? lineAmount : 0;

        await new sql.Request(tx)
          .input('quotation_id', sql.Int, quotation.id)
          .input('sl_no', sql.Int, it.sl_no ?? i + 1)
          .input('description', sql.Text, it.description)
          .input('quantity', sql.Float, Number.isFinite(qty) ? qty : null)
          .input('unit', sql.VarChar(50), it.unit)
          .input('rate', sql.Decimal(18, 2), Number.isFinite(rate) ? rate : null)
          .input('amount', sql.Decimal(18, 2), Number.isFinite(amount) ? amount : null)
          .query(`INSERT INTO sales_quotation_items (quotation_id, sl_no, description, quantity, unit, rate, amount, created_at, updated_at)
                  VALUES (@quotation_id, @sl_no, @description, @quantity, @unit, @rate, @amount, GETDATE(), GETDATE())`);
      }

      const status = (req.body?.status || 'Draft').toString();
      if (status === 'Submitted') {
        await new sql.Request(tx)
          .input('enquiry_id', sql.Int, enquiryId)
          .input('quoted_value', sql.Decimal(18, 2), quotedValueTotal)
          .query("UPDATE enquiries SET status = 'Quoted', quoted_value = @quoted_value, updated_at = GETDATE() WHERE id = @enquiry_id");
      }

      await tx.commit();
      res.json(quotation);
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error creating sales quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Sales Quotations
router.get('/quotations', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT q.*, e.enquiry_no, e.customer_name
      FROM sales_quotations q
      LEFT JOIN enquiries e ON e.id = q.enquiry_id
      ORDER BY q.id DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching sales quotations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Sales Quotation (with items)
router.get('/quotations/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid quotation id' });
    }

    const headerRes = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM sales_quotations WHERE id = @id');

    if (headerRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const itemsRes = await pool.request()
      .input('quotation_id', sql.Int, id)
      .query('SELECT * FROM sales_quotation_items WHERE quotation_id = @quotation_id ORDER BY ISNULL(sl_no, id) ASC');

    res.json({ ...headerRes.recordset[0], items: itemsRes.recordset || [] });
  } catch (error) {
    console.error('Error fetching sales quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Sales Quotation (header + replace items)
router.put('/quotations/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid quotation id' });
    }

    const existingRes = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM sales_quotations WHERE id = @id');
    if (existingRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const existing = existingRes.recordset[0];

    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const headerRes = await new sql.Request(tx)
        .input('id', sql.Int, id)
        .input('quotation_no', sql.VarChar(100), req.body.quotation_no)
        .input('quotation_date', sql.Date, toSqlDate(req.body.quotation_date))
        .input('to_name', sql.VarChar(200), req.body.to_name)
        .input('to_address', sql.Text, req.body.to_address)
        .input('subject', sql.Text, req.body.subject)
        .input('ref_no', sql.VarChar(200), req.body.ref_no)
        .input('dear', sql.VarChar(200), req.body.dear)
        .input('intro_text', sql.Text, req.body.intro_text)
        .input('terms_text', sql.Text, req.body.terms_text)
        .input('term_price', sql.Text, req.body.term_price)
        .input('term_escalation', sql.Text, req.body.term_escalation)
        .input('term_transportation', sql.Text, req.body.term_transportation)
        .input('term_taxes', sql.Text, req.body.term_taxes)
        .input('term_inspection', sql.Text, req.body.term_inspection)
        .input('term_delivery', sql.Text, req.body.term_delivery)
        .input('term_payment', sql.Text, req.body.term_payment)
        .input('term_guarantee', sql.Text, req.body.term_guarantee)
        .input('term_scope', sql.Text, req.body.term_scope)
        .input('term_validity', sql.Text, req.body.term_validity)
        .input('term_note', sql.Text, req.body.term_note)
        .input('notes_text', sql.Text, req.body.notes_text)
        .input('status', sql.VarChar(50), req.body.status)
        .query(`UPDATE sales_quotations
                SET quotation_no = ISNULL(@quotation_no, quotation_no),
                    quotation_date = @quotation_date,
                    to_name = @to_name,
                    to_address = @to_address,
                    subject = @subject,
                    ref_no = @ref_no,
                    dear = @dear,
                    intro_text = @intro_text,
                    terms_text = @terms_text,
                    term_price = @term_price,
                    term_escalation = @term_escalation,
                    term_transportation = @term_transportation,
                    term_taxes = @term_taxes,
                    term_inspection = @term_inspection,
                    term_delivery = @term_delivery,
                    term_payment = @term_payment,
                    term_guarantee = @term_guarantee,
                    term_scope = @term_scope,
                    term_validity = @term_validity,
                    term_note = @term_note,
                    notes_text = @notes_text,
                    status = ISNULL(@status, status),
                    updated_at = GETDATE()
                OUTPUT INSERTED.*
                WHERE id = @id`);

      await new sql.Request(tx)
        .input('quotation_id', sql.Int, id)
        .query('DELETE FROM sales_quotation_items WHERE quotation_id = @quotation_id');

      let quotedValueTotal = 0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i] || {};
        const qty = it.quantity === '' || it.quantity === null || it.quantity === undefined ? null : Number(it.quantity);
        const rate = it.rate === '' || it.rate === null || it.rate === undefined ? null : Number(it.rate);
        const amount = it.amount === '' || it.amount === null || it.amount === undefined ? null : Number(it.amount);

        const lineAmount = Number.isFinite(amount)
          ? amount
          : (Number.isFinite(qty) && Number.isFinite(rate) ? qty * rate : 0);
        quotedValueTotal += Number.isFinite(lineAmount) ? lineAmount : 0;

        await new sql.Request(tx)
          .input('quotation_id', sql.Int, id)
          .input('sl_no', sql.Int, it.sl_no ?? i + 1)
          .input('description', sql.Text, it.description)
          .input('quantity', sql.Float, Number.isFinite(qty) ? qty : null)
          .input('unit', sql.VarChar(50), it.unit)
          .input('rate', sql.Decimal(18, 2), Number.isFinite(rate) ? rate : null)
          .input('amount', sql.Decimal(18, 2), Number.isFinite(amount) ? amount : null)
          .query(`INSERT INTO sales_quotation_items (quotation_id, sl_no, description, quantity, unit, rate, amount, created_at, updated_at)
                  VALUES (@quotation_id, @sl_no, @description, @quantity, @unit, @rate, @amount, GETDATE(), GETDATE())`);
      }

      const nextStatus = (req.body?.status || existing?.status || 'Draft').toString();
      if (nextStatus === 'Submitted') {
        await new sql.Request(tx)
          .input('enquiry_id', sql.Int, existing.enquiry_id)
          .input('quoted_value', sql.Decimal(18, 2), quotedValueTotal)
          .query("UPDATE enquiries SET status = 'Quoted', quoted_value = @quoted_value, updated_at = GETDATE() WHERE id = @enquiry_id");
      }

      await tx.commit();
      res.json(headerRes.recordset[0]);
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error updating sales quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Sales Quotation
router.delete('/quotations/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid quotation id' });
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx)
        .input('quotation_id', sql.Int, id)
        .query('DELETE FROM sales_quotation_items WHERE quotation_id = @quotation_id');

      const headerRes = await new sql.Request(tx)
        .input('id', sql.Int, id)
        .query('DELETE FROM sales_quotations OUTPUT DELETED.* WHERE id = @id');

      if (headerRes.recordset.length === 0) {
        await tx.rollback();
        return res.status(404).json({ error: 'Quotation not found' });
      }

      await tx.commit();
      res.json({ success: true });
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error deleting sales quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export Sales Quotation PDF
router.get('/quotations/:id/pdf', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid quotation id' });
    }

    const headerRes = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT q.*, e.enquiry_no, e.customer_name, e.reference
        FROM sales_quotations q
        LEFT JOIN enquiries e ON e.id = q.enquiry_id
        WHERE q.id = @id
      `);
    if (headerRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const itemsRes = await pool.request()
      .input('quotation_id', sql.Int, id)
      .query('SELECT * FROM sales_quotation_items WHERE quotation_id = @quotation_id ORDER BY ISNULL(sl_no, id) ASC');

    if (typeof generateSalesQuotationPDF !== 'function') {
      return res.status(501).json({ error: 'Quotation PDF generator not implemented' });
    }

    const doc = generateSalesQuotationPDF({ ...headerRes.recordset[0], items: itemsRes.recordset || [] });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=sales_quotation_${id}.pdf`);
    doc.pipe(res);
  } catch (error) {
    console.error('Error generating quotation PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Work Order
router.post('/work-orders', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Check if enquiry exists
    const enquiryCheck = await pool.request()
      .input('enquiry_id', sql.Int, req.body.enquiry_id)
      .query('SELECT id FROM enquiries WHERE id = @enquiry_id');
    
    if (enquiryCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    const result = await pool.request()
      .input('enquiry_id', sql.Int, req.body.enquiry_id)
      .input('wo_link', sql.VarChar(500), req.body.wo_link)
      .input('wo_number', sql.VarChar(100), req.body.wo_number)
      .input('wo_date', sql.Date, req.body.wo_date)
      .input('wo_value', sql.Decimal(18, 2), req.body.wo_value)
      .input('wo_delivery', sql.Date, req.body.wo_delivery || null)
      .query(`INSERT INTO work_orders (enquiry_id, wo_link, wo_number, wo_date, wo_value, wo_delivery, status, created_at)
              OUTPUT INSERTED.*
              VALUES (@enquiry_id, @wo_link, @wo_number, @wo_date, @wo_value, @wo_delivery, 'Received', GETDATE())`);
    
    // Update enquiry status
    await pool.request()
      .input('enquiry_id', sql.Int, req.body.enquiry_id)
      .query('UPDATE enquiries SET status = \'Work Order Received\' WHERE id = @enquiry_id');
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating work order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Work Orders
router.get('/work-orders', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM work_orders ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Work Order
router.get('/work-orders/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM work_orders WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching work order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Work Order
router.put('/work-orders/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('enquiry_id', sql.Int, req.body.enquiry_id)
      .input('wo_link', sql.VarChar(500), req.body.wo_link)
      .input('wo_number', sql.VarChar(100), req.body.wo_number)
      .input('wo_date', sql.Date, req.body.wo_date)
      .input('wo_value', sql.Decimal(18, 2), req.body.wo_value)
      .input('wo_delivery', sql.Date, req.body.wo_delivery || null)
      .input('status', sql.VarChar(50), req.body.status || 'Received')
      .query(`UPDATE work_orders SET
              enquiry_id = @enquiry_id,
              wo_link = @wo_link,
              wo_number = @wo_number,
              wo_date = @wo_date,
              wo_value = @wo_value,
              wo_delivery = @wo_delivery,
              status = @status
              OUTPUT INSERTED.*
              WHERE id = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating work order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Work Order
router.delete('/work-orders/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM work_orders OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting work order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Enquiry Status
router.put('/enquiries/:id/status', async (req, res) => {
  try {
    const pool = await getConnection();
    const { status, quoted_value } = req.body;
    
    const validStatuses = [
      'Enquiry Cancelled',
      'No Update',
      'Evaluated',
      'Technical Evaluation',
      'Technical Qualified',
      'Disqualified',
      'Financial Evaluation',
      'RA Invited',
      'RA Not Invited',
      'Representation Clarification Pending',
      'L1',
      'Not L1',
      'Approval Pending',
      'Quoted',
      'W/O Received'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const hasQuotedValue = quoted_value !== undefined;
    if (status === 'Quoted' && !hasQuotedValue) {
      return res.status(400).json({ error: 'Quoted value is required when status is Quoted' });
    }

    if (hasQuotedValue) {
      const raw = quoted_value;
      const num = raw === '' || raw === null ? NaN : Number(raw);
      if (!Number.isFinite(num) || num < 0) {
        return res.status(400).json({ error: 'Quoted value must be a valid number (>= 0)' });
      }
    }

    const request = pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.VarChar(50), status);

    if (hasQuotedValue) {
      request.input('quoted_value', sql.Decimal(18, 2), Number(quoted_value));
    }

    const query = hasQuotedValue
      ? `UPDATE enquiries
              SET status = @status,
                  quoted_value = @quoted_value,
                  updated_at = GETDATE()
              OUTPUT INSERTED.*
              WHERE id = @id`
      : `UPDATE enquiries
              SET status = @status,
                  updated_at = GETDATE()
              OUTPUT INSERTED.*
              WHERE id = @id`;

    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating enquiry status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Enquiry Quoted Value
router.put('/enquiries/:id/quoted-value', async (req, res) => {
  try {
    const pool = await getConnection();
    const { quoted_value } = req.body;

    const raw = quoted_value;
    const num = raw === '' || raw === undefined || raw === null ? NaN : Number(raw);
    if (!Number.isFinite(num) || num < 0) {
      return res.status(400).json({ error: 'Quoted value must be a valid number (>= 0)' });
    }

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('quoted_value', sql.Decimal(18, 2), num)
      .query(`UPDATE enquiries
              SET quoted_value = @quoted_value, updated_at = GETDATE()
              OUTPUT INSERTED.*
              WHERE id = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating enquiry quoted value:', error);
    res.status(500).json({ error: error.message });
  }
});

// Billing: Create Invoice (links to a Job Entry and optionally a Work Order)
router.post('/billing/invoices', async (req, res) => {
  try {
    const pool = await getConnection();

    const jobEntryIdsRaw = Array.isArray(req.body?.job_entry_ids) ? req.body.job_entry_ids : [];
    const jobEntryIds = jobEntryIdsRaw
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));

    if (jobEntryIds.length === 0) {
      return res.status(400).json({ error: 'job_entry_ids is required' });
    }

    const uniqueJobEntryIds = Array.from(new Set(jobEntryIds));

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'items is required' });
    }

    const billToGstin = req.body?.bill_to_gstin || null;

    const normalizedItems = items.map((it, idx) => {
      const qty = it?.quantity === '' || it?.quantity === null || it?.quantity === undefined ? null : Number(it.quantity);
      const rate = it?.rate === '' || it?.rate === null || it?.rate === undefined ? null : Number(it.rate);
      const amountRaw = it?.amount === '' || it?.amount === null || it?.amount === undefined ? null : Number(it.amount);
      const lineAmount = Number.isFinite(amountRaw)
        ? amountRaw
        : (Number.isFinite(qty) && Number.isFinite(rate) ? qty * rate : 0);

      return {
        sl_no: it?.sl_no ?? idx + 1,
        description: it?.description || null,
        quantity: Number.isFinite(qty) ? qty : null,
        unit: it?.unit || null,
        sac_code: it?.sac_code || null,
        rate: Number.isFinite(rate) ? rate : null,
        amount: Number.isFinite(lineAmount) ? Number(lineAmount.toFixed(2)) : 0,
      };
    });

    const invoiceAmount = normalizedItems.reduce((sum, it) => sum + (Number.isFinite(Number(it.amount)) ? Number(it.amount) : 0), 0);
    if (!Number.isFinite(invoiceAmount) || invoiceAmount < 0) {
      return res.status(400).json({ error: 'Invalid invoice items total' });
    }

    const tax = computeTaxSplit({
      taxableAmount: invoiceAmount,
      billToGstin,
      cgstPercent: req.body?.cgst_percent,
      igstPercent: req.body?.igst_percent,
    });

    const gstPercent = tax.gst_percent;
    const gstAmount = tax.gst_amount;
    const totalAmount = tax.total_amount;
    const invoiceDate = toSqlDate(req.body?.invoice_date);
    const remarks = req.body?.remarks || null;

    const billToName = req.body?.bill_to_name || null;
    const billToAddress = req.body?.bill_to_address || null;
    const billToStateCode = req.body?.bill_to_state_code || tax.state_code || null;

    const placeOfWorkName = req.body?.place_of_work_name || null;
    const placeOfWorkAddress = req.body?.place_of_work_address || null;
    const placeOfWorkGstin = req.body?.place_of_work_gstin || null;
    const placeOfWorkStateCode = req.body?.place_of_work_state_code || inferStateCodeFromGstin(placeOfWorkGstin) || null;

    const loiNo = req.body?.loi_no || null;
    const gatePassNo = req.body?.gate_pass_no || null;
    const deliveryNoteNo = req.body?.delivery_note_no || null;
    const deliveryDate = toSqlDate(req.body?.delivery_date);

    const invoiceNo = await generateInvoiceNumber();

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
    const insert = await new sql.Request(tx)
      .input('invoice_no', sql.VarChar(100), invoiceNo)
      .input('invoice_date', sql.Date, invoiceDate)
      .input('invoice_amount', sql.Decimal(18, 2), tax.invoice_amount)
      .input('gst_percent', sql.Decimal(9, 2), gstPercent)
      .input('gst_amount', sql.Decimal(18, 2), gstAmount)
      .input('cgst_percent', sql.Decimal(9, 2), tax.cgst_percent)
      .input('cgst_amount', sql.Decimal(18, 2), tax.cgst_amount)
      .input('igst_percent', sql.Decimal(9, 2), tax.igst_percent)
      .input('igst_amount', sql.Decimal(18, 2), tax.igst_amount)
      .input('total_amount', sql.Decimal(18, 2), totalAmount)
      .input('bill_to_name', sql.NVarChar(200), billToName)
      .input('bill_to_address', sql.NVarChar(sql.MAX), billToAddress)
      .input('bill_to_gstin', sql.NVarChar(50), billToGstin)
      .input('bill_to_state_code', sql.NVarChar(10), billToStateCode)
      .input('place_of_work_name', sql.NVarChar(200), placeOfWorkName)
      .input('place_of_work_address', sql.NVarChar(sql.MAX), placeOfWorkAddress)
      .input('place_of_work_gstin', sql.NVarChar(50), placeOfWorkGstin)
      .input('place_of_work_state_code', sql.NVarChar(10), placeOfWorkStateCode)
      .input('loi_no', sql.NVarChar(100), loiNo)
      .input('gate_pass_no', sql.NVarChar(100), gatePassNo)
      .input('delivery_note_no', sql.NVarChar(100), deliveryNoteNo)
      .input('delivery_date', sql.Date, deliveryDate)
      .input('remarks', sql.Text, remarks)
      .query(`
        INSERT INTO sales_invoices (
          invoice_no, invoice_date,
          invoice_amount, gst_percent, gst_amount,
          cgst_percent, cgst_amount, igst_percent, igst_amount,
          total_amount,
          bill_to_name, bill_to_address, bill_to_gstin, bill_to_state_code,
          place_of_work_name, place_of_work_address, place_of_work_gstin, place_of_work_state_code,
          loi_no, gate_pass_no, delivery_note_no, delivery_date,
          remarks,
          created_at, updated_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @invoice_no, @invoice_date,
          @invoice_amount, @gst_percent, @gst_amount,
          @cgst_percent, @cgst_amount, @igst_percent, @igst_amount,
          @total_amount,
          @bill_to_name, @bill_to_address, @bill_to_gstin, @bill_to_state_code,
          @place_of_work_name, @place_of_work_address, @place_of_work_gstin, @place_of_work_state_code,
          @loi_no, @gate_pass_no, @delivery_note_no, @delivery_date,
          @remarks,
          GETDATE(), GETDATE()
        )
      `);

    const invoice = insert.recordset[0];

    for (const it of normalizedItems) {
      await new sql.Request(tx)
        .input('invoice_id', sql.Int, invoice.id)
        .input('sl_no', sql.Int, it.sl_no)
        .input('description', sql.NVarChar(sql.MAX), it.description)
        .input('quantity', sql.Float, it.quantity)
        .input('unit', sql.NVarChar(50), it.unit)
        .input('sac_code', sql.NVarChar(50), it.sac_code)
        .input('rate', sql.Decimal(18, 2), it.rate)
        .input('amount', sql.Decimal(18, 2), it.amount)
        .query(`
          INSERT INTO sales_invoice_items (invoice_id, sl_no, description, quantity, unit, sac_code, rate, amount, created_at, updated_at)
          VALUES (@invoice_id, @sl_no, @description, @quantity, @unit, @sac_code, @rate, @amount, GETDATE(), GETDATE())
        `);
    }

    for (const jeId of uniqueJobEntryIds) {
      await new sql.Request(tx)
        .input('invoice_id', sql.Int, invoice.id)
        .input('job_entry_id', sql.Int, jeId)
        .query(`
          INSERT INTO sales_invoice_jobs (invoice_id, job_entry_id, created_at)
          VALUES (@invoice_id, @job_entry_id, GETDATE())
        `);

      await new sql.Request(tx)
        .input('id', sql.Int, jeId)
        .query(`UPDATE job_entries SET status = 'DELIVERED', updated_at = GETDATE() WHERE id = @id`);
    }

    // Update work orders status to Delivered for any work orders matching job numbers (best-effort)
    await new sql.Request(tx).query(`
      UPDATE wo
      SET wo.status = 'Delivered', wo.updated_at = GETDATE()
      FROM work_orders wo
      INNER JOIN enquiries e ON e.id = wo.enquiry_id
      INNER JOIN job_entries je ON je.party_name = e.customer_name
      INNER JOIN sales_invoice_jobs sij ON sij.job_entry_id = je.id
      WHERE sij.invoice_id = ${Number(invoice.id)}
    `);

    await tx.commit();
    res.json(invoice);
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error creating sales invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Billing: List Invoices (Payment Received table source)
router.get('/billing/invoices', async (req, res) => {
  try {
    const pool = await getConnection();

    const paymentsTable = await pool.request().query("SELECT OBJECT_ID('dbo.sales_payments', 'U') AS oid");
    const hasPayments = Boolean(paymentsTable.recordset?.[0]?.oid);

    const query = hasPayments
      ? `
        SELECT
          i.*,
          agg.job_numbers,
          COALESCE(i.bill_to_name, agg.party_name_from_jobs) AS party_name,
          COALESCE(p.paid_amount, 0) as paid_amount,
          (i.total_amount - COALESCE(p.paid_amount, 0)) as balance_amount
        FROM sales_invoices i
        OUTER APPLY (
          SELECT
            STRING_AGG(CONVERT(VARCHAR(50), je.job_number), ', ') AS job_numbers,
            MAX(je.party_name) AS party_name_from_jobs
          FROM sales_invoice_jobs sij
          LEFT JOIN job_entries je ON je.id = sij.job_entry_id
          WHERE sij.invoice_id = i.id
        ) agg
        LEFT JOIN (
          SELECT invoice_id, SUM(amount) as paid_amount
          FROM sales_payments
          GROUP BY invoice_id
        ) p ON p.invoice_id = i.id
        ORDER BY i.id DESC
      `
      : `
        SELECT
          i.*,
          agg.job_numbers,
          COALESCE(i.bill_to_name, agg.party_name_from_jobs) AS party_name,
          CAST(0 AS DECIMAL(18,2)) as paid_amount,
          i.total_amount as balance_amount
        FROM sales_invoices i
        OUTER APPLY (
          SELECT
            STRING_AGG(CONVERT(VARCHAR(50), je.job_number), ', ') AS job_numbers,
            MAX(je.party_name) AS party_name_from_jobs
          FROM sales_invoice_jobs sij
          LEFT JOIN job_entries je ON je.id = sij.job_entry_id
          WHERE sij.invoice_id = i.id
        ) agg
        ORDER BY i.id DESC
      `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching sales invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Billing: Get Single Invoice
router.get('/billing/invoices/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid invoice id' });
    }

    const headerRes = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          i.*,
          agg.job_numbers,
          COALESCE(i.bill_to_name, agg.party_name_from_jobs) AS party_name
        FROM sales_invoices i
        OUTER APPLY (
          SELECT
            STRING_AGG(CONVERT(VARCHAR(50), je.job_number), ', ') AS job_numbers,
            MAX(je.party_name) AS party_name_from_jobs
          FROM sales_invoice_jobs sij
          LEFT JOIN job_entries je ON je.id = sij.job_entry_id
          WHERE sij.invoice_id = i.id
        ) agg
        WHERE i.id = @id
      `);

    if (!headerRes.recordset || headerRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const itemsRes = await pool.request()
      .input('invoice_id', sql.Int, id)
      .query('SELECT * FROM sales_invoice_items WHERE invoice_id = @invoice_id ORDER BY ISNULL(sl_no, id) ASC');

    res.json({ ...headerRes.recordset[0], items: itemsRes.recordset || [] });
  } catch (error) {
    console.error('Error fetching sales invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Billing: List Payments for an Invoice
router.get('/billing/invoices/:id/payments', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('invoice_id', sql.Int, req.params.id)
      .query('SELECT * FROM sales_payments WHERE invoice_id = @invoice_id ORDER BY payment_date DESC, id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Billing: Add Payment for an Invoice
router.post('/billing/invoices/:id/payments', async (req, res) => {
  try {
    const pool = await getConnection();
    const { payment_date, amount, payment_mode, reference_no, remarks } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const result = await pool.request()
      .input('invoice_id', sql.Int, req.params.id)
      .input('payment_date', sql.Date, payment_date || new Date())
      .input('amount', sql.Decimal(18, 2), amount)
      .input('payment_mode', sql.VarChar(50), payment_mode || null)
      .input('reference_no', sql.VarChar(100), reference_no || null)
      .input('remarks', sql.Text, remarks || null)
      .query(`
        INSERT INTO sales_payments (invoice_id, payment_date, amount, payment_mode, reference_no, remarks, created_at, updated_at)
        VALUES (@invoice_id, @payment_date, @amount, @payment_mode, @reference_no, @remarks, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() AS id;
      `);
    
    res.status(201).json({ id: result.recordset[0].id, message: 'Payment recorded' });
  } catch (error) {
    console.error('Error adding invoice payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Billing: Get Invoice Summary (Total, Paid, Balance)
router.get('/billing/invoices/summary', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        i.id,
        i.invoice_no,
        i.total_amount,
        COALESCE(p.paid_amount, 0) as paid_amount,
        (i.total_amount - COALESCE(p.paid_amount, 0)) as balance_amount
      FROM sales_invoices i
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as paid_amount
        FROM sales_payments
        GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching invoices summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Billing: Export Invoice PDF
router.get('/billing/invoices/:id/pdf', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid invoice id' });
    }

    const headerRes = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          i.*,
          agg.job_numbers,
          COALESCE(i.bill_to_name, agg.party_name_from_jobs) AS party_name
        FROM sales_invoices i
        OUTER APPLY (
          SELECT
            STRING_AGG(CONVERT(VARCHAR(50), je.job_number), ', ') AS job_numbers,
            MAX(je.party_name) AS party_name_from_jobs
          FROM sales_invoice_jobs sij
          LEFT JOIN job_entries je ON je.id = sij.job_entry_id
          WHERE sij.invoice_id = i.id
        ) agg
        WHERE i.id = @id
      `);

    if (!headerRes.recordset || headerRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const itemsRes = await pool.request()
      .input('invoice_id', sql.Int, id)
      .query('SELECT * FROM sales_invoice_items WHERE invoice_id = @invoice_id ORDER BY ISNULL(sl_no, id) ASC');

    const invoice = { ...headerRes.recordset[0], items: itemsRes.recordset || [] };

    const doc = generateInvoicePDF(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoice_no || id}.pdf"`);
    doc.pipe(res);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

