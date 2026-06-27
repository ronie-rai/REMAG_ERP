import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Snackbar,
  Alert,
  Grid,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { salesAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'
import { format } from 'date-fns'
import { getComparator, stableSort } from '../../utils/tableSort'

function AllBills() {
  const navigate = useNavigate()

  const [rows, setRows] = useState([])
  const [filterText, setFilterText] = useState('')

  const [order, setOrder] = useState('desc')
  const [orderBy, setOrderBy] = useState('invoice_no')

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [paymentData, setPaymentData] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    payment_mode: 'Bank Transfer',
    reference_no: '',
    remarks: '',
  })
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const fetchRows = async () => {
    try {
      const res = await salesAPI.getSalesInvoices()
      console.log('Fetched invoices:', res.data)
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error('Error fetching sales invoices:', e)
      const status = e?.response?.status
      const msg = e?.response?.data?.error || e?.message || 'Failed to load bills'
      setNotification({ open: true, message: status ? `${status}: ${msg}` : msg, severity: 'error' })
      setRows([])
    }
  }

  useEffect(() => {
    fetchRows()
  }, [])

  const filtered = useMemo(() => {
    const q = (filterText || '').trim().toLowerCase()
    if (!q) return rows

    const toText = (v) => (v === null || v === undefined ? '' : String(v))

    return rows.filter((r) => {
      const haystack = `${toText(r.invoice_no)} ${toText(r.job_numbers)} ${toText(r.party_name)} ${toText(r.total_amount)}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, filterText])

  const columns = useMemo(
    () => [
      { id: 'invoice_no', label: 'Invoice No', getValue: (r) => r.invoice_no },
      { id: 'invoice_date', label: 'Invoice Date', getValue: (r) => r.invoice_date },
      { id: 'job_numbers', label: 'Job No', getValue: (r) => r.job_numbers },
      { id: 'party_name', label: 'Customer', getValue: (r) => r.party_name },
      { id: 'total_amount', label: 'Total', getValue: (r) => r.total_amount },
      { id: 'paid_amount', label: 'Paid', getValue: (r) => r.paid_amount },
      { id: 'balance_amount', label: 'Balance', getValue: (r) => r.balance_amount },
      { id: 'actions', label: 'Actions', getValue: () => null },
    ],
    []
  )

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col) return filtered
    return stableSort(filtered, getComparator(order, col.getValue))
  }, [columns, filtered, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  const safeDate = (v) => formatDate(v)

  const handleOpenPayment = (inv) => {
    setSelectedInvoice(inv)
    setPaymentData({
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      amount: inv.balance_amount > 0 ? inv.balance_amount : '',
      payment_mode: 'Bank Transfer',
      reference_no: '',
      remarks: '',
    })
    setPaymentDialogOpen(true)
  }

  const handleAddPayment = async () => {
    if (!paymentData.amount || Number(paymentData.amount) <= 0) {
      setNotification({ open: true, message: 'Please enter a valid amount', severity: 'error' })
      return
    }
    try {
      await salesAPI.addInvoicePayment(selectedInvoice.id, paymentData)
      setNotification({ open: true, message: 'Payment recorded successfully', severity: 'success' })
      setPaymentDialogOpen(false)
      fetchRows()
    } catch (e) {
      console.error('Error adding payment:', e)
      setNotification({ open: true, message: 'Failed to add payment', severity: 'error' })
    }
  }

  const handleExportPDF = async (id, invoiceNo) => {
    try {
      const res = await salesAPI.exportInvoicePDF(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Invoice_${invoiceNo || id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error exporting PDF:', e)
      setNotification({ open: true, message: 'Failed to export PDF', severity: 'error' })
    }
  }

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        p: 3,
        borderRadius: 2,
      }}
    >
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography
            variant="h4"
            sx={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold',
            }}
          >
            ALL BILLS
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Search"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <Button variant="outlined" onClick={fetchRows}>Refresh</Button>
            <Button variant="contained" onClick={() => navigate('/sales/billing')}>New Billing</Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: 3,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.id}>
                  <TableSortLabel
                    active={orderBy === c.id}
                    direction={orderBy === c.id ? order : 'asc'}
                    onClick={() => requestSort(c.id)}
                  >
                    {c.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.invoice_no || '-'}</TableCell>
                <TableCell>{safeDate(r.invoice_date)}</TableCell>
                <TableCell>{r.job_numbers || '-'}</TableCell>
                <TableCell>{r.party_name || '-'}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{r.total_amount ?? '-'}</TableCell>
                <TableCell sx={{ color: 'green', fontWeight: 500 }}>{r.paid_amount ?? '0'}</TableCell>
                <TableCell sx={{ color: r.balance_amount > 0 ? 'red' : 'green', fontWeight: 600 }}>
                  {r.balance_amount ?? '-'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="success" 
                      onClick={() => handleOpenPayment(r)}
                      disabled={r.balance_amount <= 0}
                      sx={{ minWidth: '80px' }}
                    >
                      Pay
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => navigate(`/sales/billing/invoices/${r.id}/print`)}
                    >
                      View
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => navigate(`/sales/billing/invoices/${r.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={() => handleExportPDF(r.id, r.invoice_no)}
                    >
                      PDF
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}

            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  No records
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Receive Payment - {selectedInvoice?.invoice_no}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Balance: ₹{selectedInvoice?.balance_amount}</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Payment Mode"
                value={paymentData.payment_mode}
                onChange={(e) => setPaymentData({ ...paymentData, payment_mode: e.target.value })}
                size="small"
              >
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reference No"
                value={paymentData.reference_no}
                onChange={(e) => setPaymentData({ ...paymentData, reference_no: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Remarks"
                value={paymentData.remarks}
                onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleAddPayment}>Save Payment</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert severity={notification.severity} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default AllBills
