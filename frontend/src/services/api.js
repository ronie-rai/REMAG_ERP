import axios from 'axios'

const SESSION_TIMEOUT_MS = 20 * 60 * 1000
const LAST_ACTIVITY_KEY = 'last_activity_at'

const nowMs = () => Date.now()

const readLastActivityMs = () => {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

const writeLastActivityMs = (value) => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(value))
  } catch {
    // ignore
  }
}

export const session = {
  timeoutMs: SESSION_TIMEOUT_MS,
  touch: () => writeLastActivityMs(nowMs()),
  getLastActivityMs: () => readLastActivityMs(),
  isExpired: () => {
    const last = readLastActivityMs()
    if (!last) return false
    return nowMs() - last > SESSION_TIMEOUT_MS
  },
  clear: () => {
    try {
      localStorage.removeItem(LAST_ACTIVITY_KEY)
    } catch {
      // ignore
    }
  },
}

export const authStorage = {
  getToken: () => localStorage.getItem('token'),
  setAuth: ({ token, user }) => {
    if (token) localStorage.setItem('token', token)
    if (user) localStorage.setItem('user', JSON.stringify(user))
    if (token) session.touch()
  },
  clear: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    session.clear()
  },
  getUser: () => {
    try {
      const raw = localStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = authStorage.getToken()
  if (token) {
    if (session.isExpired()) {
      authStorage.clear()
      return Promise.reject(new Error('Session expired'))
    }
    session.touch()
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    const token = authStorage.getToken()
    if (token) {
      session.touch()
    }
    return response
  },
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      authStorage.clear()
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
  logout: () => {
    authStorage.clear()
  },
}

export const auditAPI = {
  getLogs: (params) => api.get('/audit/logs', params ? { params } : undefined),
}

// Sales & CRM APIs
export const salesAPI = {
  createEnquiry: (data) => api.post('/sales/enquiries', data),
  getEnquiries: () => api.get('/sales/enquiries'),
  getEnquiriesPendingWorkOrders: () => api.get('/sales/enquiries/pending-work-orders'),
  getEnquiry: (id) => api.get(`/sales/enquiries/${id}`),
  getEnquiryTimeline: (id) => api.get(`/sales/enquiries/${id}/timeline`),
  updateEnquiry: (id, data) => api.put(`/sales/enquiries/${id}`, data),
  deleteEnquiry: (id) => api.delete(`/sales/enquiries/${id}`),
  updateEnquiryStatus: (id, data) => api.put(`/sales/enquiries/${id}/status`, data),
  updateEnquiryQuotedValue: (id, data) => api.put(`/sales/enquiries/${id}/quoted-value`, data),
  createSalesQuotation: (data) => api.post('/sales/quotations', data),
  getSalesQuotations: () => api.get('/sales/quotations'),
  getSalesQuotation: (id) => api.get(`/sales/quotations/${id}`),
  updateSalesQuotation: (id, data) => api.put(`/sales/quotations/${id}`, data),
  deleteSalesQuotation: (id) => api.delete(`/sales/quotations/${id}`),
  exportSalesQuotationPDF: (id) => api.get(`/sales/quotations/${id}/pdf`, { responseType: 'blob' }),
  createWorkOrder: (data) => api.post('/sales/work-orders', data),
  getWorkOrders: () => api.get('/sales/work-orders'),
  getWorkOrder: (id) => api.get(`/sales/work-orders/${id}`),
  updateWorkOrder: (id, data) => api.put(`/sales/work-orders/${id}`, data),
  deleteWorkOrder: (id) => api.delete(`/sales/work-orders/${id}`),
  getClients: (search) => api.get('/clients', { params: search ? { search } : undefined }),
  exportClientsCSV: () => api.get('/clients/export-csv', { responseType: 'blob' }),
  importClientsCSV: (csv) => api.post('/clients/import-csv', { csv }),
  getClient: (id) => api.get(`/clients/${id}`),
  createClient: (data) => api.post('/clients', data),
  updateClient: (id, data) => api.put(`/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/clients/${id}`),
  // Billing (Sales)
  createSalesInvoice: (data) => api.post('/sales/billing/invoices', data),
  getSalesInvoices: () => api.get('/sales/billing/invoices'),
  getSalesInvoice: (id) => api.get(`/sales/billing/invoices/${id}`),
  addInvoicePayment: (id, data) => api.post(`/sales/billing/invoices/${id}/payments`, data),
  getInvoicePayments: (id) => api.get(`/sales/billing/invoices/${id}/payments`),
  exportInvoicePDF: (id) => api.get(`/sales/billing/invoices/${id}/pdf`, { responseType: 'blob' }),
}

// Production APIs
export const productionAPI = {
  getJobNumbers: () => api.get('/production/job-numbers'),
  createChecklist: (data) => api.post('/production/job-sheets', data),
  getChecklists: () => api.get('/production/job-sheets'),
  getChecklist: (id) => api.get(`/production/job-sheets/${id}`),
  getChecklistsByJobNumber: (jobNumber) => api.get(`/production/job-sheets/job/${jobNumber}`),
  updateChecklist: (id, data) => api.put(`/production/job-sheets/${id}`, data),
  deleteChecklist: (id) => api.delete(`/production/job-sheets/${id}`),
  exportChecklistPDF: (id) => api.get(`/production/job-sheets/${id}/pdf`, { responseType: 'blob' }),
  // AC Motor Data Sheets
  createACMotorDataSheet: (data) => api.post('/production/ac-motor-data-sheets', data),
  getACMotorDataSheets: () => api.get('/production/ac-motor-data-sheets'),
  getACMotorDataSheet: (id) => api.get(`/production/ac-motor-data-sheets/${id}`),
  updateACMotorDataSheet: (id, data) => api.put(`/production/ac-motor-data-sheets/${id}`, data),
  deleteACMotorDataSheet: (id) => api.delete(`/production/ac-motor-data-sheets/${id}`),
  getACMotorDataSheetByJobNo: (jobNo) => api.get(`/production/ac-motor-data-sheets/job/${jobNo}`),
  // DC Motor Data Sheets
  createDCMotorDataSheet: (data) => api.post('/production/dc-motor-data-sheets', data),
  getDCMotorDataSheets: () => api.get('/production/dc-motor-data-sheets'),
  getDCMotorDataSheet: (id) => api.get(`/production/dc-motor-data-sheets/${id}`),
  updateDCMotorDataSheet: (id, data) => api.put(`/production/dc-motor-data-sheets/${id}`, data),
  deleteDCMotorDataSheet: (id) => api.delete(`/production/dc-motor-data-sheets/${id}`),
  getDCMotorDataSheetByJobNo: (jobNo) => api.get(`/production/dc-motor-data-sheets/job/${jobNo}`),
  // Test Reports
  createTestReport: (data) => api.post('/production/test-reports', data),
  getTestReports: () => api.get('/production/test-reports'),
  getTestReport: (id) => api.get(`/production/test-reports/${id}`),
  updateTestReport: (id, data) => api.put(`/production/test-reports/${id}`, data),
  deleteTestReport: (id) => api.delete(`/production/test-reports/${id}`),
  exportTestReportPDF: (id) => api.get(`/production/test-reports/${id}/pdf`, { responseType: 'blob' }),
  // Machining
  getMachining: () => api.get('/production/machining'),
  getMachiningById: (id) => api.get(`/production/machining/${id}`),
  getMachiningIndent: (indentNo) => api.get(`/production/machining/indent/${encodeURIComponent(indentNo)}`),
  createMachining: (data) => api.post('/production/machining', data),
  updateMachining: (id, data) => api.put(`/production/machining/${id}`, data),
  deleteMachining: (id) => api.delete(`/production/machining/${id}`),
  receiveMachining: (id) => api.put(`/production/machining/${id}/receive`),
  createMachiningAdvanceBill: (id, data) => api.post(`/production/machining/${id}/bills/advance`, data),
  createMachiningFinalBill: (id, data) => api.post(`/production/machining/${id}/bills/final`, data),
  createProductionStep: (data) => api.post('/production/production-steps', data),
  getProductionSteps: (jobSheetId) => api.get(`/production/production-steps/job/${jobSheetId}`),
  createScrapRecord: (data) => api.post('/production/scrap-records', data),
  getScrapRecords: (jobSheetId) => api.get(`/production/scrap-records/job/${jobSheetId}`),
}

// Job Entries APIs
export const jobEntryAPI = {
  getNextJobNumber: () => api.get('/production/job-entries/next-job-number'),
  createJobEntry: (data) => api.post('/production/job-entries', data),
  getJobEntries: () => api.get('/production/job-entries'),
  getJobEntry: (id) => api.get(`/production/job-entries/${id}`),
  getJobEntryByJobNumber: (jobNumber) => api.get(`/production/job-entries/job-number/${jobNumber}`),
  updateJobEntry: (id, data) => api.put(`/production/job-entries/${id}`, data),
  deleteJobEntry: (id) => api.delete(`/production/job-entries/${id}`),
  updateJobEntryStatus: (id, data) => api.put(`/production/job-entries/${id}/status`, data),
  updateJobEntryStatusRemarks: (id, data) => api.put(`/production/job-entries/${id}/status-remarks`, data),
  getJobEntryStatusHistory: (id) => api.get(`/production/job-entries/${id}/status-history`),
  createScrapRecord: (id, data) => api.post(`/production/job-entries/${id}/scrap`, data),
}

// Store APIs
export const storeAPI = {
  createSKU: (data) => api.post('/store/skus', data),
  getSKUs: () => api.get('/store/skus'),
  getSKU: (id) => api.get(`/store/skus/${id}`),
  updateSKU: (id, data) => api.put(`/store/skus/${id}`, data),
  deleteSKU: (id) => api.delete(`/store/skus/${id}`),
  bulkIssue: (data) => api.post('/store/issues/bulk', data),
  getIssues: () => api.get('/store/issues'),
  getIssue: (id) => api.get(`/store/issues/${id}`),
  returnIssue: (id, data) => api.post(`/store/issues/${id}/return`, data),
  adjustIssue: (id, data) => api.put(`/store/issues/${id}/adjust`, data),
  voidIssue: (id, data) => api.post(`/store/issues/${id}/void`, data),
  getReservations: () => api.get('/store/reservations'),
  getReservation: (id) => api.get(`/store/reservations/${id}`),
  updateReservation: (id, data) => api.put(`/store/reservations/${id}`, data),
  deleteReservation: (id) => api.delete(`/store/reservations/${id}`),
  reserve: (data) => api.post('/store/reservations', data),
  releaseReservation: (id) => api.post(`/store/reservations/${id}/release`),
}

// Procurement APIs
export const procurementAPI = {
  createIndent: (data) => api.post('/procurement/indents', data),
  getIndents: (params) => api.get('/procurement/indents', params ? { params } : undefined),
  getIndent: (id) => api.get(`/procurement/indents/${id}`),
  updateIndent: (id, data) => api.put(`/procurement/indents/${id}`, data),
  deleteIndent: (id) => api.delete(`/procurement/indents/${id}`),
  approveIndent: (id) => api.put(`/procurement/indents/${id}/approve`),
  createVendor: (data) => api.post('/procurement/vendors', data),
  getVendors: () => api.get('/procurement/vendors'),
  exportVendorsCSV: () => api.get('/procurement/vendors/export-csv', { responseType: 'blob' }),
  importVendorsCSV: (csv) => api.post('/procurement/vendors/import-csv', { csv }),
  getVendor: (id) => api.get(`/procurement/vendors/${id}`),
  updateVendor: (id, data) => api.put(`/procurement/vendors/${id}`, data),
  deleteVendor: (id) => api.delete(`/procurement/vendors/${id}`),
  createQuotation: (data) => api.post('/procurement/quotations', data),
  getQuotations: () => api.get('/procurement/quotations'),
  createPurchaseOrder: (data) => api.post('/procurement/purchase-orders', data),
  createPurchaseOrderFromIndents: (data) => api.post('/procurement/purchase-orders/from-indents', data),
  getPOFromIndentsRemaining: (indentIds) =>
    api.get(`/procurement/purchase-orders/from-indents/remaining?indent_ids=${(indentIds || []).join(',')}`),
  getPurchaseOrders: () => api.get('/procurement/purchase-orders'),
  getPurchaseOrder: (id) => api.get(`/procurement/purchase-orders/${id}`),
  updatePurchaseOrder: (id, data) => api.put(`/procurement/purchase-orders/${id}`, data),
  deletePurchaseOrder: (id) => api.delete(`/procurement/purchase-orders/${id}`),
  exportPurchaseOrderPDF: (id) => api.get(`/procurement/purchase-orders/${id}/pdf`, { responseType: 'blob' }),
  createGRN: (data) => api.post('/procurement/grns', data),
  getGRNs: () => api.get('/procurement/grns'),
  getGRNsByPO: (poId) => api.get(`/procurement/grns/po/${poId}`),
  getGRNPOSummary: (poId) => api.get(`/procurement/grns/po/${poId}/summary`),
}

// Accounting APIs
export const accountingAPI = {
  createBill: (data) => api.post('/accounting/bills', data),
  getBills: () => api.get('/accounting/bills'),
  getBill: (id) => api.get(`/accounting/bills/${id}`),
  updateBill: (id, data) => api.put(`/accounting/bills/${id}`, data),
  createPayment: (data) => api.post('/accounting/payments', data),
  updatePayment: (id, data) => api.put(`/accounting/payments/${id}`, data),
  getPayments: () => api.get('/accounting/payments'),
  getPaymentsByBill: (billId) => api.get(`/accounting/payments/bill/${billId}`),
  getBillPayments: (billId) => api.get(`/accounting/payments/bill/${billId}`),
  createSecurityDeposit: (data) => api.post('/accounting/security-deposits', data),
  getSecurityDeposits: () => api.get('/accounting/security-deposits'),
  releaseSecurityDeposit: (id) => api.put(`/accounting/security-deposits/${id}/release`),
}

export default api

