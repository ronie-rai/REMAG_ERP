import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getConnection } from './config/database.js';
import sql from './config/database.js';
import bcrypt from 'bcryptjs';

// Import routes
import salesRoutes from './routes/sales.js';
import productionRoutes from './routes/production.js';
import procurementRoutes from './routes/procurement.js';
import accountingRoutes from './routes/accounting.js';
import clientsRoutes from './routes/clients.js';
import jobEntriesRoutes from './routes/jobEntries.js';
import machiningRoutes from './routes/machining.js';
import authRoutes from './routes/auth.js';
import storeRoutes from './routes/store.js';
import auditRoutes from './routes/audit.js';
import { ensureAuditLogsSchema } from './utils/audit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

const ensureUsersSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF COL_LENGTH('dbo.users', 'permissions_json') IS NULL
    BEGIN
      ALTER TABLE users ADD permissions_json NVARCHAR(MAX) NULL;
    END
  `);

  await pool.request().query(`
    IF COL_LENGTH('dbo.users', 'created_at') IS NULL
    BEGIN
      ALTER TABLE users ADD created_at DATETIME NULL;
    END

    IF COL_LENGTH('dbo.users', 'updated_at') IS NULL
    BEGIN
      ALTER TABLE users ADD updated_at DATETIME NULL;
    END
  `);
};

const ensureJobEntriesSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.job_entries', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.job_entries', 'work_order_id') IS NULL
        ALTER TABLE job_entries ADD work_order_id INT NULL;

      IF COL_LENGTH('dbo.job_entries', 'status_remarks') IS NULL
        ALTER TABLE job_entries ADD status_remarks NVARCHAR(500) NULL;

      IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE parent_object_id = OBJECT_ID(N'[dbo].[job_entries]')
          AND name = 'FK_job_entries_work_orders'
      )
      BEGIN
        IF OBJECT_ID('dbo.work_orders', 'U') IS NOT NULL
          ALTER TABLE job_entries
          ADD CONSTRAINT FK_job_entries_work_orders FOREIGN KEY (work_order_id) REFERENCES work_orders(id);
      END

      IF COL_LENGTH('dbo.job_entries', 'created_at') IS NULL
        ALTER TABLE job_entries ADD created_at DATETIME DEFAULT GETDATE();
      IF COL_LENGTH('dbo.job_entries', 'updated_at') IS NULL
        ALTER TABLE job_entries ADD updated_at DATETIME DEFAULT GETDATE();
    END

    IF OBJECT_ID('dbo.work_orders', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.work_orders', 'created_at') IS NULL
        ALTER TABLE work_orders ADD created_at DATETIME DEFAULT GETDATE();
      IF COL_LENGTH('dbo.work_orders', 'updated_at') IS NULL
        ALTER TABLE work_orders ADD updated_at DATETIME DEFAULT GETDATE();
    END

    IF OBJECT_ID('dbo.sales_quotations', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.sales_quotations', 'created_at') IS NULL
        ALTER TABLE sales_quotations ADD created_at DATETIME DEFAULT GETDATE();
      IF COL_LENGTH('dbo.sales_quotations', 'updated_at') IS NULL
        ALTER TABLE sales_quotations ADD updated_at DATETIME DEFAULT GETDATE();
    END
  `);
};

const ensureSalesInvoicesSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.sales_invoices', 'U') IS NULL
    BEGIN
      CREATE TABLE sales_invoices (
        id INT IDENTITY(1,1) PRIMARY KEY,
        invoice_no VARCHAR(100) NOT NULL UNIQUE,
        invoice_date DATE NULL,
        invoice_amount DECIMAL(18,2) NOT NULL,
        gst_percent DECIMAL(9,2) NULL,
        gst_amount DECIMAL(18,2) NULL,
        total_amount DECIMAL(18,2) NULL,
        remarks TEXT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
      );
      CREATE INDEX ix_sales_invoices_invoice_no ON sales_invoices(invoice_no);
    END

    IF OBJECT_ID('dbo.sales_invoices', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.sales_invoices', 'job_entry_id') IS NOT NULL
      BEGIN
        -- 1. Drop the foreign key constraint if it exists
        DECLARE @FKName nvarchar(200)
        SELECT @FKName = name
        FROM sys.foreign_keys
        WHERE parent_object_id = OBJECT_ID('dbo.sales_invoices')
          AND referenced_object_id = OBJECT_ID('dbo.job_entries')

        IF @FKName IS NOT NULL
          EXEC('ALTER TABLE sales_invoices DROP CONSTRAINT [' + @FKName + ']')

        -- 2. Drop the index if it exists
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_sales_invoices_job_entry_id' AND object_id = OBJECT_ID('dbo.sales_invoices'))
          DROP INDEX ix_sales_invoices_job_entry_id ON sales_invoices;

        -- 3. Drop any other index that might include the column
        DECLARE @IdxName nvarchar(200)
        DECLARE IdxCursor CURSOR FOR
          SELECT i.name
          FROM sys.indexes i
          INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
          INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
          WHERE i.object_id = OBJECT_ID('dbo.sales_invoices') AND c.name = 'job_entry_id'
        
        OPEN IdxCursor
        FETCH NEXT FROM IdxCursor INTO @IdxName
        WHILE @@FETCH_STATUS = 0
        BEGIN
          EXEC('DROP INDEX [' + @IdxName + '] ON sales_invoices')
          FETCH NEXT FROM IdxCursor INTO @IdxName
        END
        CLOSE IdxCursor
        DEALLOCATE IdxCursor

        -- 4. Finally drop the column
        ALTER TABLE sales_invoices DROP COLUMN job_entry_id;
      END

      IF COL_LENGTH('dbo.sales_invoices', 'bill_to_name') IS NULL
        ALTER TABLE sales_invoices ADD bill_to_name NVARCHAR(200) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'bill_to_address') IS NULL
        ALTER TABLE sales_invoices ADD bill_to_address NVARCHAR(MAX) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'bill_to_gstin') IS NULL
        ALTER TABLE sales_invoices ADD bill_to_gstin NVARCHAR(50) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'bill_to_state_code') IS NULL
        ALTER TABLE sales_invoices ADD bill_to_state_code NVARCHAR(10) NULL;

      IF COL_LENGTH('dbo.sales_invoices', 'place_of_work_name') IS NULL
        ALTER TABLE sales_invoices ADD place_of_work_name NVARCHAR(200) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'place_of_work_address') IS NULL
        ALTER TABLE sales_invoices ADD place_of_work_address NVARCHAR(MAX) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'place_of_work_gstin') IS NULL
        ALTER TABLE sales_invoices ADD place_of_work_gstin NVARCHAR(50) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'place_of_work_state_code') IS NULL
        ALTER TABLE sales_invoices ADD place_of_work_state_code NVARCHAR(10) NULL;

      IF COL_LENGTH('dbo.sales_invoices', 'loi_no') IS NULL
        ALTER TABLE sales_invoices ADD loi_no NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'gate_pass_no') IS NULL
        ALTER TABLE sales_invoices ADD gate_pass_no NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'delivery_note_no') IS NULL
        ALTER TABLE sales_invoices ADD delivery_note_no NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'delivery_date') IS NULL
        ALTER TABLE sales_invoices ADD delivery_date DATE NULL;

      IF COL_LENGTH('dbo.sales_invoices', 'cgst_percent') IS NULL
        ALTER TABLE sales_invoices ADD cgst_percent DECIMAL(9,2) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'cgst_amount') IS NULL
        ALTER TABLE sales_invoices ADD cgst_amount DECIMAL(18,2) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'igst_percent') IS NULL
        ALTER TABLE sales_invoices ADD igst_percent DECIMAL(9,2) NULL;
      IF COL_LENGTH('dbo.sales_invoices', 'igst_amount') IS NULL
        ALTER TABLE sales_invoices ADD igst_amount DECIMAL(18,2) NULL;
    END

    IF OBJECT_ID('dbo.sales_invoice_items', 'U') IS NULL
    BEGIN
      CREATE TABLE sales_invoice_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        invoice_id INT NOT NULL,
        sl_no INT NULL,
        description NVARCHAR(MAX) NULL,
        quantity FLOAT NULL,
        unit NVARCHAR(50) NULL,
        sac_code NVARCHAR(50) NULL,
        rate DECIMAL(18,2) NULL,
        amount DECIMAL(18,2) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id)
      );
      CREATE INDEX ix_sales_invoice_items_invoice_id ON sales_invoice_items(invoice_id);
    END

    IF OBJECT_ID('dbo.sales_invoice_jobs', 'U') IS NULL
    BEGIN
      CREATE TABLE sales_invoice_jobs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        invoice_id INT NOT NULL,
        job_entry_id INT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id),
        FOREIGN KEY (job_entry_id) REFERENCES job_entries(id)
      );
      CREATE UNIQUE INDEX ux_sales_invoice_jobs_invoice_job ON sales_invoice_jobs(invoice_id, job_entry_id);
      CREATE INDEX ix_sales_invoice_jobs_invoice_id ON sales_invoice_jobs(invoice_id);
      CREATE INDEX ix_sales_invoice_jobs_job_entry_id ON sales_invoice_jobs(job_entry_id);
    END
  `);
};

const ensureIndentsSchema = async () => {
  const pool = await getConnection();

  await pool.request().query(`
    IF OBJECT_ID('dbo.indents', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.indents', 'job_number') IS NULL
      BEGIN
        ALTER TABLE indents ADD job_number INT NULL;
      END
    END
  `);
};

const ensureMachiningSchema = async () => {
  const pool = await getConnection();

  await pool.request().query(`
    IF OBJECT_ID('dbo.machining', 'U') IS NULL
    BEGIN
      CREATE TABLE machining (
        id INT IDENTITY(1,1) PRIMARY KEY,
        job_number INT NULL,
        particulars NVARCHAR(MAX) NULL,
        status VARCHAR(30) NOT NULL,
        outsourced_date DATE NULL,
        outsourced_to VARCHAR(200) NULL,
        expected_delivery DATE NULL,
        received_at DATETIME NULL,
        created_at DATETIME NULL,
        updated_at DATETIME NULL
      );
    END
  `);

  await pool.request().query(`
    IF OBJECT_ID('dbo.machining', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.machining', 'machining_indent_no') IS NULL
      BEGIN
        ALTER TABLE machining ADD machining_indent_no VARCHAR(30) NULL;
      END

      IF COL_LENGTH('dbo.machining', 'indent_id') IS NULL
      BEGIN
        ALTER TABLE machining ADD indent_id INT NULL;
      END

      IF COL_LENGTH('dbo.machining', 'created_at') IS NULL
      BEGIN
        ALTER TABLE machining ADD created_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.machining', 'updated_at') IS NULL
      BEGIN
        ALTER TABLE machining ADD updated_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.machining', 'received_at') IS NULL
      BEGIN
        ALTER TABLE machining ADD received_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.machining', 'total_bill_value') IS NULL
      BEGIN
        ALTER TABLE machining ADD total_bill_value DECIMAL(18, 2) NULL;
      END

      IF COL_LENGTH('dbo.machining', 'advance_required') IS NULL
      BEGIN
        ALTER TABLE machining ADD advance_required BIT NULL;
      END

      IF COL_LENGTH('dbo.machining', 'advance_amount') IS NULL
      BEGIN
        ALTER TABLE machining ADD advance_amount DECIMAL(18, 2) NULL;
      END
    END
  `);
};

const ensurePaymentsSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.payments', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.payments', 'created_at') IS NULL
      BEGIN
        ALTER TABLE payments ADD created_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.payments', 'updated_at') IS NULL
      BEGIN
        ALTER TABLE payments ADD updated_at DATETIME NULL;
      END
    END
  `);
};

const ensureACMotorDataSheetsSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.ac_motor_data_sheets', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.ac_motor_data_sheets', 'total_set_of_coils_stator') IS NULL
      BEGIN
        ALTER TABLE ac_motor_data_sheets ADD total_set_of_coils_stator INT NULL;
      END

      IF COL_LENGTH('dbo.ac_motor_data_sheets', 'total_set_of_coils_rotor') IS NULL
      BEGIN
        ALTER TABLE ac_motor_data_sheets ADD total_set_of_coils_rotor INT NULL;
      END

      IF COL_LENGTH('dbo.ac_motor_data_sheets', 'space_heater_stator') IS NULL
      BEGIN
        ALTER TABLE ac_motor_data_sheets ADD space_heater_stator NVARCHAR(100) NULL;
      END

      IF COL_LENGTH('dbo.ac_motor_data_sheets', 'space_heater_rotor') IS NULL
      BEGIN
        ALTER TABLE ac_motor_data_sheets ADD space_heater_rotor NVARCHAR(100) NULL;
      END

      IF COL_LENGTH('dbo.ac_motor_data_sheets', 'created_at') IS NULL
      BEGIN
        ALTER TABLE ac_motor_data_sheets ADD created_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.ac_motor_data_sheets', 'updated_at') IS NULL
      BEGIN
        ALTER TABLE ac_motor_data_sheets ADD updated_at DATETIME NULL;
      END
    END
  `);
};

const ensureDCMotorDataSheetsSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.dc_motor_data_sheets', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.dc_motor_data_sheets', 'created_at') IS NULL
      BEGIN
        ALTER TABLE dc_motor_data_sheets ADD created_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.dc_motor_data_sheets', 'updated_at') IS NULL
      BEGIN
        ALTER TABLE dc_motor_data_sheets ADD updated_at DATETIME NULL;
      END
    END
  `);
};

const ensureTestReportsSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.test_reports', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.test_reports', 'report_id') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD report_id NVARCHAR(100) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'date_of_testing') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD date_of_testing DATE NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'kw') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD kw NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'hp') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD hp NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'volts') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD volts NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'current') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD [current] NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'rpm') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD rpm NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'sl_no') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD sl_no NVARCHAR(100) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'make') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD make NVARCHAR(200) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'job_no') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD job_no INT NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'party_name') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD party_name NVARCHAR(200) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'bearing_de') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD bearing_de NVARCHAR(200) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'bearing_nde') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD bearing_nde NVARCHAR(200) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'measurements_json') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD measurements_json NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'updated_at') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD updated_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.test_reports', 'created_at') IS NULL
      BEGIN
        ALTER TABLE test_reports ADD created_at DATETIME NULL;
      END
    END
  `);
};

const ensureBillsSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.bills', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.bills', 'status') IS NULL
      BEGIN
        ALTER TABLE bills ADD status VARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.bills', 'created_at') IS NULL
      BEGIN
        ALTER TABLE bills ADD created_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.bills', 'updated_at') IS NULL
      BEGIN
        ALTER TABLE bills ADD updated_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.bills', 'reference_type') IS NULL
      BEGIN
        ALTER TABLE bills ADD reference_type VARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.bills', 'reference_id') IS NULL
      BEGIN
        ALTER TABLE bills ADD reference_id INT NULL;
      END

      IF COL_LENGTH('dbo.bills', 'bill_stage') IS NULL
      BEGIN
        ALTER TABLE bills ADD bill_stage VARCHAR(20) NULL;
      END
    END
  `);
};

const ensureSalesPaymentsSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.sales_payments', 'U') IS NULL
    BEGIN
      CREATE TABLE sales_payments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        invoice_id INT NOT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        payment_mode VARCHAR(50) NULL,
        reference_no VARCHAR(100) NULL,
        remarks TEXT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id)
      );
      CREATE INDEX ix_sales_payments_invoice_id ON sales_payments(invoice_id);
    END
  `);
};

const ensureGRNsSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.grns', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.grns', 'created_at') IS NULL
      BEGIN
        ALTER TABLE grns ADD created_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.grns', 'updated_at') IS NULL
      BEGIN
        ALTER TABLE grns ADD updated_at DATETIME NULL;
      END
    END

    IF OBJECT_ID('dbo.grn_items', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.grn_items', 'created_at') IS NULL
      BEGIN
        ALTER TABLE grn_items ADD created_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.grn_items', 'updated_at') IS NULL
      BEGIN
        ALTER TABLE grn_items ADD updated_at DATETIME NULL;
      END
    END
  `);
};

const ensureVendorsSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.vendors', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.vendors', 'created_at') IS NULL
      BEGIN
        ALTER TABLE vendors ADD created_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.vendors', 'updated_at') IS NULL
      BEGIN
        ALTER TABLE vendors ADD updated_at DATETIME NULL;
      END
    END
  `);
};

const ensureJobSheetsSchema = async () => {
  const pool = await getConnection();
  await pool.request().query(`
    IF OBJECT_ID('dbo.job_sheets', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.job_sheets', 'email') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD email NVARCHAR(200) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'kw_hp') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD kw_hp NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'voltage') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD voltage NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'phase') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD phase NVARCHAR(20) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'current') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD [current] NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'speed_rpm') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD speed_rpm NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'sl_no') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD sl_no NVARCHAR(100) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'type') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD [type] NVARCHAR(100) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'weight_kg') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD weight_kg NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'make') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD make NVARCHAR(100) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'connection') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD connection NVARCHAR(50) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'date') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD [date] DATE NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'job_number') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD job_number INT NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'party_name') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD party_name NVARCHAR(200) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'department') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD department NVARCHAR(100) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'observation') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD observation NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'stator_winding') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD stator_winding NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'stator_winding_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD stator_winding_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'rotor_winding') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD rotor_winding NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'rotor_winding_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD rotor_winding_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'bearing_bearing_seat_de') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD bearing_bearing_seat_de NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'bearing_bearing_seat_de_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD bearing_bearing_seat_de_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'bearing_bearing_seat_nde') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD bearing_bearing_seat_nde NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'bearing_bearing_seat_nde_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD bearing_bearing_seat_nde_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'core_stator') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD core_stator NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'core_stator_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD core_stator_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'core_rotor') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD core_rotor NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'core_rotor_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD core_rotor_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'rotor_shaft') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD rotor_shaft NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'rotor_shaft_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD rotor_shaft_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'rotor_ring_bar') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD rotor_ring_bar NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'rotor_ring_bar_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD rotor_ring_bar_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'rtd_temp_detector') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD rtd_temp_detector NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'rtd_temp_detector_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD rtd_temp_detector_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'space_heater') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD space_heater NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'space_heater_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD space_heater_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'fan_cover') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD fan_cover NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'fan_cover_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD fan_cover_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'grease_cup_de') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD grease_cup_de NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'grease_cup_de_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD grease_cup_de_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'grease_cup_nde') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD grease_cup_nde NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'grease_cup_nde_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD grease_cup_nde_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'bearing_housing_de') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD bearing_housing_de NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'bearing_housing_de_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD bearing_housing_de_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'bearing_housing_nde') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD bearing_housing_nde NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'bearing_housing_nde_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD bearing_housing_nde_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'btd') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD btd NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'btd_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD btd_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'terminal_block') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD terminal_block NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'terminal_block_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD terminal_block_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'terminal_box') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD terminal_box NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'terminal_box_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD terminal_box_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'foot_leg') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD foot_leg NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'foot_leg_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD foot_leg_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'circlip_lock') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD circlip_lock NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'circlip_lock_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD circlip_lock_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'keys') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD [keys] NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'keys_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD keys_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'carbon_brush_rocker_arm') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD carbon_brush_rocker_arm NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'carbon_brush_rocker_arm_remarks') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD carbon_brush_rocker_arm_remarks NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'others') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD others NVARCHAR(MAX) NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'created_at') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD created_at DATETIME NULL;
      END

      IF COL_LENGTH('dbo.job_sheets', 'updated_at') IS NULL
      BEGIN
        ALTER TABLE job_sheets ADD updated_at DATETIME NULL;
      END
    END
  `);
};

const ensureDefaultUser = async () => {
  const pool = await getConnection();

  const usersCount = await pool.request().query('SELECT COUNT(1) AS cnt FROM users');
  const totalUsers = Number(usersCount.recordset?.[0]?.cnt) || 0;
  if (totalUsers > 0) {
    return;
  }

  const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const role = process.env.DEFAULT_ADMIN_ROLE || 'chairman';

  const existing = await pool.request()
    .input('username', sql.VarChar(100), username)
    .query('SELECT id FROM users WHERE username = @username');

  if (existing.recordset.length > 0) {
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);

  await pool.request()
    .input('username', sql.VarChar(100), username)
    .input('password_hash', sql.VarChar(255), password_hash)
    .input('role', sql.VarChar(50), role)
    .input('permissions_json', sql.NVarChar(sql.MAX), null)
    .query(`INSERT INTO users (username, password_hash, role, permissions_json, created_at, updated_at)
            VALUES (@username, @password_hash, @role, @permissions_json, GETDATE(), GETDATE())`);

  console.log(`Default user created: username="${username}", role="${role}"`);
 };

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'ERP System API', version: '1.0.0' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api', clientsRoutes);
app.use('/api/production', jobEntriesRoutes);
app.use('/api/production', machiningRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await getConnection();
    console.log('Database connected successfully');

    await ensureUsersSchema();
    await ensureBillsSchema();
    await ensurePaymentsSchema();
    await ensureJobEntriesSchema();
    await ensureSalesInvoicesSchema();
    await ensureSalesPaymentsSchema();
    await ensureGRNsSchema();
    await ensureVendorsSchema();
    await ensureJobSheetsSchema();
    await ensureIndentsSchema();
    await ensureTestReportsSchema();
    await ensureACMotorDataSheetsSchema();
    await ensureDCMotorDataSheetsSchema();
    await ensureMachiningSchema();
    await ensureAuditLogsSchema();
    await ensureDefaultUser();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation available at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

