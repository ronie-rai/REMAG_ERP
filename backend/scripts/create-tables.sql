-- Complete Database Schema for ERP System
-- This script creates/updates all necessary tables for the updated ERP system

-- Drop existing tables if they exist (for clean development)
-- IF EXISTS (SELECT * FROM sys.tables WHERE name = 'test_reports') DROP TABLE test_reports;
-- IF EXISTS (SELECT * FROM sys.tables WHERE name = 'dc_motor_data_sheets') DROP TABLE dc_motor_data_sheets;
-- IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ac_motor_data_sheets') DROP TABLE ac_motor_data_sheets;
-- IF EXISTS (SELECT * FROM sys.tables WHERE name = 'job_entries') DROP TABLE job_entries;
-- IF EXISTS (SELECT * FROM sys.tables WHERE name = 'job_sheets') DROP TABLE job_sheets;
-- IF EXISTS (SELECT * FROM sys.tables WHERE name = 'work_orders') DROP TABLE work_orders;
-- IF EXISTS (SELECT * FROM sys.tables WHERE name = 'enquiries') DROP TABLE enquiries;
-- IF EXISTS (SELECT * FROM sys.tables WHERE name = 'clients') DROP TABLE clients;

-- Create Clients Table (Updated)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[clients]') AND type in (N'U'))
BEGIN
    CREATE TABLE clients (
        id INT IDENTITY(1,1) PRIMARY KEY,
        client_name VARCHAR(200) NOT NULL UNIQUE,
        contact_person VARCHAR(200),
        email VARCHAR(200),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        gst_number VARCHAR(50),
        pan_number VARCHAR(20),
        client_rating INT,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    ALTER TABLE clients ADD CONSTRAINT CK_clients_client_rating CHECK (client_rating IS NULL OR (client_rating BETWEEN 1 AND 10));
    CREATE INDEX ix_clients_client_name ON clients(client_name);
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[clients]') AND name = 'client_rating')
        ALTER TABLE clients ADD client_rating INT;
    ELSE
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM sys.columns c
            JOIN sys.types t ON c.user_type_id = t.user_type_id
            WHERE c.object_id = OBJECT_ID(N'[dbo].[clients]')
              AND c.name = 'client_rating'
              AND t.name <> 'int'
        )
        BEGIN
            ALTER TABLE clients ALTER COLUMN client_rating INT;
        END
    END

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'[dbo].[clients]')
          AND name = 'CK_clients_client_rating'
    )
        ALTER TABLE clients ADD CONSTRAINT CK_clients_client_rating CHECK (client_rating IS NULL OR (client_rating BETWEEN 1 AND 10));
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[store_skus]') AND type in (N'U'))
BEGIN
    CREATE TABLE store_skus (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sku_code VARCHAR(100) NOT NULL UNIQUE,
        item_name VARCHAR(200) NOT NULL,
        size_type VARCHAR(200),
        category VARCHAR(100),
        unit VARCHAR(50),
        max_level FLOAT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX ix_store_skus_sku_code ON store_skus(sku_code);
    CREATE INDEX ix_store_skus_item_name ON store_skus(item_name);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[store_stock_ledger]') AND type in (N'U'))
BEGIN
    CREATE TABLE store_stock_ledger (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sku_id INT NOT NULL,
        txn_type VARCHAR(50) NOT NULL,
        qty FLOAT NOT NULL,
        rate DECIMAL(18,2) NULL,
        ref_type VARCHAR(50) NULL,
        ref_id INT NULL,
        txn_date DATE DEFAULT CAST(GETDATE() AS DATE),
        remarks TEXT,
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (sku_id) REFERENCES store_skus(id)
    );
    CREATE INDEX ix_store_stock_ledger_sku_id ON store_stock_ledger(sku_id);
    CREATE INDEX ix_store_stock_ledger_txn_date ON store_stock_ledger(txn_date);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[grns]') AND type in (N'U'))
BEGIN
    CREATE TABLE grns (
        id INT IDENTITY(1,1) PRIMARY KEY,
        po_id INT NULL,
        grn_number VARCHAR(100) NOT NULL UNIQUE,
        grn_date DATE,
        received_quantity FLOAT NULL,
        status VARCHAR(50) DEFAULT 'Received',
        remarks TEXT,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX ix_grns_grn_number ON grns(grn_number);
    CREATE INDEX ix_grns_po_id ON grns(po_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[grn_items]') AND type in (N'U'))
BEGIN
    CREATE TABLE grn_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        grn_id INT NOT NULL,
        sku_id INT NOT NULL,
        quantity FLOAT NOT NULL,
        rate DECIMAL(18,2) NULL,
        remarks TEXT,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (grn_id) REFERENCES grns(id),
        FOREIGN KEY (sku_id) REFERENCES store_skus(id)
    );
    CREATE INDEX ix_grn_items_grn_id ON grn_items(grn_id);
    CREATE INDEX ix_grn_items_sku_id ON grn_items(sku_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[bills]') AND type in (N'U'))
BEGIN
    CREATE TABLE bills (
        id INT IDENTITY(1,1) PRIMARY KEY,
        po_id INT NULL,
        job_sheet_id INT NULL,
        bill_number VARCHAR(100) NOT NULL UNIQUE,
        bill_date DATE,
        bill_value DECIMAL(18,2) NOT NULL,
        advance_payment DECIMAL(18,2) DEFAULT 0,
        payable_value DECIMAL(18,2) NOT NULL,
        eway_bill_number VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pending',
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX ix_bills_bill_number ON bills(bill_number);
    CREATE INDEX ix_bills_po_id ON bills(po_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[payments]') AND type in (N'U'))
BEGIN
    CREATE TABLE payments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        bill_id INT NOT NULL,
        payment_type VARCHAR(50),
        payment_amount DECIMAL(18,2) NOT NULL,
        payment_date DATE,
        payment_mode VARCHAR(50),
        reference_number VARCHAR(100),
        remarks TEXT,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (bill_id) REFERENCES bills(id)
    );
    CREATE INDEX ix_payments_bill_id ON payments(bill_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sales_invoices]') AND type in (N'U'))
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
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sales_invoice_jobs]') AND type in (N'U'))
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
GO

-- Create Users Table (For JWT auth)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type in (N'U'))
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        permissions_json NVARCHAR(MAX) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    ALTER TABLE users ADD CONSTRAINT CK_users_role CHECK (role IN ('user', 'chairman'));
    CREATE INDEX ix_users_username ON users(username);
END
GO

IF COL_LENGTH('dbo.users', 'permissions_json') IS NULL
BEGIN
    ALTER TABLE users ADD permissions_json NVARCHAR(MAX) NULL;
END
GO

-- Create Vendors Table (Similar to clients)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vendors]') AND type in (N'U'))
BEGIN
    CREATE TABLE vendors (
        id INT IDENTITY(1,1) PRIMARY KEY,
        vendor_name VARCHAR(200) NOT NULL UNIQUE,
        vendor_address TEXT,
        contact_person VARCHAR(200),
        contact_number VARCHAR(20),
        email VARCHAR(200),
        gst_number VARCHAR(50),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX ix_vendors_vendor_name ON vendors(vendor_name);
END
GO

-- Create Indents Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[indents]') AND type in (N'U'))
BEGIN
    CREATE TABLE indents (
        id INT IDENTITY(1,1) PRIMARY KEY,
        indent_number VARCHAR(50) NOT NULL UNIQUE,
        indent_date DATE DEFAULT CAST(GETDATE() AS DATE),
        job_sheet_id INT NULL,
        indent_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Raised',
        approved_by INT NULL,
        approved_at DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (approved_by) REFERENCES users(id)
    );
    CREATE INDEX ix_indents_indent_number ON indents(indent_number);
    CREATE INDEX ix_indents_status ON indents(status);
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[indents]') AND name = 'indent_date')
        ALTER TABLE indents ADD indent_date DATE DEFAULT CAST(GETDATE() AS DATE);
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[indents]') AND name = 'approved_by')
        ALTER TABLE indents ADD approved_by INT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[indents]') AND name = 'approved_at')
        ALTER TABLE indents ADD approved_at DATETIME NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[indents]') AND name = 'updated_at')
        ALTER TABLE indents ADD updated_at DATETIME DEFAULT GETDATE();
END
GO

-- Add FK to job_sheets only if job_sheets table exists (job_sheets is created later in this script)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[job_sheets]') AND type in (N'U'))
AND NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[dbo].[indents]')
      AND name = 'FK_indents_job_sheets'
)
BEGIN
    ALTER TABLE indents ADD CONSTRAINT FK_indents_job_sheets
        FOREIGN KEY (job_sheet_id) REFERENCES job_sheets(id);
END
GO

-- Create Indent Items Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[indent_items]') AND type in (N'U'))
BEGIN
    CREATE TABLE indent_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        indent_id INT NOT NULL,
        sku_id INT NULL,
        item_name VARCHAR(200),
        item_description TEXT,
        quantity FLOAT,
        unit VARCHAR(50),
        conductor_type VARCHAR(100),
        conductor_size VARCHAR(100),
        remarks TEXT,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (indent_id) REFERENCES indents(id),
        FOREIGN KEY (sku_id) REFERENCES store_skus(id)
    );
    CREATE INDEX ix_indent_items_indent_id ON indent_items(indent_id);
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[indent_items]') AND name = 'sku_id')
        ALTER TABLE indent_items ADD sku_id INT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[indent_items]') AND name = 'remarks')
        ALTER TABLE indent_items ADD remarks TEXT;
END
GO

-- Create Enquiries Table (Updated with status column)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[enquiries]') AND type in (N'U'))
BEGIN
    CREATE TABLE enquiries (
        id INT IDENTITY(1,1) PRIMARY KEY,
        enquiry_no VARCHAR(50) NOT NULL UNIQUE,
        input_channel VARCHAR(50),
        client_id INT NULL,
        customer_name VARCHAR(200) NOT NULL,
        particulars TEXT,
        job_scope VARCHAR(50),
        due_date DATE,
        reference VARCHAR(200),
        website_link VARCHAR(500),
        contact_number VARCHAR(20),
        status VARCHAR(50) DEFAULT 'Pending',
        quoted_value DECIMAL(18,2) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (client_id) REFERENCES clients(id)
    );
    CREATE INDEX ix_enquiries_status ON enquiries(status);
END
ELSE
BEGIN
    -- Add missing columns to existing enquiries table
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[enquiries]') AND name = 'client_id')
    BEGIN
        ALTER TABLE enquiries ADD client_id INT;
        ALTER TABLE enquiries ADD CONSTRAINT FK_enquiries_client FOREIGN KEY (client_id) REFERENCES clients(id);
    END
    
    -- Rename party_details to particulars if exists
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[enquiries]') AND name = 'party_details')
    BEGIN
        EXEC sp_rename 'enquiries.party_details', 'particulars', 'COLUMN';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[enquiries]') AND name = 'status')
        ALTER TABLE enquiries ADD status VARCHAR(50) DEFAULT 'Pending';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[enquiries]') AND name = 'quoted_value')
        ALTER TABLE enquiries ADD quoted_value DECIMAL(18,2) NULL;
END
GO

-- Create Work Orders Table (Linked to enquiries)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[work_orders]') AND type in (N'U'))
BEGIN
    CREATE TABLE work_orders (
        id INT IDENTITY(1,1) PRIMARY KEY,
        enquiry_id INT NOT NULL,
        wo_link VARCHAR(500),
        wo_number VARCHAR(100),
        wo_date DATE,
        wo_value DECIMAL(18,2),
        wo_delivery DATE,
        status VARCHAR(50) DEFAULT 'Received',
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (enquiry_id) REFERENCES enquiries(id)
    );
    CREATE INDEX ix_work_orders_enquiry_id ON work_orders(enquiry_id);
END
GO

-- Create Sales Quotations (Linked to enquiries)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND type in (N'U'))
BEGIN
    CREATE TABLE sales_quotations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        enquiry_id INT NOT NULL,
        quotation_no VARCHAR(100) NOT NULL,
        quotation_date DATE NULL,
        to_name VARCHAR(200) NULL,
        to_address TEXT NULL,
        subject TEXT NULL,
        ref_no VARCHAR(200) NULL,
        dear VARCHAR(200) NULL,
        intro_text TEXT NULL,
        terms_text TEXT NULL,
        term_price TEXT NULL,
        term_escalation TEXT NULL,
        term_transportation TEXT NULL,
        term_taxes TEXT NULL,
        term_inspection TEXT NULL,
        term_delivery TEXT NULL,
        term_payment TEXT NULL,
        term_guarantee TEXT NULL,
        term_scope TEXT NULL,
        term_validity TEXT NULL,
        term_note TEXT NULL,
        notes_text TEXT NULL,
        status VARCHAR(50) DEFAULT 'Draft',
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (enquiry_id) REFERENCES enquiries(id)
    );
    CREATE INDEX ix_sales_quotations_enquiry_id ON sales_quotations(enquiry_id);
    CREATE INDEX ix_sales_quotations_quotation_no ON sales_quotations(quotation_no);
END
GO

-- Add missing columns to existing sales_quotations table
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND type in (N'U'))
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_price')
        ALTER TABLE sales_quotations ADD term_price TEXT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_escalation')
        ALTER TABLE sales_quotations ADD term_escalation TEXT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_transportation')
        ALTER TABLE sales_quotations ADD term_transportation TEXT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_taxes')
        ALTER TABLE sales_quotations ADD term_taxes TEXT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_inspection')
        ALTER TABLE sales_quotations ADD term_inspection TEXT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_delivery')
        ALTER TABLE sales_quotations ADD term_delivery TEXT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_payment')
        ALTER TABLE sales_quotations ADD term_payment TEXT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_guarantee')
        ALTER TABLE sales_quotations ADD term_guarantee TEXT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_scope')
        ALTER TABLE sales_quotations ADD term_scope TEXT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_validity')
        ALTER TABLE sales_quotations ADD term_validity TEXT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotations]') AND name = 'term_note')
        ALTER TABLE sales_quotations ADD term_note TEXT NULL;
END
GO

-- Create Sales Quotation Items
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sales_quotation_items]') AND type in (N'U'))
BEGIN
    CREATE TABLE sales_quotation_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        quotation_id INT NOT NULL,
        sl_no INT NULL,
        description TEXT NULL,
        quantity FLOAT NULL,
        unit VARCHAR(50) NULL,
        rate DECIMAL(18,2) NULL,
        amount DECIMAL(18,2) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (quotation_id) REFERENCES sales_quotations(id)
    );
    CREATE INDEX ix_sales_quotation_items_quotation_id ON sales_quotation_items(quotation_id);
END
GO

-- Create Job Entries Table (For jobs without work orders)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[job_entries]') AND type in (N'U'))
BEGIN
    CREATE TABLE job_entries (
        id INT IDENTITY(1,1) PRIMARY KEY,
        timestamp DATETIME DEFAULT GETDATE(),
        job_number INT NOT NULL UNIQUE,
        client_id INT NULL,
        work_order_id INT NULL,
        party_name VARCHAR(200) NOT NULL,
        department VARCHAR(100),
        job_description TEXT,
        gatepass_number VARCHAR(100),
        scope_of_work VARCHAR(100),
        machining TEXT,
        job_type VARCHAR(50),
        spares_received TEXT,
        status VARCHAR(50) DEFAULT 'New Job',
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );
    CREATE INDEX ix_job_entries_job_number ON job_entries(job_number);
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[job_entries]') AND name = 'work_order_id')
        ALTER TABLE job_entries ADD work_order_id INT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[job_entries]') AND name = 'client_id')
    BEGIN
        ALTER TABLE job_entries ADD client_id INT NULL;
    END
END
GO

-- Create Job Sheets Table (Updated with all required fields)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[job_sheets]') AND type in (N'U'))
BEGIN
    CREATE TABLE job_sheets (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email VARCHAR(200),
        timestamp DATETIME DEFAULT GETDATE(),
        kw_hp VARCHAR(50),
        voltage VARCHAR(50),
        phase VARCHAR(20),
        [current] VARCHAR(50),
        speed_rpm VARCHAR(50),
        sl_no VARCHAR(100),
        type VARCHAR(100),
        weight_kg VARCHAR(50),
        make VARCHAR(100),
        connection VARCHAR(50),
        job_date DATE,
        job_number INT NOT NULL UNIQUE,
        party_name VARCHAR(200) NOT NULL,
        department VARCHAR(100),
        observation TEXT,
        stator_winding TEXT,
        stator_winding_remarks TEXT,
        rotor_winding TEXT,
        rotor_winding_remarks TEXT,
        bearing_bearing_seat_de TEXT,
        bearing_bearing_seat_de_remarks TEXT,
        bearing_bearing_seat_nde TEXT,
        bearing_bearing_seat_nde_remarks TEXT,
        core_stator TEXT,
        core_stator_remarks TEXT,
        core_rotor TEXT,
        core_rotor_remarks TEXT,
        rotor_shaft TEXT,
        rotor_shaft_remarks TEXT,
        rotor_ring_bar TEXT,
        rotor_ring_bar_remarks TEXT,
        rtd_temp_detector TEXT,
        rtd_temp_detector_remarks TEXT,
        space_heater TEXT,
        space_heater_remarks TEXT,
        fan_cover TEXT,
        fan_cover_remarks TEXT,
        grease_cup_de TEXT,
        grease_cup_de_remarks TEXT,
        grease_cup_nde TEXT,
        grease_cup_nde_remarks TEXT,
        bearing_housing_de TEXT,
        bearing_housing_de_remarks TEXT,
        bearing_housing_nde TEXT,
        bearing_housing_nde_remarks TEXT,
        btd TEXT,
        btd_remarks TEXT,
        terminal_block TEXT,
        terminal_block_remarks TEXT,
        terminal_box TEXT,
        terminal_box_remarks TEXT,
        foot_leg TEXT,
        foot_leg_remarks TEXT,
        circlip_lock TEXT,
        circlip_lock_remarks TEXT,
        keys TEXT,
        keys_remarks TEXT,
        carbon_brush_rocker_arm TEXT,
        carbon_brush_rocker_arm_remarks TEXT,
        others TEXT,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX ix_job_sheets_job_number ON job_sheets(job_number);
END
GO

-- Create AC Motor Data Sheets Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ac_motor_data_sheets]') AND type in (N'U'))
BEGIN
    CREATE TABLE ac_motor_data_sheets (
        id INT IDENTITY(1,1) PRIMARY KEY,
        job_no INT NOT NULL,
        captain VARCHAR(100),
        sheet_date DATE,
        party VARCHAR(200),
        final_test_date DATE,
        nameplate_details TEXT,
        slip_ring VARCHAR(50),
        cage VARCHAR(50),
        make VARCHAR(100),
        power_kw VARCHAR(50),
        voltage_volts VARCHAR(50),
        frequency_hz VARCHAR(50),
        current_amp VARCHAR(50),
        capacity_hp VARCHAR(50),
        year_of_mfg VARCHAR(10),
        type VARCHAR(100),
        class_of_insulation VARCHAR(50),
        serial_number_sl_no VARCHAR(100),
        power_factor_pf VARCHAR(50),
        rotor_current_amp VARCHAR(50),
        rotor_voltage_volts VARCHAR(50),
        total_weight VARCHAR(50),
        frame VARCHAR(50),
        speed_rpm VARCHAR(50),
        phase VARCHAR(20),
        connection_y_delta VARCHAR(20),
        
        -- Armature Winding Details
        type_of_winding VARCHAR(100),
        type_of_conductor VARCHAR(100),
        winding_details TEXT,
        
        -- Stator Details
        no_of_slots_stator INT,
        slot_width_height_length_stator VARCHAR(100),
        slot_insulation_stator VARCHAR(100),
        no_of_coils_in_series_per_set_stator INT,
        wedges_size_and_quantity_stator VARCHAR(100),
        type_of_rtds_stator VARCHAR(100),
        type_of_btds_stator VARCHAR(100),
        no_of_strips_turns_in_each_coil_stator INT,
        size_of_conductor_bare_stator VARCHAR(100),
        conductor_size_with_insulation_stator VARCHAR(100),
        coil_dimension_stator VARCHAR(100),
        
        -- Rotor Details
        no_of_slots_rotor INT,
        slot_width_height_length_rotor VARCHAR(100),
        slot_insulation_rotor VARCHAR(100),
        no_of_coils_in_series_per_set_rotor INT,
        wedges_size_and_quantity_rotor VARCHAR(100),
        type_of_rtds_rotor VARCHAR(100),
        type_of_btds_rotor VARCHAR(100),
        no_of_strips_turns_in_each_coil_rotor INT,
        size_of_conductor_bare_rotor VARCHAR(100),
        conductor_size_with_insulation_rotor VARCHAR(100),
        coil_dimension_rotor VARCHAR(100),
        
        -- Additional Details
        overhang_projection_coils_connection_side VARCHAR(100),
        overhang_projection_coils_back_side VARCHAR(100),
        winding_pitch_connection_side VARCHAR(100),
        no_of_terminal_leads INT,
        weight_of_copper_aluminium_scrap VARCHAR(50),
        type_of_bearing_and_bearing_no_load_side VARCHAR(100),
        type_of_bearing_and_bearing_no_back_side VARCHAR(100),
        direction_of_coupling_end VARCHAR(50),
        diagram TEXT,
        status VARCHAR(50),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Create DC Motor Data Sheets Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[dc_motor_data_sheets]') AND type in (N'U'))
BEGIN
    CREATE TABLE dc_motor_data_sheets (
        id INT IDENTITY(1,1) PRIMARY KEY,
        job_no INT NOT NULL,
        captain VARCHAR(100),
        sheet_date DATE,
        party VARCHAR(200),
        final_test_date DATE,
        name_plate_details TEXT,
        power_kw VARCHAR(50),
        voltage_volts VARCHAR(50),
        current_amp VARCHAR(50),
        speed_rpm VARCHAR(50),
        capacity_hp VARCHAR(50),
        make VARCHAR(100),
        type VARCHAR(100),
        class_of_insulation VARCHAR(50),
        serial_number_sl_no VARCHAR(100),
        total_weight VARCHAR(50),
        year_of_mfg VARCHAR(10),
        note TEXT,
        
        -- Armature Winding Details
        type_of_winding VARCHAR(100),
        type_of_conductor VARCHAR(100),
        no_of_slots INT,
        slot_size VARCHAR(100),
        no_of_turns_in_each_coil INT,
        conductor_size VARCHAR(100),
        wires_in_each_coil INT,
        no_of_coils_in_series_set INT,
        commutator_pitch_bottom_coil VARCHAR(100),
        commutator_pitch_top_coil VARCHAR(100),
        commutator_pitch_of_equilizer VARCHAR(100),
        no_of_parallel_strips INT,
        conductor_size_of_equilizer_ring VARCHAR(100),
        winding_pitch_slot_pitch VARCHAR(100),
        weight_of_each_set_of_coils VARCHAR(50),
        total_set_of_coils INT,
        
        -- Field Coils Details
        type_of_conductor_main_pole VARCHAR(100),
        type_of_conductor_inter_pole VARCHAR(100),
        type_of_conductor_compensating_winding VARCHAR(100),
        conductor_size_main_pole VARCHAR(100),
        conductor_size_inter_pole VARCHAR(100),
        conductor_size_compensating_winding VARCHAR(100),
        no_of_turns_in_each_layer_main_pole INT,
        no_of_turns_in_each_layer_inter_pole INT,
        no_of_turns_in_each_layer_compensating_winding INT,
        total_no_of_layer_main_pole INT,
        total_no_of_layer_inter_pole INT,
        total_no_of_layer_compensating_winding INT,
        total_no_of_turns_main_pole INT,
        total_no_of_turns_inter_pole INT,
        total_no_of_turns_compensating_winding INT,
        resistance_of_coil_main_pole VARCHAR(50),
        resistance_of_coil_inter_pole VARCHAR(50),
        resistance_of_coil_compensating_winding VARCHAR(50),
        weight_of_each_coil_main_pole VARCHAR(50),
        weight_of_each_coil_inter_pole VARCHAR(50),
        weight_of_each_coil_compensating_winding VARCHAR(50),
        core_dimension_mm_main_pole VARCHAR(100),
        core_dimension_mm_inter_pole VARCHAR(100),
        core_dimension_mm_compensating_winding VARCHAR(100),
        core_insulation_thickness_mm_main_pole VARCHAR(50),
        core_insulation_thickness_mm_inter_pole VARCHAR(50),
        core_insulation_thickness_mm_compensating_winding VARCHAR(50),
        coil_size_after_insulation_mm_main_pole VARCHAR(100),
        coil_size_after_insulation_mm_inter_pole VARCHAR(100),
        coil_size_after_insulation_mm_compensating_winding VARCHAR(100),
        
        -- Other Details
        other_details_of_motor TEXT,
        weight_of_copper_aluminium_scrap VARCHAR(50),
        types_of_bearing_and_bearing_no_load_side VARCHAR(100),
        types_of_bearing_and_bearing_no_back_side VARCHAR(100),
        diagrams TEXT,
        status VARCHAR(50),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Create Test Reports Table (Complete)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[test_reports]') AND type in (N'U'))
BEGIN
    CREATE TABLE test_reports (
        id INT IDENTITY(1,1) PRIMARY KEY,
        timestamp DATETIME DEFAULT GETDATE(),
        report_id VARCHAR(100) NOT NULL UNIQUE,
        customer VARCHAR(200),
        repairer VARCHAR(200),
        service_order_number VARCHAR(100),
        service_order_date DATE,
        gatepass_number VARCHAR(100),
        gatepass_date DATE,
        date_of_testing DATE,
        kw VARCHAR(50),
        sl_no VARCHAR(100),
        volts VARCHAR(50),
        rpm VARCHAR(50),
        [current] VARCHAR(50),
        make VARCHAR(100),
        duty VARCHAR(100),
        frequency VARCHAR(50),
        hp VARCHAR(50),
        ir_stator_phase_earth_value VARCHAR(50),
        ir_stator_phase_earth_unit VARCHAR(20),
        ir_stator_phase_phase_value VARCHAR(50),
        ir_stator_phase_phase_unit VARCHAR(20),
        resistance_connection VARCHAR(50),
        resistance_unit VARCHAR(20),
        r1r2_resistance_value VARCHAR(50),
        y1y2_resistance_value VARCHAR(50),
        b1b2_resistance_value VARCHAR(50),
        r1r2_inductance_mh VARCHAR(50),
        y1y2_inductance_mh VARCHAR(50),
        b1b2_inductance_mh VARCHAR(50),
        polarity VARCHAR(50),
        cb_voltage_applied_ry_volt VARCHAR(50),
        cb_current_r_amp VARCHAR(50),
        cb_voltage_applied_yb_volt VARCHAR(50),
        cb_current_y_amp VARCHAR(50),
        cb_voltage_applied_rb_volt VARCHAR(50),
        cb_current_b_amp VARCHAR(50),
        br_voltage_applied_ry_volt VARCHAR(50),
        br_current_r_amp VARCHAR(50),
        br_voltage_applied_yb_volt VARCHAR(50),
        br_current_y_amp VARCHAR(50),
        br_voltage_applied_rb_volt VARCHAR(50),
        br_current_b_amp VARCHAR(50),
        nlt_connection VARCHAR(50),
        nlt_voltage_applied_ry_volts VARCHAR(50),
        nlt_current_r_amp VARCHAR(50),
        nlt_voltage_applied_yb_volts VARCHAR(50),
        nlt_current_y_amp VARCHAR(50),
        nlt_voltage_applied_rb_volts VARCHAR(50),
        nlt_current_b_amp VARCHAR(50),
        de_axial VARCHAR(50),
        de_horizontal VARCHAR(50),
        de_vertical VARCHAR(50),
        de_temperature VARCHAR(50),
        nde_axial VARCHAR(50),
        nde_horizontal VARCHAR(50),
        nde_vertical VARCHAR(50),
        nde_temperature VARCHAR(50),
        note TEXT,
        witness_name VARCHAR(200),
        witness_designation VARCHAR(200),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX ix_test_reports_report_id ON test_reports(report_id);
END
GO

-- Insert some sample data for testing
IF NOT EXISTS (SELECT * FROM clients)
BEGIN
    INSERT INTO clients (client_name, contact_person, email, phone) VALUES 
    ('ABC Industries', 'John Doe', 'john@abc.com', '1234567890'),
    ('XYZ Manufacturing', 'Jane Smith', 'jane@xyz.com', '9876543210');
END
GO

PRINT 'Database tables created/updated successfully!';

