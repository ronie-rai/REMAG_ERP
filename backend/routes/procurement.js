import express from 'express';
import sql, { getConnection } from '../config/database.js';
import { generateIndentNumber, generatePONumber, generateGRNNumber, calculateConductorQuantity, generateBillNumber } from '../utils/numberGenerator.js';
import { requireAuth, requireModuleAccess, requireRole } from '../utils/auth.js';
import { generatePurchaseOrderPDF } from '../utils/pdfGenerator.js';
import { auditMiddleware } from '../utils/audit.js';

const router = express.Router();

router.use(requireAuth, requireModuleAccess('procurement'));
router.use(auditMiddleware('procurement'));

// Create Indent
router.post('/indents', async (req, res) => {
  try {
    const pool = await getConnection();
    const indentNumber = await generateIndentNumber();
    
    const indentResult = await pool.request()
      .input('indent_number', sql.VarChar(50), indentNumber)
      .input('indent_date', sql.Date, req.body.indent_date || null)
      .input('job_sheet_id', sql.Int, req.body.job_sheet_id || null)
      .input('job_number', sql.Int, req.body.job_number || null)
      .input('indent_type', sql.VarChar(50), req.body.indent_type)
      .query(`INSERT INTO indents (indent_number, indent_date, job_sheet_id, job_number, indent_type, status, created_at)
              OUTPUT INSERTED.*
              VALUES (@indent_number, ISNULL(@indent_date, CAST(GETDATE() AS DATE)), @job_sheet_id, @job_number, @indent_type, 'Raised', GETDATE())`);
    
    // Add items
    if (req.body.items && req.body.items.length > 0) {
      for (const item of req.body.items) {
        const skuIdRaw = item.sku_id;
        const skuId = skuIdRaw === '' || skuIdRaw === undefined || skuIdRaw === null ? null : Number(skuIdRaw);

        const request = pool.request()
          .input('indent_id', sql.Int, indentResult.recordset[0].id)
          .input('sku_id', sql.Int, Number.isFinite(skuId) ? skuId : null)
          .input('quantity', sql.Float, item.quantity)
          .input('remarks', sql.Text, item.remarks)
          .input('item_name', sql.VarChar(200), item.item_name)
          .input('item_description', sql.Text, item.item_description)
          .input('unit', sql.VarChar(50), item.unit)
          .input('conductor_type', sql.VarChar(100), item.conductor_type)
          .input('conductor_size', sql.VarChar(100), item.conductor_size);

        await request.query(`
          INSERT INTO indent_items (
            indent_id, sku_id, item_name, item_description, quantity, unit,
            conductor_type, conductor_size, remarks, created_at
          )
          VALUES (
            @indent_id, @sku_id, @item_name, @item_description, @quantity, @unit,
            @conductor_type, @conductor_size, @remarks, GETDATE()
          )
        `);
      }
    }
    
    // Fetch complete indent with items
    const completeIndent = await pool.request()
      .input('id', sql.Int, indentResult.recordset[0].id)
      .query(`SELECT i.*, 
              COALESCE((SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM indent_items WHERE indent_id = i.id) t), '[]'::json) as items
              FROM indents i WHERE i.id = @id`);
    
    res.json(indentResult.recordset[0]);
  } catch (error) {
    console.error('Error creating indent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Purchase Order (block if GRN exists)
router.put('/purchase-orders/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid purchase order id' });

    const grnCheck = await pool.request().input('po_id', sql.Int, id).query('SELECT TOP 1 id FROM grns WHERE po_id = @po_id');
    if ((grnCheck.recordset || []).length > 0) {
      return res.status(400).json({ error: 'Cannot edit PO because GRN already exists for this PO' });
    }

    const existingRes = await pool.request().input('id', sql.Int, id).query('SELECT * FROM purchase_orders WHERE id = @id');
    if (!existingRes.recordset || existingRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // Ensure schema columns exist for validation
    await pool.request().query(`
      IF OBJECT_ID('dbo.purchase_order_items', 'U') IS NOT NULL
      BEGIN
        IF COL_LENGTH('dbo.purchase_order_items', 'sku_id') IS NULL
        BEGIN
          ALTER TABLE purchase_order_items ADD sku_id INT NULL;
        END
        IF COL_LENGTH('dbo.purchase_order_items', 'indent_id') IS NULL
        BEGIN
          ALTER TABLE purchase_order_items ADD indent_id INT NULL;
        END
      END
    `);

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const normalizedItems = items
      .map((it) => ({
        item_name: (it?.item_name || '').toString().slice(0, 200),
        quantity: Number(it?.quantity),
        unit_price: Number(it?.unit_price),
        sku_id: it?.sku_id === '' || it?.sku_id === undefined || it?.sku_id === null ? null : Number(it?.sku_id),
        indent_id: it?.indent_id === '' || it?.indent_id === undefined || it?.indent_id === null ? null : Number(it?.indent_id),
      }))
      .filter((it) => it.item_name && Number.isFinite(it.quantity) && it.quantity > 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ error: 'No valid items provided' });
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      // Validate indent caps for items having indent_id+sku_id
      const capItems = normalizedItems.filter((it) => Number.isFinite(it.indent_id) && Number.isFinite(it.sku_id));
      if (capItems.length > 0) {
        const uniquePairs = new Map();
        for (const it of capItems) {
          const key = `${it.indent_id}::${it.sku_id}`;
          uniquePairs.set(key, { indent_id: it.indent_id, sku_id: it.sku_id });
        }

        for (const pair of uniquePairs.values()) {
          const reqSum = capItems
            .filter((x) => x.indent_id === pair.indent_id && x.sku_id === pair.sku_id)
            .reduce((s, x) => s + (Number(x.quantity) || 0), 0);

          const indentQtyRes = await new sql.Request(tx)
            .input('indent_id', sql.Int, pair.indent_id)
            .input('sku_id', sql.Int, pair.sku_id)
            .query(`
              SELECT SUM(ISNULL(quantity, 0)) AS indent_qty
              FROM indent_items
              WHERE indent_id = @indent_id AND sku_id = @sku_id
            `);
          const indentQty = Number(indentQtyRes.recordset?.[0]?.indent_qty) || 0;

          const otherOrderedRes = await new sql.Request(tx)
            .input('indent_id', sql.Int, pair.indent_id)
            .input('sku_id', sql.Int, pair.sku_id)
            .input('po_id', sql.Int, id)
            .query(`
              SELECT SUM(ISNULL(quantity, 0)) AS ordered_qty
              FROM purchase_order_items
              WHERE indent_id = @indent_id AND sku_id = @sku_id AND po_id <> @po_id
            `);
          const alreadyOrdered = Number(otherOrderedRes.recordset?.[0]?.ordered_qty) || 0;

          if (alreadyOrdered + reqSum > indentQty) {
            throw new Error(
              `PO qty exceeds indent qty for indent ${pair.indent_id}, sku ${pair.sku_id}. Remaining: ${Math.max(0, indentQty - alreadyOrdered)}`
            );
          }
        }
      }

      // Update header
      const vendorIdRaw = req.body.vendor_id;
      const vendorId = vendorIdRaw === '' || vendorIdRaw === undefined || vendorIdRaw === null ? null : Number(vendorIdRaw);
      if (!Number.isFinite(vendorId) || vendorId === null) {
        throw new Error('vendor_id is required');
      }

      const poDate = req.body.po_date ? new Date(req.body.po_date) : new Date();
      const leadTimeDays = Number(req.body.lead_time_days) || 0;
      const expectedDelivery = new Date(poDate);
      expectedDelivery.setDate(expectedDelivery.getDate() + leadTimeDays);

      const advancePayment = Number(req.body.advance_payment) || 0;
      const poValue = normalizedItems.reduce((sum, it) => {
        const up = Number.isFinite(it.unit_price) ? it.unit_price : 0;
        return sum + (Number(it.quantity) || 0) * up;
      }, 0);

      const poUpdRes = await new sql.Request(tx)
        .input('id', sql.Int, id)
        .input('vendor_id', sql.Int, vendorId)
        .input('po_date', sql.Date, poDate)
        .input('po_value', sql.Decimal(18, 2), poValue)
        .input('advance_payment', sql.Decimal(18, 2), advancePayment)
        .input('lead_time_days', sql.Int, leadTimeDays)
        .input('expected_delivery_date', sql.Date, expectedDelivery)
        .query(`
          UPDATE purchase_orders
          SET vendor_id=@vendor_id,
              po_date=@po_date,
              po_value=@po_value,
              advance_payment=@advance_payment,
              lead_time_days=@lead_time_days,
              expected_delivery_date=@expected_delivery_date
          OUTPUT INSERTED.*
          WHERE id=@id
        `);

      // Replace items
      await new sql.Request(tx).input('po_id', sql.Int, id).query('DELETE FROM purchase_order_items WHERE po_id=@po_id');
      for (const it of normalizedItems) {
        const unitPrice = Number.isFinite(it.unit_price) ? it.unit_price : 0;
        const totalValue = (Number(it.quantity) || 0) * unitPrice;
        await new sql.Request(tx)
          .input('po_id', sql.Int, id)
          .input('item_name', sql.VarChar(200), it.item_name)
          .input('quantity', sql.Float, it.quantity)
          .input('unit_price', sql.Decimal(18, 2), unitPrice)
          .input('total_value', sql.Decimal(18, 2), totalValue)
          .input('sku_id', sql.Int, Number.isFinite(it.sku_id) ? it.sku_id : null)
          .input('indent_id', sql.Int, Number.isFinite(it.indent_id) ? it.indent_id : null)
          .query(`
            INSERT INTO purchase_order_items (po_id, item_name, quantity, unit_price, total_value, sku_id, indent_id)
            VALUES (@po_id, @item_name, @quantity, @unit_price, @total_value, @sku_id, @indent_id)
          `);
      }

      // Update bill linked to this PO (if any)
      const billRes = await new sql.Request(tx)
        .input('po_id', sql.Int, id)
        .query('SELECT TOP 1 * FROM bills WHERE po_id = @po_id ORDER BY id DESC');

      if (billRes.recordset && billRes.recordset.length > 0) {
        const bill = billRes.recordset[0];
        const totalPaidRes = await new sql.Request(tx)
          .input('bill_id', sql.Int, bill.id)
          .query('SELECT SUM(ISNULL(payment_amount,0)) AS total_paid FROM payments WHERE bill_id = @bill_id');
        const totalPaid = Number(totalPaidRes.recordset?.[0]?.total_paid) || 0;

        const billValue = Number(poValue) || 0;
        const advance = Number(advancePayment) || 0;
        const payable = Math.max(0, billValue - advance);
        let status = 'Pending';
        if (totalPaid >= payable && payable >= 0) status = 'Paid';
        else if (totalPaid > 0 || advance > 0) status = 'Partially Paid';

        await new sql.Request(tx)
          .input('id', sql.Int, bill.id)
          .input('bill_date', sql.Date, poDate)
          .input('bill_value', sql.Decimal(18, 2), billValue)
          .input('advance_payment', sql.Decimal(18, 2), advance)
          .input('payable_value', sql.Decimal(18, 2), payable)
          .input('status', sql.VarChar(50), status)
          .query(`
            UPDATE bills
            SET bill_date=@bill_date,
                bill_value=@bill_value,
                advance_payment=@advance_payment,
                payable_value=@payable_value,
                status=@status,
                updated_at=GETDATE()
            WHERE id=@id
          `);
      }

      // Recompute indent statuses for any indent_id affected
      const indentIdsRes = await new sql.Request(tx).input('po_id', sql.Int, id).query(`
        SELECT DISTINCT indent_id FROM purchase_order_items WHERE po_id = @po_id AND indent_id IS NOT NULL
      `);
      const indentIds = (indentIdsRes.recordset || [])
        .map((r) => Number(r.indent_id))
        .filter((v) => Number.isFinite(v));

      for (const indentId of indentIds) {
        const checkRes = await new sql.Request(tx).input('indent_id', sql.Int, indentId).query(`
          WITH indent_qty AS (
            SELECT sku_id, SUM(ISNULL(quantity, 0)) AS indent_qty
            FROM indent_items
            WHERE indent_id = @indent_id AND sku_id IS NOT NULL
            GROUP BY sku_id
          ), ordered_qty AS (
            SELECT sku_id, SUM(ISNULL(quantity, 0)) AS ordered_qty
            FROM purchase_order_items
            WHERE indent_id = @indent_id AND sku_id IS NOT NULL
            GROUP BY sku_id
          )
          SELECT SUM(CASE WHEN (ISNULL(iq.indent_qty,0) - ISNULL(oq.ordered_qty,0)) > 0 THEN 1 ELSE 0 END) AS remaining_sku_count
          FROM indent_qty iq
          LEFT JOIN ordered_qty oq ON oq.sku_id = iq.sku_id
        `);

        const remainingSkuCount = Number(checkRes.recordset?.[0]?.remaining_sku_count) || 0;
        const nextStatus = remainingSkuCount === 0 ? 'Converted' : 'Approved';
        await new sql.Request(tx)
          .input('indent_id', sql.Int, indentId)
          .input('status', sql.VarChar(50), nextStatus)
          .query('UPDATE indents SET status = @status WHERE id = @indent_id');
      }

      await tx.commit();
      res.json(poUpdRes.recordset?.[0] || { success: true });
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Purchase Order
router.delete('/purchase-orders/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid purchase order id' });

    // Block delete if GRN exists
    const grnCheck = await pool.request().input('po_id', sql.Int, id).query('SELECT TOP 1 id FROM grns WHERE po_id = @po_id');
    if ((grnCheck.recordset || []).length > 0) {
      return res.status(400).json({ error: 'Cannot delete PO because GRN already exists for this PO' });
    }

    // Ensure schema columns exist (used for indent status recompute)
    await pool.request().query(`
      IF OBJECT_ID('dbo.purchase_order_items', 'U') IS NOT NULL
      BEGIN
        IF COL_LENGTH('dbo.purchase_order_items', 'sku_id') IS NULL
        BEGIN
          ALTER TABLE purchase_order_items ADD sku_id INT NULL;
        END
        IF COL_LENGTH('dbo.purchase_order_items', 'indent_id') IS NULL
        BEGIN
          ALTER TABLE purchase_order_items ADD indent_id INT NULL;
        END
      END
    `);

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const indentIdsRes = await new sql.Request(tx).input('po_id', sql.Int, id).query(`
        SELECT DISTINCT indent_id
        FROM purchase_order_items
        WHERE po_id = @po_id AND indent_id IS NOT NULL
      `);
      const indentIds = (indentIdsRes.recordset || [])
        .map((r) => Number(r.indent_id))
        .filter((v) => Number.isFinite(v));

      await new sql.Request(tx).input('po_id', sql.Int, id).query('DELETE FROM purchase_order_items WHERE po_id = @po_id');
      await new sql.Request(tx).input('po_id', sql.Int, id).query('DELETE FROM bills WHERE po_id = @po_id');
      const delRes = await new sql.Request(tx).input('id', sql.Int, id).query('DELETE FROM purchase_orders OUTPUT DELETED.* WHERE id = @id');
      if (!delRes.recordset || delRes.recordset.length === 0) {
        throw new Error('Purchase order not found');
      }

      // Recompute indent status: Converted only if fully ordered, else keep Approved
      for (const indentId of indentIds) {
        const checkRes = await new sql.Request(tx).input('indent_id', sql.Int, indentId).query(`
          WITH indent_qty AS (
            SELECT sku_id, SUM(ISNULL(quantity, 0)) AS indent_qty
            FROM indent_items
            WHERE indent_id = @indent_id AND sku_id IS NOT NULL
            GROUP BY sku_id
          ), ordered_qty AS (
            SELECT sku_id, SUM(ISNULL(quantity, 0)) AS ordered_qty
            FROM purchase_order_items
            WHERE indent_id = @indent_id AND sku_id IS NOT NULL
            GROUP BY sku_id
          )
          SELECT SUM(CASE WHEN (ISNULL(iq.indent_qty,0) - ISNULL(oq.ordered_qty,0)) > 0 THEN 1 ELSE 0 END) AS remaining_sku_count
          FROM indent_qty iq
          LEFT JOIN ordered_qty oq ON oq.sku_id = iq.sku_id
        `);

        const remainingSkuCount = Number(checkRes.recordset?.[0]?.remaining_sku_count) || 0;
        const nextStatus = remainingSkuCount === 0 ? 'Converted' : 'Approved';
        await new sql.Request(tx).input('indent_id', sql.Int, indentId).input('status', sql.VarChar(50), nextStatus).query(
          'UPDATE indents SET status = @status WHERE id = @indent_id'
        );
      }

      await tx.commit();
      res.json({ success: true });
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get PO item receive summary (ordered/received/pending)
router.get('/grns/po/:po_id/summary', async (req, res) => {
  try {
    const pool = await getConnection();
    const poId = Number(req.params.po_id);
    if (!Number.isFinite(poId)) {
      return res.status(400).json({ error: 'Invalid po_id' });
    }

    const poItemsRes = await pool.request()
      .input('po_id', sql.Int, poId)
      .query(`SELECT item_name, quantity AS ordered_qty, unit_price FROM purchase_order_items WHERE po_id = @po_id ORDER BY id ASC`);

    const receivedRes = await pool.request()
      .input('po_id', sql.Int, poId)
      .query(`
        SELECT
          gli.sku_id,
          SUM(ISNULL(gli.quantity, 0)) AS received_qty
        FROM grns g
        INNER JOIN grn_items gli ON gli.grn_id = g.id
        WHERE g.po_id = @po_id
        GROUP BY gli.sku_id
      `);

    const receivedBySku = new Map(
      (receivedRes.recordset || []).map((r) => [Number(r.sku_id), Number(r.received_qty) || 0])
    );

    const codes = Array.from(new Set(
      (poItemsRes.recordset || [])
        .map((r) => (r?.item_name || '').toString())
        .map((n) => {
          const parts = n.split(' - ');
          return (parts[0] || '').trim();
        })
        .filter(Boolean)
    ));

    const skuMap = new Map();
    if (codes.length > 0) {
      const placeholders = codes.map((_, i) => `@c${i}`).join(', ');
      const reqSku = pool.request();
      codes.forEach((c, i) => reqSku.input(`c${i}`, sql.VarChar(50), c));
      const skuRes = await reqSku.query(`SELECT id, sku_code, item_name FROM store_skus WHERE sku_code IN (${placeholders})`);
      (skuRes.recordset || []).forEach((r) => skuMap.set((r.sku_code || '').trim(), r));
    }

    const summary = (poItemsRes.recordset || []).map((it) => {
      const itemName = (it?.item_name || '').toString();
      const parts = itemName.split(' - ');
      const skuCode = (parts[0] || '').trim();
      const sku = skuMap.get(skuCode);
      const skuId = sku ? Number(sku.id) : null;
      const orderedQty = Number(it?.ordered_qty) || 0;
      const receivedQty = skuId ? (Number(receivedBySku.get(skuId)) || 0) : 0;
      const pendingQty = Math.max(0, orderedQty - receivedQty);

      return {
        sku_id: skuId,
        sku_code: skuCode || null,
        sku_name: sku?.item_name || null,
        item_name: itemName,
        ordered_qty: orderedQty,
        received_qty: receivedQty,
        pending_qty: pendingQty,
        unit_price: it?.unit_price ?? null,
      };
    });

    res.json(summary);
  } catch (error) {
    console.error('Error fetching GRN PO summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-generate Indent
router.post('/indents/auto-generate/:job_sheet_id', async (req, res) => {
  try {
    const pool = await getConnection();
    const jobSheet = await pool.request()
      .input('id', sql.Int, req.params.job_sheet_id)
      .query('SELECT * FROM job_sheets WHERE id = @id');
    
    if (jobSheet.recordset.length === 0) {
      return res.status(404).json({ error: 'Job sheet not found' });
    }
    
    const js = jobSheet.recordset[0];
    const indentItems = [];
    
    // Check for spares
    if (js.spares_details) {
      indentItems.push({
        item_name: 'Spares/Components',
        item_description: js.spares_details,
        quantity: 1,
        unit: 'set'
      });
    }
    
    // If rewinding, check for scrap and calculate conductor
    if (js.job_type === 'Rewinding') {
      const scrapRecord = await pool.request()
        .input('job_sheet_id', sql.Int, req.params.job_sheet_id)
        .query('SELECT * FROM scrap_records WHERE job_sheet_id = @job_sheet_id ORDER BY id DESC');
      
      const dataSheet = await pool.request()
        .input('job_sheet_id', sql.Int, req.params.job_sheet_id)
        .query('SELECT * FROM data_sheets WHERE job_sheet_id = @job_sheet_id');
      
      if (scrapRecord.recordset.length > 0 && dataSheet.recordset.length > 0) {
        const scrap = scrapRecord.recordset[0];
        const ds = dataSheet.recordset[0];
        const conductorQuantity = calculateConductorQuantity(scrap.weight_kg);
        const conductorSize = ds.stator_conductor_size || ds.rotor_conductor_size || 'Standard';
        
        indentItems.push({
          item_name: `Conductor - ${conductorSize}`,
          item_description: `Conductor for rewinding (110% of scrap weight: ${scrap.weight_kg} kg)`,
          quantity: conductorQuantity,
          unit: 'kg',
          conductor_type: 'Copper',
          conductor_size: conductorSize
        });
      }
    }
    
    if (indentItems.length === 0) {
      return res.status(400).json({ error: 'No items found to generate indent' });
    }
    
    const indentNumber = await generateIndentNumber();
    const indentResult = await pool.request()
      .input('indent_number', sql.VarChar(50), indentNumber)
      .input('job_sheet_id', sql.Int, req.params.job_sheet_id)
      .query(`INSERT INTO indents (indent_number, job_sheet_id, indent_type, status, created_at)
              OUTPUT INSERTED.*
              VALUES (@indent_number, @job_sheet_id, 'Automatic', 'Raised', GETDATE())`);
    
    // Add items
    for (const item of indentItems) {
      await pool.request()
        .input('indent_id', sql.Int, indentResult.recordset[0].id)
        .input('item_name', sql.VarChar(200), item.item_name)
        .input('item_description', sql.Text, item.item_description)
        .input('quantity', sql.Float, item.quantity)
        .input('unit', sql.VarChar(50), item.unit)
        .input('conductor_type', sql.VarChar(100), item.conductor_type)
        .input('conductor_size', sql.VarChar(100), item.conductor_size)
        .query(`INSERT INTO indent_items (indent_id, item_name, item_description, quantity, unit, conductor_type, conductor_size, created_at)
                VALUES (@indent_id, @item_name, @item_description, @quantity, @unit, @conductor_type, @conductor_size, GETDATE())`);
    }
    
    res.json(indentResult.recordset[0]);
  } catch (error) {
    console.error('Error auto-generating indent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Indents
router.get('/indents', async (req, res) => {
  try {
    const pool = await getConnection();
    const { status } = req.query;
    const request = pool.request();
    let query = 'SELECT * FROM indents';
    if (status) {
      query += ' WHERE status = @status';
      request.input('status', sql.VarChar(50), status);
    }
    query += ' ORDER BY id DESC';
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching indents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Purchase Order from Approved Indents
router.get('/purchase-orders/from-indents/remaining', async (req, res) => {
  try {
    const pool = await getConnection();

    const raw = (req.query.indent_ids || '').toString();
    const indentIds = raw
      .split(',')
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));

    if (indentIds.length === 0) {
      return res.status(400).json({ error: 'indent_ids is required' });
    }

    // Ensure schema: purchase_order_items should carry sku_id and indent_id for proper tracking
    await pool.request().query(`
      IF OBJECT_ID('dbo.purchase_order_items', 'U') IS NOT NULL
      BEGIN
        IF COL_LENGTH('dbo.purchase_order_items', 'sku_id') IS NULL
        BEGIN
          ALTER TABLE purchase_order_items ADD sku_id INT NULL;
        END
        IF COL_LENGTH('dbo.purchase_order_items', 'indent_id') IS NULL
        BEGIN
          ALTER TABLE purchase_order_items ADD indent_id INT NULL;
        END
      END
    `);

    const placeholders = indentIds.map((_, i) => `@id${i}`).join(', ');
    const rq = pool.request();
    indentIds.forEach((id, i) => rq.input(`id${i}`, sql.Int, id));

    const result = await rq.query(`
      WITH indent_qty AS (
        SELECT ii.sku_id, SUM(ISNULL(ii.quantity, 0)) AS indent_qty,
               MAX(s.sku_code) AS sku_code,
               MAX(s.item_name) AS item_name,
               MAX(s.unit) AS unit
        FROM indent_items ii
        INNER JOIN indents i ON i.id = ii.indent_id
        LEFT JOIN store_skus s ON s.id = ii.sku_id
        WHERE ii.indent_id IN (${placeholders})
          AND ii.sku_id IS NOT NULL
        GROUP BY ii.sku_id
      ), ordered_qty AS (
        SELECT poi.sku_id, SUM(ISNULL(poi.quantity, 0)) AS ordered_qty
        FROM purchase_order_items poi
        WHERE poi.indent_id IN (${placeholders})
          AND poi.sku_id IS NOT NULL
        GROUP BY poi.sku_id
      )
      SELECT
        iq.sku_id,
        iq.sku_code,
        iq.item_name,
        iq.unit,
        ISNULL(iq.indent_qty, 0) AS indent_qty,
        ISNULL(oq.ordered_qty, 0) AS ordered_qty,
        (ISNULL(iq.indent_qty, 0) - ISNULL(oq.ordered_qty, 0)) AS remaining_qty
      FROM indent_qty iq
      LEFT JOIN ordered_qty oq ON oq.sku_id = iq.sku_id
      ORDER BY iq.item_name ASC
    `);

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Error fetching indent remaining summary:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/purchase-orders/from-indents', async (req, res) => {
  try {
    const pool = await getConnection();

    // Ensure schema: purchase_order_items should carry sku_id and indent_id for proper tracking
    await pool.request().query(`
      IF OBJECT_ID('dbo.purchase_order_items', 'U') IS NOT NULL
      BEGIN
        IF COL_LENGTH('dbo.purchase_order_items', 'sku_id') IS NULL
        BEGIN
          ALTER TABLE purchase_order_items ADD sku_id INT NULL;
        END
        IF COL_LENGTH('dbo.purchase_order_items', 'indent_id') IS NULL
        BEGIN
          ALTER TABLE purchase_order_items ADD indent_id INT NULL;
        END
      END
    `);

    const indentIds = Array.isArray(req.body.indent_ids) ? req.body.indent_ids.map(Number).filter(Number.isFinite) : [];
    if (indentIds.length === 0) {
      return res.status(400).json({ error: 'indent_ids is required' });
    }

    const vendorIdRaw = req.body.vendor_id;
    const vendorId = vendorIdRaw === '' || vendorIdRaw === undefined || vendorIdRaw === null ? null : Number(vendorIdRaw);
    if (!Number.isFinite(vendorId) || vendorId === null) {
      return res.status(400).json({ error: 'vendor_id is required' });
    }

    const poDate = req.body.po_date ? new Date(req.body.po_date) : new Date();
    const leadTimeDays = Number(req.body.lead_time_days) || 0;
    const expectedDelivery = new Date(poDate);
    expectedDelivery.setDate(expectedDelivery.getDate() + leadTimeDays);

    const priceMap = req.body.prices || {}; // { [sku_id]: unit_price }
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : null; // [{ sku_id, quantity }]

    const placeholders = indentIds.map((_, i) => `@id${i}`).join(', ');
    const indentReq = pool.request();
    indentIds.forEach((id, i) => indentReq.input(`id${i}`, sql.Int, id));

    const indentsRes = await indentReq.query(`SELECT * FROM indents WHERE id IN (${placeholders})`);
    if (indentsRes.recordset.length !== indentIds.length) {
      return res.status(400).json({ error: 'One or more indents not found' });
    }

    const notApproved = indentsRes.recordset.filter((i) => i.status !== 'Approved');
    if (notApproved.length > 0) {
      return res.status(400).json({ error: 'Only Approved indents can be converted to PO' });
    }

    const remainingRes = await indentReq.query(`
      WITH indent_qty AS (
        SELECT ii.sku_id, SUM(ISNULL(ii.quantity, 0)) AS indent_qty,
               MAX(s.sku_code) AS sku_code,
               MAX(s.item_name) AS item_name,
               MAX(s.unit) AS unit
        FROM indent_items ii
        INNER JOIN indents i ON i.id = ii.indent_id
        LEFT JOIN store_skus s ON s.id = ii.sku_id
        WHERE ii.indent_id IN (${placeholders})
          AND ii.sku_id IS NOT NULL
        GROUP BY ii.sku_id
      ), ordered_qty AS (
        SELECT poi.sku_id, SUM(ISNULL(poi.quantity, 0)) AS ordered_qty
        FROM purchase_order_items poi
        WHERE poi.indent_id IN (${placeholders})
          AND poi.sku_id IS NOT NULL
        GROUP BY poi.sku_id
      )
      SELECT
        iq.sku_id,
        iq.sku_code,
        iq.item_name,
        iq.unit,
        ISNULL(iq.indent_qty, 0) AS indent_qty,
        ISNULL(oq.ordered_qty, 0) AS ordered_qty,
        (ISNULL(iq.indent_qty, 0) - ISNULL(oq.ordered_qty, 0)) AS remaining_qty
      FROM indent_qty iq
      LEFT JOIN ordered_qty oq ON oq.sku_id = iq.sku_id
      ORDER BY iq.item_name ASC
    `);

    if (remainingRes.recordset.length === 0) {
      return res.status(400).json({ error: 'No SKU items found in selected indents' });
    }

    const poNumber = await generatePONumber();

    const remainingBySku = new Map((remainingRes.recordset || []).map((r) => [Number(r.sku_id), r]));

    const normalizedRequested = (requestedItems || [])
      .map((it) => ({ sku_id: Number(it?.sku_id), quantity: Number(it?.quantity) }))
      .filter((it) => Number.isFinite(it.sku_id) && Number.isFinite(it.quantity) && it.quantity > 0);

    const skusToOrder = requestedItems ? normalizedRequested : (remainingRes.recordset || []).map((r) => ({ sku_id: Number(r.sku_id), quantity: Math.max(0, Number(r.remaining_qty) || 0) }));
    const filteredToOrder = skusToOrder.filter((it) => (Number(it.quantity) || 0) > 0);

    if (filteredToOrder.length === 0) {
      return res.status(400).json({ error: 'Nothing to order. Remaining quantity is zero for selected indents.' });
    }

    for (const it of filteredToOrder) {
      const rem = remainingBySku.get(it.sku_id);
      const remainingQty = Math.max(0, Number(rem?.remaining_qty) || 0);
      if (it.quantity > remainingQty) {
        const name = rem?.item_name || `SKU ${it.sku_id}`;
        return res.status(400).json({ error: `PO qty exceeds remaining qty for ${name}. Remaining: ${remainingQty}` });
      }
    }

    // Build PO items list (for value calc) using requested quantities
    const poItems = filteredToOrder.map((it) => {
      const meta = remainingBySku.get(it.sku_id);
      const unitPriceRaw = priceMap[it.sku_id];
      const unitPrice = unitPriceRaw === '' || unitPriceRaw === undefined || unitPriceRaw === null ? 0 : Number(unitPriceRaw);
      const total = (Number(it.quantity) || 0) * (Number.isFinite(unitPrice) ? unitPrice : 0);
      return {
        sku_id: it.sku_id,
        sku_code: meta?.sku_code || null,
        sku_name: meta?.item_name || null,
        item_name: `${meta?.sku_code || ''} - ${meta?.item_name || ''}`.trim(),
        quantity: Number(it.quantity) || 0,
        unit: meta?.unit || null,
        unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
        total_value: total,
      };
    });

    const poValue = poItems.reduce((sum, it) => sum + (Number(it.total_value) || 0), 0);
    const advancePayment = Number(req.body.advance_payment) || 0;

    const poResult = await pool.request()
      .input('quotation_id', sql.Int, null)
      .input('vendor_id', sql.Int, vendorId)
      .input('po_number', sql.VarChar(100), poNumber)
      .input('po_date', sql.Date, poDate)
      .input('po_value', sql.Decimal(18, 2), poValue)
      .input('advance_payment', sql.Decimal(18, 2), advancePayment)
      .input('lead_time_days', sql.Int, leadTimeDays)
      .input('expected_delivery_date', sql.Date, expectedDelivery)
      .query(`INSERT INTO purchase_orders (quotation_id, vendor_id, po_number, po_date, po_value, advance_payment, lead_time_days, expected_delivery_date, status, created_at)
              OUTPUT INSERTED.*
              VALUES (@quotation_id, @vendor_id, @po_number, @po_date, @po_value, @advance_payment, @lead_time_days, @expected_delivery_date, 'Issued', GETDATE())`);

    const po = poResult.recordset[0];

    // Allocate ordered qty across selected indents per sku (so we can track caps per indent)
    const perIndentRemainingRes = await indentReq.query(`
      WITH indent_qty AS (
        SELECT ii.indent_id, ii.sku_id, SUM(ISNULL(ii.quantity, 0)) AS indent_qty
        FROM indent_items ii
        WHERE ii.indent_id IN (${placeholders})
          AND ii.sku_id IS NOT NULL
        GROUP BY ii.indent_id, ii.sku_id
      ), ordered_qty AS (
        SELECT poi.indent_id, poi.sku_id, SUM(ISNULL(poi.quantity, 0)) AS ordered_qty
        FROM purchase_order_items poi
        WHERE poi.indent_id IN (${placeholders})
          AND poi.sku_id IS NOT NULL
        GROUP BY poi.indent_id, poi.sku_id
      )
      SELECT
        iq.indent_id,
        iq.sku_id,
        ISNULL(iq.indent_qty, 0) AS indent_qty,
        ISNULL(oq.ordered_qty, 0) AS ordered_qty,
        (ISNULL(iq.indent_qty, 0) - ISNULL(oq.ordered_qty, 0)) AS remaining_qty
      FROM indent_qty iq
      LEFT JOIN ordered_qty oq ON oq.indent_id = iq.indent_id AND oq.sku_id = iq.sku_id
      ORDER BY iq.indent_id ASC
    `);

    const remainingBySkuIndent = new Map();
    for (const r of perIndentRemainingRes.recordset || []) {
      const skuId = Number(r.sku_id);
      if (!remainingBySkuIndent.has(skuId)) remainingBySkuIndent.set(skuId, []);
      remainingBySkuIndent.get(skuId).push({
        indent_id: Number(r.indent_id),
        remaining_qty: Math.max(0, Number(r.remaining_qty) || 0),
      });
    }

    for (const item of poItems) {
      let remainingToAllocate = Number(item.quantity) || 0;
      const buckets = remainingBySkuIndent.get(Number(item.sku_id)) || [];

      for (const b of buckets) {
        if (remainingToAllocate <= 0) break;
        const canTake = Math.max(0, Number(b.remaining_qty) || 0);
        if (canTake <= 0) continue;
        const alloc = Math.min(remainingToAllocate, canTake);
        remainingToAllocate -= alloc;

        await pool.request()
          .input('po_id', sql.Int, po.id)
          .input('item_name', sql.VarChar(200), item.item_name)
          .input('quantity', sql.Float, alloc)
          .input('unit_price', sql.Decimal(18, 2), item.unit_price)
          .input('total_value', sql.Decimal(18, 2), (Number(alloc) || 0) * (Number(item.unit_price) || 0))
          .input('sku_id', sql.Int, Number(item.sku_id))
          .input('indent_id', sql.Int, Number(b.indent_id))
          .query(`INSERT INTO purchase_order_items (po_id, item_name, quantity, unit_price, total_value, sku_id, indent_id)
                  VALUES (@po_id, @item_name, @quantity, @unit_price, @total_value, @sku_id, @indent_id)`);
      }

      if (remainingToAllocate > 0) {
        return res.status(400).json({ error: `Unable to allocate full quantity for SKU ${item.sku_id}. Please refresh and try again.` });
      }
    }

    // Mark indents as Converted only if fully ordered
    for (const indentId of indentIds) {
      const checkRes = await pool.request().input('indent_id', sql.Int, indentId).query(`
        WITH indent_qty AS (
          SELECT sku_id, SUM(ISNULL(quantity, 0)) AS indent_qty
          FROM indent_items
          WHERE indent_id = @indent_id AND sku_id IS NOT NULL
          GROUP BY sku_id
        ), ordered_qty AS (
          SELECT sku_id, SUM(ISNULL(quantity, 0)) AS ordered_qty
          FROM purchase_order_items
          WHERE indent_id = @indent_id AND sku_id IS NOT NULL
          GROUP BY sku_id
        )
        SELECT SUM(CASE WHEN (ISNULL(iq.indent_qty,0) - ISNULL(oq.ordered_qty,0)) > 0 THEN 1 ELSE 0 END) AS remaining_sku_count
        FROM indent_qty iq
        LEFT JOIN ordered_qty oq ON oq.sku_id = iq.sku_id
      `);

      const remainingSkuCount = Number(checkRes.recordset?.[0]?.remaining_sku_count) || 0;
      if (remainingSkuCount === 0) {
        await pool.request().input('indent_id', sql.Int, indentId).query(`UPDATE indents SET status = 'Converted' WHERE id = @indent_id`);
      }
    }

    // Auto-create Bill for this PO (if not already created)
    const existingBill = await pool.request()
      .input('po_id', sql.Int, po.id)
      .query('SELECT TOP 1 id FROM bills WHERE po_id = @po_id ORDER BY id DESC');

    let billId = existingBill.recordset[0]?.id || null;
    if (!billId) {
      const billNumber = await generateBillNumber();
      const billValue = Number(po.po_value) || 0;
      const advance = Number(po.advance_payment) || 0;
      const payable = Math.max(0, billValue - advance);
      const billStatus = advance > 0 ? 'Partially Paid' : 'Pending';

      const billRes = await pool.request()
        .input('po_id', sql.Int, po.id)
        .input('bill_number', sql.VarChar(100), billNumber)
        .input('bill_date', sql.Date, po.po_date)
        .input('bill_value', sql.Decimal(18, 2), billValue)
        .input('advance_payment', sql.Decimal(18, 2), advance)
        .input('payable_value', sql.Decimal(18, 2), payable)
        .input('status', sql.VarChar(50), billStatus)
        .query(`INSERT INTO bills (po_id, bill_number, bill_date, bill_value, advance_payment, payable_value, status, created_at, updated_at)
                OUTPUT INSERTED.id
                VALUES (@po_id, @bill_number, @bill_date, @bill_value, @advance_payment, @payable_value, @status, GETDATE(), GETDATE())`);

      billId = billRes.recordset[0]?.id || null;
    }

    res.json({ ...po, indent_ids: indentIds, bill_id: billId });
  } catch (error) {
    console.error('Error creating PO from indents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Indent
router.get('/indents/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const indent = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM indents WHERE id = @id');
    
    if (indent.recordset.length === 0) {
      return res.status(404).json({ error: 'Indent not found' });
    }
    
    const items = await pool.request()
      .input('indent_id', sql.Int, req.params.id)
      .query(`
        SELECT
          ii.*,
          s.sku_code,
          s.item_name AS sku_item_name,
          s.unit AS sku_unit
        FROM indent_items ii
        LEFT JOIN store_skus s ON s.id = ii.sku_id
        WHERE ii.indent_id = @indent_id
        ORDER BY ii.id ASC
      `);
    
    res.json({ ...indent.recordset[0], items: items.recordset });
  } catch (error) {
    console.error('Error fetching indent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Indent (header + items)
router.put('/indents/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid indent id' });
    }

    const existingRes = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM indents WHERE id = @id');

    if (existingRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Indent not found' });
    }

    const existing = existingRes.recordset[0];
    if (existing.status === 'Converted') {
      return res.status(400).json({ error: 'Converted indent cannot be updated' });
    }

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      await new sql.Request(tx)
        .input('id', sql.Int, id)
        .input('indent_date', sql.Date, req.body.indent_date || null)
        .input('job_sheet_id', sql.Int, req.body.job_sheet_id || null)
        .input('job_number', sql.Int, req.body.job_number || null)
        .input('indent_type', sql.VarChar(50), req.body.indent_type || existing.indent_type)
        .query(`UPDATE indents
                SET indent_date = ISNULL(@indent_date, indent_date),
                    job_sheet_id = @job_sheet_id,
                    job_number = @job_number,
                    indent_type = @indent_type
                WHERE id = @id`);

      await new sql.Request(tx)
        .input('indent_id', sql.Int, id)
        .query('DELETE FROM indent_items WHERE indent_id = @indent_id');

      for (const item of items) {
        const skuIdRaw = item.sku_id;
        const skuId = skuIdRaw === '' || skuIdRaw === undefined || skuIdRaw === null ? null : Number(skuIdRaw);

        const reqItem = new sql.Request(tx)
          .input('indent_id', sql.Int, id)
          .input('sku_id', sql.Int, Number.isFinite(skuId) ? skuId : null)
          .input('quantity', sql.Float, item.quantity)
          .input('remarks', sql.Text, item.remarks)
          .input('item_name', sql.VarChar(200), item.item_name)
          .input('item_description', sql.Text, item.item_description)
          .input('unit', sql.VarChar(50), item.unit)
          .input('conductor_type', sql.VarChar(100), item.conductor_type)
          .input('conductor_size', sql.VarChar(100), item.conductor_size);

        await reqItem.query(`
          INSERT INTO indent_items (
            indent_id, sku_id, item_name, item_description, quantity, unit,
            conductor_type, conductor_size, remarks, created_at
          )
          VALUES (
            @indent_id, @sku_id, @item_name, @item_description, @quantity, @unit,
            @conductor_type, @conductor_size, @remarks, GETDATE()
          )
        `);
      }

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    const updatedIndent = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM indents WHERE id = @id');

    const updatedItems = await pool.request()
      .input('indent_id', sql.Int, id)
      .query(`
        SELECT
          ii.*,
          s.sku_code,
          s.item_name AS sku_item_name,
          s.unit AS sku_unit
        FROM indent_items ii
        LEFT JOIN store_skus s ON s.id = ii.sku_id
        WHERE ii.indent_id = @indent_id
        ORDER BY ii.id ASC
      `);

    res.json({ ...updatedIndent.recordset[0], items: updatedItems.recordset });
  } catch (error) {
    console.error('Error updating indent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Indent
router.delete('/indents/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid indent id' });
    }

    const existingRes = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM indents WHERE id = @id');

    if (existingRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Indent not found' });
    }

    const indent = existingRes.recordset[0];
    if (indent.status === 'Converted') {
      return res.status(400).json({ error: 'Converted indent cannot be deleted' });
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx)
        .input('indent_id', sql.Int, id)
        .query('DELETE FROM indent_items WHERE indent_id = @indent_id');

      await new sql.Request(tx)
        .input('id', sql.Int, id)
        .query('DELETE FROM indents WHERE id = @id');

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting indent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve Indent (Chairman only)
router.put('/indents/:id/approve', requireAuth, requireRole('chairman'), async (req, res) => {
  try {
    const pool = await getConnection();

    const existing = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM indents WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({ error: 'Indent not found' });
    }

    const indent = existing.recordset[0];

    if (indent.status === 'Approved') {
      return res.status(400).json({ error: 'Indent is already approved' });
    }

    if (indent.status !== 'Raised') {
      return res.status(400).json({ error: 'Only Raised indents can be approved' });
    }

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('approved_by', sql.Int, req.user.id)
      .query(`UPDATE indents
              SET status = 'Approved', approved_by = @approved_by, approved_at = GETDATE()
              OUTPUT INSERTED.*
              WHERE id = @id`);

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error approving indent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Vendor
router.post('/vendors', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('vendor_name', sql.VarChar(200), req.body.vendor_name)
      .input('vendor_address', sql.Text, req.body.vendor_address)
      .input('contact_person', sql.VarChar(200), req.body.contact_person)
      .input('contact_number', sql.VarChar(20), req.body.contact_number)
      .input('email', sql.VarChar(200), req.body.email)
      .input('gst_number', sql.VarChar(50), req.body.gst_number)
      .query(`INSERT INTO vendors (vendor_name, vendor_address, contact_person, contact_number, email, gst_number, created_at)
              OUTPUT INSERTED.*
              VALUES (@vendor_name, @vendor_address, @contact_person, @contact_number, @email, @gst_number, GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export Vendors CSV
router.get('/vendors/export-csv', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM vendors ORDER BY vendor_name ASC');

    const cols = [
      'vendor_name',
      'vendor_address',
      'contact_person',
      'contact_number',
      'email',
      'gst_number',
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

    const filename = `vendors_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting vendors CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import Vendors CSV
router.post('/vendors/import-csv', async (req, res) => {
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

      const vendor_name = get('vendor_name') || get('Vendor Name');
      if (!vendor_name) {
        skipped++;
        continue;
      }

      await pool.request()
        .input('vendor_name', sql.VarChar(200), vendor_name)
        .input('vendor_address', sql.Text, get('vendor_address'))
        .input('contact_person', sql.VarChar(200), get('contact_person'))
        .input('contact_number', sql.VarChar(20), get('contact_number'))
        .input('email', sql.VarChar(200), get('email'))
        .input('gst_number', sql.VarChar(50), get('gst_number'))
        .query(`INSERT INTO vendors (vendor_name, vendor_address, contact_person, contact_number, email, gst_number, created_at)
                VALUES (@vendor_name, @vendor_address, @contact_person, @contact_number, @email, @gst_number, GETDATE())`);

      inserted++;
    }

    res.json({ success: true, inserted, skipped, total: rows.length - 1 });
  } catch (error) {
    console.error('Error importing vendors CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Vendors
router.get('/vendors', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM vendors ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Vendor
router.get('/vendors/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM vendors WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Vendor
router.put('/vendors/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const readonlyFields = new Set(['id', 'created_at', 'updated_at']);
    const updateKeys = Object.keys(req.body || {}).filter((f) => !readonlyFields.has(f));
    const fields = updateKeys.map((key) => `${key} = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);

    updateKeys.forEach((key) => {
      const value = req.body[key];
      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });

    if (!fields) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const result = await request.query(`
      UPDATE vendors SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Vendor
router.delete('/vendors/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM vendors OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Quotation
router.post('/quotations', async (req, res) => {
  try {
    const pool = await getConnection();
    const quotationResult = await pool.request()
      .input('indent_id', sql.Int, req.body.indent_id)
      .input('vendor_id', sql.Int, req.body.vendor_id)
      .input('quotation_number', sql.VarChar(100), req.body.quotation_number)
      .input('quotation_date', sql.Date, req.body.quotation_date)
      .input('total_value', sql.Decimal(18, 2), req.body.total_value)
      .query(`INSERT INTO quotations (indent_id, vendor_id, quotation_number, quotation_date, total_value, status, created_at)
              OUTPUT INSERTED.*
              VALUES (@indent_id, @vendor_id, @quotation_number, @quotation_date, @total_value, 'Received', GETDATE())`);
    
    // Add items
    if (req.body.items && req.body.items.length > 0) {
      for (const item of req.body.items) {
        await pool.request()
          .input('quotation_id', sql.Int, quotationResult.recordset[0].id)
          .input('item_name', sql.VarChar(200), item.item_name)
          .input('quantity', sql.Float, item.quantity)
          .input('unit_price', sql.Decimal(18, 2), item.unit_price)
          .input('total_price', sql.Decimal(18, 2), item.total_price)
          .query(`INSERT INTO quotation_items (quotation_id, item_name, quantity, unit_price, total_price)
                  VALUES (@quotation_id, @item_name, @quantity, @unit_price, @total_price)`);
      }
    }
    
    res.json(quotationResult.recordset[0]);
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Quotations
router.get('/quotations', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM quotations ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Purchase Order
router.post('/purchase-orders', async (req, res) => {
  try {
    const pool = await getConnection();
    const poNumber = await generatePONumber();
    
    // Calculate expected delivery date
    const poDate = new Date(req.body.po_date);
    const leadTimeDays = req.body.lead_time_days || 0;
    const expectedDelivery = new Date(poDate);
    expectedDelivery.setDate(expectedDelivery.getDate() + leadTimeDays);
    
    const poResult = await pool.request()
      .input('quotation_id', sql.Int, req.body.quotation_id)
      .input('vendor_id', sql.Int, req.body.vendor_id)
      .input('po_number', sql.VarChar(100), poNumber)
      .input('po_date', sql.Date, req.body.po_date)
      .input('po_value', sql.Decimal(18, 2), req.body.po_value)
      .input('advance_payment', sql.Decimal(18, 2), req.body.advance_payment || 0)
      .input('lead_time_days', sql.Int, req.body.lead_time_days)
      .input('expected_delivery_date', sql.Date, expectedDelivery)
      .query(`INSERT INTO purchase_orders (quotation_id, vendor_id, po_number, po_date, po_value, advance_payment, lead_time_days, expected_delivery_date, status, created_at)
              OUTPUT INSERTED.*
              VALUES (@quotation_id, @vendor_id, @po_number, @po_date, @po_value, @advance_payment, @lead_time_days, @expected_delivery_date, 'Issued', GETDATE())`);
    
    // Add items
    if (req.body.items && req.body.items.length > 0) {
      for (const item of req.body.items) {
        await pool.request()
          .input('po_id', sql.Int, poResult.recordset[0].id)
          .input('item_name', sql.VarChar(200), item.item_name)
          .input('quantity', sql.Float, item.quantity)
          .input('unit_price', sql.Decimal(18, 2), item.unit_price)
          .input('total_value', sql.Decimal(18, 2), item.total_value)
          .query(`INSERT INTO purchase_order_items (po_id, item_name, quantity, unit_price, total_value)
                  VALUES (@po_id, @item_name, @quantity, @unit_price, @total_value)`);
      }
    }
    
    const po = poResult.recordset[0];

    // Auto-create Bill for this PO (if not already created)
    const existingBill = await pool.request()
      .input('po_id', sql.Int, po.id)
      .query('SELECT TOP 1 id FROM bills WHERE po_id = @po_id ORDER BY id DESC');

    let billId = existingBill.recordset[0]?.id || null;
    if (!billId) {
      const billNumber = await generateBillNumber();
      const billValue = Number(po.po_value) || 0;
      const advance = Number(po.advance_payment) || 0;
      const payable = Math.max(0, billValue - advance);
      const billStatus = advance > 0 ? 'Partially Paid' : 'Pending';

      const billRes = await pool.request()
        .input('po_id', sql.Int, po.id)
        .input('bill_number', sql.VarChar(100), billNumber)
        .input('bill_date', sql.Date, po.po_date)
        .input('bill_value', sql.Decimal(18, 2), billValue)
        .input('advance_payment', sql.Decimal(18, 2), advance)
        .input('payable_value', sql.Decimal(18, 2), payable)
        .input('status', sql.VarChar(50), billStatus)
        .query(`INSERT INTO bills (po_id, bill_number, bill_date, bill_value, advance_payment, payable_value, status, created_at, updated_at)
                OUTPUT INSERTED.id
                VALUES (@po_id, @bill_number, @bill_date, @bill_value, @advance_payment, @payable_value, @status, GETDATE(), GETDATE())`);

      billId = billRes.recordset[0]?.id || null;
    }

    res.json({ ...po, bill_id: billId });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Purchase Orders
router.get('/purchase-orders', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        po.*,
        v.vendor_name,
        ISNULL(x.total_ordered_qty, 0) AS total_ordered_qty,
        ISNULL(x.total_received_qty, 0) AS total_received_qty,
        CASE WHEN ISNULL(x.total_received_qty, 0) > 0 THEN 1 ELSE 0 END AS has_grn,
        CASE
          WHEN ISNULL(x.total_received_qty, 0) <= 0 THEN 'Pending'
          WHEN ISNULL(x.total_received_qty, 0) < ISNULL(x.total_ordered_qty, 0) THEN 'Partially Received'
          ELSE 'Received'
        END AS receipt_status
      FROM purchase_orders po
      LEFT JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN (
        SELECT
          poi.po_id,
          SUM(ISNULL(poi.quantity, 0)) AS total_ordered_qty,
          ISNULL(rec.total_received_qty, 0) AS total_received_qty
        FROM purchase_order_items poi
        LEFT JOIN LATERAL (
          SELECT SUM(COALESCE(gi.quantity, 0)) AS total_received_qty
          FROM grns g
          INNER JOIN grn_items gi ON gi.grn_id = g.id
          WHERE g.po_id = poi.po_id
        ) rec ON TRUE
        GROUP BY poi.po_id, rec.total_received_qty
      ) x ON x.po_id = po.id
      ORDER BY po.id DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get GRNs for a specific PO
router.get('/grns/po/:po_id', async (req, res) => {
  try {
    const pool = await getConnection();
    const poId = Number(req.params.po_id);
    if (!Number.isFinite(poId)) {
      return res.status(400).json({ error: 'Invalid po_id' });
    }

    const result = await pool.request()
      .input('po_id', sql.Int, poId)
      .query(`
        SELECT
          g.*,
          po.po_number,
          COALESCE(
            (
              SELECT json_agg(row_to_json(t))
              FROM (
                SELECT
                  gi.sku_id,
                  s.sku_code,
                  s.item_name,
                  gi.quantity
                FROM grn_items gi
                LEFT JOIN store_skus s ON s.id = gi.sku_id
                WHERE gi.grn_id = g.id
              ) t
            ),
            '[]'::json
          ) AS items
        FROM grns g
        LEFT JOIN purchase_orders po ON po.id = g.po_id
        WHERE g.po_id = @po_id
        ORDER BY g.id DESC
      `);

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Error fetching GRNs for PO:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Purchase Order
router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const po = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM purchase_orders WHERE id = @id');
    
    if (po.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    const items = await pool.request()
      .input('po_id', sql.Int, req.params.id)
      .query('SELECT * FROM purchase_order_items WHERE po_id = @po_id');
    
    res.json({ ...po.recordset[0], items: items.recordset });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export Purchase Order PDF
router.get('/purchase-orders/:id/pdf', async (req, res) => {
  try {
    const pool = await getConnection();
    const poRes = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM purchase_orders WHERE id = @id');

    if (poRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const po = poRes.recordset[0];

    const vendorRes = await pool.request()
      .input('vendor_id', sql.Int, po.vendor_id)
      .query('SELECT * FROM vendors WHERE id = @vendor_id');
    const vendor = vendorRes.recordset[0] || null;

    const itemsRes = await pool.request()
      .input('po_id', sql.Int, req.params.id)
      .query('SELECT * FROM purchase_order_items WHERE po_id = @po_id ORDER BY id ASC');

    const doc = generatePurchaseOrderPDF({ po, vendor, items: itemsRes.recordset });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=purchase_order_${po.po_number || req.params.id}.pdf`);
    doc.pipe(res);
  } catch (error) {
    console.error('Error generating PO PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create GRN
router.post('/grns', async (req, res) => {
  try {
    const pool = await getConnection();
    const grnNumber = generateGRNNumber();

    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!req.body.po_id) {
      return res.status(400).json({ error: 'po_id is required' });
    }

    if (items.length > 0) {
      const receivedRes = await pool.request()
        .input('po_id', sql.Int, req.body.po_id)
        .query(`
          SELECT
            gli.sku_id,
            SUM(ISNULL(gli.quantity, 0)) AS received_qty
          FROM grns g
          INNER JOIN grn_items gli ON gli.grn_id = g.id
          WHERE g.po_id = @po_id
          GROUP BY gli.sku_id
        `);

      const alreadyReceived = new Map(
        (receivedRes.recordset || []).map((r) => [Number(r.sku_id), Number(r.received_qty) || 0])
      );

      const orderedRes = await pool.request()
        .input('po_id', sql.Int, req.body.po_id)
        .query(`
          SELECT poi.item_name, poi.quantity AS ordered_qty
          FROM purchase_order_items poi
          WHERE poi.po_id = @po_id
        `);

      const codes = Array.from(new Set(
        (orderedRes.recordset || [])
          .map((r) => (r?.item_name || '').toString())
          .map((n) => {
            const parts = n.split(' - ');
            return (parts[0] || '').trim();
          })
          .filter(Boolean)
      ));

      const skuMap = new Map();
      if (codes.length > 0) {
        const placeholders = codes.map((_, i) => `@c${i}`).join(', ');
        const reqSku = pool.request();
        codes.forEach((c, i) => reqSku.input(`c${i}`, sql.VarChar(50), c));
        const skuRes = await reqSku.query(`SELECT id, sku_code FROM store_skus WHERE sku_code IN (${placeholders})`);
        (skuRes.recordset || []).forEach((r) => skuMap.set((r.sku_code || '').trim(), Number(r.id)));
      }

      const orderedBySku = new Map();
      (orderedRes.recordset || []).forEach((r) => {
        const itemName = (r?.item_name || '').toString();
        const parts = itemName.split(' - ');
        const skuCode = (parts[0] || '').trim();
        const skuId = skuMap.get(skuCode);
        if (!Number.isFinite(skuId)) return;
        const qty = Number(r?.ordered_qty) || 0;
        orderedBySku.set(skuId, (orderedBySku.get(skuId) || 0) + qty);
      });

      for (const item of items) {
        const skuIdRaw = item.sku_id;
        const skuId = skuIdRaw === '' || skuIdRaw === undefined || skuIdRaw === null ? null : Number(skuIdRaw);
        const qty = Number(item.quantity) || 0;

        if (!Number.isFinite(skuId) || skuId === null) {
          return res.status(400).json({ error: 'Invalid sku_id in items' });
        }
        if (!Number.isFinite(qty) || qty <= 0) {
          return res.status(400).json({ error: 'Invalid quantity in items' });
        }

        const orderedQty = Number(orderedBySku.get(skuId)) || 0;
        const receivedQty = Number(alreadyReceived.get(skuId)) || 0;
        const pendingQty = Math.max(0, orderedQty - receivedQty);

        if (orderedQty <= 0) {
          return res.status(400).json({ error: `SKU ${skuId} not found in Purchase Order items` });
        }
        if (qty > pendingQty) {
          return res.status(400).json({ error: `Received quantity cannot exceed pending quantity for SKU ${skuId} (pending: ${pendingQty})` });
        }
      }
    }

    const totalReceivedQty = items.length
      ? items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
      : (Number(req.body.received_quantity) || 0);

    const result = await pool.request()
      .input('po_id', sql.Int, req.body.po_id)
      .input('grn_number', sql.VarChar(100), grnNumber)
      .input('grn_date', sql.Date, req.body.grn_date)
      .input('received_quantity', sql.Float, totalReceivedQty)
      .input('remarks', sql.Text, req.body.remarks)
      .query(`INSERT INTO grns (po_id, grn_number, grn_date, received_quantity, status, remarks, created_at, updated_at)
              OUTPUT INSERTED.*
              VALUES (@po_id, @grn_number, @grn_date, @received_quantity, 'Received', @remarks, GETDATE(), GETDATE())`);

    const grn = result.recordset[0];

    if (items.length > 0) {
      for (const item of items) {
        const skuIdRaw = item.sku_id;
        const skuId = skuIdRaw === '' || skuIdRaw === undefined || skuIdRaw === null ? null : Number(skuIdRaw);
        const qty = Number(item.quantity) || 0;
        const rateRaw = item.rate;
        const rate = rateRaw === '' || rateRaw === undefined || rateRaw === null ? null : Number(rateRaw);

        if (!Number.isFinite(skuId) || skuId === null) {
          continue;
        }

        if (!Number.isFinite(qty) || qty <= 0) {
          continue;
        }

        await pool.request()
          .input('grn_id', sql.Int, grn.id)
          .input('sku_id', sql.Int, skuId)
          .input('quantity', sql.Float, qty)
          .input('rate', sql.Decimal(18, 2), Number.isFinite(rate) ? rate : null)
          .input('remarks', sql.Text, item.remarks)
          .query(`INSERT INTO grn_items (grn_id, sku_id, quantity, rate, remarks, created_at, updated_at)
                  VALUES (@grn_id, @sku_id, @quantity, @rate, @remarks, GETDATE(), GETDATE())`);

        await pool.request()
          .input('sku_id', sql.Int, skuId)
          .input('qty', sql.Float, qty)
          .input('rate', sql.Decimal(18, 2), Number.isFinite(rate) ? rate : null)
          .input('ref_id', sql.Int, grn.id)
          .input('txn_date', sql.Date, req.body.grn_date)
          .input('remarks', sql.Text, req.body.remarks)
          .query(`INSERT INTO store_stock_ledger (sku_id, txn_type, qty, rate, ref_type, ref_id, txn_date, remarks, created_at)
                  VALUES (@sku_id, 'PURCHASE_IN', @qty, @rate, 'GRN', @ref_id, ISNULL(@txn_date, CAST(GETDATE() AS DATE)), @remarks, GETDATE())`);
      }
    }
    
    // Update PO status
    await pool.request()
      .input('po_id', sql.Int, req.body.po_id)
      .query('UPDATE purchase_orders SET status = \'Received\' WHERE id = @po_id');

    // Auto-create Bill for this PO (if not already created)
    const existingBill = await pool.request()
      .input('po_id', sql.Int, req.body.po_id)
      .query('SELECT TOP 1 id FROM bills WHERE po_id = @po_id ORDER BY id DESC');

    let billId = existingBill.recordset[0]?.id || null;
    if (!billId) {
      const poRes = await pool.request()
        .input('po_id', sql.Int, req.body.po_id)
        .query('SELECT * FROM purchase_orders WHERE id = @po_id');

      const po = poRes.recordset[0];
      if (po) {
        const billNumber = await generateBillNumber();
        const billValue = Number(po.po_value) || 0;
        const advance = Number(po.advance_payment) || 0;
        const payable = Math.max(0, billValue - advance);
        const billStatus = advance > 0 ? 'Partially Paid' : 'Pending';

        const billRes = await pool.request()
          .input('po_id', sql.Int, po.id)
          .input('bill_number', sql.VarChar(100), billNumber)
          .input('bill_date', sql.Date, req.body.grn_date || po.po_date || new Date())
          .input('bill_value', sql.Decimal(18, 2), billValue)
          .input('advance_payment', sql.Decimal(18, 2), advance)
          .input('payable_value', sql.Decimal(18, 2), payable)
          .input('status', sql.VarChar(50), billStatus)
          .query(`INSERT INTO bills (po_id, bill_number, bill_date, bill_value, advance_payment, payable_value, status, created_at, updated_at)
                  OUTPUT INSERTED.id
                  VALUES (@po_id, @bill_number, @bill_date, @bill_value, @advance_payment, @payable_value, @status, GETDATE(), GETDATE())`);

        billId = billRes.recordset[0]?.id || null;
      }
    }

    res.json({ ...grn, bill_id: billId });
  } catch (error) {
    console.error('Error creating GRN:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All GRNs
router.get('/grns', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        g.*,
        po.po_number
      FROM grns g
      LEFT JOIN purchase_orders po ON po.id = g.po_id
      ORDER BY g.id DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

