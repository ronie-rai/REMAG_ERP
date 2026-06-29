import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import EnquiryForm from './pages/sales/EnquiryForm'
import EnquiryList from './pages/sales/EnquiryList'
import WorkOrderList from './pages/sales/WorkOrderList'
import WorkOrderForm from './pages/sales/WorkOrderForm'
import ClientsList from './pages/sales/ClientsList'
import ClientForm from './pages/sales/ClientForm'
import SalesQuotationList from './pages/sales/SalesQuotationList'
import SalesQuotationForm from './pages/sales/SalesQuotationForm'
import Billing from './pages/sales/Billing'
import PaymentReceived from './pages/sales/PaymentReceived'
import SalesInvoicePrint from './pages/sales/SalesInvoicePrint'
import JobEntryForm from './pages/production/JobEntryForm'
import JobEntryList from './pages/production/JobEntryList'
import JobEntryDetails from './pages/production/JobEntryDetails'
import ChecklistForm from './pages/production/ChecklistForm'
import ChecklistList from './pages/production/ChecklistList'
import ChecklistDetails from './pages/production/ChecklistDetails'
import ChecklistView from './pages/production/ChecklistView'
import ChecklistPrint from './pages/production/ChecklistPrint'
import DataSheetForm from './pages/production/DataSheetForm'
import ACDataSheetList from './pages/production/ACDataSheetList'
import ACDataSheetForm from './pages/production/ACDataSheetForm'
import ACDataSheetDetails from './pages/production/ACDataSheetDetails'
import ACDataSheetPrint from './pages/production/ACDataSheetPrint'
import DCDataSheetForm from './pages/production/DCDataSheetForm'
import DCDataSheetList from './pages/production/DCDataSheetList'
import DCDataSheetDetails from './pages/production/DCDataSheetDetails'
import DCDataSheetPrint from './pages/production/DCDataSheetPrint'
import TestReportForm from './pages/production/TestReportForm'
import TestReportList from './pages/production/TestReportList'
import TestReportDetails from './pages/production/TestReportDetails'
import TestReportPrint from './pages/production/TestReportPrint'
import Machining from './pages/production/Machining'
import IndentList from './pages/procurement/IndentList'
import IndentForm from './pages/procurement/IndentForm'
import PurchaseOrderList from './pages/procurement/PurchaseOrderList'
import PurchaseOrderFromIndentsForm from './pages/procurement/PurchaseOrderFromIndentsForm'
import PurchaseOrderEditForm from './pages/procurement/PurchaseOrderEditForm'
import GRNList from './pages/procurement/GRNList'
import GRNForm from './pages/procurement/GRNForm'
import VendorsList from './pages/procurement/VendorsList'
import VendorForm from './pages/procurement/VendorForm'
import SKUList from './pages/store/SKUList'
import SKUForm from './pages/store/SKUForm'
import IssueList from './pages/store/IssueList'
import AdvanceBookingList from './pages/store/AdvanceBookingList'
import BillList from './pages/accounting/BillList'
import PaymentList from './pages/accounting/PaymentList'
import Login from './pages/auth/Login'
import RequireAuth from './components/RequireAuth'
import RequirePermission from './components/RequirePermission'
import IndentApprovals from './pages/procurement/IndentApprovals'
import UserManagement from './pages/admin/UserManagement'
import ErrorBoundary from './components/ErrorBoundary'
import { authStorage, session } from './services/api'
import PublicHome from './pages/public/PublicHome'
import PublicAbout from './pages/public/PublicAbout'
import PublicServices from './pages/public/PublicServices'
import PublicContact from './pages/public/PublicContact'

const theme = createTheme({
  palette: {
    primary: {
      main: '#20B2C8',
      light: '#3ECDE3',
      dark: '#178AA0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#E8A838',
      light: '#F4C563',
      dark: '#d4892e',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F8FAFB',
    },
  },
  typography: {
    fontSize: 12,
    fontFamily: "'Inter', 'Outfit', sans-serif",
  },
  components: {
    MuiTextField: {
      defaultProps: {
        InputLabelProps: {
          shrink: true,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1A1A2E, #16213E)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #16213E 0%, #0F3460 100%)',
          color: '#ffffff',
        },
      },
    },
  },
})

function App() {
  const SessionWatcher = () => {
    const location = useLocation()

    useEffect(() => {
      const interval = setInterval(() => {
        const token = authStorage.getToken()
        if (!token) return

        if (session.isExpired()) {
          authStorage.clear()

          const currentPath = location.pathname
          if (currentPath !== '/login') {
            window.location.replace('/login')
          }
        }
      }, 30 * 1000)

      return () => clearInterval(interval)
    }, [location.pathname])

    return null
  }

  const ProtectedApp = () => (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route
            path="/sales/enquiries"
            element={<RequirePermission moduleKey="sales" pageKey="enquiries" action="view"><EnquiryList /></RequirePermission>}
          />
          <Route
            path="/sales/enquiries/new"
            element={<RequirePermission moduleKey="sales" pageKey="enquiries" action="create"><EnquiryForm /></RequirePermission>}
          />
          <Route
            path="/sales/enquiries/:id/edit"
            element={<RequirePermission moduleKey="sales" pageKey="enquiries" action="edit"><EnquiryForm /></RequirePermission>}
          />

          <Route
            path="/sales/quotations"
            element={<RequirePermission moduleKey="sales" pageKey="quotations" action="view"><SalesQuotationList /></RequirePermission>}
          />
          <Route
            path="/sales/quotations/new"
            element={<RequirePermission moduleKey="sales" pageKey="quotations" action="create"><SalesQuotationForm /></RequirePermission>}
          />
          <Route
            path="/sales/quotations/:id/edit"
            element={<RequirePermission moduleKey="sales" pageKey="quotations" action="edit"><SalesQuotationForm /></RequirePermission>}
          />

          <Route
            path="/sales/work-orders"
            element={<RequirePermission moduleKey="sales" pageKey="work_orders" action="view"><WorkOrderList /></RequirePermission>}
          />
          <Route
            path="/sales/work-orders/new"
            element={<RequirePermission moduleKey="sales" pageKey="work_orders" action="create"><WorkOrderForm /></RequirePermission>}
          />
          <Route
            path="/sales/work-orders/:id/edit"
            element={<RequirePermission moduleKey="sales" pageKey="work_orders" action="edit"><WorkOrderForm /></RequirePermission>}
          />

          <Route
            path="/sales/clients"
            element={<RequirePermission moduleKey="sales" pageKey="clients" action="view"><ClientsList /></RequirePermission>}
          />
          <Route
            path="/sales/clients/new"
            element={<RequirePermission moduleKey="sales" pageKey="clients" action="create"><ClientForm /></RequirePermission>}
          />
          <Route
            path="/sales/clients/:id/edit"
            element={<RequirePermission moduleKey="sales" pageKey="clients" action="edit"><ClientForm /></RequirePermission>}
          />

          <Route
            path="/sales/billing"
            element={<RequirePermission moduleKey="sales" pageKey="billing" action="view"><Billing /></RequirePermission>}
          />

          <Route
            path="/sales/payment-received"
            element={<RequirePermission moduleKey="sales" pageKey="payment_received" action="view"><PaymentReceived /></RequirePermission>}
          />

          <Route
            path="/sales/billing/invoices/:id/print"
            element={<RequirePermission moduleKey="sales" pageKey="billing" action="view"><SalesInvoicePrint /></RequirePermission>}
          />

          <Route
            path="/production/job-entries"
            element={<RequirePermission moduleKey="production" pageKey="job_entries" action="view"><JobEntryList /></RequirePermission>}
          />
          <Route
            path="/production/job-entries/new"
            element={<RequirePermission moduleKey="production" pageKey="job_entries" action="create"><JobEntryForm /></RequirePermission>}
          />
          <Route
            path="/production/job-entries/:id/edit"
            element={<RequirePermission moduleKey="production" pageKey="job_entries" action="edit"><JobEntryForm /></RequirePermission>}
          />
          <Route
            path="/production/job-entries/job/:jobNumber"
            element={<RequirePermission moduleKey="production" pageKey="job_entries" action="view"><JobEntryDetails /></RequirePermission>}
          />

          <Route
            path="/production/checklists"
            element={<RequirePermission moduleKey="production" pageKey="checklists" action="view"><ChecklistList /></RequirePermission>}
          />
          <Route
            path="/production/checklists/new"
            element={<RequirePermission moduleKey="production" pageKey="checklists" action="create"><ChecklistForm /></RequirePermission>}
          />
          <Route
            path="/production/checklists/:id/edit"
            element={<RequirePermission moduleKey="production" pageKey="checklists" action="edit"><ChecklistForm /></RequirePermission>}
          />
          <Route
            path="/production/checklists/job/:jobNumber"
            element={<RequirePermission moduleKey="production" pageKey="checklists" action="view"><ChecklistDetails /></RequirePermission>}
          />
          <Route
            path="/production/checklists/:id"
            element={<RequirePermission moduleKey="production" pageKey="checklists" action="view"><ChecklistView /></RequirePermission>}
          />
          <Route
            path="/production/checklists/:id/print"
            element={<RequirePermission moduleKey="production" pageKey="checklists" action="view"><ChecklistPrint /></RequirePermission>}
          />

          <Route
            path="/production/machining"
            element={<RequirePermission moduleKey="production" pageKey="machining" action="view"><Machining /></RequirePermission>}
          />

          <Route
            path="/production/ac-data-sheets"
            element={<RequirePermission moduleKey="production" pageKey="ac_data_sheets" action="view"><ACDataSheetList /></RequirePermission>}
          />
          <Route
            path="/production/ac-data-sheets/new"
            element={<RequirePermission moduleKey="production" pageKey="ac_data_sheets" action="create"><ACDataSheetForm /></RequirePermission>}
          />
          <Route
            path="/production/ac-data-sheets/:id/edit"
            element={<RequirePermission moduleKey="production" pageKey="ac_data_sheets" action="edit"><ACDataSheetForm /></RequirePermission>}
          />
          <Route
            path="/production/ac-data-sheets/:id"
            element={<RequirePermission moduleKey="production" pageKey="ac_data_sheets" action="view"><ACDataSheetDetails /></RequirePermission>}
          />
          <Route
            path="/production/ac-data-sheets/:id/print"
            element={<RequirePermission moduleKey="production" pageKey="ac_data_sheets" action="view"><ACDataSheetPrint /></RequirePermission>}
          />

          <Route
            path="/production/dc-data-sheets"
            element={<RequirePermission moduleKey="production" pageKey="dc_data_sheets" action="view"><DCDataSheetList /></RequirePermission>}
          />
          <Route
            path="/production/dc-data-sheets/new"
            element={<RequirePermission moduleKey="production" pageKey="dc_data_sheets" action="create"><DCDataSheetForm /></RequirePermission>}
          />
          <Route
            path="/production/dc-data-sheets/:id/edit"
            element={<RequirePermission moduleKey="production" pageKey="dc_data_sheets" action="edit"><DCDataSheetForm /></RequirePermission>}
          />
          <Route
            path="/production/dc-data-sheets/:id"
            element={<RequirePermission moduleKey="production" pageKey="dc_data_sheets" action="view"><DCDataSheetDetails /></RequirePermission>}
          />
          <Route
            path="/production/dc-data-sheets/:id/print"
            element={<RequirePermission moduleKey="production" pageKey="dc_data_sheets" action="view"><DCDataSheetPrint /></RequirePermission>}
          />

          <Route
            path="/production/test-reports"
            element={<RequirePermission moduleKey="production" pageKey="test_reports" action="view"><TestReportList /></RequirePermission>}
          />
          <Route
            path="/production/test-reports/new"
            element={<RequirePermission moduleKey="production" pageKey="test_reports" action="create"><TestReportForm /></RequirePermission>}
          />
          <Route
            path="/production/test-reports/:id/edit"
            element={<RequirePermission moduleKey="production" pageKey="test_reports" action="edit"><TestReportForm /></RequirePermission>}
          />
          <Route
            path="/production/test-reports/:id"
            element={<RequirePermission moduleKey="production" pageKey="test_reports" action="view"><TestReportDetails /></RequirePermission>}
          />
          <Route
            path="/production/test-reports/:id/print"
            element={<RequirePermission moduleKey="production" pageKey="test_reports" action="view"><TestReportPrint /></RequirePermission>}
          />

          <Route
            path="/procurement/indents"
            element={<RequirePermission moduleKey="procurement" pageKey="indents" action="view"><IndentList /></RequirePermission>}
          />
          <Route
            path="/procurement/indents/new"
            element={<RequirePermission moduleKey="procurement" pageKey="indents" action="create"><IndentForm /></RequirePermission>}
          />
          <Route
            path="/procurement/indents/:id/edit"
            element={<RequirePermission moduleKey="procurement" pageKey="indents" action="edit"><IndentForm /></RequirePermission>}
          />
          <Route
            path="/procurement/indents/approvals"
            element={<RequirePermission moduleKey="procurement" pageKey="indents" action="approve"><IndentApprovals /></RequirePermission>}
          />

          <Route
            path="/procurement/purchase-orders"
            element={<RequirePermission moduleKey="procurement" pageKey="purchase_orders" action="view"><PurchaseOrderList /></RequirePermission>}
          />
          <Route
            path="/procurement/purchase-orders/new-from-indents"
            element={<RequirePermission moduleKey="procurement" pageKey="purchase_orders" action="create"><PurchaseOrderFromIndentsForm /></RequirePermission>}
          />
          <Route
            path="/procurement/purchase-orders/:id/edit"
            element={<RequirePermission moduleKey="procurement" pageKey="purchase_orders" action="edit"><PurchaseOrderEditForm /></RequirePermission>}
          />

          <Route
            path="/procurement/grns"
            element={<RequirePermission moduleKey="procurement" pageKey="grns" action="view"><GRNList /></RequirePermission>}
          />
          <Route
            path="/procurement/grns/new"
            element={<RequirePermission moduleKey="procurement" pageKey="grns" action="create"><GRNForm /></RequirePermission>}
          />

          <Route
            path="/procurement/vendors"
            element={<RequirePermission moduleKey="procurement" pageKey="vendors" action="view"><VendorsList /></RequirePermission>}
          />
          <Route
            path="/procurement/vendors/new"
            element={<RequirePermission moduleKey="procurement" pageKey="vendors" action="create"><VendorForm /></RequirePermission>}
          />
          <Route
            path="/procurement/vendors/:id/edit"
            element={<RequirePermission moduleKey="procurement" pageKey="vendors" action="edit"><VendorForm /></RequirePermission>}
          />

          <Route
            path="/store/skus"
            element={<RequirePermission moduleKey="store" pageKey="skus" action="view"><SKUList /></RequirePermission>}
          />
          <Route
            path="/store/skus/new"
            element={<RequirePermission moduleKey="store" pageKey="skus" action="create"><SKUForm /></RequirePermission>}
          />
          <Route
            path="/store/skus/:id/edit"
            element={<RequirePermission moduleKey="store" pageKey="skus" action="edit"><SKUForm /></RequirePermission>}
          />

          <Route
            path="/store/advance-booking"
            element={<RequirePermission moduleKey="store" pageKey="advance_booking" action="view"><AdvanceBookingList /></RequirePermission>}
          />
          <Route
            path="/store/issues"
            element={<RequirePermission moduleKey="store" pageKey="issues" action="view"><IssueList /></RequirePermission>}
          />

          <Route
            path="/accounting/bills"
            element={<RequirePermission moduleKey="accounting" pageKey="bills" action="view"><BillList /></RequirePermission>}
          />
          <Route
            path="/accounting/payments"
            element={<RequirePermission moduleKey="accounting" pageKey="payments" action="view"><PaymentList /></RequirePermission>}
          />

          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SessionWatcher />
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/about-us" element={<PublicAbout />} />
          <Route path="/our-services" element={<PublicServices />} />
          <Route path="/contact-us" element={<PublicContact />} />

          {/* ── Auth Routes ── */}
          <Route path="/login" element={<Login />} />

          {/* ── Protected ERP Routes ── */}
          <Route
            path="/*"
            element={
              <RequireAuth>
                <ProtectedApp />
              </RequireAuth>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App

