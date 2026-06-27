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
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
} from '@mui/icons-material'
import { procurementAPI } from '../../services/api'
import { getComparator, stableSort } from '../../utils/tableSort'

function VendorsList() {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, vendor: null })
  const [importing, setImporting] = useState(false)

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('vendor_name')

  const fetchVendors = async () => {
    setLoading(true)
    try {
      const res = await procurementAPI.getVendors()
      setVendors(res.data || [])
    } catch (error) {
      console.error('Error fetching vendors:', error)
      const message = error?.response?.data?.error || error?.message || 'Error fetching vendors'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCloseNotification = () => setNotification((p) => ({ ...p, open: false }))

  const handleExportCSV = async () => {
    try {
      const res = await procurementAPI.exportVendorsCSV()
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'vendors.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting vendors CSV:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to export CSV'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleImportFile = async (file) => {
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const res = await procurementAPI.importVendorsCSV(text)
      const inserted = res?.data?.inserted ?? 0
      const skipped = res?.data?.skipped ?? 0
      setNotification({ open: true, message: `Import complete. Inserted: ${inserted}, Skipped: ${skipped}`, severity: 'success' })
      fetchVendors()
    } catch (error) {
      console.error('Error importing vendors CSV:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to import CSV'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteClick = (vendor) => {
    setDeleteDialog({ open: true, vendor })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.vendor) return
    try {
      await procurementAPI.deleteVendor(deleteDialog.vendor.id)
      setVendors((prev) => prev.filter((v) => v.id !== deleteDialog.vendor.id))
      setNotification({ open: true, message: 'Vendor deleted successfully', severity: 'success' })
    } catch (error) {
      console.error('Error deleting vendor:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to delete vendor'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setDeleteDialog({ open: false, vendor: null })
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter((v) => {
      const name = (v.vendor_name || '').toLowerCase()
      const contact = (v.contact_person || '').toLowerCase()
      const phone = (v.contact_number || '').toLowerCase()
      const email = (v.email || '').toLowerCase()
      return name.includes(q) || contact.includes(q) || phone.includes(q) || email.includes(q)
    })
  }, [vendors, search])

  const columns = useMemo(
    () => [
      { id: 'vendor_name', label: 'Vendor Name', getValue: (v) => v.vendor_name },
      { id: 'contact_person', label: 'Contact Person', getValue: (v) => v.contact_person },
      { id: 'contact_number', label: 'Contact Number', getValue: (v) => v.contact_number },
      { id: 'email', label: 'Email', getValue: (v) => v.email },
      { id: 'address', label: 'Address', getValue: (v) => v.address },
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
            Vendors
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchVendors} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={loading}
            >
              Export CSV
            </Button>

            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              component="label"
              disabled={loading || importing}
            >
              Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0]
                  e.target.value = ''
                  handleImportFile(f)
                }}
              />
            </Button>

            <Button
              variant="contained"
              onClick={() => navigate('/procurement/vendors/new')}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
              }}
            >
              New Vendor
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
          placeholder="Search vendors..."
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
            {sortedRows.map((v) => (
              <TableRow key={v.id} hover>
                <TableCell>{v.vendor_name}</TableCell>
                <TableCell>{v.contact_person || '-'}</TableCell>
                <TableCell>{v.email || '-'}</TableCell>
                <TableCell>{v.contact_number || '-'}</TableCell>
                <TableCell>{v.address || '-'}</TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => navigate(`/procurement/vendors/${v.id}/edit`)} size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteClick(v)} size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No vendors found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, vendor: null })}>
        <DialogTitle>Delete Vendor</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{deleteDialog.vendor?.vendor_name}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, vendor: null })}>Cancel</Button>
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

export default VendorsList
