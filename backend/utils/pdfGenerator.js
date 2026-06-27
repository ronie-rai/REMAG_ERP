import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

export const generateJobSheetPDF = (jobSheetData) => {
  const doc = new PDFDocument({ margin: 30 });

  const title = 'CHECKLIST';

  doc.fontSize(14).text(title, { align: 'center' });
  doc.moveDown(0.4);

  const leftX = doc.page.margins.left;
  const rightX = doc.page.width / 2 + 10;
  const startY = doc.y;

  const dateText = jobSheetData.date ? format(new Date(jobSheetData.date), 'dd/MM/yyyy') : '';

  doc.fontSize(8)
    .text(`Job No: ${jobSheetData.job_number ?? ''}`, leftX, startY)
    .text(`Date: ${dateText}`, leftX)
    .text(`Party: ${jobSheetData.party_name || ''}`, leftX)
    .text(`Dept: ${jobSheetData.department || ''}`, leftX);

  doc.fontSize(8)
    .text(`Make: ${jobSheetData.make || ''}`, rightX, startY)
    .text(`KW/HP: ${jobSheetData.kw_hp || ''}`, rightX)
    .text(`Type: ${jobSheetData.type || ''}`, rightX)
    .text(`Sl No: ${jobSheetData.sl_no || ''}`, rightX);

  doc.moveDown(0.6);

  const specsY = doc.y;
  doc.fontSize(8)
    .text(`Voltage: ${jobSheetData.voltage || ''}`, leftX, specsY)
    .text(`Phase: ${jobSheetData.phase || ''}`, leftX)
    .text(`Current: ${jobSheetData.current || ''}`, leftX)
    .text(`Speed: ${jobSheetData.speed_rpm || ''}`, leftX);

  doc.fontSize(8)
    .text(`Connection: ${jobSheetData.connection || ''}`, rightX, specsY)
    .text(`Weight: ${jobSheetData.weight_kg || ''}`, rightX)
    .text(`Email: ${jobSheetData.email || ''}`, rightX);

  doc.moveDown(0.6);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);

  const rows = [
    { label: 'Observation', value: jobSheetData.observation, remarks: '' },
    { label: 'Stator Winding', value: jobSheetData.stator_winding, remarks: jobSheetData.stator_winding_remarks },
    { label: 'Rotor Winding', value: jobSheetData.rotor_winding, remarks: jobSheetData.rotor_winding_remarks },
    { label: 'Bearing & Bearing Seat (DE)', value: jobSheetData.bearing_bearing_seat_de, remarks: jobSheetData.bearing_bearing_seat_de_remarks },
    { label: 'Bearing & Bearing Seat (NDE)', value: jobSheetData.bearing_bearing_seat_nde, remarks: jobSheetData.bearing_bearing_seat_nde_remarks },
    { label: 'Core (Stator)', value: jobSheetData.core_stator, remarks: jobSheetData.core_stator_remarks },
    { label: 'Core (Rotor)', value: jobSheetData.core_rotor, remarks: jobSheetData.core_rotor_remarks },
    { label: 'Rotor Shaft', value: jobSheetData.rotor_shaft, remarks: jobSheetData.rotor_shaft_remarks },
    { label: 'Rotor Ring / Bar', value: jobSheetData.rotor_ring_bar, remarks: jobSheetData.rotor_ring_bar_remarks },
    { label: 'RTD / Temp Detector', value: jobSheetData.rtd_temp_detector, remarks: jobSheetData.rtd_temp_detector_remarks },
    { label: 'Space Heater', value: jobSheetData.space_heater, remarks: jobSheetData.space_heater_remarks },
    { label: 'Fan / Cover', value: jobSheetData.fan_cover, remarks: jobSheetData.fan_cover_remarks },
    { label: 'Grease Cup (DE)', value: jobSheetData.grease_cup_de, remarks: jobSheetData.grease_cup_de_remarks },
    { label: 'Grease Cup (NDE)', value: jobSheetData.grease_cup_nde, remarks: jobSheetData.grease_cup_nde_remarks },
    { label: 'Bearing Housing (DE)', value: jobSheetData.bearing_housing_de, remarks: jobSheetData.bearing_housing_de_remarks },
    { label: 'Bearing Housing (NDE)', value: jobSheetData.bearing_housing_nde, remarks: jobSheetData.bearing_housing_nde_remarks },
    { label: 'BTD', value: jobSheetData.btd, remarks: jobSheetData.btd_remarks },
    { label: 'Terminal Block', value: jobSheetData.terminal_block, remarks: jobSheetData.terminal_block_remarks },
    { label: 'Terminal Box', value: jobSheetData.terminal_box, remarks: jobSheetData.terminal_box_remarks },
    { label: 'Foot / Leg', value: jobSheetData.foot_leg, remarks: jobSheetData.foot_leg_remarks },
    { label: 'Circlip / Lock', value: jobSheetData.circlip_lock, remarks: jobSheetData.circlip_lock_remarks },
    { label: 'Keys', value: jobSheetData.keys, remarks: jobSheetData.keys_remarks },
    { label: 'Carbon / Brush / Rocker Arm', value: jobSheetData.carbon_brush_rocker_arm, remarks: jobSheetData.carbon_brush_rocker_arm_remarks },
    { label: 'Others', value: jobSheetData.others, remarks: '' },
  ];

  const tableLeft = leftX;
  const tableRight = doc.page.width - doc.page.margins.right;
  const tableWidth = tableRight - tableLeft;
  const wLabel = 155;
  const wRemarks = 145;
  const wValue = Math.max(120, tableWidth - wLabel - wRemarks);

  const colLabel = tableLeft;
  const colValue = colLabel + wLabel;
  const colRemarks = colValue + wValue;

  const headerY = doc.y;
  const headerH = 14;
  doc.lineWidth(0.8).rect(tableLeft, headerY, tableWidth, headerH).stroke();
  doc.moveTo(colValue, headerY).lineTo(colValue, headerY + headerH).stroke();
  doc.moveTo(colRemarks, headerY).lineTo(colRemarks, headerY + headerH).stroke();

  doc.fontSize(8)
    .text('Item', colLabel + 4, headerY + 4, { width: wLabel - 8 })
    .text('Details', colValue + 4, headerY + 4, { width: wValue - 8 })
    .text('Remarks', colRemarks + 4, headerY + 4, { width: wRemarks - 8 });

  const rowH = 12;
  let y = headerY + headerH;

  rows.forEach((r) => {
    const valueText = (r.value ?? '') === null ? '' : String(r.value ?? '');
    const remarksText = (r.remarks ?? '') === null ? '' : String(r.remarks ?? '');

    doc.lineWidth(0.8).rect(tableLeft, y, tableWidth, rowH).stroke();
    doc.moveTo(colValue, y).lineTo(colValue, y + rowH).stroke();
    doc.moveTo(colRemarks, y).lineTo(colRemarks, y + rowH).stroke();

    doc.fontSize(7)
      .text(r.label, colLabel + 4, y + 3, { width: wLabel - 8, lineBreak: false, ellipsis: true })
      .text(valueText, colValue + 4, y + 3, { width: wValue - 8, lineBreak: false, ellipsis: true })
      .text(remarksText, colRemarks + 4, y + 3, { width: wRemarks - 8, lineBreak: false, ellipsis: true });

    y += rowH;
  });

  doc.end();
  return doc;
};

export const generateSalesQuotationPDF = (quotation) => {
  const doc = new PDFDocument({ margin: 40 });

  const companyName = 'Remag Electros Pvt. Ltd.';
  const headerRight = 'Dependable Rewinders\nAuthorised Service Provider of\nmarathon® REGAL';

  doc.fontSize(16).text(companyName, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(8).text(headerRight, { align: 'center' });
  doc.moveDown(0.4);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.6);

  const leftX = doc.page.margins.left;
  const rightX = doc.page.width / 2 + 10;
  const startY = doc.y;

  const qNo = quotation?.quotation_no || '';
  const qDateText = quotation?.quotation_date ? format(new Date(quotation.quotation_date), 'dd/MM/yyyy') : '';

  doc.fontSize(9)
    .text(qNo ? `Ref: ${qNo}` : 'Ref:', leftX, startY)
    .text(`Date: ${qDateText}`, rightX, startY, { align: 'right', width: doc.page.width - doc.page.margins.right - rightX });

  doc.moveDown(1.0);

  if (quotation?.to_name || quotation?.to_address) {
    doc.fontSize(9).text('To,', leftX);
    if (quotation?.to_name) doc.text(quotation.to_name, leftX);
    if (quotation?.to_address) doc.text(String(quotation.to_address), leftX);
    doc.moveDown(0.4);
  }

  if (quotation?.subject) {
    doc.fontSize(9).font('Helvetica-Bold').text(`Sub: ${quotation.subject}`, leftX);
    doc.font('Helvetica');
    doc.moveDown(0.3);
  }

  if (quotation?.ref_no) {
    doc.fontSize(9).text(`Ref: ${quotation.ref_no}`, leftX);
    doc.moveDown(0.3);
  }

  doc.fontSize(9).text(quotation?.dear ? `Dear ${quotation.dear},` : 'Dear Sir,', leftX);
  doc.moveDown(0.5);

  if (quotation?.intro_text) {
    doc.fontSize(9).text(String(quotation.intro_text), { align: 'left' });
    doc.moveDown(0.6);
  }

  if (quotation?.terms_text) {
    doc.fontSize(9).font('Helvetica-Bold').text('TERMS & CONDITION:', leftX);
    doc.font('Helvetica');
    doc.moveDown(0.25);
    doc.fontSize(9).text(String(quotation.terms_text), { align: 'left' });
    doc.moveDown(0.6);
  }

  const termRows = [
    { label: 'Price', key: 'term_price' },
    { label: 'Escalation', key: 'term_escalation' },
    { label: 'Transportation', key: 'term_transportation' },
    { label: 'Taxes', key: 'term_taxes' },
    { label: 'Inspection', key: 'term_inspection' },
    { label: 'Delivery', key: 'term_delivery' },
    { label: 'Payment', key: 'term_payment' },
    { label: 'Guarantee', key: 'term_guarantee' },
    { label: 'Scope', key: 'term_scope' },
    { label: 'Validity', key: 'term_validity' },
    { label: 'Note', key: 'term_note' },
  ];

  const hasStructuredTerms = termRows.some((t) => {
    const v = quotation?.[t.key];
    return v !== null && v !== undefined && String(v).trim() !== '';
  });

  if (hasStructuredTerms) {
    doc.fontSize(9).font('Helvetica-Bold').text('TERMS & CONDITION:', leftX);
    doc.font('Helvetica');
    doc.moveDown(0.25);

    termRows.forEach((t) => {
      const v = quotation?.[t.key];
      if (v === null || v === undefined || String(v).trim() === '') return;
      const beforeY = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').text(`${t.label}:`, leftX, beforeY, { continued: true });
      doc.font('Helvetica').text(` ${String(v)}`, { continued: false });
    });

    doc.moveDown(0.6);
  }

  const items = Array.isArray(quotation?.items) ? quotation.items : [];
  if (items.length) {
    const tableLeft = leftX;
    const tableRight = doc.page.width - doc.page.margins.right;
    const tableWidth = tableRight - tableLeft;

    const wSno = 35;
    const wQty = 55;
    const wRate = 80;
    const wAmount = 90;
    const wDesc = Math.max(160, tableWidth - (wSno + wQty + wRate + wAmount));

    const colSno = tableLeft;
    const colDesc = colSno + wSno;
    const colQty = colDesc + wDesc;
    const colRate = colQty + wQty;
    const colAmount = colRate + wRate;

    const headerH = 18;
    const rowH = 18;
    let y = doc.y;

    doc.lineWidth(0.8).rect(tableLeft, y, tableWidth, headerH).stroke();
    doc.moveTo(colDesc, y).lineTo(colDesc, y + headerH).stroke();
    doc.moveTo(colQty, y).lineTo(colQty, y + headerH).stroke();
    doc.moveTo(colRate, y).lineTo(colRate, y + headerH).stroke();
    doc.moveTo(colAmount, y).lineTo(colAmount, y + headerH).stroke();

    doc.fontSize(9)
      .text('Sl. no', colSno + 4, y + 5, { width: wSno - 8 })
      .text('Particulars', colDesc + 4, y + 5, { width: wDesc - 8 })
      .text('Qty', colQty + 4, y + 5, { width: wQty - 8, align: 'right' })
      .text('Rate (Each)', colRate + 4, y + 5, { width: wRate - 8, align: 'right' })
      .text('Amount', colAmount + 4, y + 5, { width: wAmount - 8, align: 'right' });

    y += headerH;
    let grandTotal = 0;

    items.forEach((it, idx) => {
      const sno = it?.sl_no ?? (idx + 1);
      const qty = Number(it?.quantity) || 0;
      const rate = Number(it?.rate) || 0;
      const amount = Number(it?.amount) || qty * rate;
      grandTotal += amount;

      if (y > doc.page.height - doc.page.margins.bottom - 120) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      doc.lineWidth(0.8).rect(tableLeft, y, tableWidth, rowH).stroke();
      doc.moveTo(colDesc, y).lineTo(colDesc, y + rowH).stroke();
      doc.moveTo(colQty, y).lineTo(colQty, y + rowH).stroke();
      doc.moveTo(colRate, y).lineTo(colRate, y + rowH).stroke();
      doc.moveTo(colAmount, y).lineTo(colAmount, y + rowH).stroke();

      doc.fontSize(9)
        .text(String(sno), colSno + 4, y + 5, { width: wSno - 8 })
        .text(String(it?.description || ''), colDesc + 4, y + 5, { width: wDesc - 8, lineBreak: false, ellipsis: true })
        .text(qty ? String(qty) : '', colQty + 4, y + 5, { width: wQty - 8, align: 'right' })
        .text(rate ? rate.toFixed(2) : '', colRate + 4, y + 5, { width: wRate - 8, align: 'right' })
        .text(amount ? amount.toFixed(2) : '', colAmount + 4, y + 5, { width: wAmount - 8, align: 'right' });

      y += rowH;
    });

    doc.y = Math.max(doc.y, y + 10);
    doc.fontSize(10).text(`Total: ${grandTotal.toFixed(2)}`, tableLeft, doc.y, { width: tableWidth, align: 'right' });
    doc.moveDown(0.7);
  }

  if (quotation?.notes_text) {
    doc.fontSize(9).font('Helvetica-Bold').text('NOTE:', leftX);
    doc.font('Helvetica');
    doc.moveDown(0.2);
    doc.fontSize(9).text(String(quotation.notes_text), { align: 'left' });
    doc.moveDown(0.8);
  }

  doc.fontSize(9).text('Thanking you,', leftX);
  doc.moveDown(0.6);
  doc.fontSize(9).text('Yours faithfully,', leftX);
  doc.fontSize(9).text('For Remag Electros (P) Ltd.', leftX);
  doc.moveDown(2.0);
  doc.fontSize(9).text('Authorized Signatory', leftX);

  doc.end();
  return doc;
};

export const generatePurchaseOrderPDF = ({ po, vendor, items }) => {
  const doc = new PDFDocument({ margin: 40 });

  const companyName = 'Remag Electros Pvt. Ltd.';
  const companyPhones = '+91 9238351338, +91 9437047731';
  const companyEmail = 'info@remagelectros.com';
  const companyAddress = 'B/35, Industrial Estate\nRourkela - 769004\nOdisha, India';

  doc.fontSize(16).text(companyName, { align: 'center' });
  doc.fontSize(9).text(companyPhones, { align: 'center' });
  doc.fontSize(9).text(companyEmail, { align: 'center' });
  doc.fontSize(9).text(companyAddress, { align: 'center' });

  doc.moveDown(0.4);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.5);

  doc.fontSize(14).text('PURCHASE ORDER', { align: 'center' });
  doc.moveDown(0.5);

  const leftX = doc.page.margins.left;
  const rightX = doc.page.width / 2 + 10;
  const startY = doc.y;

  const poDateText = po?.po_date ? format(new Date(po.po_date), 'dd/MM/yyyy') : '';
  const expectedText = po?.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'dd/MM/yyyy') : '';

  doc.fontSize(9)
    .text(`PO No: ${po?.po_number || ''}`, leftX, startY)
    .text(`PO Date: ${poDateText}`, leftX)
    .text(`Expected Delivery: ${expectedText}`, leftX)
    .text(`Status: ${po?.status || ''}`, leftX);

  doc.fontSize(9)
    .text(`Vendor: ${vendor?.vendor_name || ''}`, rightX, startY)
    .text(`Contact: ${vendor?.contact_person || ''}`, rightX)
    .text(`Phone: ${vendor?.contact_number || ''}`, rightX)
    .text(`Email: ${vendor?.email || ''}`, rightX)
    .text(`GST: ${vendor?.gst_number || ''}`, rightX);

  if (vendor?.vendor_address) {
    doc.text(`Address: ${vendor.vendor_address}`, rightX, doc.y, { width: doc.page.width - doc.page.margins.right - rightX });
  }

  doc.moveDown(0.4);

  const tableLeft = leftX;
  const tableRight = doc.page.width - doc.page.margins.right;
  const tableWidth = tableRight - tableLeft;

  const wSno = 30;
  const wQty = 50;
  const wRate = 70;
  const wAmount = 80;
  const wItem = Math.max(120, tableWidth - (wSno + wQty + wRate + wAmount));

  const colSno = tableLeft;
  const colItem = colSno + wSno;
  const colQty = colItem + wItem;
  const colRate = colQty + wQty;
  const colTotal = colRate + wRate;

  const tableTop = doc.y;
  const headerH = 18;
  const rowH = 18;

  doc.lineWidth(0.8).rect(tableLeft, tableTop, tableWidth, headerH).stroke();

  doc.fontSize(9)
    .text('S.No', colSno + 4, tableTop + 5, { width: wSno - 8 })
    .text('Item', colItem + 4, tableTop + 5, { width: wItem - 8 })
    .text('Qty', colQty + 4, tableTop + 5, { width: wQty - 8, align: 'right' })
    .text('Rate', colRate + 4, tableTop + 5, { width: wRate - 8, align: 'right' })
    .text('Amount', colTotal + 4, tableTop + 5, { width: wAmount - 8, align: 'right' });

  doc.moveTo(colItem, tableTop).lineTo(colItem, tableTop + headerH).stroke();
  doc.moveTo(colQty, tableTop).lineTo(colQty, tableTop + headerH).stroke();
  doc.moveTo(colRate, tableTop).lineTo(colRate, tableTop + headerH).stroke();
  doc.moveTo(colTotal, tableTop).lineTo(colTotal, tableTop + headerH).stroke();

  let y = tableTop + headerH;
  let grandTotal = 0;

  (items || []).forEach((it, idx) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.unit_price) || 0;
    const amount = Number(it.total_value) || qty * rate;
    grandTotal += amount;

    doc.lineWidth(0.8).rect(tableLeft, y, tableWidth, rowH).stroke();
    doc.moveTo(colItem, y).lineTo(colItem, y + rowH).stroke();
    doc.moveTo(colQty, y).lineTo(colQty, y + rowH).stroke();
    doc.moveTo(colRate, y).lineTo(colRate, y + rowH).stroke();
    doc.moveTo(colTotal, y).lineTo(colTotal, y + rowH).stroke();

    doc.fontSize(9)
      .text(String(idx + 1), colSno + 4, y + 5, { width: wSno - 8 })
      .text(it.item_name || '', colItem + 4, y + 5, { width: wItem - 8 })
      .text(qty.toString(), colQty + 4, y + 5, { width: wQty - 8, align: 'right' })
      .text(rate.toFixed(2), colRate + 4, y + 5, { width: wRate - 8, align: 'right' })
      .text(amount.toFixed(2), colTotal + 4, y + 5, { width: wAmount - 8, align: 'right' });

    y += rowH;
    if (y > doc.page.height - doc.page.margins.bottom - 90) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  });

  doc.y = Math.max(doc.y, y + 12);

  doc.fontSize(10).text(`Total: ${grandTotal.toFixed(2)}`, tableLeft, doc.y, { width: tableWidth, align: 'right' });

  const footerY = doc.y + 20;
  const forText = 'For Remag Electros Pvt. Ltd.';
  const forTextWidth = doc.widthOfString(forText, { fontSize: 10 });
  const forX = Math.max(tableLeft, tableRight - forTextWidth);
  doc.fontSize(10).text(forText, forX, footerY, { lineBreak: false });

  const authText = 'Authorised Signatory';
  const authTextWidth = doc.widthOfString(authText, { fontSize: 10 });
  const authX = Math.max(tableLeft, tableRight - authTextWidth);
  doc.fontSize(10).text(authText, authX, footerY + 45, { lineBreak: false });

  doc.end();
  return doc;
};

export const generateDataSheetPDF = (dataSheetData) => {
  const doc = new PDFDocument({ margin: 50 });
  const motorType = dataSheetData.motor_type || '';
  
  doc.fontSize(20).text(`${motorType} DATA SHEET`, { align: 'center' });
  doc.moveDown();
  
  // Nameplate Details
  doc.fontSize(14).text('NAMEPLATE DETAILS', { underline: true });
  doc.moveDown(0.5);
  
  const nameplateFields = [
    ['Make', dataSheetData.nameplate_make],
    ['Model', dataSheetData.nameplate_model],
    ['Rating (kW)', dataSheetData.nameplate_rating_kw],
    ['Voltage', dataSheetData.nameplate_voltage],
    ['Current', dataSheetData.nameplate_current],
    ['Speed (RPM)', dataSheetData.nameplate_speed_rpm],
    ['Frequency (Hz)', dataSheetData.nameplate_frequency_hz],
    ['Frame', dataSheetData.nameplate_frame],
    ['Serial No.', dataSheetData.nameplate_serial],
  ];
  
  nameplateFields.forEach(([label, value]) => {
    doc.fontSize(10).text(`${label}: ${value || ''}`, { indent: 20 });
  });
  
  if (motorType === 'AC Motor') {
    doc.moveDown();
    doc.fontSize(14).text('STATOR WINDING DETAILS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10)
      .text(`Slots: ${dataSheetData.stator_slots || ''}`, { indent: 20 })
      .text(`Winding Type: ${dataSheetData.stator_winding_type || ''}`, { indent: 20 })
      .text(`Coil Pitch: ${dataSheetData.stator_coil_pitch || ''}`, { indent: 20 })
      .text(`Conductors per Slot: ${dataSheetData.stator_conductors_per_slot || ''}`, { indent: 20 })
      .text(`Conductor Size: ${dataSheetData.stator_conductor_size || ''}`, { indent: 20 })
      .text(`Winding Resistance: ${dataSheetData.stator_winding_resistance || ''}`, { indent: 20 });
    
    if (dataSheetData.rotor_slots) {
      doc.moveDown();
      doc.fontSize(14).text('ROTOR WINDING DETAILS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10)
        .text(`Slots: ${dataSheetData.rotor_slots || ''}`, { indent: 20 })
        .text(`Winding Type: ${dataSheetData.rotor_winding_type || ''}`, { indent: 20 })
        .text(`Conductor Size: ${dataSheetData.rotor_conductor_size || ''}`, { indent: 20 });
    }
    
    doc.moveDown();
    doc.fontSize(14).text('BEARINGS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10)
      .text(`Drive End: ${dataSheetData.bearing_drive_end || ''}`, { indent: 20 })
      .text(`Non-Drive End: ${dataSheetData.bearing_non_drive_end || ''}`, { indent: 20 });
  } else if (motorType === 'DC Motor/Generator') {
    doc.moveDown();
    doc.fontSize(14).text('ARMATURE WINDING', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10)
      .text(`Slots: ${dataSheetData.armature_slots || ''}`, { indent: 20 })
      .text(`Winding Type: ${dataSheetData.armature_winding_type || ''}`, { indent: 20 })
      .text(`Direction: ${dataSheetData.armature_winding_direction || ''}`, { indent: 20 })
      .text(`Conductors: ${dataSheetData.armature_conductors || ''}`, { indent: 20 })
      .text(`Conductor Size: ${dataSheetData.armature_conductor_size || ''}`, { indent: 20 });
    
    doc.moveDown();
    doc.fontSize(14).text('FIELD COILS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10)
      .text(`Number of Coils: ${dataSheetData.field_coils || ''}`, { indent: 20 })
      .text(`Turns per Coil: ${dataSheetData.field_coil_turns || ''}`, { indent: 20 })
      .text(`Resistance: ${dataSheetData.field_coil_resistance || ''}`, { indent: 20 });
    
    doc.moveDown();
    doc.fontSize(14).text('POLE DETAILS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10)
      .text(`Number of Poles: ${dataSheetData.poles || ''}`, { indent: 20 })
      .text(`Pole Pitch: ${dataSheetData.pole_pitch || ''}`, { indent: 20 });
  }
  
  doc.end();
  return doc;
};

export const generateTestReportPDF = (testReportData) => {
  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(20).text('TEST REPORT', { align: 'center' });
  doc.moveDown();

  // General Details
  doc.fontSize(14).text('GENERAL DETAILS', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10)
    .text(`Test Type: ${testReportData.test_type || ''}`, { indent: 20 })
    .text(`Test Date: ${testReportData.test_date ? format(new Date(testReportData.test_date), 'dd/MM/yyyy') : ''}`, { indent: 20 })
    .text(`Motor Type: ${testReportData.motor_type || ''}`, { indent: 20 })
    .text(`Rating: ${testReportData.rating || ''}`, { indent: 20 })
    .text(`Voltage: ${testReportData.voltage || ''}`, { indent: 20 })
    .text(`Current: ${testReportData.current || ''}`, { indent: 20 })
    .text(`Speed: ${testReportData.speed || ''}`, { indent: 20 });

  doc.moveDown();

  // Test Results
  doc.fontSize(14).text('TEST RESULTS', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10)
    .text(`IR Value: ${testReportData.ir_value || ''}`, { indent: 20 })
    .text(`PI Value: ${testReportData.pi_value || ''}`, { indent: 20 })
    .text(`Winding Resistance: ${testReportData.winding_resistance || ''}`, { indent: 20 })
    .text(`Inductance: ${testReportData.inductance || ''}`, { indent: 20 })
    .text(`Current Balance: ${testReportData.current_balance || ''}`, { indent: 20 })
    .text(`Block Rotor: ${testReportData.block_rotor || ''}`, { indent: 20 })
    .text(`No Load Run: ${testReportData.no_load_run || ''}`, { indent: 20 })
    .text(`Vibration: ${testReportData.vibration || ''}`, { indent: 20 })
    .text(`Temperature: ${testReportData.temperature || ''}`, { indent: 20 });

  if (testReportData.remarks) {
    doc.moveDown();
    doc.fontSize(14).text('REMARKS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(testReportData.remarks, { indent: 20 });
  }

  doc.end();
  return doc;
};

export const generateInvoicePDF = (invoice) => {
  const doc = new PDFDocument({ margin: 40 });

  const companyName = 'Remag Electros Pvt. Ltd.';
  const companyPhones = '+91 9238351338, +91 9437047731';
  const companyEmail = 'info@remagelectros.com';
  const companyAddress = 'B/35, Industrial Estate\nRourkela - 769004\nOdisha, India';
  const companyGST = '21AAPFR8705D1ZM';

  doc.fontSize(16).text(companyName, { align: 'center' });
  doc.fontSize(9).text(companyPhones, { align: 'center' });
  doc.fontSize(9).text(companyEmail, { align: 'center' });
  doc.fontSize(9).text(companyAddress, { align: 'center' });
  doc.fontSize(9).text(`GSTIN: ${companyGST}`, { align: 'center' });

  doc.moveDown(0.4);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.5);

  doc.fontSize(14).text('TAX INVOICE', { align: 'center' });
  doc.moveDown(0.5);

  const leftX = doc.page.margins.left;
  const rightX = doc.page.width / 2 + 10;
  const startY = doc.y;

  const invoiceDateText = invoice?.invoice_date ? format(new Date(invoice.invoice_date), 'dd/MM/yyyy') : '';

  doc.fontSize(9)
    .text(`Invoice No: ${invoice?.invoice_no || ''}`, leftX, startY)
    .text(`Invoice Date: ${invoiceDateText}`, leftX);

  if (invoice?.delivery_date) {
    const deliveryText = format(new Date(invoice.delivery_date), 'dd/MM/yyyy');
    doc.text(`Delivery Date: ${deliveryText}`, leftX);
  }

  if (invoice?.loi_no) doc.text(`LOI No: ${invoice.loi_no}`, leftX);
  if (invoice?.gate_pass_no) doc.text(`Gate Pass No: ${invoice.gate_pass_no}`, leftX);
  if (invoice?.delivery_note_no) doc.text(`Delivery Note No: ${invoice.delivery_note_no}`, leftX);

  doc.fontSize(9)
    .text(`Bill To:`, rightX, startY)
    .font('Helvetica-Bold')
    .text(invoice?.bill_to_name || '', rightX, doc.y)
    .font('Helvetica');

  if (invoice?.bill_to_address) {
    doc.text(String(invoice.bill_to_address), rightX);
  }

  if (invoice?.bill_to_gstin) {
    doc.text(`GSTIN: ${invoice.bill_to_gstin}`, rightX);
  }

  if (invoice?.bill_to_state_code) {
    doc.text(`State Code: ${invoice.bill_to_state_code}`, rightX);
  }

  doc.moveDown(0.4);

  if (invoice?.place_of_work_name) {
    doc.fontSize(9).text(`Ship To:`, leftX, doc.y);
    doc.font('Helvetica-Bold').text(invoice.place_of_work_name, leftX).font('Helvetica');

    if (invoice?.place_of_work_address) {
      doc.text(String(invoice.place_of_work_address), leftX);
    }

    if (invoice?.place_of_work_gstin) {
      doc.text(`GSTIN: ${invoice.place_of_work_gstin}`, leftX);
    }

    if (invoice?.place_of_work_state_code) {
      doc.text(`State Code: ${invoice.place_of_work_state_code}`, leftX);
    }
  }

  doc.moveDown(0.4);

  const tableLeft = leftX;
  const tableRight = doc.page.width - doc.page.margins.right;
  const tableWidth = tableRight - tableLeft;

  const wSno = 35;
  const wQty = 55;
  const wUnit = 45;
  const wSAC = 55;
  const wRate = 70;
  const wAmount = 90;
  const wDesc = Math.max(120, tableWidth - (wSno + wQty + wUnit + wSAC + wRate + wAmount));

  const colSno = tableLeft;
  const colDesc = colSno + wSno;
  const colQty = colDesc + wDesc;
  const colUnit = colQty + wQty;
  const colSAC = colUnit + wUnit;
  const colRate = colSAC + wSAC;
  const colAmount = colRate + wRate;

  const tableTop = doc.y;
  const headerH = 18;
  const rowH = 18;

  doc.lineWidth(0.8).rect(tableLeft, tableTop, tableWidth, headerH).stroke();

  doc.fontSize(9)
    .text('Sl. no', colSno + 4, tableTop + 5, { width: wSno - 8 })
    .text('Description', colDesc + 4, tableTop + 5, { width: wDesc - 8 })
    .text('Qty', colQty + 4, tableTop + 5, { width: wQty - 8, align: 'right' })
    .text('Unit', colUnit + 4, tableTop + 5, { width: wUnit - 8 })
    .text('SAC', colSAC + 4, tableTop + 5, { width: wSAC - 8 })
    .text('Rate', colRate + 4, tableTop + 5, { width: wRate - 8, align: 'right' })
    .text('Amount', colAmount + 4, tableTop + 5, { width: wAmount - 8, align: 'right' });

  doc.moveTo(colDesc, tableTop).lineTo(colDesc, tableTop + headerH).stroke();
  doc.moveTo(colQty, tableTop).lineTo(colQty, tableTop + headerH).stroke();
  doc.moveTo(colUnit, tableTop).lineTo(colUnit, tableTop + headerH).stroke();
  doc.moveTo(colSAC, tableTop).lineTo(colSAC, tableTop + headerH).stroke();
  doc.moveTo(colRate, tableTop).lineTo(colRate, tableTop + headerH).stroke();
  doc.moveTo(colAmount, tableTop).lineTo(colAmount, tableTop + headerH).stroke();

  let y = tableTop + headerH;
  let taxableTotal = 0;

  const items = Array.isArray(invoice?.items) ? invoice.items : [];

  items.forEach((it, idx) => {
    const sno = it?.sl_no ?? (idx + 1);
    const qty = Number(it?.quantity) || 0;
    const rate = Number(it?.rate) || 0;
    const amount = Number(it?.amount) || qty * rate;
    taxableTotal += amount;

    if (y > doc.page.height - doc.page.margins.bottom - 120) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    doc.lineWidth(0.8).rect(tableLeft, y, tableWidth, rowH).stroke();
    doc.moveTo(colDesc, y).lineTo(colDesc, y + rowH).stroke();
    doc.moveTo(colQty, y).lineTo(colQty, y + rowH).stroke();
    doc.moveTo(colUnit, y).lineTo(colUnit, y + rowH).stroke();
    doc.moveTo(colSAC, y).lineTo(colSAC, y + rowH).stroke();
    doc.moveTo(colRate, y).lineTo(colRate, y + rowH).stroke();
    doc.moveTo(colAmount, y).lineTo(colAmount, y + rowH).stroke();

    doc.fontSize(9)
      .text(String(sno), colSno + 4, y + 5, { width: wSno - 8 })
      .text(String(it?.description || ''), colDesc + 4, y + 5, { width: wDesc - 8, lineBreak: false, ellipsis: true })
      .text(qty ? String(qty) : '', colQty + 4, y + 5, { width: wQty - 8, align: 'right' })
      .text(it?.unit || '', colUnit + 4, y + 5, { width: wUnit - 8 })
      .text(it?.sac_code || '', colSAC + 4, y + 5, { width: wSAC - 8 })
      .text(rate ? rate.toFixed(2) : '', colRate + 4, y + 5, { width: wRate - 8, align: 'right' })
      .text(amount ? amount.toFixed(2) : '', colAmount + 4, y + 5, { width: wAmount - 8, align: 'right' });

    y += rowH;
  });

  const cgstAmount = Number(invoice?.cgst_amount) || 0;
  const igstAmount = Number(invoice?.igst_amount) || 0;
  const totalAmount = Number(invoice?.total_amount) || 0;

  const summaryY = Math.max(doc.y, y + 15);
  doc.fontSize(10)
    .text(`Taxable Amount: ${taxableTotal.toFixed(2)}`, tableLeft, summaryY, { width: tableWidth, align: 'right' })
    .text(`CGST (${invoice?.cgst_percent || 0}%): ${cgstAmount.toFixed(2)}`, tableLeft, summaryY + 14, { width: tableWidth, align: 'right' })
    .text(`IGST (${invoice?.igst_percent || 0}%): ${igstAmount.toFixed(2)}`, tableLeft, summaryY + 28, { width: tableWidth, align: 'right' })
    .font('Helvetica-Bold')
    .text(`Grand Total: ${totalAmount.toFixed(2)}`, tableLeft, summaryY + 45, { width: tableWidth, align: 'right' })
    .font('Helvetica');

  doc.y = summaryY + 65;

  if (invoice?.remarks) {
    doc.fontSize(9).font('Helvetica-Bold').text('Remarks:', leftX);
    doc.font('Helvetica');
    doc.fontSize(9).text(String(invoice.remarks), { align: 'left' });
    doc.moveDown(0.8);
  }

  doc.fontSize(9).text('Thanking you,', leftX);
  doc.moveDown(0.6);
  doc.fontSize(9).text('Yours faithfully,', leftX);
  doc.fontSize(9).text('For Remag Electros (P) Ltd.', leftX);
  doc.moveDown(2.0);
  doc.fontSize(9).text('Authorized Signatory', leftX);

  doc.end();
  return doc;
};

