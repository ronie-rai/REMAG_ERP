import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  TableSortLabel,
  Grid,
} from '@mui/material'
import { accountingAPI, productionAPI } from '../../services/api'
import { formatDate, formatDateTime } from '../../utils/dateFormat'
import { Add as AddIcon } from '@mui/icons-material'
import PaymentDialog from './PaymentDialog'
import { getComparator, stableSort } from '../../utils/tableSort'

function BillList() {
  const [bills, setBills] = useState([])
  const [paymentDialog, setPaymentDialog] = useState({ open: false, bill: null })
  const [savingPayment, setSavingPayment] = useState(false)
  const [historyDialog, setHistoryDialog] = useState({ open: false, bill: null })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPayments, setHistoryPayments] = useState([])

  const [billDetailsDialog, setBillDetailsDialog] = useState({ open: false, bill: null })
  const [billDetailsLoading, setBillDetailsLoading] = useState(false)
  const [billSource, setBillSource] = useState(null)
  const [billPurchaseSource, setBillPurchaseSource] = useState(null)

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('bill_number')

  const fetchBills = async () => {
    try {
      const response = await accountingAPI.getBills()
      setBills(response.data)
    } catch (error) {
      console.error('Error fetching bills:', error)
    }
  }

  const openBillDetails = async (bill) => {
    if (!bill?.id) return
    setBillDetailsDialog({ open: true, bill })
    setBillSource(null)
    setBillPurchaseSource(null)
    try {
      setBillDetailsLoading(true)
      const res = await accountingAPI.getBill(bill.id)
      const fullBill = res.data
      setBillDetailsDialog({ open: true, bill: fullBill })

      if (fullBill?.reference_type === 'machining' && fullBill?.reference_id) {
        const src = await productionAPI.getMachiningById(fullBill.reference_id)
        setBillSource(src.data)
      }

      if (fullBill?.po_id) {
        const poRes = await procurementAPI.getPurchaseOrder(fullBill.po_id)
        setBillPurchaseSource(poRes.data)
      }
    } catch (e) {
      console.error('Error fetching bill details:', e)
      setBillSource(null)
      setBillPurchaseSource(null)
    } finally {
      setBillDetailsLoading(false)
    }
  }

  const closeBillDetails = () => setBillDetailsDialog({ open: false, bill: null })

  const columns = useMemo(
    () => [
      {
        id: 'bill_number',
        label: 'Bill Number',
        getValue: (b) => b.bill_number,
      },
      {
        id: 'bill_date',
        label: 'Bill Date',
        getValue: (b) => b.bill_date,
      },
      {
        id: 'bill_value',
        label: 'Bill Value',
        getValue: (b) => b.bill_value,
      },
      {
        id: 'advance_payment',
        label: 'Advance Payment',
        getValue: (b) => b.advance_payment,
      },
      {
        id: 'payable_value',
        label: 'Total Payable Value',
        getValue: (b) => b.payable_value,
      },
      {
        id: 'current_due',
        label: 'Current Due',
        getValue: (b) => b.current_due ?? (Number(b.payable_value) - Number(b.total_paid || 0)),
      },
      {
        id: 'status',
        label: 'Status',
        getValue: (b) => b.status,
      },
      {
        id: 'actions',
        label: 'Actions',
        sortable: false,
      },
    ],
    []
  )

  const sortedBills = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return bills
    return stableSort(bills, getComparator(order, col.getValue))
  }, [bills, columns, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  useEffect(() => {
    fetchBills()
  }, [])

  const openHistory = async (bill) => {
    if (!bill) return
    setHistoryDialog({ open: true, bill })
    setHistoryPayments([])
    try {
      setHistoryLoading(true)
      const res = await accountingAPI.getPaymentsByBill(bill.id)
      const list = Array.isArray(res.data) ? res.data : []
      list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
      setHistoryPayments(list)
    } catch (e) {
      console.error('Error fetching bill payments:', e)
      setHistoryPayments([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const closeHistory = () => setHistoryDialog({ open: false, bill: null })

  const openPayment = (bill) => setPaymentDialog({ open: true, bill })
  const closePayment = () => setPaymentDialog({ open: false, bill: null })

  const handleCreatePayment = async (data) => {
    if (!paymentDialog.bill) return
    try {
      setSavingPayment(true)
      await accountingAPI.createPayment({
        bill_id: paymentDialog.bill.id,
        payment_type: data.payment_type,
        payment_amount: data.payment_amount,
        payment_date: data.payment_date,
        payment_mode: data.payment_mode,
        reference_number: data.reference_number,
        remarks: data.remarks,
      })
      closePayment()
      await fetchBills()

      if (historyDialog.open && historyDialog.bill?.id === paymentDialog.bill.id) {
        await openHistory(historyDialog.bill)
      }
    } catch (error) {
      console.error('Error creating payment:', error)
    } finally {
      setSavingPayment(false)
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
          Bills
        </Typography>
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
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.id}>
                  {c.sortable === false ? (
                    c.label
                  ) : (
                    <TableSortLabel
                      active={orderBy === c.id}
                      direction={orderBy === c.id ? order : 'asc'}
                      onClick={() => requestSort(c.id)}
                    >
                      {c.label}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedBills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell>
                  <Button
                    variant="text"
                    onClick={() => openBillDetails(bill)}
                    sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
                  >
                    {bill.bill_number}
                  </Button>
                </TableCell>
                <TableCell>
                  {formatDate(bill.bill_date)}
                </TableCell>
                <TableCell>{bill.bill_value}</TableCell>
                <TableCell>{bill.advance_payment}</TableCell>
                <TableCell>{bill.payable_value}</TableCell>
                <TableCell>{bill.current_due ?? (Number(bill.payable_value) - Number(bill.total_paid || 0))}</TableCell>
                <TableCell>{bill.status}</TableCell>
                <TableCell>
                  <Tooltip title="Add Payment">
                    <IconButton onClick={() => openPayment(bill)} size="small" color="primary">
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <PaymentDialog
        open={paymentDialog.open}
        title={`Add Payment - ${paymentDialog.bill?.bill_number || ''}`}
        initialValue={
          paymentDialog.bill
            ? {
                payment_type: 'Customer Payment',
                payment_amount: String(
                  paymentDialog.bill.current_due ?? (Number(paymentDialog.bill.payable_value) - Number(paymentDialog.bill.total_paid || 0))
                ),
                payment_date: new Date().toISOString().slice(0, 10),
                payment_mode: 'NEFT',
                reference_number: '',
                remarks: '',
              }
            : undefined
        }
        onClose={closePayment}
        onSubmit={handleCreatePayment}
        submitting={savingPayment}
      />

      <Dialog open={historyDialog.open} onClose={closeHistory} fullWidth maxWidth="md">
        <DialogTitle>{historyDialog.bill ? `Payments - ${historyDialog.bill.bill_number}` : 'Payments'}</DialogTitle>
        <DialogContent dividers>
          {historyLoading ? <LinearProgress /> : null}
          <Table size="small" sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Payment Date</TableCell>
                <TableCell>Payment Type</TableCell>
                <TableCell>Payment Amount</TableCell>
                <TableCell>Payment Mode</TableCell>
                <TableCell>Reference Number</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historyPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {formatDate(p.payment_date)}
                  </TableCell>
                  <TableCell>{p.payment_type || '-'}</TableCell>
                  <TableCell>{p.payment_amount ?? '-'}</TableCell>
                  <TableCell>{p.payment_mode || '-'}</TableCell>
                  <TableCell>{p.reference_number || '-'}</TableCell>
                </TableRow>
              ))}

              {!historyLoading && historyPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeHistory}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={billDetailsDialog.open} onClose={closeBillDetails} fullWidth maxWidth="md">
        <DialogTitle>{billDetailsDialog.bill ? `Bill Details - ${billDetailsDialog.bill.bill_number}` : 'Bill Details'}</DialogTitle>
        <DialogContent dividers>
          {billDetailsLoading ? <LinearProgress /> : null}

          {billDetailsDialog.bill ? (
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Bill Number</Typography>
                <Typography>{billDetailsDialog.bill.bill_number || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Bill Date</Typography>
                <Typography>
                  {formatDate(billDetailsDialog.bill.bill_date)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">PO No</Typography>
                <Typography>{billDetailsDialog.bill.po_number || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Status</Typography>
                <Typography>{billDetailsDialog.bill.status || '-'}</Typography>
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Bill Value</Typography>
                <Typography>{billDetailsDialog.bill.bill_value ?? '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Advance Payment</Typography>
                <Typography>{billDetailsDialog.bill.advance_payment ?? '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Payable Value</Typography>
                <Typography>{billDetailsDialog.bill.payable_value ?? '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Current Due</Typography>
                <Typography>
                  {billDetailsDialog.bill.current_due ?? (Number(billDetailsDialog.bill.payable_value) - Number(billDetailsDialog.bill.total_paid || 0))}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2">Raised From</Typography>
                {billDetailsDialog.bill.reference_type ? (
                  <Typography>
                    {billDetailsDialog.bill.reference_type}
                    {billDetailsDialog.bill.bill_stage ? ` (${billDetailsDialog.bill.bill_stage})` : ''}
                    {billDetailsDialog.bill.reference_id ? ` - ID: ${billDetailsDialog.bill.reference_id}` : ''}
                  </Typography>
                ) : billDetailsDialog.bill.po_id ? (
                  <Typography>
                    Purchase Order
                    {billDetailsDialog.bill.po_number ? ` (${billDetailsDialog.bill.po_number})` : ''}
                    {billDetailsDialog.bill.po_id ? ` - ID: ${billDetailsDialog.bill.po_id}` : ''}
                  </Typography>
                ) : (
                  <Typography>-</Typography>
                )}
              </Grid>

              {billDetailsDialog.bill.reference_type === 'machining' ? (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Machining Details</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2">Job Number</Typography>
                    <Typography>{billSource?.job_number ?? '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2">Outsourced To</Typography>
                    <Typography>{billSource?.outsourced_to ?? '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2">Outsourced Date</Typography>
                    <Typography>{formatDate(billSource?.outsourced_date)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2">Received At</Typography>
                    <Typography>{formatDateTime(billSource?.received_at)}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Particulars</Typography>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{billSource?.particulars ?? '-'}</Typography>
                  </Grid>
                </>
              ) : null}

              {billDetailsDialog.bill.po_id ? (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Purchase Order Items</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Item</TableCell>
                          <TableCell>Qty</TableCell>
                          <TableCell>Unit Price</TableCell>
                          <TableCell>Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(Array.isArray(billPurchaseSource?.items) ? billPurchaseSource.items : []).map((it, idx) => (
                          <TableRow key={it.id || idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{it.item_name ?? '-'}</TableCell>
                            <TableCell>{it.quantity ?? '-'}</TableCell>
                            <TableCell>{it.unit_price ?? '-'}</TableCell>
                            <TableCell>{it.total_value ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                        {!billDetailsLoading && (!billPurchaseSource || !Array.isArray(billPurchaseSource.items) || billPurchaseSource.items.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">No items found</TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </Grid>
                </>
              ) : null}
            </Grid>
          ) : (
            <Typography sx={{ py: 2 }}>No data</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBillDetails}>Close</Button>
          {billDetailsDialog.bill ? (
            <Button onClick={() => openHistory(billDetailsDialog.bill)} variant="contained">Payments</Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default BillList

