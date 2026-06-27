import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material'
import { salesAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'
import { authStorage } from '../../services/api'
import { format } from 'date-fns'
import { getComparator, stableSort } from '../../utils/tableSort'

function SalesQuotationList() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, row: null })

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('quotation_no')

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

  const canCreate = can('sales', 'create')
  const canEdit = can('sales', 'edit')
  const canDelete = can('sales', 'delete')

  const handleCloseNotification = () => setNotification((p) => ({ ...p, open: false }))

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await salesAPI.getSalesQuotations()
      setRows(res.data || [])
    } catch (error) {
      console.error('Error fetching sales quotations:', error)
      const message = error?.response?.data?.error || error?.message || 'Error fetching quotations'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const viewRows = useMemo(() => rows, [rows])

  const columns = useMemo(
    () => [
      { id: 'quotation_no', label: 'Quotation No', getValue: (r) => r.quotation_no || `#${r.id}` },
      { id: 'quotation_date', label: 'Date', getValue: (r) => r.quotation_date },
      { id: 'enquiry', label: 'Enquiry', getValue: (r) => r.enquiry_no || r.enquiry_id },
      { id: 'customer_name', label: 'Customer', getValue: (r) => r.customer_name },
      { id: 'status', label: 'Status', getValue: (r) => r.status },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const sortedRows = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return viewRows
    return stableSort(viewRows, getComparator(order, col.getValue))
  }, [columns, order, orderBy, viewRows])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  const handleExportPDF = async (id) => {
    try {
      const res = await salesAPI.exportSalesQuotationPDF(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `sales_quotation_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting quotation PDF:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to export PDF'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.row) return
    try {
      await salesAPI.deleteSalesQuotation(deleteDialog.row.id)
      setRows((prev) => prev.filter((r) => r.id !== deleteDialog.row.id))
      setNotification({ open: true, message: 'Quotation deleted successfully', severity: 'success' })
    } catch (error) {
      console.error('Error deleting quotation:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to delete quotation'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setDeleteDialog({ open: false, row: null })
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
            Quotations
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
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
            {sortedRows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.quotation_no || `#${r.id}`}</TableCell>
                <TableCell>{formatDate(r.quotation_date)}</TableCell>
                <TableCell>{r.enquiry_no || r.enquiry_id || '-'}</TableCell>
                <TableCell>{r.customer_name || '-'}</TableCell>
                <TableCell>{r.status || '-'}</TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => navigate(`/sales/quotations/${r.id}/edit`)} size="small" disabled={!canEdit}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Export PDF">
                    <IconButton onClick={() => handleExportPDF(r.id)} size="small">
                      <PictureAsPdfIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => setDeleteDialog({ open: true, row: r })} size="small" color="error" disabled={!canDelete}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {viewRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No quotations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, row: null })}>
        <DialogTitle>Delete Quotation</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{deleteDialog.row?.quotation_no || `#${deleteDialog.row?.id}`}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, row: null })}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
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

export default SalesQuotationList
