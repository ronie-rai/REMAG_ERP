import express from 'express';
import sql, { getConnection } from '../config/database.js';
import { requireAuth, requireModuleAccess } from '../utils/auth.js';
import { auditMiddleware } from '../utils/audit.js';

const router = express.Router();

router.use(requireAuth, requireModuleAccess('sales'));
router.use(auditMiddleware('sales'));

// Create Client
router.post('/clients', async (req, res) => {
  try {
    const pool = await getConnection();
    const ratingRaw = req.body.client_rating;
    const rating = ratingRaw === '' || ratingRaw === undefined || ratingRaw === null ? null : Number(ratingRaw);
    const result = await pool.request()
      .input('client_name', sql.VarChar(200), req.body.client_name)
      .input('contact_person', sql.VarChar(200), req.body.contact_person)
      .input('email', sql.VarChar(200), req.body.email)
      .input('phone', sql.VarChar(20), req.body.phone)
      .input('address', sql.Text, req.body.address)
      .input('city', sql.VarChar(100), req.body.city)
      .input('state', sql.VarChar(100), req.body.state)
      .input('pincode', sql.VarChar(10), req.body.pincode)
      .input('gst_number', sql.VarChar(50), req.body.gst_number)
      .input('pan_number', sql.VarChar(20), req.body.pan_number)
      .input('client_rating', sql.Int, Number.isFinite(rating) ? rating : null)
      .query(`INSERT INTO clients (client_name, contact_person, email, phone, address, city, state, pincode, gst_number, pan_number, client_rating, created_at, updated_at)
              OUTPUT INSERTED.*
              VALUES (@client_name, @contact_person, @email, @phone, @address, @city, @state, @pincode, @gst_number, @pan_number, @client_rating, GETDATE(), GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Clients
router.get('/clients', async (req, res) => {
  try {
    const pool = await getConnection();
    const search = req.query.search || '';
    let query = 'SELECT * FROM clients';
    
    if (search) {
      query += ` WHERE client_name LIKE '%${search}%' OR contact_person LIKE '%${search}%' OR email LIKE '%${search}%'`;
    }
    
    query += ' ORDER BY client_name ASC';
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export Clients CSV
router.get('/clients/export-csv', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM clients ORDER BY client_name ASC');

    const cols = [
      'client_name',
      'contact_person',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'pincode',
      'gst_number',
      'pan_number',
      'client_rating',
    ];

    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = cols.join(',');
    const lines = (result.recordset || []).map((row) => cols.map((c) => esc(row[c])).join(','));
    const csv = [header, ...lines].join('\n');

    const filename = `clients_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting clients CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import Clients CSV
router.post('/clients/import-csv', async (req, res) => {
  try {
    const csv = req.body?.csv;
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'csv is required' });
    }

    const parseCSV = (text) => {
      const rows = [];
      let row = [];
      let field = '';
      let inQuotes = false;

      const pushField = () => {
        row.push(field);
        field = '';
      };

      const pushRow = () => {
        // skip fully empty lines
        if (row.length === 1 && String(row[0] || '').trim() === '') {
          row = [];
          return;
        }
        rows.push(row);
        row = [];
      };

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
          if (ch === '"') {
            const next = text[i + 1];
            if (next === '"') {
              field += '"';
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            field += ch;
          }
          continue;
        }

        if (ch === '"') {
          inQuotes = true;
          continue;
        }
        if (ch === ',') {
          pushField();
          continue;
        }
        if (ch === '\n') {
          pushField();
          pushRow();
          continue;
        }
        if (ch === '\r') {
          continue;
        }
        field += ch;
      }

      pushField();
      if (row.length > 0) pushRow();
      return rows;
    };

    const rows = parseCSV(csv);
    if (rows.length < 2) {
      return res.status(400).json({ error: 'CSV must include a header row and at least one data row' });
    }

    const header = rows[0].map((h) => String(h || '').trim());
    const idx = (name) => header.findIndex((h) => h.toLowerCase() === String(name).toLowerCase());

    const pool = await getConnection();
    let inserted = 0;
    let skipped = 0;

    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r];
      const get = (name) => {
        const i = idx(name);
        if (i < 0) return null;
        const v = cols[i];
        const s = v === null || v === undefined ? '' : String(v).trim();
        return s === '' ? null : s;
      };

      const client_name = get('client_name') || get('Client Name');
      if (!client_name) {
        skipped++;
        continue;
      }

      const ratingRaw = get('client_rating');
      const ratingNum = ratingRaw === null ? null : Number(ratingRaw);

      await pool.request()
        .input('client_name', sql.VarChar(200), client_name)
        .input('contact_person', sql.VarChar(200), get('contact_person'))
        .input('email', sql.VarChar(200), get('email'))
        .input('phone', sql.VarChar(20), get('phone'))
        .input('address', sql.Text, get('address'))
        .input('city', sql.VarChar(100), get('city'))
        .input('state', sql.VarChar(100), get('state'))
        .input('pincode', sql.VarChar(10), get('pincode'))
        .input('gst_number', sql.VarChar(50), get('gst_number'))
        .input('pan_number', sql.VarChar(20), get('pan_number'))
        .input('client_rating', sql.Int, Number.isFinite(ratingNum) ? ratingNum : null)
        .query(`INSERT INTO clients (client_name, contact_person, email, phone, address, city, state, pincode, gst_number, pan_number, client_rating, created_at, updated_at)
                VALUES (@client_name, @contact_person, @email, @phone, @address, @city, @state, @pincode, @gst_number, @pan_number, @client_rating, GETDATE(), GETDATE())`);

      inserted++;
    }

    res.json({ success: true, inserted, skipped, total: rows.length - 1 });
  } catch (error) {
    console.error('Error importing clients CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Client
router.get('/clients/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM clients WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Client
router.put('/clients/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const fields = Object.keys(req.body).filter(f => f !== 'id').map(key => `${key} = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);
    
    Object.keys(req.body).filter(f => f !== 'id').forEach(key => {
      const value = req.body[key];

      if (key === 'client_rating') {
        const ratingRaw = value;
        const rating = ratingRaw === '' || ratingRaw === undefined || ratingRaw === null ? null : Number(ratingRaw);
        request.input('client_rating', sql.Int, Number.isFinite(rating) ? rating : null);
        return;
      }

      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });
    
    const result = await request.query(`
      UPDATE clients SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Client
router.delete('/clients/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM clients OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

