import { format } from 'date-fns'

// Fallback PDF generator using browser's print functionality
// This will be used until jspdf packages are installed

const colors = {
  primary: '#1976d2',
  secondary: '#dc004e',
  accent: '#7c4dff',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  gray: '#757575',
  lightGray: '#f5f5f5',
  darkGray: '#424242'
}

const generatePrintableHTML = (title, data, sections) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .header p {
          font-size: 14px;
          opacity: 0.9;
        }
        
        .content {
          padding: 30px;
        }
        
        .section {
          margin-bottom: 30px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: ${colors.primary};
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid ${colors.primary};
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .info-item {
          background: ${colors.lightGray};
          padding: 12px 15px;
          border-radius: 8px;
          border-left: 4px solid ${colors.primary};
        }
        
        .info-label {
          font-size: 12px;
          color: ${colors.gray};
          margin-bottom: 4px;
        }
        
        .info-value {
          font-size: 14px;
          font-weight: 500;
          color: ${colors.darkGray};
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .table th {
          background: ${colors.primary};
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
          font-size: 12px;
        }
        
        .table td {
          padding: 10px 12px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 12px;
        }
        
        .table tr:hover {
          background: #f8f9fa;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status-success { background: ${colors.success}; color: white; }
        .status-warning { background: ${colors.warning}; color: white; }
        .status-error { background: ${colors.error}; color: white; }
        .status-default { background: ${colors.gray}; color: white; }
        
        .footer {
          background: ${colors.lightGray};
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: ${colors.gray};
          border-top: 1px solid #e0e0e0;
        }
        
        .witness-info {
          background: ${colors.success};
          color: white;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
        }
        
        @media print {
          body { background: white; }
          .container { box-shadow: none; }
          .header { background: ${colors.primary} !important; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
          <p>Generated on ${format(new Date(), 'dd-MM-yyyy hh:mm a')}</p>
        </div>
        
        <div class="content">
          ${sections}
        </div>
        
        <div class="footer">
          <p>© 2024 ERP System | Page printed on ${format(new Date(), 'dd-MM-yyyy hh:mm a')}</p>
        </div>
      </div>
    </body>
    </html>
  `
  return html
}

// Job Entry PDF (Fallback)
export const generateJobEntryPDF = async (jobEntry) => {
  const sections = `
    <div class="section">
      <div class="section-title">Job Information</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Job Number</div>
          <div class="info-value">${jobEntry.job_number}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Party Name</div>
          <div class="info-value">${jobEntry.party_name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Department</div>
          <div class="info-value">${jobEntry.department || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Gatepass Number</div>
          <div class="info-value">${jobEntry.gatepass_number || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Scope of Work</div>
          <div class="info-value">${jobEntry.scope_of_work || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Job Type</div>
          <div class="info-value">${jobEntry.job_type || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Status</div>
          <div class="info-value">
            <span class="status-badge status-${jobEntry.status === 'Dispatch' ? 'success' : jobEntry.status === 'Testing' ? 'warning' : 'default'}">
              ${jobEntry.status}
            </span>
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Created</div>
          <div class="info-value">${jobEntry.created_at ? format(new Date(jobEntry.created_at), 'dd-MM-yyyy hh:mm a') : 'N/A'}</div>
        </div>
      </div>
    </div>
    
    ${jobEntry.job_description ? `
    <div class="section">
      <div class="section-title">Job Description</div>
      <div style="background: ${colors.lightGray}; padding: 15px; border-radius: 8px;">
        ${jobEntry.job_description}
      </div>
    </div>
    ` : ''}
    
    ${jobEntry.machining || jobEntry.spares_received ? `
    <div class="section">
      <div class="section-title">Additional Details</div>
      <table class="table">
        <tr>
          <th>Detail Type</th>
          <th>Description</th>
        </tr>
        <tr>
          <td>Machining</td>
          <td>${jobEntry.machining || 'N/A'}</td>
        </tr>
        <tr>
          <td>Spares Received</td>
          <td>${jobEntry.spares_received || 'N/A'}</td>
        </tr>
      </table>
    </div>
    ` : ''}
  `
  
  const html = generatePrintableHTML(`JOB ENTRY #${jobEntry.job_number}`, jobEntry, sections)
  
  // Create a new window and print
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  
  // Wait for the content to load, then print
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

// AC Motor Data Sheet PDF (Fallback)
export const generateACMotorDataSheetPDF = async (dataSheet) => {
  const sections = `
    <div class="section">
      <div class="section-title">Basic Information</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Job Number</div>
          <div class="info-value">${dataSheet.job_no}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Party</div>
          <div class="info-value">${dataSheet.party}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Captain</div>
          <div class="info-value">${dataSheet.captain || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Sheet Date</div>
          <div class="info-value">${dataSheet.sheet_date ? format(new Date(dataSheet.sheet_date), 'dd-MMM-yyyy') : 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Make</div>
          <div class="info-value">${dataSheet.make || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Power</div>
          <div class="info-value">${dataSheet.power_kw || 'N/A'} kW</div>
        </div>
        <div class="info-item">
          <div class="info-label">Voltage</div>
          <div class="info-value">${dataSheet.voltage_volts || 'N/A'} V</div>
        </div>
        <div class="info-item">
          <div class="info-label">Speed</div>
          <div class="info-value">${dataSheet.speed_rpm || 'N/A'} RPM</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Nameplate Details</div>
      <table class="table">
        <tr>
          <th>Parameter</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Type</td>
          <td>${dataSheet.type || 'N/A'}</td>
        </tr>
        <tr>
          <td>Class of Insulation</td>
          <td>${dataSheet.class_of_insulation || 'N/A'}</td>
        </tr>
        <tr>
          <td>Serial Number</td>
          <td>${dataSheet.serial_number_sl_no || 'N/A'}</td>
        </tr>
        <tr>
          <td>Power Factor</td>
          <td>${dataSheet.power_factor_pf || 'N/A'}</td>
        </tr>
        <tr>
          <td>Frame</td>
          <td>${dataSheet.frame || 'N/A'}</td>
        </tr>
        <tr>
          <td>Phase</td>
          <td>${dataSheet.phase || 'N/A'}</td>
        </tr>
        <tr>
          <td>Connection</td>
          <td>${dataSheet.connection_y_delta || 'N/A'}</td>
        </tr>
        <tr>
          <td>Total Weight</td>
          <td>${dataSheet.total_weight || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <div class="section">
      <div class="section-title">Status</div>
      <div style="text-align: center; margin: 20px 0;">
        <span class="status-badge status-${dataSheet.status === 'Completed' ? 'success' : 'default'}">
          ${dataSheet.status || 'Draft'}
        </span>
      </div>
    </div>
  `
  
  const html = generatePrintableHTML(`AC MOTOR DATA SHEET #${dataSheet.job_no}`, dataSheet, sections)
  
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

// DC Motor Data Sheet PDF (Fallback)
export const generateDCMotorDataSheetPDF = async (dataSheet) => {
  const sections = `
    <div class="section">
      <div class="section-title">Basic Information</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Job Number</div>
          <div class="info-value">${dataSheet.job_no}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Party</div>
          <div class="info-value">${dataSheet.party}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Captain</div>
          <div class="info-value">${dataSheet.captain || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Sheet Date</div>
          <div class="info-value">${dataSheet.sheet_date ? format(new Date(dataSheet.sheet_date), 'dd-MMM-yyyy') : 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Make</div>
          <div class="info-value">${dataSheet.make || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Power</div>
          <div class="info-value">${dataSheet.power_kw || 'N/A'} kW</div>
        </div>
        <div class="info-item">
          <div class="info-label">Voltage</div>
          <div class="info-value">${dataSheet.voltage_volts || 'N/A'} V</div>
        </div>
        <div class="info-item">
          <div class="info-label">Speed</div>
          <div class="info-value">${dataSheet.speed_rpm || 'N/A'} RPM</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Nameplate Details</div>
      <table class="table">
        <tr>
          <th>Parameter</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Current</td>
          <td>${dataSheet.current_amp || 'N/A'} A</td>
        </tr>
        <tr>
          <td>Capacity</td>
          <td>${dataSheet.capacity_hp || 'N/A'} HP</td>
        </tr>
        <tr>
          <td>Class of Insulation</td>
          <td>${dataSheet.class_of_insulation || 'N/A'}</td>
        </tr>
        <tr>
          <td>Serial Number</td>
          <td>${dataSheet.serial_number_sl_no || 'N/A'}</td>
        </tr>
        <tr>
          <td>Total Weight</td>
          <td>${dataSheet.total_weight || 'N/A'}</td>
        </tr>
        <tr>
          <td>Year of Mfg</td>
          <td>${dataSheet.year_of_mfg || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <div class="section">
      <div class="section-title">Armature Winding Details</div>
      <table class="table">
        <tr>
          <th>Parameter</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Type of Winding</td>
          <td>${dataSheet.type_of_winding || 'N/A'}</td>
        </tr>
        <tr>
          <td>Type of Conductor</td>
          <td>${dataSheet.type_of_conductor || 'N/A'}</td>
        </tr>
        <tr>
          <td>Number of Slots</td>
          <td>${dataSheet.no_of_slots || 'N/A'}</td>
        </tr>
        <tr>
          <td>Slot Size</td>
          <td>${dataSheet.slot_size || 'N/A'}</td>
        </tr>
        <tr>
          <td>Turns in Each Coil</td>
          <td>${dataSheet.no_of_turns_in_each_coil || 'N/A'}</td>
        </tr>
        <tr>
          <td>Conductor Size</td>
          <td>${dataSheet.conductor_size || 'N/A'}</td>
        </tr>
      </table>
    </div>
  `
  
  const html = generatePrintableHTML(`DC MOTOR DATA SHEET #${dataSheet.job_no}`, dataSheet, sections)
  
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

// Test Report PDF (Fallback)
export const generateTestReportPDF = async (testReport) => {
  const sections = `
    <div class="section">
      <div class="section-title">Test Information</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Report ID</div>
          <div class="info-value">${testReport.report_id}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Customer</div>
          <div class="info-value">${testReport.customer}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Repairer</div>
          <div class="info-value">${testReport.repairer}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Service Order</div>
          <div class="info-value">${testReport.service_order_number || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Gatepass</div>
          <div class="info-value">${testReport.gatepass_number || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Test Date</div>
          <div class="info-value">${testReport.date_of_testing ? format(new Date(testReport.date_of_testing), 'dd-MMM-yyyy') : 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Make</div>
          <div class="info-value">${testReport.make}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Serial No</div>
          <div class="info-value">${testReport.sl_no}</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Motor Specifications</div>
      <table class="table">
        <tr>
          <th>Parameter</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Power</td>
          <td>${testReport.kw || 'N/A'} kW / ${testReport.hp || 'N/A'} HP</td>
        </tr>
        <tr>
          <td>Voltage</td>
          <td>${testReport.volts || 'N/A'} V</td>
        </tr>
        <tr>
          <td>Current</td>
          <td>${testReport.current || 'N/A'} A</td>
        </tr>
        <tr>
          <td>Speed</td>
          <td>${testReport.rpm || 'N/A'} RPM</td>
        </tr>
        <tr>
          <td>Frequency</td>
          <td>${testReport.frequency || 'N/A'} Hz</td>
        </tr>
        <tr>
          <td>Duty</td>
          <td>${testReport.duty || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <div class="section">
      <div class="section-title">Test Results</div>
      <table class="table">
        <tr>
          <th>Test</th>
          <th>Value</th>
          <th>Unit</th>
        </tr>
        <tr>
          <td>IR Stator (Phase-Earth)</td>
          <td>${testReport.ir_stator_phase_earth_value || 'N/A'}</td>
          <td>${testReport.ir_stator_phase_earth_unit || ''}</td>
        </tr>
        <tr>
          <td>IR Stator (Phase-Phase)</td>
          <td>${testReport.ir_stator_phase_phase_value || 'N/A'}</td>
          <td>${testReport.ir_stator_phase_phase_unit || ''}</td>
        </tr>
        <tr>
          <td>Resistance (R1-R2)</td>
          <td>${testReport.r1r2_resistance_value || 'N/A'}</td>
          <td>${testReport.resistance_unit || ''}</td>
        </tr>
        <tr>
          <td>Inductance (R1-R2)</td>
          <td>${testReport.r1r2_inductance_mh || 'N/A'}</td>
          <td>mH</td>
        </tr>
      </table>
    </div>
    
    ${testReport.witness_name ? `
    <div class="witness-info">
      <h3>Witness Information</h3>
      <p><strong>Name:</strong> ${testReport.witness_name}</p>
      ${testReport.witness_designation ? `<p><strong>Designation:</strong> ${testReport.witness_designation}</p>` : ''}
    </div>
    ` : ''}
  `
  
  const html = generatePrintableHTML(`TEST REPORT #${testReport.report_id}`, testReport, sections)
  
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

// Checklist PDF (Fallback)
export const generateChecklistPDF = async (jobSheet) => {
  const sections = `
    <div class="section">
      <div class="section-title">Basic Information</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Job Number</div>
          <div class="info-value">${jobSheet.job_number}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Party Name</div>
          <div class="info-value">${jobSheet.party_name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Department</div>
          <div class="info-value">${jobSheet.department || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Job Date</div>
          <div class="info-value">${jobSheet.date ? format(new Date(jobSheet.date), 'dd-MMM-yyyy') : 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Make</div>
          <div class="info-value">${jobSheet.make || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Type</div>
          <div class="info-value">${jobSheet.type || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Power</div>
          <div class="info-value">${jobSheet.kw_hp || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Voltage</div>
          <div class="info-value">${jobSheet.voltage || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Speed</div>
          <div class="info-value">${jobSheet.speed_rpm || 'N/A'} RPM</div>
        </div>
      </div>
    </div>
    
    ${jobSheet.observation ? `
    <div class="section">
      <div class="section-title">Observations</div>
      <div style="background: ${colors.lightGray}; padding: 15px; border-radius: 8px;">
        ${jobSheet.observation}
      </div>
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">Technical Details</div>
      <table class="table">
        <tr>
          <th>Component</th>
          <th>Details</th>
          <th>Remarks</th>
        </tr>
        <tr>
          <td>Stator Winding</td>
          <td>${jobSheet.stator_winding || 'N/A'}</td>
          <td>${jobSheet.stator_winding_remarks || ''}</td>
        </tr>
        <tr>
          <td>Rotor Winding</td>
          <td>${jobSheet.rotor_winding || 'N/A'}</td>
          <td>${jobSheet.rotor_winding_remarks || ''}</td>
        </tr>
        <tr>
          <td>Bearing (DE)</td>
          <td>${jobSheet.bearing_bearing_seat_de || 'N/A'}</td>
          <td>${jobSheet.bearing_bearing_seat_de_remarks || ''}</td>
        </tr>
        <tr>
          <td>Bearing (NDE)</td>
          <td>${jobSheet.bearing_bearing_seat_nde || 'N/A'}</td>
          <td>${jobSheet.bearing_bearing_seat_nde_remarks || ''}</td>
        </tr>
        <tr>
          <td>Core (Stator)</td>
          <td>${jobSheet.core_stator || 'N/A'}</td>
          <td>${jobSheet.core_stator_remarks || ''}</td>
        </tr>
        <tr>
          <td>Core (Rotor)</td>
          <td>${jobSheet.core_rotor || 'N/A'}</td>
          <td>${jobSheet.core_rotor_remarks || ''}</td>
        </tr>
      </table>
    </div>
  `
  
  const html = generatePrintableHTML(`CHECKLIST #${jobSheet.job_number}`, jobSheet, sections)
  
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  
  setTimeout(() => {
    printWindow.print()
  }, 500)
}
