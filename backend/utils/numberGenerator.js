import sql, { getConnection } from '../config/database.js';

export const generateEnquiryNo = async () => {
  const year = new Date().getFullYear();
  const pool = await getConnection();
  
  const result = await pool.request()
    .query(`SELECT TOP 1 enquiry_no FROM enquiries 
            WHERE enquiry_no LIKE 'ENQ${year}%' 
            ORDER BY id DESC`);
  
  let newNum = 1;
  if (result.recordset.length > 0) {
    const lastNo = result.recordset[0].enquiry_no;
    const lastNum = parseInt(lastNo.slice(-4));
    newNum = lastNum + 1;
  }
  
  return `ENQ${year}${newNum.toString().padStart(4, '0')}`;
};

export const generateSalesQuotationNo = async () => {
  const year = new Date().getFullYear();
  const pool = await getConnection();

  const result = await pool.request()
    .query(`SELECT TOP 1 quotation_no FROM sales_quotations
            WHERE quotation_no LIKE 'QUO${year}%'
            ORDER BY id DESC`);

  let newNum = 1;
  if (result.recordset.length > 0) {
    const lastNo = result.recordset[0].quotation_no;
    const lastNum = parseInt(String(lastNo).slice(-4));
    newNum = Number.isFinite(lastNum) ? lastNum + 1 : (newNum + 1);
  }

  return `QUO${year}${newNum.toString().padStart(4, '0')}`;
};

export const generateJobNumber = async () => {
  const year = new Date().getFullYear();
  const pool = await getConnection();
  
  const result = await pool.request()
    .query(`SELECT TOP 1 job_number FROM job_sheets 
            WHERE job_number LIKE 'JOB${year}%' 
            ORDER BY id DESC`);
  
  let newNum = 1;
  if (result.recordset.length > 0) {
    const lastNo = result.recordset[0].job_number;
    const lastNum = parseInt(lastNo.slice(-4));
    newNum = lastNum + 1;
  }
  
  return `JOB${year}${newNum.toString().padStart(4, '0')}`;
};

export const generateIndentNumber = async () => {
  const year = new Date().getFullYear();
  const pool = await getConnection();
  
  const result = await pool.request()
    .query(`SELECT TOP 1 indent_number FROM indents 
            WHERE indent_number LIKE 'IND${year}%' 
            ORDER BY id DESC`);
  
  let newNum = 1;
  if (result.recordset.length > 0) {
    const lastNo = result.recordset[0].indent_number;
    const lastNum = parseInt(lastNo.slice(-4));
    newNum = lastNum + 1;
  }
  
  return `IND${year}${newNum.toString().padStart(4, '0')}`;
};

export const generatePONumber = async () => {
  const year = new Date().getFullYear();
  const pool = await getConnection();
  
  const result = await pool.request()
    .query(`SELECT TOP 1 po_number FROM purchase_orders 
            WHERE po_number LIKE 'PO${year}%' 
            ORDER BY id DESC`);
  
  let newNum = 1;
  if (result.recordset.length > 0) {
    const lastNo = result.recordset[0].po_number;
    const lastNum = parseInt(lastNo.slice(-4));
    newNum = lastNum + 1;
  }
  
  return `PO${year}${newNum.toString().padStart(4, '0')}`;
};

export const generateGRNNumber = () => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const day = String(new Date().getDate()).padStart(2, '0');
  const hour = String(new Date().getHours()).padStart(2, '0');
  const minute = String(new Date().getMinutes()).padStart(2, '0');
  return `GRN${year}${month}${day}${hour}${minute}`;
};

export const generateBillNumber = async () => {
  const year = new Date().getFullYear();
  const pool = await getConnection();
  
  const result = await pool.request()
    .query(`SELECT TOP 1 bill_number FROM bills 
            WHERE bill_number LIKE 'BILL${year}%' 
            ORDER BY id DESC`);
  
  let newNum = 1;
  if (result.recordset.length > 0) {
    const lastNo = result.recordset[0].bill_number;
    const lastNum = parseInt(lastNo.slice(-4));
    newNum = lastNum + 1;
  }
  
  return `BILL${year}${newNum.toString().padStart(4, '0')}`;
};

export const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const pool = await getConnection();

  const result = await pool.request().query(`
    SELECT TOP 1 invoice_no FROM sales_invoices
    WHERE invoice_no LIKE 'INV${year}%'
    ORDER BY id DESC
  `);

  let newNum = 1;
  if (result.recordset.length > 0) {
    const lastNo = result.recordset[0].invoice_no;
    const lastNum = parseInt(String(lastNo).slice(-4));
    newNum = Number.isFinite(lastNum) ? lastNum + 1 : (newNum + 1);
  }

  return `INV${year}${newNum.toString().padStart(4, '0')}`;
};

export const generateTestReportId = () => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const day = String(new Date().getDate()).padStart(2, '0');
  return `TR${year}${month}${day}`;
};

export const calculateConductorQuantity = (scrapWeightKg) => {
  return Math.round(scrapWeightKg * 1.10 * 100) / 100;
};

