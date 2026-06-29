-- Complete PostgreSQL Schema for ERP System (Generated & Sorted by Dependencies)

CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        permissions_json TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS store_skus (
        id SERIAL PRIMARY KEY,
        sku_code VARCHAR(100) NOT NULL UNIQUE,
        item_name VARCHAR(200) NOT NULL,
        size_type VARCHAR(200),
        category VARCHAR(100),
        unit VARCHAR(50),
        max_level FLOAT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        vendor_name VARCHAR(200) NOT NULL UNIQUE,
        vendor_address TEXT,
        contact_person VARCHAR(200),
        contact_number VARCHAR(20),
        email VARCHAR(200),
        gst_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS store_stock_ledger (
        id SERIAL PRIMARY KEY,
        sku_id INT NOT NULL,
        txn_type VARCHAR(50) NOT NULL,
        qty FLOAT NOT NULL,
        rate DECIMAL(18,2) NULL,
        ref_type VARCHAR(50) NULL,
        ref_id INT NULL,
        txn_date DATE DEFAULT CURRENT_DATE,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sku_id) REFERENCES store_skus(id)
    );

CREATE TABLE IF NOT EXISTS store_issue_transactions (
        id SERIAL PRIMARY KEY,
        issued_to VARCHAR(200) NOT NULL,
        issue_date DATE NOT NULL,
        remarks TEXT NULL,
        status VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS store_reservations (
        id SERIAL PRIMARY KEY,
        reserved_for VARCHAR(200) NOT NULL,
        reserve_date DATE NOT NULL,
        remarks TEXT NULL,
        status VARCHAR(50) DEFAULT 'Reserved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS enquiries (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
    );

CREATE TABLE IF NOT EXISTS sales_quotations (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enquiry_id) REFERENCES enquiries(id)
    );

CREATE TABLE IF NOT EXISTS sales_quotation_items (
        id SERIAL PRIMARY KEY,
        quotation_id INT NOT NULL,
        sl_no INT NULL,
        description TEXT NULL,
        quantity FLOAT NULL,
        unit VARCHAR(50) NULL,
        rate DECIMAL(18,2) NULL,
        amount DECIMAL(18,2) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quotation_id) REFERENCES sales_quotations(id)
    );

CREATE TABLE IF NOT EXISTS work_orders (
        id SERIAL PRIMARY KEY,
        enquiry_id INT NOT NULL,
        wo_link VARCHAR(500),
        wo_number VARCHAR(100),
        wo_date DATE,
        wo_value DECIMAL(18,2),
        wo_delivery DATE,
        status VARCHAR(50) DEFAULT 'Received',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enquiry_id) REFERENCES enquiries(id)
    );

CREATE TABLE IF NOT EXISTS job_sheets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(200),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        kw_hp VARCHAR(50),
        voltage VARCHAR(50),
        phase VARCHAR(20),
        "current" VARCHAR(50),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS job_entries (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
        status_remarks VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );

CREATE TABLE IF NOT EXISTS sales_invoices (
        id SERIAL PRIMARY KEY,
        invoice_no VARCHAR(100) NOT NULL UNIQUE,
        invoice_date DATE NULL,
        invoice_amount DECIMAL(18,2) NOT NULL,
        gst_percent DECIMAL(9,2) NULL,
        gst_amount DECIMAL(18,2) NULL,
        total_amount DECIMAL(18,2) NULL,
        remarks TEXT NULL,
        bill_to_name VARCHAR(200) NULL,
        bill_to_address TEXT NULL,
        bill_to_gstin VARCHAR(50) NULL,
        bill_to_state_code VARCHAR(10) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS sales_invoice_jobs (
        id SERIAL PRIMARY KEY,
        invoice_id INT NOT NULL,
        job_entry_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id),
        FOREIGN KEY (job_entry_id) REFERENCES job_entries(id)
    );

CREATE TABLE IF NOT EXISTS sales_invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INT NOT NULL,
        sl_no INT NULL,
        description TEXT NULL,
        quantity FLOAT NULL,
        unit VARCHAR(50) NULL,
        sac_code VARCHAR(50) NULL,
        rate DECIMAL(18,2) NULL,
        amount DECIMAL(18,2) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id)
    );

CREATE TABLE IF NOT EXISTS sales_payments (
        id SERIAL PRIMARY KEY,
        invoice_id INT NOT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        payment_mode VARCHAR(50) NULL,
        reference_no VARCHAR(100) NULL,
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id)
    );

CREATE TABLE IF NOT EXISTS indents (
        id SERIAL PRIMARY KEY,
        indent_number VARCHAR(50) NOT NULL UNIQUE,
        indent_date DATE DEFAULT CURRENT_DATE,
        job_sheet_id INT NULL,
        job_number INT NULL,
        indent_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Raised',
        approved_by INT NULL,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (approved_by) REFERENCES users(id)
    );

CREATE TABLE IF NOT EXISTS indent_items (
        id SERIAL PRIMARY KEY,
        indent_id INT NOT NULL,
        sku_id INT NULL,
        item_name VARCHAR(200),
        item_description TEXT,
        quantity FLOAT,
        unit VARCHAR(50),
        conductor_type VARCHAR(100),
        conductor_size VARCHAR(100),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (indent_id) REFERENCES indents(id),
        FOREIGN KEY (sku_id) REFERENCES store_skus(id)
    );

CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        quotation_id INT NULL,
        vendor_id INT NOT NULL,
        po_number VARCHAR(100) NOT NULL UNIQUE,
        po_date DATE NULL,
        po_value DECIMAL(18,2) NOT NULL,
        advance_payment DECIMAL(18,2) NULL,
        lead_time_days INT NULL,
        expected_delivery_date DATE NULL,
        status VARCHAR(50) DEFAULT 'Issued',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );

CREATE TABLE IF NOT EXISTS purchase_order_items (
        id SERIAL PRIMARY KEY,
        po_id INT NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        quantity FLOAT NOT NULL,
        unit_price DECIMAL(18,2) NOT NULL,
        total_value DECIMAL(18,2) NOT NULL,
        sku_id INT NULL,
        indent_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
        FOREIGN KEY (sku_id) REFERENCES store_skus(id),
        FOREIGN KEY (indent_id) REFERENCES indents(id)
    );

CREATE TABLE IF NOT EXISTS grns (
        id SERIAL PRIMARY KEY,
        po_id INT NULL,
        grn_number VARCHAR(100) NOT NULL UNIQUE,
        grn_date DATE,
        received_quantity FLOAT NULL,
        status VARCHAR(50) DEFAULT 'Received',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS grn_items (
        id SERIAL PRIMARY KEY,
        grn_id INT NOT NULL,
        sku_id INT NOT NULL,
        quantity FLOAT NOT NULL,
        rate DECIMAL(18,2) NULL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (grn_id) REFERENCES grns(id),
        FOREIGN KEY (sku_id) REFERENCES store_skus(id)
    );

CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        po_id INT NULL,
        job_sheet_id INT NULL,
        reference_type VARCHAR(50) NULL,
        reference_id INT NULL,
        bill_stage VARCHAR(50) NULL,
        bill_number VARCHAR(100) NOT NULL UNIQUE,
        bill_date DATE,
        bill_value DECIMAL(18,2) NOT NULL,
        advance_payment DECIMAL(18,2) DEFAULT 0,
        payable_value DECIMAL(18,2) NOT NULL,
        eway_bill_number VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        bill_id INT NOT NULL,
        payment_type VARCHAR(50),
        payment_amount DECIMAL(18,2) NOT NULL,
        payment_date DATE,
        payment_mode VARCHAR(50),
        reference_number VARCHAR(100),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES bills(id)
    );

CREATE TABLE IF NOT EXISTS ac_motor_data_sheets (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS dc_motor_data_sheets (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS test_reports (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
        "current" VARCHAR(50),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS machining (
        id SERIAL PRIMARY KEY,
        job_number INT NULL,
        particulars TEXT NULL,
        status VARCHAR(30) NOT NULL,
        outsourced_date DATE NULL,
        outsourced_to VARCHAR(200) NULL,
        expected_delivery DATE NULL,
        received_at TIMESTAMP NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        machining_indent_no VARCHAR(30) NULL,
        indent_id INT NULL,
        total_bill_value DECIMAL(18, 2) NULL,
        advance_required BOOLEAN NULL,
        advance_amount DECIMAL(18, 2) NULL
    );

CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id INT NULL,
        username VARCHAR(100) NULL,
        module VARCHAR(50) NULL,
        action VARCHAR(50) NULL,
        method VARCHAR(10) NULL,
        path VARCHAR(300) NULL,
        status_code INT NULL,
        entity_id INT NULL,
        details_json TEXT NULL
    );

CREATE TABLE IF NOT EXISTS data_sheets (
    id SERIAL PRIMARY KEY,
    job_no INT NULL,
    sheet_type VARCHAR(100) NULL,
    data_json TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS ix_clients_client_name ON clients (client_name);
CREATE INDEX IF NOT EXISTS ix_store_skus_sku_code ON store_skus (sku_code);
CREATE INDEX IF NOT EXISTS ix_store_skus_item_name ON store_skus (item_name);
CREATE INDEX IF NOT EXISTS ix_store_stock_ledger_sku_id ON store_stock_ledger (sku_id);
CREATE INDEX IF NOT EXISTS ix_store_stock_ledger_txn_date ON store_stock_ledger (txn_date);
CREATE INDEX IF NOT EXISTS ix_grns_grn_number ON grns (grn_number);
CREATE INDEX IF NOT EXISTS ix_grns_po_id ON grns (po_id);
CREATE INDEX IF NOT EXISTS ix_grn_items_grn_id ON grn_items (grn_id);
CREATE INDEX IF NOT EXISTS ix_grn_items_sku_id ON grn_items (sku_id);
CREATE INDEX IF NOT EXISTS ix_bills_bill_number ON bills (bill_number);
CREATE INDEX IF NOT EXISTS ix_bills_po_id ON bills (po_id);
CREATE INDEX IF NOT EXISTS ix_payments_bill_id ON payments (bill_id);
CREATE INDEX IF NOT EXISTS ix_sales_invoices_invoice_no ON sales_invoices (invoice_no);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_invoice_jobs_invoice_job ON sales_invoice_jobs (invoice_id, job_entry_id);
CREATE INDEX IF NOT EXISTS ix_sales_invoice_jobs_invoice_id ON sales_invoice_jobs (invoice_id);
CREATE INDEX IF NOT EXISTS ix_sales_invoice_jobs_job_entry_id ON sales_invoice_jobs (job_entry_id);
CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);
CREATE INDEX IF NOT EXISTS ix_vendors_vendor_name ON vendors (vendor_name);
CREATE INDEX IF NOT EXISTS ix_indents_indent_number ON indents (indent_number);
CREATE INDEX IF NOT EXISTS ix_indents_status ON indents (status);
CREATE INDEX IF NOT EXISTS ix_indent_items_indent_id ON indent_items (indent_id);
CREATE INDEX IF NOT EXISTS ix_enquiries_status ON enquiries (status);
CREATE INDEX IF NOT EXISTS ix_work_orders_enquiry_id ON work_orders (enquiry_id);
CREATE INDEX IF NOT EXISTS ix_sales_quotations_enquiry_id ON sales_quotations (enquiry_id);
CREATE INDEX IF NOT EXISTS ix_sales_quotations_quotation_no ON sales_quotations (quotation_no);
CREATE INDEX IF NOT EXISTS ix_sales_quotation_items_quotation_id ON sales_quotation_items (quotation_id);
CREATE INDEX IF NOT EXISTS ix_job_entries_job_number ON job_entries (job_number);
CREATE INDEX IF NOT EXISTS ix_job_sheets_job_number ON job_sheets (job_number);
CREATE INDEX IF NOT EXISTS ix_test_reports_report_id ON test_reports (report_id);
CREATE INDEX IF NOT EXISTS ix_sales_invoice_items_invoice_id ON sales_invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS ix_sales_payments_invoice_id ON sales_payments (invoice_id);
CREATE INDEX IF NOT EXISTS ix_purchase_orders_po_number ON purchase_orders (po_number);
CREATE INDEX IF NOT EXISTS ix_purchase_order_items_po_id ON purchase_order_items (po_id);

-- Security Deposits (used by Accounting module)
CREATE TABLE IF NOT EXISTS security_deposits (
    id SERIAL PRIMARY KEY,
    job_sheet_id INT NULL,
    sd_amount DECIMAL(18,2) NOT NULL,
    sd_date DATE NOT NULL,
    guarantee_period_months INT NOT NULL DEFAULT 12,
    release_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Held',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_security_deposits_job_sheet_id ON security_deposits (job_sheet_id);
CREATE INDEX IF NOT EXISTS ix_security_deposits_status ON security_deposits (status);
