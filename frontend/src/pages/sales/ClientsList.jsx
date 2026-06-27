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
import { Delete as DeleteIcon, Edit as EditIcon, Refresh as RefreshIcon, UploadFile as UploadFileIcon, Download as DownloadIcon } from '@mui/icons-material'
import { salesAPI } from '../../services/api'
import { authStorage } from '../../services/api'
import { getComparator, stableSort } from '../../utils/tableSort'

function ClientsList() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, client: null })
  const [importing, setImporting] = useState(false)

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('client_name')

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

  const fetchClients = async (searchValue) => {
    setLoading(true)
    try {
      const res = await salesAPI.getClients(searchValue)
      setClients(res.data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
      const message = error?.response?.data?.error || error?.message || 'Error fetching clients'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      fetchClients(search)
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleCloseNotification = () => setNotification((p) => ({ ...p, open: false }))

  const handleDeleteClick = (client) => {
    if (!canDelete) {
      setNotification({ open: true, message: 'Forbidden', severity: 'error' })
      return
    }
    setDeleteDialog({ open: true, client })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.client) return
    try {
      await salesAPI.deleteClient(deleteDialog.client.id)
      setClients((prev) => prev.filter((c) => c.id !== deleteDialog.client.id))
      setNotification({ open: true, message: 'Client deleted successfully', severity: 'success' })
    } catch (error) {
      console.error('Error deleting client:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to delete client'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setDeleteDialog({ open: false, client: null })
    }
  }

  const rows = useMemo(() => clients, [clients])

  const columns = useMemo(
    () => [
      { id: 'client_name', label: 'Client Name', getValue: (c) => c.client_name },
      { id: 'contact_person', label: 'Contact Person', getValue: (c) => c.contact_person },
      { id: 'email', label: 'Email', getValue: (c) => c.email },
      { id: 'phone', label: 'Phone', getValue: (c) => c.phone },
      { id: 'city', label: 'City', getValue: (c) => c.city },
      { id: 'client_rating', label: 'Client Rating', getValue: (c) => c.client_rating },
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

  const handleExportCSV = async () => {
    try {
      const res = await salesAPI.exportClientsCSV()
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'clients.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to export CSV'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleImportFile = async (file) => {
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const res = await salesAPI.importClientsCSV(text)
      const inserted = res?.data?.inserted ?? 0
      const skipped = res?.data?.skipped ?? 0
      setNotification({ open: true, message: `Import complete. Inserted: ${inserted}, Skipped: ${skipped}`, severity: 'success' })
      fetchClients(search)
    } catch (error) {
      console.error('Error importing CSV:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to import CSV'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setImporting(false)
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
            Clients
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="Refresh">
              <IconButton onClick={() => fetchClients(search)} disabled={loading}>
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
              disabled={loading || importing || !canCreate}
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
              onClick={() => navigate('/sales/clients/new')}
              disabled={!canCreate}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
              }}
            >
              New Client
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
          placeholder="Search clients..."
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
            {sortedRows.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.client_name}</TableCell>
                <TableCell>{c.contact_person || '-'}</TableCell>
                <TableCell>{c.email || '-'}</TableCell>
                <TableCell>{c.phone || '-'}</TableCell>
                <TableCell>{c.city || '-'}</TableCell>
                <TableCell>{c.client_rating || '-'}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <Tooltip title="Edit">
                      <IconButton onClick={() => navigate(`/sales/clients/${c.id}/edit`)} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {canDelete ? (
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDeleteClick(c)} size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No clients found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, client: null })}>
        <DialogTitle>Delete Client</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{deleteDialog.client?.client_name}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, client: null })}>Cancel</Button>
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

export default ClientsList
