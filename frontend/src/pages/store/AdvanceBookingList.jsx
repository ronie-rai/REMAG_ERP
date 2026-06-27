import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material'
import { Refresh as RefreshIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { storeAPI } from '../../services/api'
import { getComparator, stableSort } from '../../utils/tableSort'

function AdvanceBookingList() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('id')

  const [editDialog, setEditDialog] = useState({ open: false, reservation: null })
  const [form, setForm] = useState({ reserved_for: '', reserve_date: '', remarks: '' })

  const [deleteDialog, setDeleteDialog] = useState({ open: false, reservation: null })

  const fetchReservations = async () => {
    setLoading(true)
    try {
      const res = await storeAPI.getReservations()
      setRows(res.data || [])
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Error fetching advance bookings'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReservations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns = useMemo(
    () => [
      { id: 'id', label: 'ID', getValue: (r) => r.id },
      { id: 'reserved_for', label: 'Reserved For', getValue: (r) => r.reserved_for },
      { id: 'reserve_date', label: 'Reserve Date', getValue: (r) => r.reserve_date },
      { id: 'reserved_qty', label: 'Reserved Qty', getValue: (r) => r.reserved_qty ?? 0, align: 'right' },
      { id: 'status', label: 'Status', getValue: (r) => r.status || 'Reserved' },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const sortedRows = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return rows
    return stableSort(rows, getComparator(order, col.getValue))
  }, [columns, order, orderBy, rows])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  const openEdit = async (r) => {
    try {
      const res = await storeAPI.getReservation(r.id)
      const data = res.data
      setForm({
        reserved_for: data.reserved_for || '',
        reserve_date: data.reserve_date ? String(data.reserve_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        remarks: data.remarks || '',
      })
      setEditDialog({ open: true, reservation: data })
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load reservation'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const closeEdit = () => {
    setEditDialog({ open: false, reservation: null })
    setForm({ reserved_for: '', reserve_date: '', remarks: '' })
  }

  const submitEdit = async () => {
    if (!editDialog.reservation) return
    try {
      await storeAPI.updateReservation(editDialog.reservation.id, {
        reserved_for: form.reserved_for,
        reserve_date: form.reserve_date,
        remarks: form.remarks,
      })
      setNotification({ open: true, message: 'Updated successfully', severity: 'success' })
      closeEdit()
      await fetchReservations()
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Update failed'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const openDelete = (r) => setDeleteDialog({ open: true, reservation: r })
  const closeDelete = () => setDeleteDialog({ open: false, reservation: null })

  const confirmDelete = async () => {
    if (!deleteDialog.reservation) return
    try {
      await storeAPI.deleteReservation(deleteDialog.reservation.id)
      setNotification({ open: true, message: 'Deleted successfully', severity: 'success' })
      closeDelete()
      await fetchReservations()
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Delete failed'
      setNotification({ open: true, message, severity: 'error' })
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
            Advance Booking
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchReservations} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
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
                <TableCell key={c.id} align={c.align}>
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
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.reserved_for}</TableCell>
                <TableCell>{r.reserve_date ? String(r.reserve_date).slice(0, 10) : '-'}</TableCell>
                <TableCell align="right">{r.reserved_qty ?? 0}</TableCell>
                <TableCell>{r.status || 'Reserved'}</TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => openEdit(r)} size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => openDelete(r)} size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No advance bookings found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={editDialog.open} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Advance Booking #{editDialog.reservation?.id}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reserved For"
                value={form.reserved_for}
                onChange={(e) => setForm((p) => ({ ...p, reserved_for: e.target.value }))}
                size="small"
                margin="dense"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Reserve Date"
                value={form.reserve_date}
                onChange={(e) => setForm((p) => ({ ...p, reserve_date: e.target.value }))}
                size="small"
                margin="dense"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                value={form.remarks}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                size="small"
                margin="dense"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Cancel</Button>
          <Button variant="contained" onClick={submitEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={closeDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Advance Booking</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          Are you sure you want to delete booking #{deleteDialog.reservation?.id}?
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDelete}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={() => setNotification((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={notification.severity} onClose={() => setNotification((p) => ({ ...p, open: false }))} sx={{ borderRadius: 2 }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default AdvanceBookingList
