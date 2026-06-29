import express from 'express';
import sql, { getConnection } from '../config/database.js';
import { requireAuth, requireModuleAccess } from '../utils/auth.js';
import { auditMiddleware } from '../utils/audit.js';

const router = express.Router();

router.use(requireAuth, requireModuleAccess('production'));
router.use(auditMiddleware('production'));

// Get Max Job Number
const getMaxJobNumber = async () => {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT MAX(max_job) AS max_job
    FROM (
      SELECT MAX(
        NULLIF(REGEXP_REPLACE(job_number::TEXT, '[^0-9]', '', 'g'), '')::INT
      ) AS max_job
      FROM job_entries
      UNION ALL
      SELECT MAX(
        NULLIF(REGEXP_REPLACE(job_number::TEXT, '[^0-9]', '', 'g'), '')::INT
      ) AS max_job
      FROM job_sheets
    ) t
  `);
  
  let maxJob = 0;
  result.recordset.forEach(row => {
    if (row.max_job && row.max_job > maxJob) {
      maxJob = row.max_job;
    }
  });
  
  return maxJob + 1;
};


// Get Next Job Number
router.get('/job-entries/next-job-number', async (req, res) => {
  try {
    const nextJobNumber = await getMaxJobNumber();
    res.json({ next_job_number: nextJobNumber, nextJobNumber });
  } catch (error) {
    console.error('Error fetching next job number:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Job Entry
router.post('/job-entries', async (req, res) => {
  try {
    const pool = await getConnection();
    const jobNumber = await getMaxJobNumber();
    const workOrderIdRaw = req.body?.work_order_id;
    const workOrderId = workOrderIdRaw === null || workOrderIdRaw === undefined || workOrderIdRaw === '' ? null : Number(workOrderIdRaw);
    if (workOrderId !== null && !Number.isFinite(workOrderId)) {
      return res.status(400).json({ error: 'work_order_id must be a valid number' });
    }
    
    const result = await pool.request()
      .input('job_number', sql.Int, jobNumber)
      .input('client_id', sql.Int, req.body.client_id || null)
      .input('work_order_id', sql.Int, workOrderId)
      .input('party_name', sql.VarChar(200), req.body.party_name)
      .input('department', sql.VarChar(100), req.body.department)
      .input('job_description', sql.Text, req.body.job_description)
      .input('gatepass_number', sql.VarChar(100), req.body.gatepass_number)
      .input('scope_of_work', sql.VarChar(100), req.body.scope_of_work)
      .input('machining', sql.Text, req.body.machining)
      .input('job_type', sql.VarChar(50), req.body.job_type)
      .input('spares_received', sql.Text, req.body.spares_received)
      .input('status', sql.VarChar(50), req.body.status || 'DISMANTLE')
      .input('status_remarks', sql.NVarChar(500), req.body.status_remarks || null)
      .query(`INSERT INTO job_entries (job_number, client_id, work_order_id, party_name, department, job_description, 
              gatepass_number, scope_of_work, machining, job_type, spares_received, status, status_remarks, timestamp, created_at, updated_at)
              OUTPUT INSERTED.*
              VALUES (@job_number, @client_id, @work_order_id, @party_name, @department, @job_description, 
              @gatepass_number, @scope_of_work, @machining, @job_type, @spares_received, @status, @status_remarks, GETDATE(), GETDATE(), GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating job entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Job Entry Status Remarks
router.put('/job-entries/:id/status-remarks', async (req, res) => {
  try {
    const pool = await getConnection();
    const remarksRaw = req.body?.status_remarks;
    const statusRemarks = remarksRaw === null || remarksRaw === undefined || remarksRaw === '' ? null : String(remarksRaw);

    if (statusRemarks !== null && statusRemarks.length > 500) {
      return res.status(400).json({ error: 'status_remarks must be <= 500 characters' });
    }

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status_remarks', sql.NVarChar(500), statusRemarks)
      .query(`UPDATE job_entries
              SET status_remarks = @status_remarks, updated_at = GETDATE()
              OUTPUT INSERTED.*
              WHERE id = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job entry not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating job entry status remarks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Job Entry
router.put('/job-entries/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const readonlyFields = new Set([
      'id',
      'client_name',
      'created_at',
      'updated_at',
      'timestamp',
    ]);
    const updatableKeys = Object.keys(req.body).filter((f) => !readonlyFields.has(f));
    const fields = updatableKeys.map((key) => `${key} = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);

    updatableKeys.forEach((key) => {
      const value = req.body[key];

      if (value === null || value === undefined || value === '') {
        if (key === 'work_order_id' || key === 'client_id') {
          request.input(key, sql.Int, null);
        } else {
          request.input(key, sql.NVarChar, null);
        }
        return;
      }

      if (key === 'work_order_id' || key === 'client_id') {
        const n = Number(value);
        request.input(key, sql.Int, Number.isFinite(n) ? n : null);
        return;
      }

      if (typeof value === 'number') {
        request.input(key, sql.Int, value);
      } else if (typeof value === 'boolean') {
        request.input(key, sql.Bit, value);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });

    if (!fields) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    const result = await request.query(`
      UPDATE job_entries SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job entry not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating job entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Job Entry
router.delete('/job-entries/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM job_entries OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job entry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting job entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Job Entries
router.get('/job-entries', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT je.*, c.client_name 
      FROM job_entries je
      LEFT JOIN clients c ON je.client_id = c.id
      ORDER BY je.job_number DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching job entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Job Entry
router.get('/job-entries/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT je.*, c.client_name 
        FROM job_entries je
        LEFT JOIN clients c ON je.client_id = c.id
        WHERE je.id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job entry not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching job entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Job Entry by Job Number
router.get('/job-entries/job-number/:job_number', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('job_number', sql.Int, req.params.job_number)
      .query(`
        SELECT je.*, c.client_name 
        FROM job_entries je
        LEFT JOIN clients c ON je.client_id = c.id
        WHERE je.job_number = @job_number
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job entry not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching job entry by job number:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Job Entry Status (with special handling for status changes)
router.put('/job-entries/:id/status', async (req, res) => {
  try {
    const pool = await getConnection();
    const { status, scrapWeight, scrapType, confirmed } = req.body;
    
    const validStatuses = [
      'DISMANTLE',
      'CLEAN',
      'CHECK LIST',
      'DATA SHEET',
      'RAW MATERIAL PURCHASE',
      'RAW MATERIAL RECEIVED',
      'CORE/SLOT CLEANING',
      'COIL PRODUCTION',
      'MACHINING',
      'SAMPLE COIL TEST',
      'IN HOUSE INSPECTION',
      'ASSEMBLY',
      'IN HOUSE RUN TEST',
      'FINAL RUN TEST WITH CLIENT',
      'PAINT',
      'READY TO DISPATCH',
      'DISPATCH',
      'DELIVERED',
      'HOLD',
      'WARRENTY CLAIM',
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Gate: for certain statuses, do NOT update immediately. Frontend will open a form,
    // and only after successful save it should call this endpoint again.
    if (status === 'RAW MATERIAL PURCHASE' && confirmed !== true) {
      const jeRes = await pool.request()
        .input('id', sql.Int, req.params.id)
        .query('SELECT TOP 1 * FROM job_entries WHERE id = @id');
      if (!jeRes.recordset || jeRes.recordset.length === 0) {
        return res.status(404).json({ error: 'Job entry not found' });
      }
      return res.json({
        ...jeRes.recordset[0],
        requiresIndent: true,
        message: 'Please create indent for this job'
      });
    }

    if (status === 'MACHINING' && confirmed !== true) {
      const jeRes = await pool.request()
        .input('id', sql.Int, req.params.id)
        .query('SELECT TOP 1 * FROM job_entries WHERE id = @id');
      if (!jeRes.recordset || jeRes.recordset.length === 0) {
        return res.status(404).json({ error: 'Job entry not found' });
      }
      return res.json({
        ...jeRes.recordset[0],
        requiresMachining: true,
        message: 'Please create machining entry for this job'
      });
    }
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.VarChar(50), status)
      .query(`UPDATE job_entries SET status = @status, updated_at = GETDATE()
              OUTPUT INSERTED.*
              WHERE id = @id`);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job entry not found' });
    }
    
    // Special flows aligned with new status names
    if (status === 'CHECK LIST') {
      return res.json({
        ...result.recordset[0],
        requiresChecklist: true,
        message: 'Please create checklist for this job'
      });
    }

    if (status === 'DATA SHEET') {
      return res.json({
        ...result.recordset[0],
        requiresDataSheet: true,
        message: 'Please create data sheet for this job'
      });
    }

    if (status === 'IN HOUSE RUN TEST' || status === 'FINAL RUN TEST WITH CLIENT') {
      return res.json({
        ...result.recordset[0],
        requiresTestReport: true,
        message: 'Please create test report for this job'
      });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating job entry status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Job Entry Status History (from audit logs)
router.get('/job-entries/:id/status-history', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const result = await pool.request()
      .input('entity_id', sql.Int, id)
      .query(`
        SELECT
          created_at,
          username,
          (details_json::json->'body'->>'status') AS status,
          (details_json::json->'body'->>'status_remarks') AS status_remarks
        FROM audit_logs
        WHERE module = 'production'
          AND entity_id = @entity_id
          AND (
            path LIKE '%/job-entries/' || @entity_id::text || '/status%'
            OR path LIKE '%/job-entries/' || @entity_id::text || '/status-remarks%'
          )
          AND (method = 'PUT' OR method = 'PATCH')
          AND (
            (details_json::json->'body'->>'status') IS NOT NULL
            OR (details_json::json->'body'->>'status_remarks') IS NOT NULL
          )
        ORDER BY created_at DESC
      `);

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Error fetching job entry status history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Scrap Record for Job Entry
router.post('/job-entries/:id/scrap', async (req, res) => {
  try {
    const pool = await getConnection();
    const { weight_kg, scrap_type } = req.body;
    
    const result = await pool.request()
      .input('job_entry_id', sql.Int, req.params.id)
      .input('weight_kg', sql.Float, weight_kg)
      .input('scrap_type', sql.VarChar(50), scrap_type) // Copper or Aluminium
      .input('weighing_date', sql.Date, req.body.weighing_date || new Date())
      .input('photo_path', sql.VarChar(500), req.body.photo_path)
      .query(`INSERT INTO scrap_records (job_entry_id, weight_kg, scrap_type, weighing_date, photo_path, created_at)
              OUTPUT INSERTED.*
              VALUES (@job_entry_id, @weight_kg, @scrap_type, @weighing_date, @photo_path, GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating scrap record:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

