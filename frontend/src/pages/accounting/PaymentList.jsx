import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  IconButton,
  Tooltip,
} from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { accountingAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'
import { format } from 'date-fns'
import { Edit as EditIcon } from '@mui/icons-material'
import PaymentDialog from './PaymentDialog'
import { getComparator, stableSort } from '../../utils/tableSort'

function PaymentList() {
  const navigate = useNavigate()
  const location = useLocation()
  const billIdFromState = location.state?.billId
  const [payments, setPayments] = useState([])
  const [editDialog, setEditDialog] = useState({ open: false, payment: null })
  const [saving, setSaving] = useState(false)
  const [activeBillId, setActiveBillId] = useState(billIdFromState || null)
  const [filterText, setFilterText] = useState('')

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('payment_date')

  const fetchPayments = async (billIdOverride) => {
    try {
      const billId = billIdOverride ?? activeBillId
      if (billId) {
        const response = await accountingAPI.getPaymentsByBill(billId)
        setPayments(response.data)
      } else {
        const response = await accountingAPI.getPayments()
        setPayments(response.data)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const filteredPayments = useMemo(() => {
    const q = (filterText || '').trim().toLowerCase()
    if (!q) return payments

    const toText = (v) => (v === null || v === undefined ? '' : String(v))

    return payments.filter((p) => {
      const billNumber = toText(p.bill_number)
      const paymentType = toText(p.payment_type)
      const paymentMode = toText(p.payment_mode)
      const reference = toText(p.reference_number)
      const remarks = toText(p.remarks)
      const amount = toText(p.payment_amount)
      const date = toText(p.payment_date)

      const haystack = `${billNumber} ${paymentType} ${paymentMode} ${reference} ${remarks} ${amount} ${date}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [payments, filterText])

  const columns = useMemo(
    () => [
      { id: 'bill_number', label: 'Bill Number', getValue: (p) => p.bill_number },
      { id: 'payment_date', label: 'Payment Date', getValue: (p) => p.payment_date },
      { id: 'payment_type', label: 'Payment Type', getValue: (p) => p.payment_type },
      { id: 'payment_amount', label: 'Payment Amount', getValue: (p) => p.payment_amount },
      { id: 'payment_mode', label: 'Payment Mode', getValue: (p) => p.payment_mode },
      { id: 'reference_number', label: 'Reference Number', getValue: (p) => p.reference_number },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const sortedPayments = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return filteredPayments
    return stableSort(filteredPayments, getComparator(order, col.getValue))
  }, [columns, filteredPayments, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  useEffect(() => {
    if (billIdFromState) {
      setActiveBillId(billIdFromState)
      fetchPayments(billIdFromState)
      navigate('/accounting/payments', { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billIdFromState])

  const openEdit = (payment) => {
    setEditDialog({ open: true, payment })
  }

  const closeEdit = () => setEditDialog({ open: false, payment: null })

  const handleUpdate = async (data) => {
    if (!editDialog.payment) return
    try {
      setSaving(true)
      await accountingAPI.updatePayment(editDialog.payment.id, {
        payment_type: data.payment_type,
        payment_amount: data.payment_amount,
        payment_date: data.payment_date,
        payment_mode: data.payment_mode,
        reference_number: data.reference_number,
        remarks: data.remarks,
      })
      closeEdit()
      await fetchPayments()
    } catch (error) {
      console.error('Error updating payment:', error)
    } finally {
      setSaving(false)
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
            Payments
          </Typography>
          <TextField
            size="small"
            label="Filter"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          {activeBillId ? (
            <Button
              variant="outlined"
              onClick={() => {
                setActiveBillId(null)
                setPayments([])
                setFilterText('')
                fetchPayments()
              }}
            >
              Clear Filter (Bill ID: {activeBillId})
            </Button>
          ) : null}
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
            {sortedPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.bill_number || '-'}</TableCell>
                <TableCell>
                  {formatDate(payment.payment_date)}
                </TableCell>
                <TableCell>{payment.payment_type}</TableCell>
                <TableCell>{payment.payment_amount}</TableCell>
                <TableCell>{payment.payment_mode}</TableCell>
                <TableCell>{payment.reference_number || '-'}</TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => openEdit(payment)} size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <PaymentDialog
        open={editDialog.open}
        title={`Edit Payment`}
        initialValue={
          editDialog.payment
            ? {
                payment_type: editDialog.payment.payment_type || 'Customer Payment',
                payment_amount: editDialog.payment.payment_amount || '',
                payment_date: editDialog.payment.payment_date
                  ? new Date(editDialog.payment.payment_date).toISOString().slice(0, 10)
                  : new Date().toISOString().slice(0, 10),
                payment_mode: editDialog.payment.payment_mode || 'NEFT',
                reference_number: editDialog.payment.reference_number || '',
                remarks: editDialog.payment.remarks || '',
              }
            : undefined
        }
        onClose={closeEdit}
        onSubmit={handleUpdate}
        submitting={saving}
      />
    </Box>
  )
}

export default PaymentList

