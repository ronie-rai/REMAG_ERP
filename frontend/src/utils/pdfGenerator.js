import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'

// Add font for better text rendering
const addFont = (doc) => {
  // Using default font for now, can be enhanced with custom fonts
  doc.setFont('helvetica')
}

// Modern color scheme
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

// Common header styling
const addHeader = (doc, title, subtitle = '') => {
  // Add gradient-like header background
  doc.setFillColor(colors.primary)
  doc.rect(0, 0, 210, 40, 'F')
  
  // Add accent line
  doc.setFillColor(colors.accent)
  doc.rect(0, 40, 210, 3, 'F')
  
  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 15, 25)
  
  // Subtitle
  if (subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, 15, 35)
  }
  
  // Reset text color for content
  doc.setTextColor(0, 0, 0)
}

// Footer with page numbers
const addFooter = (doc, pageNumber) => {
  const pageHeight = doc.internal.pageSize.height
  const pageWidth = doc.internal.pageSize.width
  
  // Footer line
  doc.setDrawColor(colors.gray)
  doc.setLineWidth(0.5)
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20)
  
  // Page number
  doc.setFontSize(10)
  doc.setTextColor(colors.gray)
  doc.text(`Page ${pageNumber}`, pageWidth - 30, pageHeight - 10)
  
  // Date and time
  doc.text(`Generated: ${format(new Date(), 'dd-MM-yyyy hh:mm a')}`, 15, pageHeight - 10)
}

// Modern table styling
const getTableStyle = () => ({
  headStyles: {
    fillColor: colors.primary,
    textColor: 255,
    fontStyle: 'bold',
    fontSize: 10,
    halign: 'center'
  },
  bodyStyles: {
    textColor: 0,
    fontSize: 9,
    cellPadding: 3
  },
  alternateRowStyles: {
    fillColor: [245, 245, 245]
  },
  margin: { top: 60, bottom: 30 },
  styles: {
    lineColor: [200, 200, 200],
    lineWidth: 0.1
  }
})

// Checklist PDF
export const generateChecklistPDF = async (jobSheet) => {
  const doc = new jsPDF()
  addFont(doc)
  
  let yPosition = 60
  
  // Header
  addHeader(doc, 'CHECKLIST', `Job No: ${jobSheet.job_number}`)
  
  // Basic Information Card
  doc.setFillColor(colors.lightGray)
  doc.roundedRect(15, yPosition, 180, 80, 5, 5, 'F')
  doc.setDrawColor(colors.gray)
  doc.roundedRect(15, yPosition, 180, 80, 5, 5, 'S')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Basic Information', 25, yPosition + 15)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const basicInfo = [
    `Party Name: ${jobSheet.party_name}`,
    `Department: ${jobSheet.department}`,
    `Job Date: ${jobSheet.date ? format(new Date(jobSheet.date), 'dd-MMM-yyyy') : 'N/A'}`,
    `Make: ${jobSheet.make || 'N/A'}`,
    `Type: ${jobSheet.type || 'N/A'}`,
    `Power: ${jobSheet.kw_hp || 'N/A'}`,
    `Voltage: ${jobSheet.voltage || 'N/A'}`,
    `Speed: ${jobSheet.speed_rpm || 'N/A'} RPM`
  ]
  
  basicInfo.forEach((info, index) => {
    doc.text(info, 25, yPosition + 30 + (index * 6))
  })
  
  yPosition += 100
  
  // Observations
  if (jobSheet.observation) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Observations', 15, yPosition)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const splitObservation = doc.splitTextToSize(jobSheet.observation, 180)
    doc.text(splitObservation, 15, yPosition + 10)
    yPosition += 10 + (splitObservation.length * 5)
  }
  
  // Technical Details Table
  const technicalData = [
    ['Component', 'Details', 'Remarks'],
    ['Stator Winding', jobSheet.stator_winding || 'N/A', jobSheet.stator_winding_remarks || ''],
    ['Rotor Winding', jobSheet.rotor_winding || 'N/A', jobSheet.rotor_winding_remarks || ''],
    ['Bearing (DE)', jobSheet.bearing_bearing_seat_de || 'N/A', jobSheet.bearing_bearing_seat_de_remarks || ''],
    ['Bearing (NDE)', jobSheet.bearing_bearing_seat_nde || 'N/A', jobSheet.bearing_bearing_seat_nde_remarks || ''],
    ['Core (Stator)', jobSheet.core_stator || 'N/A', jobSheet.core_stator_remarks || ''],
    ['Core (Rotor)', jobSheet.core_rotor || 'N/A', jobSheet.core_rotor_remarks || '']
  ]
  
  doc.autoTable({
    head: [technicalData[0]],
    body: technicalData.slice(1),
    ...getTableStyle(),
    startY: yPosition + 10
  })
  
  // Footer
  addFooter(doc, 1)
  
  // Save the PDF
  doc.save(`Checklist_${jobSheet.job_number}.pdf`)
}

// AC Motor Data Sheet PDF
export const generateACMotorDataSheetPDF = async (dataSheet) => {
  const doc = new jsPDF()
  addFont(doc)
  
  let yPosition = 60
  
  // Header
  addHeader(doc, 'AC MOTOR DATA SHEET', `Job No: ${dataSheet.job_no}`)
  
  // Basic Information
  doc.setFillColor(colors.lightGray)
  doc.roundedRect(15, yPosition, 180, 70, 5, 5, 'F')
  doc.setDrawColor(colors.gray)
  doc.roundedRect(15, yPosition, 180, 70, 5, 5, 'S')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Basic Information', 25, yPosition + 15)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const basicInfo = [
    `Party: ${dataSheet.party}`,
    `Captain: ${dataSheet.captain}`,
    `Sheet Date: ${dataSheet.sheet_date ? format(new Date(dataSheet.sheet_date), 'dd-MMM-yyyy') : 'N/A'}`,
    `Make: ${dataSheet.make}`,
    `Power: ${dataSheet.power_kw} kW`,
    `Voltage: ${dataSheet.voltage_volts} V`,
    `Speed: ${dataSheet.speed_rpm} RPM`,
    `Frequency: ${dataSheet.frequency_hz} Hz`
  ]
  
  basicInfo.forEach((info, index) => {
    doc.text(info, 25, yPosition + 30 + (index * 5))
  })
  
  yPosition += 90
  
  // Nameplate Details
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Nameplate Details', 15, yPosition)
  
  const nameplateData = [
    ['Parameter', 'Value'],
    ['Type', dataSheet.type || 'N/A'],
    ['Class of Insulation', dataSheet.class_of_insulation || 'N/A'],
    ['Serial Number', dataSheet.serial_number_sl_no || 'N/A'],
    ['Power Factor', dataSheet.power_factor_pf || 'N/A'],
    ['Frame', dataSheet.frame || 'N/A'],
    ['Phase', dataSheet.phase || 'N/A'],
    ['Connection', dataSheet.connection_y_delta || 'N/A'],
    ['Total Weight', dataSheet.total_weight || 'N/A']
  ]
  
  doc.autoTable({
    head: [nameplateData[0]],
    body: nameplateData.slice(1),
    ...getTableStyle(),
    startY: yPosition + 10,
    columns: [
      { header: 'Parameter', dataKey: 'param' },
      { header: 'Value', dataKey: 'value' }
    ]
  })
  
  yPosition = doc.lastAutoTable.finalY + 20
  
  // Winding Details
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Winding Details', 15, yPosition)
  
  const windingData = [
    ['Component', 'Type', 'Conductor', 'Slots', 'Coils/Series', 'Conductor Size'],
    ['Stator', dataSheet.type_of_winding || 'N/A', dataSheet.type_of_conductor || 'N/A', 
     dataSheet.no_of_slots_stator || 'N/A', dataSheet.no_of_coils_in_series_per_set_stator || 'N/A', 
     dataSheet.size_of_conductor_bare_stator || 'N/A'],
    ['Rotor', dataSheet.type_of_winding || 'N/A', dataSheet.type_of_conductor || 'N/A', 
     dataSheet.no_of_slots_rotor || 'N/A', dataSheet.no_of_coils_in_series_per_set_rotor || 'N/A', 
     dataSheet.size_of_conductor_bare_rotor || 'N/A']
  ]
  
  doc.autoTable({
    head: [windingData[0]],
    body: windingData.slice(1),
    ...getTableStyle(),
    startY: yPosition + 10
  })
  
  // Footer
  addFooter(doc, 1)
  
  // Save the PDF
  doc.save(`ACMotorDataSheet_${dataSheet.job_no}.pdf`)
}

// DC Motor Data Sheet PDF
export const generateDCMotorDataSheetPDF = async (dataSheet) => {
  const doc = new jsPDF()
  addFont(doc)
  
  let yPosition = 60
  
  // Header
  addHeader(doc, 'DC MOTOR DATA SHEET', `Job No: ${dataSheet.job_no}`)
  
  // Basic Information
  doc.setFillColor(colors.lightGray)
  doc.roundedRect(15, yPosition, 180, 60, 5, 5, 'F')
  doc.setDrawColor(colors.gray)
  doc.roundedRect(15, yPosition, 180, 60, 5, 5, 'S')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Basic Information', 25, yPosition + 15)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const basicInfo = [
    `Party: ${dataSheet.party}`,
    `Captain: ${dataSheet.captain}`,
    `Sheet Date: ${dataSheet.sheet_date ? format(new Date(dataSheet.sheet_date), 'dd-MMM-yyyy') : 'N/A'}`,
    `Make: ${dataSheet.make}`,
    `Power: ${dataSheet.power_kw} kW`,
    `Voltage: ${dataSheet.voltage_volts} V`,
    `Speed: ${dataSheet.speed_rpm} RPM`,
    `Type: ${dataSheet.type}`
  ]
  
  basicInfo.forEach((info, index) => {
    doc.text(info, 25, yPosition + 30 + (index * 4))
  })
  
  yPosition += 80
  
  // Nameplate Details
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Nameplate Details', 15, yPosition)
  
  const nameplateData = [
    ['Parameter', 'Value'],
    ['Current', `${dataSheet.current_amp || 'N/A'} A`],
    ['Capacity', `${dataSheet.capacity_hp || 'N/A'} HP`],
    ['Class of Insulation', dataSheet.class_of_insulation || 'N/A'],
    ['Serial Number', dataSheet.serial_number_sl_no || 'N/A'],
    ['Total Weight', dataSheet.total_weight || 'N/A'],
    ['Year of Mfg', dataSheet.year_of_mfg || 'N/A']
  ]
  
  doc.autoTable({
    head: [nameplateData[0]],
    body: nameplateData.slice(1),
    ...getTableStyle(),
    startY: yPosition + 10
  })
  
  yPosition = doc.lastAutoTable.finalY + 20
  
  // Armature Winding Details
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Armature Winding Details', 15, yPosition)
  
  const armatureData = [
    ['Parameter', 'Value'],
    ['Type of Winding', dataSheet.type_of_winding || 'N/A'],
    ['Type of Conductor', dataSheet.type_of_conductor || 'N/A'],
    ['Number of Slots', dataSheet.no_of_slots || 'N/A'],
    ['Slot Size', dataSheet.slot_size || 'N/A'],
    ['Turns in Each Coil', dataSheet.no_of_turns_in_each_coil || 'N/A'],
    ['Conductor Size', dataSheet.conductor_size || 'N/A'],
    ['Wires in Each Coil', dataSheet.wires_in_each_coil || 'N/A'],
    ['Coils in Series Set', dataSheet.no_of_coils_in_series_set || 'N/A']
  ]
  
  doc.autoTable({
    head: [armatureData[0]],
    body: armatureData.slice(1),
    ...getTableStyle(),
    startY: yPosition + 10
  })
  
  // Footer
  addFooter(doc, 1)
  
  // Save the PDF
  doc.save(`DCMotorDataSheet_${dataSheet.job_no}.pdf`)
}

// Test Report PDF
export const generateTestReportPDF = async (testReport) => {
  const doc = new jsPDF()
  addFont(doc)
  
  let yPosition = 60
  
  // Header
  addHeader(doc, 'TEST REPORT', `Report ID: ${testReport.report_id}`)
  
  // Basic Information
  doc.setFillColor(colors.lightGray)
  doc.roundedRect(15, yPosition, 180, 60, 5, 5, 'F')
  doc.setDrawColor(colors.gray)
  doc.roundedRect(15, yPosition, 180, 60, 5, 5, 'S')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Test Information', 25, yPosition + 15)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const basicInfo = [
    `Customer: ${testReport.customer}`,
    `Repairer: ${testReport.repairer}`,
    `Service Order: ${testReport.service_order_number || 'N/A'}`,
    `Gatepass: ${testReport.gatepass_number || 'N/A'}`,
    `Test Date: ${testReport.date_of_testing ? format(new Date(testReport.date_of_testing), 'dd-MMM-yyyy') : 'N/A'}`,
    `Make: ${testReport.make}`,
    `Serial No: ${testReport.sl_no}`,
    `Power: ${testReport.kw} kW / ${testReport.hp} HP`
  ]
  
  basicInfo.forEach((info, index) => {
    doc.text(info, 25, yPosition + 30 + (index * 4))
  })
  
  yPosition += 80
  
  // Motor Specifications
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Motor Specifications', 15, yPosition)
  
  const motorSpecs = [
    ['Parameter', 'Value'],
    ['Voltage', `${testReport.volts || 'N/A'} V`],
    ['Current', `${testReport.current || 'N/A'} A`],
    ['Speed', `${testReport.rpm || 'N/A'} RPM`],
    ['Frequency', `${testReport.frequency || 'N/A'} Hz`],
    ['Duty', testReport.duty || 'N/A']
  ]
  
  doc.autoTable({
    head: [motorSpecs[0]],
    body: motorSpecs.slice(1),
    ...getTableStyle(),
    startY: yPosition + 10
  })
  
  yPosition = doc.lastAutoTable.finalY + 20
  
  // Test Results
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Test Results', 15, yPosition)
  
  const testResults = [
    ['Test', 'Value', 'Unit'],
    ['IR Stator (Phase-Earth)', testReport.ir_stator_phase_earth_value || 'N/A', testReport.ir_stator_phase_earth_unit || ''],
    ['IR Stator (Phase-Phase)', testReport.ir_stator_phase_phase_value || 'N/A', testReport.ir_stator_phase_phase_unit || ''],
    ['Resistance', testReport.r1r2_resistance_value || 'N/A', testReport.resistance_unit || ''],
    ['Inductance (R1-R2)', testReport.r1r2_inductance_mh || 'N/A', 'mH'],
    ['Inductance (Y1-Y2)', testReport.y1y2_inductance_mh || 'N/A', 'mH'],
    ['Inductance (B1-B2)', testReport.b1b2_inductance_mh || 'N/A', 'mH']
  ]
  
  doc.autoTable({
    head: [testResults[0]],
    body: testResults.slice(1),
    ...getTableStyle(),
    startY: yPosition + 10
  })
  
  yPosition = doc.lastAutoTable.finalY + 20
  
  // Vibration Measurements
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Vibration Measurements', 15, yPosition)
  
  const vibrationData = [
    ['Position', 'Axial', 'Horizontal', 'Vertical', 'Temperature'],
    ['Drive End (DE)', testReport.de_axial || 'N/A', testReport.de_horizontal || 'N/A', testReport.de_vertical || 'N/A', testReport.de_temperature || 'N/A'],
    ['Non-Drive End (NDE)', testReport.nde_axial || 'N/A', testReport.nde_horizontal || 'N/A', testReport.nde_vertical || 'N/A', testReport.nde_temperature || 'N/A']
  ]
  
  doc.autoTable({
    head: [vibrationData[0]],
    body: vibrationData.slice(1),
    ...getTableStyle(),
    startY: yPosition + 10
  })
  
  yPosition = doc.lastAutoTable.finalY + 20
  
  // Witness Information
  if (testReport.witness_name) {
    doc.setFillColor(colors.success)
    doc.roundedRect(15, yPosition, 180, 30, 5, 5, 'F')
    doc.setDrawColor(colors.success)
    doc.roundedRect(15, yPosition, 180, 30, 5, 5, 'S')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Witness Information', 25, yPosition + 15)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Name: ${testReport.witness_name}`, 25, yPosition + 25)
    if (testReport.witness_designation) {
      doc.text(`Designation: ${testReport.witness_designation}`, 100, yPosition + 25)
    }
    doc.setTextColor(0, 0, 0)
  }
  
  // Footer
  addFooter(doc, 1)
  
  // Save the PDF
  doc.save(`TestReport_${testReport.report_id}.pdf`)
}

// Job Entry PDF
export const generateJobEntryPDF = async (jobEntry) => {
  const doc = new jsPDF()
  addFont(doc)
  
  let yPosition = 60
  
  // Header
  addHeader(doc, 'JOB ENTRY', `Job No: ${jobEntry.job_number}`)
  
  // Basic Information Card
  doc.setFillColor(colors.lightGray)
  doc.roundedRect(15, yPosition, 180, 80, 5, 5, 'F')
  doc.setDrawColor(colors.gray)
  doc.roundedRect(15, yPosition, 180, 80, 5, 5, 'S')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Job Information', 25, yPosition + 15)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const jobInfo = [
    `Party Name: ${jobEntry.party_name}`,
    `Department: ${jobEntry.department}`,
    `Gatepass Number: ${jobEntry.gatepass_number || 'N/A'}`,
    `Scope of Work: ${jobEntry.scope_of_work || 'N/A'}`,
    `Job Type: ${jobEntry.job_type || 'N/A'}`,
    `Status: ${jobEntry.status}`,
    `Created: ${jobEntry.created_at ? format(new Date(jobEntry.created_at), 'dd-MM-yyyy hh:mm a') : 'N/A'}`
  ]
  
  jobInfo.forEach((info, index) => {
    doc.text(info, 25, yPosition + 30 + (index * 6))
  })
  
  yPosition += 100
  
  // Job Description
  if (jobEntry.job_description) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Job Description', 15, yPosition)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const splitDescription = doc.splitTextToSize(jobEntry.job_description, 180)
    doc.text(splitDescription, 15, yPosition + 10)
    yPosition += 10 + (splitDescription.length * 5)
  }
  
  // Additional Details
  if (jobEntry.machining || jobEntry.spares_received) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Additional Details', 15, yPosition)
    
    const additionalData = [
      ['Detail Type', 'Description'],
      ['Machining', jobEntry.machining || 'N/A'],
      ['Spares Received', jobEntry.spares_received || 'N/A']
    ]
    
    doc.autoTable({
      head: [additionalData[0]],
      body: additionalData.slice(1),
      ...getTableStyle(),
      startY: yPosition + 10
    })
  }
  
  // Status Badge
  const statusColor = {
    'Cleaning': colors.gray,
    'Dismantling': colors.primary,
    'Coil Stripping': colors.warning,
    'Testing': colors.success,
    'Dispatch': colors.success
  }
  
  doc.setFillColor(statusColor[jobEntry.status] || colors.gray)
  doc.roundedRect(15, doc.internal.pageSize.height - 50, 60, 20, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Status: ${jobEntry.status}`, 20, doc.internal.pageSize.height - 35)
  doc.setTextColor(0, 0, 0)
  
  // Footer
  addFooter(doc, 1)
  
  // Save the PDF
  doc.save(`JobEntry_${jobEntry.job_number}.pdf`)
}
