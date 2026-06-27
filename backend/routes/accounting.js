import express from 'express';
import sql, { getConnection } from '../config/database.js';
import { generateBillNumber } from '../utils/numberGenerator.js';
import { requireAuth, requireModuleAccess } from '../utils/auth.js';
import { auditMiddleware } from '../utils/audit.js';

const router = express.Router();

router.use(requireAuth, requireModuleAccess('accounting'));
router.use(auditMiddleware('accounting'));

// Create Bill
router.post('/bills', async (req, res) => {
  try {
    const pool = await getConnection();
    const billNumber = await generateBillNumber();
    
    const result = await pool.request()
      .input('po_id', sql.Int, req.body.po_id || null)
      .input('job_sheet_id', sql.Int, req.body.job_sheet_id || null)
      .input('reference_type', sql.VarChar(50), req.body.reference_type || null)
      .input('reference_id', sql.Int, req.body.reference_id || null)
      .input('bill_stage', sql.VarChar(20), req.body.bill_stage || null)
      .input('bill_number', sql.VarChar(100), billNumber)
      .input('bill_date', sql.Date, req.body.bill_date)
      .input('bill_value', sql.Decimal(18, 2), req.body.bill_value)
      .input('advance_payment', sql.Decimal(18, 2), req.body.advance_payment || 0)
      .input('payable_value', sql.Decimal(18, 2), req.body.payable_value)
      .input('eway_bill_number', sql.VarChar(100), req.body.eway_bill_number)
      .query(`INSERT INTO bills (po_id, job_sheet_id, reference_type, reference_id, bill_stage, bill_number, bill_date, bill_value, advance_payment, payable_value, eway_bill_number, status, created_at)
              OUTPUT INSERTED.*
              VALUES (@po_id, @job_sheet_id, @reference_type, @reference_id, @bill_stage, @bill_number, @bill_date, @bill_value, @advance_payment, @payable_value, @eway_bill_number, 'Pending', GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Bills
router.get('/bills', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        b.*,
        po.po_number,
        ISNULL(p.total_paid, 0) AS total_paid,
        (ISNULL(b.payable_value, 0) - ISNULL(p.total_paid, 0)) AS current_due
      FROM bills b
      LEFT JOIN purchase_orders po ON po.id = b.po_id
      LEFT JOIN (
        SELECT bill_id, SUM(payment_amount) AS total_paid
        FROM payments
        GROUP BY bill_id
      ) p ON p.bill_id = b.id
      ORDER BY b.id DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Bill
router.get('/bills/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT
          b.*,
          po.po_number
        FROM bills b
        LEFT JOIN purchase_orders po ON po.id = b.po_id
        WHERE b.id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Bill
router.put('/bills/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const fields = Object.keys(req.body).filter(f => f !== 'id').map(key => `${key} = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);
    
    Object.keys(req.body).filter(f => f !== 'id').forEach(key => {
      const value = req.body[key];
      if (key.includes('date')) {
        request.input(key, sql.Date, value);
      } else if (key.includes('value') || key.includes('payment') || key.includes('amount')) {
        request.input(key, sql.Decimal(18, 2), value);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });
    
    const result = await request.query(`
      UPDATE bills SET ${fields}
      OUTPUT INSERTED.*
      WHERE id = @id
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Payment
router.post('/payments', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('bill_id', sql.Int, req.body.bill_id)
      .input('payment_type', sql.VarChar(50), req.body.payment_type)
      .input('payment_amount', sql.Decimal(18, 2), req.body.payment_amount)
      .input('payment_date', sql.Date, req.body.payment_date)
      .input('payment_mode', sql.VarChar(50), req.body.payment_mode)
      .input('reference_number', sql.VarChar(100), req.body.reference_number)
      .input('remarks', sql.Text, req.body.remarks)
      .query(`INSERT INTO payments (bill_id, payment_type, payment_amount, payment_date, payment_mode, reference_number, remarks, created_at, updated_at)
              OUTPUT INSERTED.*
              VALUES (@bill_id, @payment_type, @payment_amount, @payment_date, @payment_mode, @reference_number, @remarks, GETDATE(), GETDATE())`);
    
    // Calculate total payments and update bill status
    const payments = await pool.request()
      .input('bill_id', sql.Int, req.body.bill_id)
      .query('SELECT SUM(payment_amount) as total FROM payments WHERE bill_id = @bill_id');
    
    const bill = await pool.request()
      .input('bill_id', sql.Int, req.body.bill_id)
      .query('SELECT bill_value, advance_payment FROM bills WHERE id = @bill_id');
    
    if (bill.recordset.length > 0) {
      const totalPayments = Number(payments.recordset[0].total) || 0;
      const advance = Number(bill.recordset[0].advance_payment) || 0;
      const billValue = Number(bill.recordset[0].bill_value) || 0;
      const totalPaid = totalPayments + advance;

      if (billValue > 0 && totalPaid >= billValue) {
        await pool.request()
          .input('bill_id', sql.Int, req.body.bill_id)
          .query('UPDATE bills SET status = \'Paid\', updated_at = GETDATE() WHERE id = @bill_id');
      } else if (totalPaid > 0) {
        await pool.request()
          .input('bill_id', sql.Int, req.body.bill_id)
          .query('UPDATE bills SET status = \'Partially Paid\', updated_at = GETDATE() WHERE id = @bill_id');
      } else {
        await pool.request()
          .input('bill_id', sql.Int, req.body.bill_id)
          .query('UPDATE bills SET status = \'Pending\', updated_at = GETDATE() WHERE id = @bill_id');
      }
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Payment
router.put('/payments/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const fields = Object.keys(req.body).filter(f => f !== 'id').map(key => `${key} = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);

    Object.keys(req.body).filter(f => f !== 'id').forEach(key => {
      const value = req.body[key];
      if (key.includes('date')) {
        request.input(key, sql.Date, value);
      } else if (key.includes('amount')) {
        request.input(key, sql.Decimal(18, 2), value);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });

    const result = await request.query(`
      UPDATE payments SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = result.recordset[0];

    const payments = await pool.request()
      .input('bill_id', sql.Int, payment.bill_id)
      .query('SELECT SUM(payment_amount) as total FROM payments WHERE bill_id = @bill_id');

    const bill = await pool.request()
      .input('bill_id', sql.Int, payment.bill_id)
      .query('SELECT bill_value, advance_payment FROM bills WHERE id = @bill_id');

    if (bill.recordset.length > 0) {
      const totalPayments = Number(payments.recordset[0].total) || 0;
      const advance = Number(bill.recordset[0].advance_payment) || 0;
      const billValue = Number(bill.recordset[0].bill_value) || 0;
      const totalPaid = totalPayments + advance;

      if (billValue > 0 && totalPaid >= billValue) {
        await pool.request()
          .input('bill_id', sql.Int, payment.bill_id)
          .query('UPDATE bills SET status = \'Paid\', updated_at = GETDATE() WHERE id = @bill_id');
      } else if (totalPaid > 0) {
        await pool.request()
          .input('bill_id', sql.Int, payment.bill_id)
          .query('UPDATE bills SET status = \'Partially Paid\', updated_at = GETDATE() WHERE id = @bill_id');
      } else {
        await pool.request()
          .input('bill_id', sql.Int, payment.bill_id)
          .query('UPDATE bills SET status = \'Pending\', updated_at = GETDATE() WHERE id = @bill_id');
      }
    }

    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Payments
router.get('/payments', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        p.*, b.bill_number
      FROM payments p
      LEFT JOIN bills b ON b.id = p.bill_id
      ORDER BY p.id DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Payments for Bill
router.get('/payments/bill/:bill_id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('bill_id', sql.Int, req.params.bill_id)
      .query(`
        SELECT
          p.*, b.bill_number
        FROM payments p
        LEFT JOIN bills b ON b.id = p.bill_id
        WHERE p.bill_id = @bill_id
        ORDER BY p.id DESC
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Security Deposit
router.post('/security-deposits', async (req, res) => {
  try {
    const pool = await getConnection();
    const sdDate = new Date(req.body.sd_date);
    const guaranteeMonths = req.body.guarantee_period_months || 12;
    const releaseDate = new Date(sdDate);
    releaseDate.setMonth(releaseDate.getMonth() + guaranteeMonths);
    
    const result = await pool.request()
      .input('job_sheet_id', sql.Int, req.body.job_sheet_id)
      .input('sd_amount', sql.Decimal(18, 2), req.body.sd_amount)
      .input('sd_date', sql.Date, req.body.sd_date)
      .input('guarantee_period_months', sql.Int, guaranteeMonths)
      .input('release_date', sql.Date, releaseDate)
      .query(`INSERT INTO security_deposits (job_sheet_id, sd_amount, sd_date, guarantee_period_months, release_date, status, created_at)
              OUTPUT INSERTED.*
              VALUES (@job_sheet_id, @sd_amount, @sd_date, @guarantee_period_months, @release_date, 'Held', GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating security deposit:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Security Deposits
router.get('/security-deposits', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM security_deposits ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching security deposits:', error);
    res.status(500).json({ error: error.message });
  }
});

// Release Security Deposit
router.put('/security-deposits/:id/release', async (req, res) => {
  try {
    const pool = await getConnection();
    const sd = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM security_deposits WHERE id = @id');
    
    if (sd.recordset.length === 0) {
      return res.status(404).json({ error: 'Security deposit not found' });
    }
    
    const releaseDate = new Date(sd.recordset[0].release_date);
    const today = new Date();
    
    if (today < releaseDate) {
      return res.status(400).json({ 
        error: `Security deposit cannot be released before ${releaseDate.toISOString().split('T')[0]}` 
      });
    }
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE security_deposits SET status = 'Released'
              OUTPUT INSERTED.*
              WHERE id = @id`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error releasing security deposit:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

