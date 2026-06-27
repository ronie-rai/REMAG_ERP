import express from 'express';
import sql, { getConnection } from '../config/database.js';
import { generateJobNumber, calculateConductorQuantity, generateIndentNumber, generateTestReportId } from '../utils/numberGenerator.js';
import { generateJobSheetPDF, generateDataSheetPDF, generateTestReportPDF } from '../utils/pdfGenerator.js';
import { requireAuth, requireModuleAccess } from '../utils/auth.js';
import { auditMiddleware } from '../utils/audit.js';

const router = express.Router();

router.use(requireAuth, requireModuleAccess('production'));
router.use(auditMiddleware('production'));

// Get all job numbers for dropdown selection
router.get('/job-numbers', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT job_number, party_name, department 
      FROM job_entries 
      ORDER BY job_number DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching job numbers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Job Sheet (Updated with all required fields)
router.post('/job-sheets', async (req, res) => {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('email', sql.VarChar(200), req.body.email)
      .input('kw_hp', sql.VarChar(50), req.body.kw_hp)
      .input('voltage', sql.VarChar(50), req.body.voltage)
      .input('phase', sql.VarChar(20), req.body.phase)
      .input('current', sql.VarChar(50), req.body.current)
      .input('speed_rpm', sql.VarChar(50), req.body.speed_rpm)
      .input('sl_no', sql.VarChar(100), req.body.sl_no)
      .input('type', sql.VarChar(100), req.body.type)
      .input('weight_kg', sql.VarChar(50), req.body.weight_kg)
      .input('make', sql.VarChar(100), req.body.make)
      .input('connection', sql.VarChar(50), req.body.connection)
      .input('date', sql.Date, req.body.date)
      .input('job_number', sql.Int, req.body.job_number)
      .input('party_name', sql.VarChar(200), req.body.party_name)
      .input('department', sql.VarChar(100), req.body.department)
      .input('observation', sql.Text, req.body.observation)
      .input('stator_winding', sql.Text, req.body.stator_winding)
      .input('stator_winding_remarks', sql.Text, req.body.stator_winding_remarks)
      .input('rotor_winding', sql.Text, req.body.rotor_winding)
      .input('rotor_winding_remarks', sql.Text, req.body.rotor_winding_remarks)
      .input('bearing_bearing_seat_de', sql.Text, req.body.bearing_bearing_seat_de)
      .input('bearing_bearing_seat_de_remarks', sql.Text, req.body.bearing_bearing_seat_de_remarks)
      .input('bearing_bearing_seat_nde', sql.Text, req.body.bearing_bearing_seat_nde)
      .input('bearing_bearing_seat_nde_remarks', sql.Text, req.body.bearing_bearing_seat_nde_remarks)
      .input('core_stator', sql.Text, req.body.core_stator)
      .input('core_stator_remarks', sql.Text, req.body.core_stator_remarks)
      .input('core_rotor', sql.Text, req.body.core_rotor)
      .input('core_rotor_remarks', sql.Text, req.body.core_rotor_remarks)
      .input('rotor_shaft', sql.Text, req.body.rotor_shaft)
      .input('rotor_shaft_remarks', sql.Text, req.body.rotor_shaft_remarks)
      .input('rotor_ring_bar', sql.Text, req.body.rotor_ring_bar)
      .input('rotor_ring_bar_remarks', sql.Text, req.body.rotor_ring_bar_remarks)
      .input('rtd_temp_detector', sql.Text, req.body.rtd_temp_detector)
      .input('rtd_temp_detector_remarks', sql.Text, req.body.rtd_temp_detector_remarks)
      .input('space_heater', sql.Text, req.body.space_heater)
      .input('space_heater_remarks', sql.Text, req.body.space_heater_remarks)
      .input('fan_cover', sql.Text, req.body.fan_cover)
      .input('fan_cover_remarks', sql.Text, req.body.fan_cover_remarks)
      .input('grease_cup_de', sql.Text, req.body.grease_cup_de)
      .input('grease_cup_de_remarks', sql.Text, req.body.grease_cup_de_remarks)
      .input('grease_cup_nde', sql.Text, req.body.grease_cup_nde)
      .input('grease_cup_nde_remarks', sql.Text, req.body.grease_cup_nde_remarks)
      .input('bearing_housing_de', sql.Text, req.body.bearing_housing_de)
      .input('bearing_housing_de_remarks', sql.Text, req.body.bearing_housing_de_remarks)
      .input('bearing_housing_nde', sql.Text, req.body.bearing_housing_nde)
      .input('bearing_housing_nde_remarks', sql.Text, req.body.bearing_housing_nde_remarks)
      .input('btd', sql.Text, req.body.btd)
      .input('btd_remarks', sql.Text, req.body.btd_remarks)
      .input('terminal_block', sql.Text, req.body.terminal_block)
      .input('terminal_block_remarks', sql.Text, req.body.terminal_block_remarks)
      .input('terminal_box', sql.Text, req.body.terminal_box)
      .input('terminal_box_remarks', sql.Text, req.body.terminal_box_remarks)
      .input('foot_leg', sql.Text, req.body.foot_leg)
      .input('foot_leg_remarks', sql.Text, req.body.foot_leg_remarks)
      .input('circlip_lock', sql.Text, req.body.circlip_lock)
      .input('circlip_lock_remarks', sql.Text, req.body.circlip_lock_remarks)
      .input('keys', sql.Text, req.body.keys)
      .input('keys_remarks', sql.Text, req.body.keys_remarks)
      .input('carbon_brush_rocker_arm', sql.Text, req.body.carbon_brush_rocker_arm)
      .input('carbon_brush_rocker_arm_remarks', sql.Text, req.body.carbon_brush_rocker_arm_remarks)
      .input('others', sql.Text, req.body.others)
      .query(`INSERT INTO job_sheets (email, kw_hp, voltage, phase, [current], speed_rpm, sl_no, [type], 
              weight_kg, make, connection, [date], job_number, party_name, department, observation, 
              stator_winding, stator_winding_remarks, rotor_winding, rotor_winding_remarks, 
              bearing_bearing_seat_de, bearing_bearing_seat_de_remarks, bearing_bearing_seat_nde, 
              bearing_bearing_seat_nde_remarks, core_stator, core_stator_remarks, core_rotor, 
              core_rotor_remarks, rotor_shaft, rotor_shaft_remarks, rotor_ring_bar, rotor_ring_bar_remarks, 
              rtd_temp_detector, rtd_temp_detector_remarks, space_heater, space_heater_remarks, 
              fan_cover, fan_cover_remarks, grease_cup_de, grease_cup_de_remarks, grease_cup_nde, 
              grease_cup_nde_remarks, bearing_housing_de, bearing_housing_de_remarks, bearing_housing_nde, 
              bearing_housing_nde_remarks, btd, btd_remarks, terminal_block, terminal_block_remarks, 
              terminal_box, terminal_box_remarks, foot_leg, foot_leg_remarks, circlip_lock, 
              circlip_lock_remarks, keys, keys_remarks, carbon_brush_rocker_arm, 
              carbon_brush_rocker_arm_remarks, others, created_at, updated_at)
              OUTPUT INSERTED.*
              VALUES (@email, @kw_hp, @voltage, @phase, @current, @speed_rpm, @sl_no, @type, 
              @weight_kg, @make, @connection, @date, @job_number, @party_name, @department, @observation, 
              @stator_winding, @stator_winding_remarks, @rotor_winding, @rotor_winding_remarks, 
              @bearing_bearing_seat_de, @bearing_bearing_seat_de_remarks, @bearing_bearing_seat_nde, 
              @bearing_bearing_seat_nde_remarks, @core_stator, @core_stator_remarks, @core_rotor, 
              @core_rotor_remarks, @rotor_shaft, @rotor_shaft_remarks, @rotor_ring_bar, @rotor_ring_bar_remarks, 
              @rtd_temp_detector, @rtd_temp_detector_remarks, @space_heater, @space_heater_remarks, 
              @fan_cover, @fan_cover_remarks, @grease_cup_de, @grease_cup_de_remarks, @grease_cup_nde, 
              @grease_cup_nde_remarks, @bearing_housing_de, @bearing_housing_de_remarks, @bearing_housing_nde, 
              @bearing_housing_nde_remarks, @btd, @btd_remarks, @terminal_block, @terminal_block_remarks, 
              @terminal_box, @terminal_box_remarks, @foot_leg, @foot_leg_remarks, @circlip_lock, 
              @circlip_lock_remarks, @keys, @keys_remarks, @carbon_brush_rocker_arm, 
              @carbon_brush_rocker_arm_remarks, @others, GETDATE(), GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating job sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update DC Motor Data Sheet
router.put('/dc-motor-data-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const readonlyFields = new Set(['id', 'created_at', 'updated_at']);
    const updateKeys = Object.keys(req.body || {}).filter((k) => !readonlyFields.has(k));
    const fields = updateKeys.map((key) => `${key} = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);

    updateKeys.forEach((key) => {
      const value = req.body[key];
      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else if (typeof value === 'number') {
        request.input(key, sql.Int, value);
      } else if (typeof value === 'boolean') {
        request.input(key, sql.Bit, value);
      } else if (key === 'sheet_date' || key.endsWith('_date')) {
        const d = new Date(value);
        request.input(key, sql.Date, Number.isNaN(d.getTime()) ? null : d);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });

    if (!fields) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const result = await request.query(`
      UPDATE dc_motor_data_sheets SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'DC motor data sheet not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating DC motor data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete DC Motor Data Sheet
router.delete('/dc-motor-data-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM dc_motor_data_sheets OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'DC motor data sheet not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting DC motor data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Job Sheets
router.get('/job-sheets', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        js.*,
        je.job_type,
        COALESCE(je.timestamp, je.created_at) AS received_date
      FROM job_sheets js
      LEFT JOIN job_entries je ON je.job_number = js.job_number
      ORDER BY js.id DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching job sheets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Job Sheet
router.get('/job-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM job_sheets WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job sheet not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching job sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Job Sheets by Job Number
router.get('/job-sheets/job/:job_number', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('job_number', sql.Int, req.params.job_number)
      .query('SELECT * FROM job_sheets WHERE job_number = @job_number ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching job sheets by job number:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Job Sheet
router.put('/job-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const updateKeys = Object.keys(req.body).filter((key) => !['id', 'created_at', 'updated_at'].includes(key));
    const fields = updateKeys.map((key) => `[${key}] = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);
    
    updateKeys.forEach((key) => {
      const value = req.body[key];
      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else if (typeof value === 'number') {
        request.input(key, sql.Int, value);
      } else if (typeof value === 'boolean') {
        request.input(key, sql.Bit, value);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });

    if (!fields) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    const result = await request.query(`
      UPDATE job_sheets SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job sheet not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating job sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Job Sheet
router.delete('/job-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM job_sheets OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job sheet not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting job sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create AC Motor Data Sheet
router.post('/ac-motor-data-sheets', async (req, res) => {
  try {
    const pool = await getConnection();

    const toSqlDate = (value) => {
      if (!value) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    
    const result = await pool.request()
      .input('job_no', sql.Int, req.body.job_no)
      .input('captain', sql.VarChar(100), req.body.captain)
      .input('sheet_date', sql.Date, toSqlDate(req.body.sheet_date))
      .input('party', sql.VarChar(200), req.body.party)
      .input('final_test_date', sql.Date, toSqlDate(req.body.final_test_date))
      .input('nameplate_details', sql.Text, req.body.nameplate_details)
      .input('slip_ring', sql.VarChar(50), req.body.slip_ring)
      .input('cage', sql.VarChar(50), req.body.cage)
      .input('make', sql.VarChar(100), req.body.make)
      .input('power_kw', sql.VarChar(50), req.body.power_kw)
      .input('voltage_volts', sql.VarChar(50), req.body.voltage_volts)
      .input('frequency_hz', sql.VarChar(50), req.body.frequency_hz)
      .input('current_amp', sql.VarChar(50), req.body.current_amp)
      .input('capacity_hp', sql.VarChar(50), req.body.capacity_hp)
      .input('year_of_mfg', sql.VarChar(10), req.body.year_of_mfg)
      .input('type', sql.VarChar(100), req.body.type)
      .input('class_of_insulation', sql.VarChar(50), req.body.class_of_insulation)
      .input('serial_number_sl_no', sql.VarChar(100), req.body.serial_number_sl_no)
      .input('power_factor_pf', sql.VarChar(50), req.body.power_factor_pf)
      .input('rotor_current_amp', sql.VarChar(50), req.body.rotor_current_amp)
      .input('rotor_voltage_volts', sql.VarChar(50), req.body.rotor_voltage_volts)
      .input('total_weight', sql.VarChar(50), req.body.total_weight)
      .input('frame', sql.VarChar(50), req.body.frame)
      .input('speed_rpm', sql.VarChar(50), req.body.speed_rpm)
      .input('phase', sql.VarChar(20), req.body.phase)
      .input('connection_y_delta', sql.VarChar(20), req.body.connection_y_delta)
      .input('type_of_winding', sql.VarChar(100), req.body.type_of_winding)
      .input('type_of_conductor', sql.VarChar(100), req.body.type_of_conductor)
      .input('winding_details', sql.Text, req.body.winding_details)
      .input('no_of_slots_stator', sql.Int, req.body.no_of_slots_stator)
      .input('slot_width_height_length_stator', sql.VarChar(100), req.body.slot_width_height_length_stator)
      .input('slot_insulation_stator', sql.VarChar(100), req.body.slot_insulation_stator)
      .input('total_set_of_coils_stator', sql.Int, req.body.total_set_of_coils_stator)
      .input('no_of_coils_in_series_per_set_stator', sql.Int, req.body.no_of_coils_in_series_per_set_stator)
      .input('wedges_size_and_quantity_stator', sql.VarChar(100), req.body.wedges_size_and_quantity_stator)
      .input('type_of_rtds_stator', sql.VarChar(100), req.body.type_of_rtds_stator)
      .input('type_of_btds_stator', sql.VarChar(100), req.body.type_of_btds_stator)
      .input('space_heater_stator', sql.VarChar(100), req.body.space_heater_stator)
      .input('no_of_strips_turns_in_each_coil_stator', sql.Int, req.body.no_of_strips_turns_in_each_coil_stator)
      .input('size_of_conductor_bare_stator', sql.VarChar(100), req.body.size_of_conductor_bare_stator)
      .input('conductor_size_with_insulation_stator', sql.VarChar(100), req.body.conductor_size_with_insulation_stator)
      .input('coil_dimension_stator', sql.VarChar(100), req.body.coil_dimension_stator)
      .input('no_of_slots_rotor', sql.Int, req.body.no_of_slots_rotor)
      .input('slot_width_height_length_rotor', sql.VarChar(100), req.body.slot_width_height_length_rotor)
      .input('slot_insulation_rotor', sql.VarChar(100), req.body.slot_insulation_rotor)
      .input('total_set_of_coils_rotor', sql.Int, req.body.total_set_of_coils_rotor)
      .input('no_of_coils_in_series_per_set_rotor', sql.Int, req.body.no_of_coils_in_series_per_set_rotor)
      .input('wedges_size_and_quantity_rotor', sql.VarChar(100), req.body.wedges_size_and_quantity_rotor)
      .input('type_of_rtds_rotor', sql.VarChar(100), req.body.type_of_rtds_rotor)
      .input('type_of_btds_rotor', sql.VarChar(100), req.body.type_of_btds_rotor)
      .input('space_heater_rotor', sql.VarChar(100), req.body.space_heater_rotor)
      .input('no_of_strips_turns_in_each_coil_rotor', sql.Int, req.body.no_of_strips_turns_in_each_coil_rotor)
      .input('size_of_conductor_bare_rotor', sql.VarChar(100), req.body.size_of_conductor_bare_rotor)
      .input('conductor_size_with_insulation_rotor', sql.VarChar(100), req.body.conductor_size_with_insulation_rotor)
      .input('coil_dimension_rotor', sql.VarChar(100), req.body.coil_dimension_rotor)
      .input('overhang_projection_coils_connection_side', sql.VarChar(100), req.body.overhang_projection_coils_connection_side)
      .input('overhang_projection_coils_back_side', sql.VarChar(100), req.body.overhang_projection_coils_back_side)
      .input('winding_pitch_connection_side', sql.VarChar(100), req.body.winding_pitch_connection_side)
      .input('no_of_terminal_leads', sql.Int, req.body.no_of_terminal_leads)
      .input('weight_of_copper_aluminium_scrap', sql.VarChar(50), req.body.weight_of_copper_aluminium_scrap)
      .input('type_of_bearing_and_bearing_no_load_side', sql.VarChar(100), req.body.type_of_bearing_and_bearing_no_load_side)
      .input('type_of_bearing_and_bearing_no_back_side', sql.VarChar(100), req.body.type_of_bearing_and_bearing_no_back_side)
      .input('direction_of_coupling_end', sql.VarChar(50), req.body.direction_of_coupling_end)
      .input('diagram', sql.Text, req.body.diagram)
      .input('status', sql.VarChar(50), req.body.status || 'Draft')
      .query(`INSERT INTO ac_motor_data_sheets (job_no, captain, sheet_date, party, final_test_date, 
              nameplate_details, slip_ring, cage, make, power_kw, voltage_volts, frequency_hz, 
              current_amp, capacity_hp, year_of_mfg, type, class_of_insulation, serial_number_sl_no, 
              power_factor_pf, rotor_current_amp, rotor_voltage_volts, total_weight, frame, 
              speed_rpm, phase, connection_y_delta, type_of_winding, type_of_conductor, 
              winding_details, no_of_slots_stator, slot_width_height_length_stator, slot_insulation_stator, total_set_of_coils_stator,
              no_of_coils_in_series_per_set_stator, wedges_size_and_quantity_stator, type_of_rtds_stator, 
              type_of_btds_stator, space_heater_stator, no_of_strips_turns_in_each_coil_stator, size_of_conductor_bare_stator, 
              conductor_size_with_insulation_stator, coil_dimension_stator, no_of_slots_rotor, 
              slot_width_height_length_rotor, slot_insulation_rotor, total_set_of_coils_rotor, no_of_coils_in_series_per_set_rotor, 
              wedges_size_and_quantity_rotor, type_of_rtds_rotor, type_of_btds_rotor, 
              space_heater_rotor, no_of_strips_turns_in_each_coil_rotor, size_of_conductor_bare_rotor, 
              conductor_size_with_insulation_rotor, coil_dimension_rotor, overhang_projection_coils_connection_side, 
              overhang_projection_coils_back_side, winding_pitch_connection_side, no_of_terminal_leads, 
              weight_of_copper_aluminium_scrap, type_of_bearing_and_bearing_no_load_side, 
              type_of_bearing_and_bearing_no_back_side, direction_of_coupling_end, diagram, status, 
              created_at, updated_at)
              OUTPUT INSERTED.*
              VALUES (@job_no, @captain, @sheet_date, @party, @final_test_date, 
              @nameplate_details, @slip_ring, @cage, @make, @power_kw, @voltage_volts, @frequency_hz, 
              @current_amp, @capacity_hp, @year_of_mfg, @type, @class_of_insulation, @serial_number_sl_no, 
              @power_factor_pf, @rotor_current_amp, @rotor_voltage_volts, @total_weight, @frame, 
              @speed_rpm, @phase, @connection_y_delta, @type_of_winding, @type_of_conductor, 
              @winding_details, @no_of_slots_stator, @slot_width_height_length_stator, @slot_insulation_stator, @total_set_of_coils_stator,
              @no_of_coils_in_series_per_set_stator, @wedges_size_and_quantity_stator, @type_of_rtds_stator, 
              @type_of_btds_stator, @space_heater_stator, @no_of_strips_turns_in_each_coil_stator, @size_of_conductor_bare_stator, 
              @conductor_size_with_insulation_stator, @coil_dimension_stator, @no_of_slots_rotor, 
              @slot_width_height_length_rotor, @slot_insulation_rotor, @total_set_of_coils_rotor, @no_of_coils_in_series_per_set_rotor, 
              @wedges_size_and_quantity_rotor, @type_of_rtds_rotor, @type_of_btds_rotor, 
              @space_heater_rotor, @no_of_strips_turns_in_each_coil_rotor, @size_of_conductor_bare_rotor, 
              @conductor_size_with_insulation_rotor, @coil_dimension_rotor, @overhang_projection_coils_connection_side, 
              @overhang_projection_coils_back_side, @winding_pitch_connection_side, @no_of_terminal_leads, 
              @weight_of_copper_aluminium_scrap, @type_of_bearing_and_bearing_no_load_side, 
              @type_of_bearing_and_bearing_no_back_side, @direction_of_coupling_end, @diagram, @status, 
              GETDATE(), GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating AC motor data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get AC Motor Data Sheets
router.get('/ac-motor-data-sheets', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM ac_motor_data_sheets ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching AC motor data sheets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single AC Motor Data Sheet
router.get('/ac-motor-data-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM ac_motor_data_sheets WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'AC motor data sheet not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching AC motor data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get AC Motor Data Sheet by Job Number
router.get('/ac-motor-data-sheets/job/:job_no', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('job_no', sql.Int, req.params.job_no)
      .query('SELECT * FROM ac_motor_data_sheets WHERE job_no = @job_no');
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching AC motor data sheet by job number:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update AC Motor Data Sheet
router.put('/ac-motor-data-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const readonlyFields = new Set(['id', 'created_at', 'updated_at']);
    const updateKeys = Object.keys(req.body || {}).filter((k) => !readonlyFields.has(k));
    const fields = updateKeys.map((key) => `${key} = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);

    updateKeys.forEach((key) => {
      const value = req.body[key];
      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else if (typeof value === 'number') {
        request.input(key, sql.Int, value);
      } else if (typeof value === 'boolean') {
        request.input(key, sql.Bit, value);
      } else if (key === 'sheet_date' || key.endsWith('_date')) {
        const d = new Date(value);
        request.input(key, sql.Date, Number.isNaN(d.getTime()) ? null : d);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });

    if (!fields) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const result = await request.query(`
      UPDATE ac_motor_data_sheets SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'AC motor data sheet not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating AC motor data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete AC Motor Data Sheet
router.delete('/ac-motor-data-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM ac_motor_data_sheets OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'AC motor data sheet not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting AC motor data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});
router.post('/dc-motor-data-sheets', async (req, res) => {
  try {
    const pool = await getConnection();

    const toSqlDate = (value) => {
      if (!value) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    
    const result = await pool.request()
      .input('job_no', sql.Int, req.body.job_no)
      .input('captain', sql.VarChar(100), req.body.captain)
      .input('sheet_date', sql.Date, toSqlDate(req.body.sheet_date))
      .input('party', sql.VarChar(200), req.body.party)
      .input('final_test_date', sql.Date, toSqlDate(req.body.final_test_date))
      .input('name_plate_details', sql.Text, req.body.name_plate_details)
      .input('power_kw', sql.VarChar(50), req.body.power_kw)
      .input('voltage_volts', sql.VarChar(50), req.body.voltage_volts)
      .input('current_amp', sql.VarChar(50), req.body.current_amp)
      .input('speed_rpm', sql.VarChar(50), req.body.speed_rpm)
      .input('capacity_hp', sql.VarChar(50), req.body.capacity_hp)
      .input('make', sql.VarChar(100), req.body.make)
      .input('type', sql.VarChar(100), req.body.type)
      .input('class_of_insulation', sql.VarChar(50), req.body.class_of_insulation)
      .input('serial_number_sl_no', sql.VarChar(100), req.body.serial_number_sl_no)
      .input('total_weight', sql.VarChar(50), req.body.total_weight)
      .input('year_of_mfg', sql.VarChar(10), req.body.year_of_mfg)
      .input('note', sql.Text, req.body.note)
      .input('type_of_winding', sql.VarChar(100), req.body.type_of_winding)
      .input('type_of_conductor', sql.VarChar(100), req.body.type_of_conductor)
      .input('no_of_slots', sql.Int, req.body.no_of_slots)
      .input('slot_size', sql.VarChar(100), req.body.slot_size)
      .input('no_of_turns_in_each_coil', sql.Int, req.body.no_of_turns_in_each_coil)
      .input('conductor_size', sql.VarChar(100), req.body.conductor_size)
      .input('wires_in_each_coil', sql.Int, req.body.wires_in_each_coil)
      .input('no_of_coils_in_series_set', sql.Int, req.body.no_of_coils_in_series_set)
      .input('commutator_pitch_bottom_coil', sql.VarChar(100), req.body.commutator_pitch_bottom_coil)
      .input('commutator_pitch_top_coil', sql.VarChar(100), req.body.commutator_pitch_top_coil)
      .input('commutator_pitch_of_equilizer', sql.VarChar(100), req.body.commutator_pitch_of_equilizer)
      .input('no_of_parallel_strips', sql.Int, req.body.no_of_parallel_strips)
      .input('conductor_size_of_equilizer_ring', sql.VarChar(100), req.body.conductor_size_of_equilizer_ring)
      .input('winding_pitch_slot_pitch', sql.VarChar(100), req.body.winding_pitch_slot_pitch)
      .input('weight_of_each_set_of_coils', sql.VarChar(50), req.body.weight_of_each_set_of_coils)
      .input('total_set_of_coils', sql.Int, req.body.total_set_of_coils)
      .input('type_of_conductor_main_pole', sql.VarChar(100), req.body.type_of_conductor_main_pole)
      .input('type_of_conductor_inter_pole', sql.VarChar(100), req.body.type_of_conductor_inter_pole)
      .input('type_of_conductor_compensating_winding', sql.VarChar(100), req.body.type_of_conductor_compensating_winding)
      .input('conductor_size_main_pole', sql.VarChar(100), req.body.conductor_size_main_pole)
      .input('conductor_size_inter_pole', sql.VarChar(100), req.body.conductor_size_inter_pole)
      .input('conductor_size_compensating_winding', sql.VarChar(100), req.body.conductor_size_compensating_winding)
      .input('no_of_turns_in_each_layer_main_pole', sql.Int, req.body.no_of_turns_in_each_layer_main_pole)
      .input('no_of_turns_in_each_layer_inter_pole', sql.Int, req.body.no_of_turns_in_each_layer_inter_pole)
      .input('no_of_turns_in_each_layer_compensating_winding', sql.Int, req.body.no_of_turns_in_each_layer_compensating_winding)
      .input('total_no_of_layer_main_pole', sql.Int, req.body.total_no_of_layer_main_pole)
      .input('total_no_of_layer_inter_pole', sql.Int, req.body.total_no_of_layer_inter_pole)
      .input('total_no_of_layer_compensating_winding', sql.Int, req.body.total_no_of_layer_compensating_winding)
      .input('total_no_of_turns_main_pole', sql.Int, req.body.total_no_of_turns_main_pole)
      .input('total_no_of_turns_inter_pole', sql.Int, req.body.total_no_of_turns_inter_pole)
      .input('total_no_of_turns_compensating_winding', sql.Int, req.body.total_no_of_turns_compensating_winding)
      .input('resistance_of_coil_main_pole', sql.VarChar(50), req.body.resistance_of_coil_main_pole)
      .input('resistance_of_coil_inter_pole', sql.VarChar(50), req.body.resistance_of_coil_inter_pole)
      .input('resistance_of_coil_compensating_winding', sql.VarChar(50), req.body.resistance_of_coil_compensating_winding)
      .input('weight_of_each_coil_main_pole', sql.VarChar(50), req.body.weight_of_each_coil_main_pole)
      .input('weight_of_each_coil_inter_pole', sql.VarChar(50), req.body.weight_of_each_coil_inter_pole)
      .input('weight_of_each_coil_compensating_winding', sql.VarChar(50), req.body.weight_of_each_coil_compensating_winding)
      .input('core_dimension_mm_main_pole', sql.VarChar(100), req.body.core_dimension_mm_main_pole)
      .input('core_dimension_mm_inter_pole', sql.VarChar(100), req.body.core_dimension_mm_inter_pole)
      .input('core_dimension_mm_compensating_winding', sql.VarChar(100), req.body.core_dimension_mm_compensating_winding)
      .input('core_insulation_thickness_mm_main_pole', sql.VarChar(50), req.body.core_insulation_thickness_mm_main_pole)
      .input('core_insulation_thickness_mm_inter_pole', sql.VarChar(50), req.body.core_insulation_thickness_mm_inter_pole)
      .input('core_insulation_thickness_mm_compensating_winding', sql.VarChar(50), req.body.core_insulation_thickness_mm_compensating_winding)
      .input('coil_size_after_insulation_mm_main_pole', sql.VarChar(100), req.body.coil_size_after_insulation_mm_main_pole)
      .input('coil_size_after_insulation_mm_inter_pole', sql.VarChar(100), req.body.coil_size_after_insulation_mm_inter_pole)
      .input('coil_size_after_insulation_mm_compensating_winding', sql.VarChar(100), req.body.coil_size_after_insulation_mm_compensating_winding)
      .input('other_details_of_motor', sql.Text, req.body.other_details_of_motor)
      .input('weight_of_copper_aluminium_scrap', sql.VarChar(50), req.body.weight_of_copper_aluminium_scrap)
      .input('types_of_bearing_and_bearing_no_load_side', sql.VarChar(100), req.body.types_of_bearing_and_bearing_no_load_side)
      .input('types_of_bearing_and_bearing_no_back_side', sql.VarChar(100), req.body.types_of_bearing_and_bearing_no_back_side)
      .input('diagrams', sql.Text, req.body.diagrams)
      .input('status', sql.VarChar(50), req.body.status || 'Draft')
      .query(`INSERT INTO dc_motor_data_sheets (job_no, captain, sheet_date, party, final_test_date, 
              name_plate_details, power_kw, voltage_volts, current_amp, speed_rpm, capacity_hp, 
              make, type, class_of_insulation, serial_number_sl_no, total_weight, year_of_mfg, 
              note, type_of_winding, type_of_conductor, no_of_slots, slot_size, 
              no_of_turns_in_each_coil, conductor_size, wires_in_each_coil, no_of_coils_in_series_set, 
              commutator_pitch_bottom_coil, commutator_pitch_top_coil, commutator_pitch_of_equilizer, 
              no_of_parallel_strips, conductor_size_of_equilizer_ring, winding_pitch_slot_pitch, 
              weight_of_each_set_of_coils, total_set_of_coils, type_of_conductor_main_pole, 
              type_of_conductor_inter_pole, type_of_conductor_compensating_winding, 
              conductor_size_main_pole, conductor_size_inter_pole, conductor_size_compensating_winding, 
              no_of_turns_in_each_layer_main_pole, no_of_turns_in_each_layer_inter_pole, 
              no_of_turns_in_each_layer_compensating_winding, total_no_of_layer_main_pole, 
              total_no_of_layer_inter_pole, total_no_of_layer_compensating_winding, 
              total_no_of_turns_main_pole, total_no_of_turns_inter_pole, 
              total_no_of_turns_compensating_winding, resistance_of_coil_main_pole, 
              resistance_of_coil_inter_pole, resistance_of_coil_compensating_winding, 
              weight_of_each_coil_main_pole, weight_of_each_coil_inter_pole, 
              weight_of_each_coil_compensating_winding, core_dimension_mm_main_pole, 
              core_dimension_mm_inter_pole, core_dimension_mm_compensating_winding, 
              core_insulation_thickness_mm_main_pole, core_insulation_thickness_mm_inter_pole, 
              core_insulation_thickness_mm_compensating_winding, coil_size_after_insulation_mm_main_pole, 
              coil_size_after_insulation_mm_inter_pole, coil_size_after_insulation_mm_compensating_winding, 
              other_details_of_motor, weight_of_copper_aluminium_scrap, 
              types_of_bearing_and_bearing_no_load_side, types_of_bearing_and_bearing_no_back_side, 
              diagrams, status, created_at, updated_at)
              OUTPUT INSERTED.*
              VALUES (@job_no, @captain, @sheet_date, @party, @final_test_date, 
              @name_plate_details, @power_kw, @voltage_volts, @current_amp, @speed_rpm, @capacity_hp, 
              @make, @type, @class_of_insulation, @serial_number_sl_no, @total_weight, @year_of_mfg, 
              @note, @type_of_winding, @type_of_conductor, @no_of_slots, @slot_size, 
              @no_of_turns_in_each_coil, @conductor_size, @wires_in_each_coil, @no_of_coils_in_series_set, 
              @commutator_pitch_bottom_coil, @commutator_pitch_top_coil, @commutator_pitch_of_equilizer, 
              @no_of_parallel_strips, @conductor_size_of_equilizer_ring, @winding_pitch_slot_pitch, 
              @weight_of_each_set_of_coils, @total_set_of_coils, @type_of_conductor_main_pole, 
              @type_of_conductor_inter_pole, @type_of_conductor_compensating_winding, 
              @conductor_size_main_pole, @conductor_size_inter_pole, @conductor_size_compensating_winding, 
              @no_of_turns_in_each_layer_main_pole, @no_of_turns_in_each_layer_inter_pole, 
              @no_of_turns_in_each_layer_compensating_winding, @total_no_of_layer_main_pole, 
              @total_no_of_layer_inter_pole, @total_no_of_layer_compensating_winding, 
              @total_no_of_turns_main_pole, @total_no_of_turns_inter_pole, 
              @total_no_of_turns_compensating_winding, @resistance_of_coil_main_pole, 
              @resistance_of_coil_inter_pole, @resistance_of_coil_compensating_winding, 
              @weight_of_each_coil_main_pole, @weight_of_each_coil_inter_pole, 
              @weight_of_each_coil_compensating_winding, @core_dimension_mm_main_pole, 
              @core_dimension_mm_inter_pole, @core_dimension_mm_compensating_winding, 
              @core_insulation_thickness_mm_main_pole, @core_insulation_thickness_mm_inter_pole, 
              @core_insulation_thickness_mm_compensating_winding, @coil_size_after_insulation_mm_main_pole, 
              @coil_size_after_insulation_mm_inter_pole, @coil_size_after_insulation_mm_compensating_winding, 
              @other_details_of_motor, @weight_of_copper_aluminium_scrap, 
              @types_of_bearing_and_bearing_no_load_side, @types_of_bearing_and_bearing_no_back_side, 
              @diagrams, @status, GETDATE(), GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating DC motor data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get DC Motor Data Sheets
router.get('/dc-motor-data-sheets', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM dc_motor_data_sheets ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching DC motor data sheets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single DC Motor Data Sheet
router.get('/dc-motor-data-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM dc_motor_data_sheets WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'DC motor data sheet not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching DC motor data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get DC Motor Data Sheet by Job Number
router.get('/dc-motor-data-sheets/job/:job_no', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('job_no', sql.Int, req.params.job_no)
      .query('SELECT * FROM dc_motor_data_sheets WHERE job_no = @job_no');
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching DC motor data sheet by job number:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Test Reports
router.get('/test-reports', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM test_reports ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching test reports:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Test Report
router.get('/test-reports/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM test_reports WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Test report not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching test report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Test Report
router.put('/test-reports/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const readonlyFields = new Set(['id', 'created_at', 'updated_at', 'timestamp']);
    const keys = Object.keys(req.body || {}).filter((k) => !readonlyFields.has(k));
    const escapeCol = (k) => (k === 'current' ? '[current]' : `[${k}]`);
    const fields = keys.map((key) => `${escapeCol(key)} = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);

    keys.forEach((key) => {
      const value = req.body[key];
      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else if (typeof value === 'number') {
        request.input(key, sql.Int, value);
      } else if (typeof value === 'boolean') {
        request.input(key, sql.Bit, value);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });

    if (!fields) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const result = await request.query(`
      UPDATE test_reports SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Test report not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating test report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Test Report
router.delete('/test-reports/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM test_reports OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Test report not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting test report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export Job Sheet PDF
router.get('/job-sheets/:id/pdf', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM job_sheets WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job sheet not found' });
    }
    
    const doc = generateJobSheetPDF(result.recordset[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=job_sheet_${result.recordset[0].job_number}.pdf`);
    doc.pipe(res);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Data Sheet
router.post('/data-sheets', async (req, res) => {
  try {
    const pool = await getConnection();
    const fields = Object.keys(req.body);
    const values = fields.map(f => `@${f}`).join(', ');
    const request = pool.request();
    
    fields.forEach(key => {
      const value = req.body[key];
      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else if (typeof value === 'number') {
        request.input(key, sql.Float, value);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });
    
    const fieldList = fields.join(', ');
    const result = await request.query(`
      INSERT INTO data_sheets (${fieldList}, created_at, updated_at)
      OUTPUT INSERTED.*
      VALUES (${values}, GETDATE(), GETDATE())
    `);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Data Sheets
router.get('/data-sheets', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM data_sheets ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching data sheets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Data Sheet
router.get('/data-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM data_sheets WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Data sheet not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Data Sheet
router.put('/data-sheets/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const fields = Object.keys(req.body).filter(f => f !== 'id').map(key => `${key} = @${key}`).join(', ');
    const request = pool.request().input('id', sql.Int, req.params.id);
    
    Object.keys(req.body).filter(f => f !== 'id').forEach(key => {
      const value = req.body[key];
      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar, null);
      } else if (typeof value === 'number') {
        request.input(key, sql.Float, value);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });
    
    const result = await request.query(`
      UPDATE data_sheets SET ${fields}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Data sheet not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating data sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export Data Sheet PDF
router.get('/data-sheets/:id/pdf', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM data_sheets WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Data sheet not found' });
    }
    
    const doc = generateDataSheetPDF(result.recordset[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=data_sheet_${req.params.id}.pdf`);
    doc.pipe(res);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Test Report
router.post('/test-reports', async (req, res) => {
  try {
    const pool = await getConnection();
    const request = pool.request();

    if (!req.body || typeof req.body !== 'object') {
      req.body = {};
    }

    if (!req.body.report_id) {
      req.body.report_id = generateTestReportId();
    }

    if (!req.body.date_of_testing) {
      req.body.date_of_testing = new Date().toISOString().slice(0, 10);
    }

    const readonlyFields = new Set(['id', 'created_at', 'updated_at', 'timestamp']);
    const keys = Object.keys(req.body || {}).filter((k) => !readonlyFields.has(k));

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields provided' });
    }

    const escapeCol = (k) => (k === 'current' ? '[current]' : `[${k}]`);

    keys.forEach((key) => {
      const value = req.body[key];

      if (key === 'job_no') {
        if (value === null || value === undefined || value === '') {
          request.input(key, sql.Int, null);
          return;
        }
        const n = Number(value);
        request.input(key, sql.Int, Number.isNaN(n) ? null : n);
        return;
      }

      if (key === 'date' || key === 'date_of_testing' || key.endsWith('_date')) {
        if (value === null || value === undefined || value === '') {
          request.input(key, sql.Date, null);
          return;
        }
        const d = new Date(value);
        request.input(key, sql.Date, Number.isNaN(d.getTime()) ? null : d);
        return;
      }

      if (key === 'measurements_json') {
        request.input(key, sql.NVarChar(sql.MAX), value === '' ? null : (value ?? null));
        return;
      }

      if (value === null || value === undefined || value === '') {
        request.input(key, sql.NVarChar, null);
        return;
      }

      request.input(key, sql.NVarChar, value);
    });

    const fieldList = keys.map(escapeCol).join(', ');
    const values = keys.map((k) => `@${k}`).join(', ');

    const result = await request.query(`
      INSERT INTO test_reports (${fieldList}, created_at, updated_at)
      OUTPUT INSERTED.*
      VALUES (${values}, GETDATE(), GETDATE())
    `);

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating test report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Test Reports
router.get('/test-reports', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM test_reports ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching test reports:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Test Report
router.get('/test-reports/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM test_reports WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Test report not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching test report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export Test Report PDF
router.get('/test-reports/:id/pdf', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM test_reports WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Test report not found' });
    }
    
    const doc = generateTestReportPDF(result.recordset[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=test_report_${req.params.id}.pdf`);
    doc.pipe(res);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Scrap Record (with auto-indent generation for rewinding)
router.post('/scrap-records', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Create scrap record
    const scrapResult = await pool.request()
      .input('job_sheet_id', sql.Int, req.body.job_sheet_id)
      .input('weight_kg', sql.Float, req.body.weight_kg)
      .input('weighing_date', sql.Date, req.body.weighing_date)
      .input('photo_path', sql.VarChar(500), req.body.photo_path)
      .query(`INSERT INTO scrap_records (job_sheet_id, weight_kg, weighing_date, photo_path, created_at)
              OUTPUT INSERTED.*
              VALUES (@job_sheet_id, @weight_kg, @weighing_date, @photo_path, GETDATE())`);
    
    // Check if rewinding job and auto-generate indent
    const jobSheet = await pool.request()
      .input('job_sheet_id', sql.Int, req.body.job_sheet_id)
      .query('SELECT job_type FROM job_sheets WHERE id = @job_sheet_id');
    
    if (jobSheet.recordset.length > 0 && jobSheet.recordset[0].job_type === 'Rewinding') {
      const dataSheet = await pool.request()
        .input('job_sheet_id', sql.Int, req.body.job_sheet_id)
        .query('SELECT stator_conductor_size, rotor_conductor_size FROM data_sheets WHERE job_sheet_id = @job_sheet_id');
      
      if (dataSheet.recordset.length > 0) {
        const conductorQuantity = calculateConductorQuantity(req.body.weight_kg);
        const conductorSize = dataSheet.recordset[0].stator_conductor_size || 
                             dataSheet.recordset[0].rotor_conductor_size || 
                             'Standard';
        const indentNumber = await generateIndentNumber();
        
        // Create indent
        const indentResult = await pool.request()
          .input('indent_number', sql.VarChar(50), indentNumber)
          .input('job_sheet_id', sql.Int, req.body.job_sheet_id)
          .query(`INSERT INTO indents (indent_number, job_sheet_id, indent_type, status, created_at)
                  OUTPUT INSERTED.*
                  VALUES (@indent_number, @job_sheet_id, 'Automatic', 'Raised', GETDATE())`);
        
        // Add conductor item
        await pool.request()
          .input('indent_id', sql.Int, indentResult.recordset[0].id)
          .input('item_name', sql.VarChar(200), `Conductor - ${conductorSize}`)
          .input('item_description', sql.Text, `Conductor for rewinding (110% of scrap weight: ${req.body.weight_kg} kg)`)
          .input('quantity', sql.Float, conductorQuantity)
          .input('unit', sql.VarChar(50), 'kg')
          .input('conductor_type', sql.VarChar(100), 'Copper')
          .input('conductor_size', sql.VarChar(100), conductorSize)
          .query(`INSERT INTO indent_items (indent_id, item_name, item_description, quantity, unit, conductor_type, conductor_size, created_at)
                  VALUES (@indent_id, @item_name, @item_description, @quantity, @unit, @conductor_type, @conductor_size, GETDATE())`);
      }
    }
    
    res.json(scrapResult.recordset[0]);
  } catch (error) {
    console.error('Error creating scrap record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Scrap Records for Job
router.get('/scrap-records/job/:job_sheet_id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('job_sheet_id', sql.Int, req.params.job_sheet_id)
      .query('SELECT * FROM scrap_records WHERE job_sheet_id = @job_sheet_id ORDER BY id DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching scrap records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Production Step
router.post('/production-steps', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('job_sheet_id', sql.Int, req.body.job_sheet_id)
      .input('step_name', sql.VarChar(100), req.body.step_name)
      .input('step_status', sql.VarChar(50), req.body.step_status || 'Pending')
      .input('step_date', sql.DateTime, req.body.step_date || new Date())
      .input('remarks', sql.Text, req.body.remarks)
      .query(`INSERT INTO production_steps (job_sheet_id, step_name, step_status, step_date, remarks, created_at)
              OUTPUT INSERTED.*
              VALUES (@job_sheet_id, @step_name, @step_status, @step_date, @remarks, GETDATE())`);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating production step:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Production Steps for Job
router.get('/production-steps/job/:job_sheet_id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('job_sheet_id', sql.Int, req.params.job_sheet_id)
      .query('SELECT * FROM production_steps WHERE job_sheet_id = @job_sheet_id ORDER BY id ASC');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching production steps:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Production Workflow
router.post('/production-steps/workflow/:job_sheet_id', async (req, res) => {
  try {
    const pool = await getConnection();
    const jobSheet = await pool.request()
      .input('id', sql.Int, req.params.job_sheet_id)
      .query('SELECT job_type FROM job_sheets WHERE id = @id');
    
    if (jobSheet.recordset.length === 0) {
      return res.status(404).json({ error: 'Job sheet not found' });
    }
    
    const jobType = jobSheet.recordset[0].job_type;
    let workflowSteps = [];
    
    if (jobType === 'Rewinding') {
      workflowSteps = [
        'Cleaning/Dismantling',
        'Job Sheet',
        'Data Sheet',
        'Conductor Testing',
        'Scrap Handling',
        'Required Material Purchased',
        'Coil Production - Looping/Spreading',
        'Coil Production - Insulation',
        'Coil Production - Taping',
        'Coil Production - Molding',
        'Coil Production - Pressing',
        'Coil Production - Overhauling Taping',
        'Coil Production - HV/Surge Resistance Test',
        'Coil Production - Full Coil Production',
        'Winding Core and Slot Cleaning',
        'First Test',
        'Machining (If required)',
        'Assembly and Final Test',
        'Paint and Dispatch'
      ];
    } else if (jobType === 'Overhauling') {
      workflowSteps = [
        'Cleaning / Dismantling - Job Sheet',
        'Check IR/PI Value (Pre-varnishing test)',
        'Heating',
        'Varnishing',
        'Heating',
        'Spare Machining (If required)',
        'Assembling and Final Test',
        'Paint and Dispatch'
      ];
    }
    
    const createdSteps = [];
    for (const stepName of workflowSteps) {
      const result = await pool.request()
        .input('job_sheet_id', sql.Int, req.params.job_sheet_id)
        .input('step_name', sql.VarChar(100), stepName)
        .query(`INSERT INTO production_steps (job_sheet_id, step_name, step_status, created_at)
                OUTPUT INSERTED.*
                VALUES (@job_sheet_id, @step_name, 'Pending', GETDATE())`);
      createdSteps.push(result.recordset[0]);
    }
    
    res.json({ message: `Created ${createdSteps.length} workflow steps`, steps: createdSteps });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

