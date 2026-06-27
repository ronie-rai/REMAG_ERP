import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, DownloadDone as ReceiveIcon, Refresh as RefreshIcon, PictureAsPdf as PdfIcon, RequestQuote as AdvanceBillIcon, ReceiptLong as FinalBillIcon } from '@mui/icons-material'
import { productionAPI } from '../../services/api'
import { formatDate, formatDateTime } from '../../utils/dateFormat'
import { format } from 'date-fns'
import { useSearchParams } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getComparator, stableSort } from '../../utils/tableSort'

const statusOptions = ['Completed', 'Done In-House', 'Outsourced']

function Machining() {
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const [indentDialog, setIndentDialog] = useState({ open: false, indentNo: '', loading: false, data: null })

  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState({ open: false, row: null })
  const [outsourcedDialog, setOutsourcedDialog] = useState({ open: false, base: null })
  const [confirmDelete, setConfirmDelete] = useState({ open: false, row: null })
  const [billDialog, setBillDialog] = useState({ open: false, stage: null, row: null, bill_date: '', total_bill_value: '', advance_amount: '' })
  const [billSaving, setBillSaving] = useState(false)

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState(null)

  const user = authStorage.getUser()
  const isChairman = user?.role === 'chairman'
  const permissions = user?.permissions || null
  const can = (moduleKey, action) => {
    if (isChairman) return true
    if (!permissions || typeof permissions !== 'object') return false
    const modulePerms = permissions[moduleKey]
    if (!modulePerms || typeof modulePerms !== 'object') return false
    return modulePerms[action] === true
  }

  const canCreate = can('production', 'create')
  const canEdit = can('production', 'edit')
  const canDelete = can('production', 'delete')

  const safeFormatDateTime = (value) => formatDateTime(value)

  const safeFormatDate = (value) => formatDate(value)

  const displayText = (value) => {
    if (value === null || value === undefined) return '-'
    const s = String(value).trim()
    return s ? s : '-'
  }

  const openIndent = async (indentNo) => {
    const no = String(indentNo || '').trim()
    if (!no) return

    setIndentDialog({ open: true, indentNo: no, loading: true, data: null })
    try {
      const res = await productionAPI.getMachiningIndent(no)
      setIndentDialog({ open: true, indentNo: no, loading: false, data: res.data })
    } catch (e) {
      console.error('Error fetching machining indent:', e)
      const message = e?.response?.data?.error || e?.message || 'Failed to load indent'
      setNotification({ open: true, message, severity: 'error' })
      setIndentDialog({ open: false, indentNo: '', loading: false, data: null })
    }
  }

  const refreshIndentDialog = async () => {
    if (!indentDialog.open || !indentDialog.indentNo) return
    await openIndent(indentDialog.indentNo)
  }

  const exportIndentPdf = async (indentNo) => {
    const no = String(indentNo || '').trim()
    if (!no) return

    try {
      const res = await productionAPI.getMachiningIndent(no)
      const data = res.data || {}
      const rs = Array.isArray(data.rows) ? data.rows : []

      const isOutsourced = (x) => {
        const st = String(x?.status || '').toLowerCase()
        if (st === 'outsourced') return true
        if (x?.outsourced_to) return true
        if (x?.outsourced_date) return true
        if (x?.expected_delivery) return true
        if (x?.received_at) return true
        return false
      }

      const outsourcedRows = rs.filter(isOutsourced)
      const inHouseRows = rs.filter((x) => !isOutsourced(x))

      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })

      doc.setFontSize(14)
      doc.text(`Machining Indent ${no}`, 14, 16)

      doc.setFontSize(10)
      const jobNoText = data.job_number !== null && data.job_number !== undefined ? String(data.job_number) : '-'
      doc.text(`Job Number: ${jobNoText}`, 14, 24)
      doc.text(`Items: ${rs.length}`, 14, 30)
      doc.text(`In-House: ${inHouseRows.length}`, 14, 36)
      doc.text(`Outsourced: ${outsourcedRows.length}`, 14, 42)

      let cursorY = 48

      if (inHouseRows.length) {
        doc.setFontSize(12)
        doc.text('In-House Machining', 14, cursorY)
        cursorY += 4

        autoTable(doc, {
          startY: cursorY,
          head: [['#', 'Particulars', 'Status']],
          body: inHouseRows.map((r, idx) => [
            String(idx + 1),
            r?.particulars ? String(r.particulars) : '',
            r?.status ? String(r.status) : '',
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [102, 126, 234] },
        })

        cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10
      }

      if (outsourcedRows.length) {
        doc.setFontSize(12)
        doc.text('Outsourced Machining', 14, cursorY)
        cursorY += 4

        autoTable(doc, {
          startY: cursorY,
          head: [['#', 'Particulars', 'Status', 'Outsourced To', 'Outsourced Date', 'Expected Delivery', 'Received At']],
          body: outsourcedRows.map((r, idx) => [
            String(idx + 1),
            r?.particulars ? String(r.particulars) : '',
            r?.status ? String(r.status) : '',
            r?.outsourced_to ? String(r.outsourced_to) : '',
            r?.outsourced_date ? safeFormatDate(r.outsourced_date) : '-',
            r?.expected_delivery ? safeFormatDate(r.expected_delivery) : '-',
            r?.received_at ? safeFormatDateTime(r.received_at) : '-',
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [118, 75, 162] },
        })
      }

      const filename = `Machining_Indent_${no}.pdf`
      doc.save(filename)
    } catch (e) {
      console.error('Error exporting machining indent PDF:', e)
      const message = e?.response?.data?.error || e?.message || 'Failed to export PDF'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const fetchRows = async () => {
    setLoading(true)
    try {
      const res = await productionAPI.getMachining()
      setRows(res.data || [])
    } catch (e) {
      console.error('Error fetching machining rows:', e)
      const message = e?.response?.data?.error || e?.message || 'Failed to load'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCloseNotification = () => setNotification((p) => ({ ...p, open: false }))

  const openBillDialog = (row, stage) => {
    if (!row?.id) return
    const today = new Date().toISOString().slice(0, 10)
    setBillDialog({
      open: true,
      stage,
      row,
      bill_date: today,
      total_bill_value: row?.total_bill_value !== null && row?.total_bill_value !== undefined ? String(row.total_bill_value) : '',
      advance_amount: row?.advance_amount !== null && row?.advance_amount !== undefined ? String(row.advance_amount) : '',
    })
  }

  const closeBillDialog = () => setBillDialog({ open: false, stage: null, row: null, bill_date: '', total_bill_value: '', advance_amount: '' })

  const submitBillDialog = async () => {
    if (!billDialog.open || !billDialog.row?.id || !billDialog.stage) return
    try {
      setBillSaving(true)
      const payload = {
        bill_date: billDialog.bill_date,
        total_bill_value: billDialog.total_bill_value === '' ? null : Number(billDialog.total_bill_value),
        advance_amount: billDialog.advance_amount === '' ? null : Number(billDialog.advance_amount),
      }

      if (billDialog.stage === 'advance') {
        await productionAPI.createMachiningAdvanceBill(billDialog.row.id, payload)
        setNotification({ open: true, message: 'Advance bill created', severity: 'success' })
      } else {
        await productionAPI.createMachiningFinalBill(billDialog.row.id, payload)
        setNotification({ open: true, message: 'Final bill created', severity: 'success' })
      }

      closeBillDialog()
      fetchRows()
    } catch (e) {
      console.error('Error creating machining bill:', e)
      const message = e?.response?.data?.error || e?.message || 'Failed to create bill'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setBillSaving(false)
    }
  }

  const [form, setForm] = useState({ job_number: '', particulars: '', status: '' })
  const [outsourcedForm, setOutsourcedForm] = useState({ outsourced_date: '', outsourced_to: '', expected_delivery: '', total_bill_value: '', advance_amount: '' })
  const [jobNumbers, setJobNumbers] = useState([])
  const [bulkRows, setBulkRows] = useState([{ particulars: '' }])

  const resetForms = () => {
    setForm({ job_number: '', particulars: '', status: '' })
    setOutsourcedForm({ outsourced_date: '', outsourced_to: '', expected_delivery: '', total_bill_value: '', advance_amount: '' })
    setBulkRows([{ particulars: '' }])
  }

  useEffect(() => {
    const fetchJobNumbers = async () => {
      try {
        const res = await jobEntryAPI.getJobEntries()
        const nums = (res.data || [])
          .map((e) => e?.job_number)
          .filter((n) => n !== null && n !== undefined && n !== '')
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n))
        nums.sort((a, b) => b - a)
        setJobNumbers(nums)
      } catch (e) {
        console.error('Error fetching job numbers:', e)
      }
    }
    fetchJobNumbers()
  }, [])

  useEffect(() => {
    const qJob = searchParams.get('job_number')
    if (qJob) {
      const n = Number(qJob)
      if (Number.isFinite(n)) {
        setForm((p) => ({ ...p, job_number: String(n) }))
      }
    }
  }, [searchParams])

  const openCreate = () => {
    resetForms()
    setCreateDialog(true)
  }

  const openEdit = (row) => {
    setEditDialog({ open: true, row })
    setForm({
      job_number: row?.job_number ?? '',
      particulars: row?.particulars ?? '',
      status: row?.status ?? '',
    })
    setOutsourcedForm({
      outsourced_date: row?.outsourced_date ? String(row.outsourced_date).slice(0, 10) : '',
      outsourced_to: row?.outsourced_to ?? '',
      expected_delivery: row?.expected_delivery ? String(row.expected_delivery).slice(0, 10) : '',
      total_bill_value: row?.total_bill_value !== null && row?.total_bill_value !== undefined ? String(row.total_bill_value) : '',
      advance_amount: row?.advance_amount !== null && row?.advance_amount !== undefined ? String(row.advance_amount) : '',
    })
  }

  const submitCreate = async () => {
    if (!canCreate) {
      setNotification({ open: true, message: 'Forbidden', severity: 'error' })
      return
    }

    if (!form.job_number) {
      setNotification({ open: true, message: 'Job Number is required', severity: 'error' })
      return
    }

    if (!form.status) {
      setNotification({ open: true, message: 'Status is required', severity: 'error' })
      return
    }

    // Build rows from bulk input
    const cleanRows = (bulkRows || [])
      .map((r) => ({
        job_number: Number(form.job_number),
        particulars: r.particulars,
        status: form.status,
      }))
      .filter((r) => r.particulars && r.status)

    if (cleanRows.length === 0) {
      setNotification({ open: true, message: 'Add at least one row with particulars', severity: 'error' })
      return
    }

    if (form.status === 'Outsourced') {
      const today = new Date().toISOString().slice(0, 10)
      setOutsourcedForm((p) => ({ ...p, outsourced_date: p.outsourced_date || today }))
      setOutsourcedDialog({ open: true, base: { job_number: form.job_number, rows: cleanRows } })
      setCreateDialog(false)
      return
    }

    try {
      if (cleanRows.length > 1) {
        await productionAPI.createMachining({ rows: cleanRows })
      } else {
        await productionAPI.createMachining(cleanRows[0])
      }
      setNotification({ open: true, message: 'Saved successfully', severity: 'success' })
      setCreateDialog(false)
      resetForms()
      fetchRows()

      const afterStatus = searchParams.get('afterStatus')
      const jobEntryId = searchParams.get('jobEntryId')
      if (afterStatus && jobEntryId) {
        try {
          await jobEntryAPI.updateJobEntryStatus(Number(jobEntryId), { status: afterStatus, confirmed: true })
        } catch (err) {
          console.error('Failed to confirm job entry status after machining save:', err)
        }
      }
    } catch (e) {
      console.error('Error creating machining:', e)
      const message = e?.response?.data?.error || e?.message || 'Failed to save'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const submitOutsourcedCreate = async () => {
    if (!canCreate) {
      setNotification({ open: true, message: 'Forbidden', severity: 'error' })
      return
    }

    const base = outsourcedDialog.base
    if (!base?.job_number) {
      setNotification({ open: true, message: 'Job Number is required', severity: 'error' })
      return
    }

    if (!outsourcedForm.outsourced_date) {
      setNotification({ open: true, message: 'Today\'s date is required', severity: 'error' })
      return
    }

    if (outsourcedForm.total_bill_value === '' || outsourcedForm.total_bill_value === null || outsourcedForm.total_bill_value === undefined) {
      setNotification({ open: true, message: 'Total Amount is required', severity: 'error' })
      return
    }

    const totalNum = Number(outsourcedForm.total_bill_value)
    const advanceNum = outsourcedForm.advance_amount === '' || outsourcedForm.advance_amount === null || outsourcedForm.advance_amount === undefined
      ? 0
      : Number(outsourcedForm.advance_amount)

    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      setNotification({ open: true, message: 'Total Amount must be a number greater than 0', severity: 'error' })
      return
    }

    if (!Number.isFinite(advanceNum) || advanceNum < 0) {
      setNotification({ open: true, message: 'Advance Amount must be 0 or more', severity: 'error' })
      return
    }

    if (advanceNum > totalNum) {
      setNotification({ open: true, message: 'Advance Amount cannot be greater than Total Amount', severity: 'error' })
      return
    }

    try {
      const baseRows = Array.isArray(base?.rows) ? base.rows : []
      const rowsPayload = baseRows.map((r) => ({
        job_number: Number(base.job_number),
        particulars: r.particulars,
        status: 'Outsourced',
        outsourced_date: outsourcedForm.outsourced_date,
        outsourced_to: outsourcedForm.outsourced_to,
        expected_delivery: outsourcedForm.expected_delivery,
        total_bill_value: totalNum,
        advance_amount: advanceNum,
      }))

      if (rowsPayload.length > 1) {
        await productionAPI.createMachining({ rows: rowsPayload })
      } else {
        await productionAPI.createMachining(rowsPayload[0] || {
          job_number: Number(base.job_number),
          particulars: '',
          status: 'Outsourced',
          outsourced_date: outsourcedForm.outsourced_date,
          outsourced_to: outsourcedForm.outsourced_to,
          expected_delivery: outsourcedForm.expected_delivery,
          total_bill_value: totalNum,
          advance_amount: advanceNum,
        })
      }
      setNotification({ open: true, message: 'Outsourced record created', severity: 'success' })
      setOutsourcedDialog({ open: false, base: null })
      resetForms()
      fetchRows()

      const afterStatus = searchParams.get('afterStatus')
      const jobEntryId = searchParams.get('jobEntryId')
      if (afterStatus && jobEntryId) {
        try {
          await jobEntryAPI.updateJobEntryStatus(Number(jobEntryId), { status: afterStatus, confirmed: true })
        } catch (err) {
          console.error('Failed to confirm job entry status after machining save:', err)
        }
      }
    } catch (e) {
      console.error('Error creating outsourced machining:', e)
      const message = e?.response?.data?.error || e?.message || 'Failed to save'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const submitEdit = async () => {
    if (!canEdit) {
      setNotification({ open: true, message: 'Forbidden', severity: 'error' })
      return
    }

    const row = editDialog.row
    if (!row?.id) return

    if (!form.job_number) {
      setNotification({ open: true, message: 'Job Number is required', severity: 'error' })
      return
    }

    if (!form.status) {
      setNotification({ open: true, message: 'Status is required', severity: 'error' })
      return
    }

    try {
      await productionAPI.updateMachining(row.id, {
        job_number: Number(form.job_number),
        particulars: form.particulars,
        status: form.status,
        outsourced_date: form.status === 'Outsourced' ? (outsourcedForm.outsourced_date || null) : null,
        outsourced_to: form.status === 'Outsourced' ? (outsourcedForm.outsourced_to || null) : null,
        expected_delivery: form.status === 'Outsourced' ? (outsourcedForm.expected_delivery || null) : null,
        total_bill_value: form.status === 'Outsourced'
          ? (outsourcedForm.total_bill_value === '' ? null : Number(outsourcedForm.total_bill_value))
          : null,
        advance_amount: form.status === 'Outsourced'
          ? (outsourcedForm.advance_amount === '' ? null : Number(outsourcedForm.advance_amount))
          : null,
      })
      setNotification({ open: true, message: 'Updated successfully', severity: 'success' })
      setEditDialog({ open: false, row: null })
      resetForms()
      fetchRows()
      refreshIndentDialog()
    } catch (e) {
      console.error('Error updating machining:', e)
      const message = e?.response?.data?.error || e?.message || 'Failed to update'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleReceive = async (row) => {
    if (!canEdit) {
      setNotification({ open: true, message: 'Forbidden', severity: 'error' })
      return
    }

    if (!row?.id) return

    try {
      await productionAPI.receiveMachining(row.id)
      setNotification({ open: true, message: 'Received successfully', severity: 'success' })
      fetchRows()
    } catch (e) {
      console.error('Error receiving machining:', e)
      const message = e?.response?.data?.error || e?.message || 'Failed to receive'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!canDelete) {
      setNotification({ open: true, message: 'Forbidden', severity: 'error' })
      return
    }

    const row = confirmDelete.row
    if (!row?.id) return

    try {
      await productionAPI.deleteMachining(row.id)
      setNotification({ open: true, message: 'Deleted successfully', severity: 'success' })
      setConfirmDelete({ open: false, row: null })
      fetchRows()
      refreshIndentDialog()
    } catch (e) {
      console.error('Error deleting machining:', e)
      const message = e?.response?.data?.error || e?.message || 'Failed to delete'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const displayRows = useMemo(() => {
    const src = Array.isArray(rows) ? rows : []
    const withIndent = src.filter((r) => r?.machining_indent_no)
    const withoutIndent = src.filter((r) => !r?.machining_indent_no)

    const latestByIndent = new Map()
    for (const r of withIndent) {
      const key = String(r.machining_indent_no)
      const cur = latestByIndent.get(key)
      if (!cur || Number(r.id) > Number(cur.id)) {
        latestByIndent.set(key, r)
      }
    }

    const countByIndent = new Map()
    for (const r of withIndent) {
      const key = String(r.machining_indent_no)
      countByIndent.set(key, (countByIndent.get(key) || 0) + 1)
    }

    const grouped = Array.from(latestByIndent.values()).map((r) => ({
      ...r,
      _rows_count: countByIndent.get(String(r.machining_indent_no)) || 1,
    }))

    // Keep same overall sorting behavior: newest first (by id)
    const merged = [...withoutIndent, ...grouped]
    merged.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))
    return merged
  }, [rows])

  const columns = useMemo(
    () => [
      {
        id: 'machining_indent_no',
        label: 'Machining Indent No',
        getValue: (r) => r.machining_indent_no,
      },
      { id: 'job_number', label: 'Job Number', getValue: (r) => r.job_number },
      { id: 'particulars', label: 'Particulars', getValue: (r) => r.particulars },
      { id: 'status', label: 'Status', getValue: (r) => r.status },
      { id: 'outsourced_date', label: 'Outsourced Date', getValue: (r) => r.outsourced_date },
      { id: 'outsourced_to', label: 'Outsourced To', getValue: (r) => r.outsourced_to },
      { id: 'expected_delivery', label: 'Expected Delivery', getValue: (r) => r.expected_delivery },
      { id: 'received_at', label: 'Received At', getValue: (r) => r.received_at },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const sortedDisplayRows = useMemo(() => {
    if (!orderBy) return displayRows
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return displayRows
    return stableSort(displayRows, getComparator(order, col.getValue))
  }, [columns, displayRows, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
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
            Machining
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchRows} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              disabled={!canCreate}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
              }}
            >
              New
            </Button>
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
            {sortedDisplayRows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  {r.machining_indent_no ? (
                    <Button
                      variant="text"
                      onClick={() => openIndent(r.machining_indent_no)}
                      sx={{ fontWeight: 'bold', p: 0, minWidth: 'auto' }}
                    >
                      {r.machining_indent_no}{r._rows_count ? ` (${r._rows_count})` : ''}
                    </Button>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{r.job_number ?? '-'}</TableCell>
                <TableCell sx={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{displayText(r.particulars)}</TableCell>
                <TableCell>{r.status || '-'}</TableCell>
                <TableCell>{safeFormatDate(r.outsourced_date)}</TableCell>
                <TableCell>{displayText(r.outsourced_to)}</TableCell>
                <TableCell>{safeFormatDate(r.expected_delivery)}</TableCell>
                <TableCell>{safeFormatDateTime(r.received_at)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {r.machining_indent_no ? (
                      <Tooltip title="Export PDF">
                        <IconButton size="small" onClick={() => exportIndentPdf(r.machining_indent_no)}>
                          <PdfIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}

                    {canEdit && !r.machining_indent_no ? (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(r)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}

                  {canDelete && !r.machining_indent_no ? (
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete({ open: true, row: r })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}

                  {canEdit && !r.machining_indent_no && r.status === 'Outsourced' && !r.received_at ? (
                    <Tooltip title="Receive">
                      <IconButton size="small" color="success" onClick={() => handleReceive(r)}>
                        <ReceiveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}

                  {canEdit && !r.machining_indent_no && r.status === 'Outsourced' && Number(r.advance_amount || 0) > 0 && !r.advance_bill_id ? (
                    <Tooltip title="Raise Advance Bill">
                      <IconButton size="small" color="primary" onClick={() => openBillDialog(r, 'advance')}>
                        <AdvanceBillIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}


                  {canEdit && !r.machining_indent_no && r.status === 'Outsourced' && r.received_at && !r.final_bill_id ? (
                    <Tooltip title="Raise Final Bill">
                      <IconButton size="small" color="secondary" onClick={() => openBillDialog(r, 'final')}>
                        <FinalBillIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  </Box>
                </TableCell>
              </TableRow>
            ))}

            {sortedDisplayRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No records
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={indentDialog.open}
        onClose={() => setIndentDialog({ open: false, indentNo: '', loading: false, data: null })}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Machining Indent {indentDialog.indentNo}</DialogTitle>
        <DialogContent>
          {indentDialog.loading ? (
            <Typography sx={{ py: 2 }}>Loading...</Typography>
          ) : indentDialog.data ? (
            <>
              {(() => {
                const rs = indentDialog.data.rows || []
                const isOutsourced = (x) => {
                  const st = String(x?.status || '').toLowerCase()
                  if (st === 'outsourced') return true
                  if (x?.outsourced_to) return true
                  if (x?.outsourced_date) return true
                  if (x?.expected_delivery) return true
                  if (x?.received_at) return true
                  return false
                }

                const outsourcedRows = rs.filter(isOutsourced)
                const inHouseRows = rs.filter((x) => !isOutsourced(x))

                const vendors = Array.from(new Set(outsourcedRows.map((x) => String(x?.outsourced_to || '').trim()).filter(Boolean)))
                const receivedCount = outsourcedRows.filter((x) => x?.received_at).length
                return (
                  <Grid container spacing={2} sx={{ mt: 0.5, mb: 2 }}>
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2">Job Number</Typography>
                      <Typography>{indentDialog.data.job_number ?? '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2">Items Count</Typography>
                      <Typography>{rs.length}</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2">Received (Outsourced)</Typography>
                      <Typography>{receivedCount} / {outsourcedRows.length}</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2">Vendors</Typography>
                      <Typography>{vendors.length ? vendors.join(', ') : '-'}</Typography>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2">In-House</Typography>
                      <Typography>{inHouseRows.length}</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2">Outsourced</Typography>
                      <Typography>{outsourcedRows.length}</Typography>
                    </Grid>
                  </Grid>
                )
              })()}

              {(() => {
                const rs = indentDialog.data.rows || []
                const isOutsourced = (x) => {
                  const st = String(x?.status || '').toLowerCase()
                  if (st === 'outsourced') return true
                  if (x?.outsourced_to) return true
                  if (x?.outsourced_date) return true
                  if (x?.expected_delivery) return true
                  if (x?.received_at) return true
                  return false
                }

                const outsourcedRows = rs.filter(isOutsourced)
                const inHouseRows = rs.filter((x) => !isOutsourced(x))

                return (
                  <>
                    {inHouseRows.length ? (
                      <>
                        <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>In-House Machining</Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>#</TableCell>
                              <TableCell>Particulars</TableCell>
                              <TableCell>Status</TableCell>
                              {(canEdit || canDelete) ? <TableCell>Actions</TableCell> : null}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {inHouseRows.map((it, idx) => (
                              <TableRow key={it.id || idx}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{displayText(it.particulars)}</TableCell>
                                <TableCell>{displayText(it.status)}</TableCell>
                                {(canEdit || canDelete) ? (
                                  <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      {canEdit ? (
                                        <Tooltip title="Edit">
                                          <IconButton size="small" onClick={() => openEdit(it)}>
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      ) : null}
                                      {canDelete ? (
                                        <Tooltip title="Delete">
                                          <IconButton size="small" color="error" onClick={() => setConfirmDelete({ open: true, row: it })}>
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      ) : null}
                                    </Box>
                                  </TableCell>
                                ) : null}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    ) : null}

                    {outsourcedRows.length ? (
                      <>
                        <Typography variant="subtitle1" sx={{ mt: inHouseRows.length ? 3 : 1, mb: 1 }}>Outsourced Machining</Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>#</TableCell>
                              <TableCell>Particulars</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Outsourced To</TableCell>
                              <TableCell>Outsourced Date</TableCell>
                              <TableCell>Expected Delivery</TableCell>
                              <TableCell>Received At</TableCell>
                              {(canEdit || canDelete) ? <TableCell>Actions</TableCell> : null}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {outsourcedRows.map((it, idx) => (
                              <TableRow key={it.id || idx}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{displayText(it.particulars)}</TableCell>
                                <TableCell>{displayText(it.status)}</TableCell>
                                <TableCell>{displayText(it.outsourced_to)}</TableCell>
                                <TableCell>{safeFormatDate(it.outsourced_date)}</TableCell>
                                <TableCell>{safeFormatDate(it.expected_delivery)}</TableCell>
                                <TableCell>{safeFormatDateTime(it.received_at)}</TableCell>
                                {(canEdit || canDelete) ? (
                                  <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      {canEdit ? (
                                        <Tooltip title="Edit">
                                          <IconButton size="small" onClick={() => openEdit(it)}>
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      ) : null}
                                      {canDelete ? (
                                        <Tooltip title="Delete">
                                          <IconButton size="small" color="error" onClick={() => setConfirmDelete({ open: true, row: it })}>
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      ) : null}
                                      {canEdit && it.status === 'Outsourced' && !it.received_at ? (
                                        <Tooltip title="Receive">
                                          <IconButton size="small" color="success" onClick={() => handleReceive(it)}>
                                            <ReceiveIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      ) : null}
                                    </Box>
                                  </TableCell>
                                ) : null}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    ) : null}

                    {!inHouseRows.length && !outsourcedRows.length ? (
                      <Typography sx={{ py: 2 }}>No machining items</Typography>
                    ) : null}
                  </>
                )
              })()}
            </>
          ) : (
            <Typography sx={{ py: 2 }}>No data</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIndentDialog({ open: false, indentNo: '', loading: false, data: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={billDialog.open} onClose={closeBillDialog} fullWidth maxWidth="xs">
        <DialogTitle>{billDialog.stage === 'final' ? 'Raise Final Bill' : 'Raise Advance Bill'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="Bill Date"
                type="date"
                fullWidth
                value={billDialog.bill_date}
                onChange={(e) => setBillDialog((p) => ({ ...p, bill_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Total Bill Value"
                fullWidth
                value={billDialog.total_bill_value}
                onChange={(e) => setBillDialog((p) => ({ ...p, total_bill_value: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Advance Amount"
                fullWidth
                value={billDialog.advance_amount}
                onChange={(e) => setBillDialog((p) => ({ ...p, advance_amount: e.target.value }))}
                helperText={billDialog.stage === 'final' ? 'Used to calculate Final = Total - Advance' : undefined}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBillDialog} disabled={billSaving}>Cancel</Button>
          <Button variant="contained" onClick={submitBillDialog} disabled={billSaving}>
            {billSaving ? 'Saving...' : 'Create Bill'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Machining</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Job Number"
                value={form.job_number}
                onChange={(e) => setForm((p) => ({ ...p, job_number: e.target.value }))}
              >
                {jobNumbers.map((n) => (
                  <MenuItem key={n} value={String(n)}>{n}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                {statusOptions.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Rows</Typography>
              <Grid container spacing={1}>
                {bulkRows.map((r, idx) => (
                  <React.Fragment key={idx}>
                    <Grid item xs={12} md={11}>
                      <TextField
                        fullWidth
                        label="Particulars"
                        value={r.particulars}
                        onChange={(e) => {
                          const v = e.target.value
                          setBulkRows((p) => p.map((x, i) => (i === idx ? { ...x, particulars: v } : x)))
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Tooltip title="Remove">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setBulkRows((p) => (p.length <= 1 ? p : p.filter((_, i) => i !== idx)))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </React.Fragment>
                ))}
                <Grid item xs={12}>
                  <Button onClick={() => setBulkRows((p) => [...p, { particulars: '' }])}>
                    Add Row
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={submitCreate} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={outsourcedDialog.open} onClose={() => setOutsourcedDialog({ open: false, base: null })} fullWidth maxWidth="sm">
        <DialogTitle>Outsourced Details</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Today's Date"
                InputLabelProps={{ shrink: true }}
                value={outsourcedForm.outsourced_date}
                onChange={(e) => setOutsourcedForm((p) => ({ ...p, outsourced_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Expected Delivery"
                InputLabelProps={{ shrink: true }}
                value={outsourcedForm.expected_delivery}
                onChange={(e) => setOutsourcedForm((p) => ({ ...p, expected_delivery: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Outsourced To"
                value={outsourcedForm.outsourced_to}
                onChange={(e) => setOutsourcedForm((p) => ({ ...p, outsourced_to: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Total Amount"
                value={outsourcedForm.total_bill_value}
                onChange={(e) => setOutsourcedForm((p) => ({ ...p, total_bill_value: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Advance Amount (Optional)"
                value={outsourcedForm.advance_amount}
                onChange={(e) => setOutsourcedForm((p) => ({ ...p, advance_amount: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutsourcedDialog({ open: false, base: null })}>Cancel</Button>
          <Button onClick={submitOutsourcedCreate} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, row: null })} fullWidth maxWidth="sm">
        <DialogTitle>Edit Machining</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Job Number"
                value={form.job_number}
                onChange={(e) => setForm((p) => ({ ...p, job_number: e.target.value }))}
              >
                {jobNumbers.map((n) => (
                  <MenuItem key={n} value={String(n)}>{n}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                {statusOptions.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Particulars"
                value={form.particulars}
                onChange={(e) => setForm((p) => ({ ...p, particulars: e.target.value }))}
              />
            </Grid>

            {form.status === 'Outsourced' ? (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Outsourced Date"
                    InputLabelProps={{ shrink: true }}
                    value={outsourcedForm.outsourced_date}
                    onChange={(e) => setOutsourcedForm((p) => ({ ...p, outsourced_date: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Expected Delivery"
                    InputLabelProps={{ shrink: true }}
                    value={outsourcedForm.expected_delivery}
                    onChange={(e) => setOutsourcedForm((p) => ({ ...p, expected_delivery: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Outsourced To"
                    value={outsourcedForm.outsourced_to}
                    onChange={(e) => setOutsourcedForm((p) => ({ ...p, outsourced_to: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Total Amount"
                    value={outsourcedForm.total_bill_value}
                    onChange={(e) => setOutsourcedForm((p) => ({ ...p, total_bill_value: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Advance Amount (Optional)"
                    value={outsourcedForm.advance_amount}
                    onChange={(e) => setOutsourcedForm((p) => ({ ...p, advance_amount: e.target.value }))}
                  />
                </Grid>
              </>
            ) : null}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, row: null })}>Cancel</Button>
          <Button onClick={submitEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, row: null })}>
        <DialogTitle>Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this record?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete({ open: false, row: null })}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={notification.severity} onClose={handleCloseNotification} sx={{ borderRadius: 2 }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Machining
