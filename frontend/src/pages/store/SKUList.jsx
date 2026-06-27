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
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Delete as DeleteIcon, Edit as EditIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import { storeAPI } from '../../services/api'
import { getComparator, stableSort } from '../../utils/tableSort'

function SKUList() {
  const navigate = useNavigate()
  const [skus, setSkus] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, sku: null })
  const [bulkDialog, setBulkDialog] = useState({ open: false, mode: 'issue' })
  const [bulkIssuedTo, setBulkIssuedTo] = useState('')
  const [bulkRemarks, setBulkRemarks] = useState('')
  const [bulkItems, setBulkItems] = useState([{ sku_id: '', qty: '' }])

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('sku_code')

  const fetchSKUs = async () => {
    setLoading(true)
    try {
      const res = await storeAPI.getSKUs()
      setSkus(res.data || [])
    } catch (error) {
      console.error('Error fetching SKUs:', error)
      const message = error?.response?.data?.error || error?.message || 'Error fetching SKUs'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSKUs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCloseNotification = () => setNotification((p) => ({ ...p, open: false }))

  const openBulkDialog = (mode) => {
    setBulkDialog({ open: true, mode })
    setBulkIssuedTo('')
    setBulkRemarks('')
    setBulkItems([{ sku_id: '', qty: '' }])
  }

  const closeBulkDialog = () => {
    setBulkDialog({ open: false, mode: 'issue' })
  }

  const updateBulkItem = (idx, patch) => {
    setBulkItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const addBulkLine = () => {
    setBulkItems((prev) => [...prev, { sku_id: '', qty: '' }])
  }

  const removeBulkLine = (idx) => {
    setBulkItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const submitBulk = async () => {
    const targetLabel = bulkDialog.mode === 'reserve' ? 'reserved_for' : 'issued_to'
    const targetValue = bulkIssuedTo.trim()
    if (!targetValue) {
      setNotification({ open: true, message: `${targetLabel} is required`, severity: 'error' })
      return
    }

    const items = bulkItems
      .map((it) => ({ sku_id: Number(it.sku_id), qty: Number(it.qty) }))
      .filter((it) => Number.isFinite(it.sku_id) && Number.isFinite(it.qty) && it.qty > 0)

    if (items.length === 0) {
      setNotification({ open: true, message: 'Please add at least 1 SKU with qty', severity: 'error' })
      return
    }

    try {
      if (bulkDialog.mode === 'reserve') {
        await storeAPI.reserve({ reserved_for: targetValue, remarks: bulkRemarks, items })
        setNotification({ open: true, message: 'Reserved successfully', severity: 'success' })
      } else {
        await storeAPI.bulkIssue({ issued_to: targetValue, remarks: bulkRemarks, items })
        setNotification({ open: true, message: 'Issued successfully', severity: 'success' })
      }
      closeBulkDialog()
      await fetchSKUs()
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Operation failed'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleDeleteClick = (sku) => {
    setDeleteDialog({ open: true, sku })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.sku) return
    try {
      await storeAPI.deleteSKU(deleteDialog.sku.id)
      setSkus((prev) => prev.filter((s) => s.id !== deleteDialog.sku.id))
      setNotification({ open: true, message: 'SKU deleted successfully', severity: 'success' })
    } catch (error) {
      console.error('Error deleting SKU:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to delete SKU'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setDeleteDialog({ open: false, sku: null })
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return skus
    return skus.filter((s) => {
      const code = (s.sku_code || '').toLowerCase()
      const name = (s.item_name || '').toLowerCase()
      const cat = (s.category || '').toLowerCase()
      return code.includes(q) || name.includes(q) || cat.includes(q)
    })
  }, [skus, search])

  const columns = useMemo(
    () => [
      { id: 'sku_code', label: 'SKU Code', getValue: (s) => s.sku_code },
      { id: 'item_name', label: 'Item Name', getValue: (s) => s.item_name },
      { id: 'size_type', label: 'Size/Type', getValue: (s) => s.size_type },
      { id: 'category', label: 'Category', getValue: (s) => s.category },
      { id: 'unit', label: 'Unit', getValue: (s) => s.unit },
      { id: 'current_stock', label: 'Current Stock', getValue: (s) => s.current_stock ?? 0, align: 'right' },
      { id: 'reserved_qty', label: 'Reserved', getValue: (s) => s.reserved_qty ?? 0, align: 'right' },
      { id: 'available_qty', label: 'Available', getValue: (s) => s.available_qty ?? (s.current_stock ?? 0), align: 'right' },
      { id: 'latest_rate', label: 'Latest Rate', getValue: (s) => s.latest_rate, align: 'right' },
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
            SKUs
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchSKUs} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button variant="outlined" onClick={() => openBulkDialog('issue')}>
              Issue SKUs
            </Button>
            <Button variant="outlined" onClick={() => openBulkDialog('reserve')}>
              Book SKUs
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/store/skus/new')}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
              }}
            >
              New SKU
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper
        sx={{
          p: 2,
          mb: 2,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: 3,
        }}
      >
        <TextField
          fullWidth
          placeholder="Search SKU code / item name / category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
        />
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
            {sortedRows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.sku_code}</TableCell>
                <TableCell>{s.item_name}</TableCell>
                <TableCell>{s.size_type || '-'}</TableCell>
                <TableCell>{s.category || '-'}</TableCell>
                <TableCell>{s.unit || '-'}</TableCell>
                <TableCell align="right">{s.current_stock ?? 0}</TableCell>
                <TableCell align="right">{s.reserved_qty ?? 0}</TableCell>
                <TableCell align="right">{s.available_qty ?? (s.current_stock ?? 0)}</TableCell>
                <TableCell align="right">{s.latest_rate ?? '-'}</TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => navigate(`/store/skus/${s.id}/edit`)} size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteClick(s)} size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  No SKUs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={bulkDialog.open} onClose={closeBulkDialog} maxWidth="md" fullWidth>
        <DialogTitle>{bulkDialog.mode === 'reserve' ? 'Book (Reserve) SKUs' : 'Issue SKUs'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={bulkDialog.mode === 'reserve' ? 'Reserved For' : 'Issued To'}
                size="small"
                margin="dense"
                InputLabelProps={{ shrink: true }}
                value={bulkIssuedTo}
                onChange={(e) => setBulkIssuedTo(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Remarks"
                size="small"
                margin="dense"
                InputLabelProps={{ shrink: true }}
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
              />
            </Grid>

            {bulkItems.map((it, idx) => (
              <React.Fragment key={idx}>
                <Grid item xs={12} md={7}>
                  <FormControl fullWidth>
                    <InputLabel>SKU</InputLabel>
                    <Select
                      label="SKU"
                      value={it.sku_id}
                      size="small"
                      onChange={(e) => updateBulkItem(idx, { sku_id: e.target.value })}
                    >
                      {skus.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.sku_code} - {s.item_name} (Avail: {s.available_qty ?? s.current_stock ?? 0})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Qty"
                    type="number"
                    size="small"
                    margin="dense"
                    InputLabelProps={{ shrink: true }}
                    value={it.qty}
                    onChange={(e) => updateBulkItem(idx, { qty: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => removeBulkLine(idx)}
                    disabled={bulkItems.length === 1}
                    fullWidth
                  >
                    Remove
                  </Button>
                </Grid>
              </React.Fragment>
            ))}

            <Grid item xs={12}>
              <Button variant="outlined" onClick={addBulkLine}>
                Add SKU
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkDialog}>Cancel</Button>
          <Button variant="contained" onClick={submitBulk}>
            {bulkDialog.mode === 'reserve' ? 'Book' : 'Issue'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, sku: null })}>
        <DialogTitle>Delete SKU</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{deleteDialog.sku?.sku_code}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, sku: null })}>Cancel</Button>
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

export default SKUList
