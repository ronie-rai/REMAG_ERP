import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Alert,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { procurementAPI } from '../../services/api'
import { getComparator, stableSort } from '../../utils/tableSort'

function IndentList() {
  const navigate = useNavigate()
  const [indents, setIndents] = useState([])
  const [detailDialog, setDetailDialog] = useState({ open: false, indentId: null })
  const [selectedIndent, setSelectedIndent] = useState(null)
  const [loadingIndent, setLoadingIndent] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('indent_number')

  const columns = useMemo(
    () => [
      { id: 'indent_number', label: 'Indent Number', getValue: (i) => i.indent_number },
      { id: 'indent_type', label: 'Type', getValue: (i) => i.indent_type },
      { id: 'status', label: 'Status', getValue: (i) => i.status },
      { id: 'created_at', label: 'Created Date', getValue: (i) => i.created_at },
    ],
    []
  )

  const sortedIndents = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col) return indents
    return stableSort(indents, getComparator(order, col.getValue))
  }, [columns, indents, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  useEffect(() => {
    const fetchIndents = async () => {
      try {
        const response = await procurementAPI.getIndents()
        setIndents(response.data)
      } catch (error) {
        console.error('Error fetching indents:', error)
      }
    }
    fetchIndents()
  }, [])

  const fetchIndents = async () => {
    try {
      const response = await procurementAPI.getIndents()
      setIndents(response.data)
    } catch (error) {
      console.error('Error fetching indents:', error)
    }
  }

  const openDetails = async (indent) => {
    setDetailDialog({ open: true, indentId: indent.id })
    setSelectedIndent(null)
    setLoadingIndent(true)
    try {
      const res = await procurementAPI.getIndent(indent.id)
      setSelectedIndent(res.data)
    } catch (error) {
      console.error('Error fetching indent details:', error)
    } finally {
      setLoadingIndent(false)
    }
  }

  const closeDetails = () => {
    setDetailDialog({ open: false, indentId: null })
    setSelectedIndent(null)
    setLoadingIndent(false)
  }

  const goEdit = () => {
    if (!selectedIndent?.id) return
    closeDetails()
    navigate(`/procurement/indents/${selectedIndent.id}/edit`)
  }

  const closeNotification = () => {
    setNotification((p) => ({ ...p, open: false }))
  }

  const handleDelete = async () => {
    if (!selectedIndent?.id) return
    if (selectedIndent.status === 'Converted') {
      setNotification({ open: true, message: 'Converted indent cannot be deleted', severity: 'error' })
      return
    }

    const ok = window.confirm(`Delete indent ${selectedIndent.indent_number}?`)
    if (!ok) return

    setDeleting(true)
    try {
      await procurementAPI.deleteIndent(selectedIndent.id)
      setNotification({ open: true, message: 'Indent deleted', severity: 'success' })
      closeDetails()
      await fetchIndents()
    } catch (error) {
      console.error('Error deleting indent:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to delete indent'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setDeleting(false)
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
            Indents
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/procurement/indents/new')}
            sx={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
            }}
          >
            New Indent
          </Button>
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
            {sortedIndents.map((indent) => (
              <TableRow key={indent.id}>
                <TableCell>
                  <Button variant="text" onClick={() => openDetails(indent)} sx={{ textTransform: 'none', p: 0, minWidth: 0 }}>
                    {indent.indent_number}
                  </Button>
                </TableCell>
                <TableCell>{indent.indent_type}</TableCell>
                <TableCell>{indent.status}</TableCell>
                <TableCell>
                  {new Date(indent.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={detailDialog.open} onClose={closeDetails} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <span>Indent Details</span>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton onClick={handleDelete} size="small" color="error" disabled={!selectedIndent || loadingIndent || deleting || selectedIndent?.status === 'Converted'}>
              <DeleteIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={goEdit} size="small" disabled={!selectedIndent || loadingIndent || deleting}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingIndent ? (
            <Typography>Loading...</Typography>
          ) : selectedIndent ? (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 2 }}>
                <Typography><strong>Indent Number:</strong> {selectedIndent.indent_number}</Typography>
                <Typography><strong>Status:</strong> {selectedIndent.status}</Typography>
                <Typography><strong>Type:</strong> {selectedIndent.indent_type}</Typography>
                <Typography><strong>Indent Date:</strong> {selectedIndent.indent_date ? new Date(selectedIndent.indent_date).toLocaleDateString() : '-'}</Typography>
                <Typography><strong>Checklist ID:</strong> {selectedIndent.job_sheet_id ?? '-'}</Typography>
                <Typography><strong>Created:</strong> {selectedIndent.created_at ? new Date(selectedIndent.created_at).toLocaleString() : '-'}</Typography>
              </Box>

              <Typography variant="h6" sx={{ mb: 1 }}>Items</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedIndent.items || []).map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.sku_code || it.sku_id || '-'}</TableCell>
                      <TableCell>{it.sku_item_name || it.item_name || '-'}</TableCell>
                      <TableCell>{it.quantity}</TableCell>
                      <TableCell>{it.sku_unit || it.unit || '-'}</TableCell>
                      <TableCell>{it.remarks || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Typography>Failed to load indent.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={notification.severity} onClose={closeNotification} sx={{ borderRadius: 2 }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default IndentList

