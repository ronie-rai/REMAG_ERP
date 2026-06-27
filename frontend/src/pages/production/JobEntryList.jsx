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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Tooltip,
  Fab,
  Zoom,
  Backdrop,
  CircularProgress,
} from '@mui/material'
import { 
  Edit as EditIcon, 
  FactCheck as FactCheckIcon,
  Delete as DeleteIcon, 
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { jobEntryAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'
import { generateJobEntryPDF } from '../../utils/pdfGeneratorFallback'
import { format } from 'date-fns'
import { getComparator, stableSort } from '../../utils/tableSort'
import SearchableSelect from '../../components/SearchableSelect'

const jobStatusOptions = [
  'DISMANTLE',
  'CLEAN',
  'CHECK LIST',
  'DATA SHEET',
  'RAW MATERIAL PURCHASE',
  'RAW MATERIAL RECEIVED',
  'CORE/SLOT CLEANING',
  'COIL PRODUCTION',
  'MACHINING',
  'SAMPLE COIL TEST',
  'IN HOUSE INSPECTION',
  'ASSEMBLY',
  'IN HOUSE RUN TEST',
  'FINAL RUN TEST WITH CLIENT',
  'PAINT',
  'READY TO DISPATCH',
  'DISPATCH',
  'DELIVERED',
  'HOLD',
  'WARRENTY CLAIM',
]

const statusColors = {
  'DISMANTLE': 'info',
  'CLEAN': 'default',
  'CHECK LIST': 'secondary',
  'DATA SHEET': 'warning',
  'RAW MATERIAL PURCHASE': 'primary',
  'RAW MATERIAL RECEIVED': 'success',
  'CORE/SLOT CLEANING': 'info',
  'COIL PRODUCTION': 'success',
  'MACHINING': 'warning',
  'SAMPLE COIL TEST': 'secondary',
  'IN HOUSE INSPECTION': 'primary',
  'ASSEMBLY': 'primary',
  'IN HOUSE RUN TEST': 'success',
  'FINAL RUN TEST WITH CLIENT': 'success',
  'PAINT': 'info',
  'READY TO DISPATCH': 'warning',
  'DISPATCH': 'success',
  'DELIVERED': 'success',
  'HOLD': 'error',
  'WARRENTY CLAIM': 'error',
}

function JobEntryList() {
  const navigate = useNavigate()
  const [jobEntries, setJobEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [workOrders, setWorkOrders] = useState([])
  const [woDialog, setWoDialog] = useState({ open: false, jobEntry: null, work_order_id: '' })

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('job_number')

  const [remarksDraftById, setRemarksDraftById] = useState({})
  const [savingRemarksId, setSavingRemarksId] = useState(null)

  useEffect(() => {
    fetchJobEntries()
    fetchWorkOrders()
  }, [])

  const fetchJobEntries = async () => {
    setLoading(true)
    try {
      const response = await jobEntryAPI.getJobEntries()
      setJobEntries(response.data)
    } catch (error) {
      console.error('Error fetching job entries:', error)
      setNotification({
        open: true,
        message: 'Error fetching job entries',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveStatusRemarks = async (jobEntryId) => {
    try {
      const draft = Object.prototype.hasOwnProperty.call(remarksDraftById, jobEntryId)
        ? remarksDraftById[jobEntryId]
        : undefined

      if (draft === undefined) return

      setSavingRemarksId(jobEntryId)
      const res = await jobEntryAPI.updateJobEntryStatusRemarks(jobEntryId, { status_remarks: draft })
      const updated = res.data
      setJobEntries((prev) => prev.map((e) => (e.id === jobEntryId ? { ...e, status_remarks: updated.status_remarks } : e)))
      setRemarksDraftById((prev) => {
        const next = { ...prev }
        delete next[jobEntryId]
        return next
      })
      setNotification({ open: true, message: 'Status remarks updated', severity: 'success' })
    } catch (error) {
      console.error('Error updating status remarks:', error)
      const message = error?.response?.data?.error || 'Error updating status remarks'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setSavingRemarksId(null)
    }
  }

  const fetchWorkOrders = async () => {
    try {
      const res = await salesAPI.getWorkOrders()
      setWorkOrders(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error('Error fetching work orders:', error)
      setWorkOrders([])
    }
  }

  const workOrderOptions = useMemo(() => {
    return (workOrders || []).map((wo) => ({
      label: `${wo.wo_number || wo.id}${wo.wo_date ? ` - ${wo.wo_date}` : ''}`,
      value: String(wo.id),
      data: wo,
    }))
  }, [workOrders])

  const workOrderLabelById = useMemo(() => {
    const map = new Map()
    ;(workOrders || []).forEach((wo) => {
      map.set(String(wo.id), wo.wo_number || String(wo.id))
    })
    return map
  }, [workOrders])

  const openWorkOrderDialog = (jobEntry) => {
    setWoDialog({
      open: true,
      jobEntry,
      work_order_id: jobEntry?.work_order_id ? String(jobEntry.work_order_id) : '',
    })
  }

  const closeWorkOrderDialog = () => setWoDialog({ open: false, jobEntry: null, work_order_id: '' })

  const saveWorkOrderLink = async () => {
    if (!woDialog.jobEntry) return
    try {
      const payload = {
        work_order_id: woDialog.work_order_id === '' ? null : Number(woDialog.work_order_id),
      }
      const res = await jobEntryAPI.updateJobEntry(woDialog.jobEntry.id, payload)
      const updated = res.data
      setJobEntries((prev) => prev.map((e) => (e.id === updated.id ? { ...e, work_order_id: updated.work_order_id } : e)))
      setNotification({ open: true, message: 'Work Order updated', severity: 'success' })
      closeWorkOrderDialog()
    } catch (error) {
      console.error('Error updating work order:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to update work order'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleRowStatusChange = async (jobEntryId, newStatus) => {
    try {
      const res = await jobEntryAPI.updateJobEntryStatus(jobEntryId, { status: newStatus })

      if (res.data.requiresIndent) {
        setNotification({ open: true, message: res.data.message || 'Please create indent for this job', severity: 'info' })
        navigate(`/procurement/indents/new?job_number=${res.data.job_number}&afterStatus=${encodeURIComponent(newStatus)}&jobEntryId=${res.data.id}`)
        return
      }

      if (res.data.requiresMachining) {
        setNotification({ open: true, message: res.data.message || 'Please create machining entry for this job', severity: 'info' })
        navigate(`/production/machining?job_number=${res.data.job_number}&afterStatus=${encodeURIComponent(newStatus)}&jobEntryId=${res.data.id}`)
        return
      }

      setJobEntries((prev) => prev.map((e) => (e.id === jobEntryId ? { ...e, status: newStatus } : e)))
      setNotification({
        open: true,
        message: 'Status updated successfully',
        severity: 'success',
      })
    } catch (error) {
      console.error('Error updating status:', error)
      setNotification({
        open: true,
        message: 'Error updating status',
        severity: 'error',
      })
    }
  }

  const handleEdit = (id) => {
    navigate(`/production/job-entries/${id}/edit`)
  }

  const handleDelete = async (id) => {
    try {
      await jobEntryAPI.deleteJobEntry(id)
      setJobEntries(prev => prev.filter(entry => entry.id !== id))
      setNotification({
        open: true,
        message: 'Job entry deleted successfully',
        severity: 'success'
      })
      setDeleteDialog({ open: false, id: null })
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Error deleting job entry',
        severity: 'error'
      })
    }
  }

  const handlePDFExport = async (jobEntry) => {
    setPdfLoading(true)
    try {
      await generateJobEntryPDF(jobEntry)
      setNotification({
        open: true,
        message: 'PDF generated successfully',
        severity: 'success'
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      setNotification({
        open: true,
        message: 'Error generating PDF',
        severity: 'error'
      })
    } finally {
      setPdfLoading(false)
    }
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  const filteredJobEntries = useMemo(() => jobEntries.filter(entry => {
    const matchesSearch = entry.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.job_number?.toString().includes(searchTerm) ||
                         entry.job_description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter
    return matchesSearch && matchesStatus
  }), [jobEntries, searchTerm, statusFilter])

  const columns = useMemo(
    () => [
      { id: 'job_number', label: 'Job Number', getValue: (e) => e.job_number },
      { id: 'party_name', label: 'Party Name', getValue: (e) => e.party_name },
      { id: 'work_order_id', label: 'Work Order', getValue: (e) => e.work_order_id },
      { id: 'department', label: 'Department', getValue: (e) => e.department },
      { id: 'job_description', label: 'Job Description', getValue: (e) => e.job_description },
      { id: 'gatepass_number', label: 'Gatepass', getValue: (e) => e.gatepass_number },
      { id: 'status', label: 'Status', sortable: false },
      { id: 'status_remarks', label: 'Status Remarks', sortable: false },
      { id: 'created_at', label: 'Created', getValue: (e) => e.created_at },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const sortedJobEntries = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return filteredJobEntries
    return stableSort(filteredJobEntries, getComparator(order, col.getValue))
  }, [columns, filteredJobEntries, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      p: 3,
      borderRadius: 2
    }}>
      <Backdrop open={pdfLoading} sx={{ zIndex: 9999 }}>
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Header with Glassmorphism Effect */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold'
            }}
          >
            Job Entries
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchJobEntries} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button 
              variant="contained" 
              onClick={() => navigate('/production/job-entries/new')}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                }
              }}
            >
              New Job Entry
            </Button>
          </Box>
        </Box>

        {/* Search and Filter Section */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by party name, job number, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{
              minWidth: 300,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
              }
            }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="status-filter-label" sx={{ mt: -0.5 }}>
              Status Filter
            </InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status Filter"
              sx={{
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <MenuItem value="all">All Status</MenuItem>
              {jobStatusOptions.map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Main Table with Modern Styling */}
      <Paper sx={{ 
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '& th': { color: 'white', fontWeight: 'bold' }
              }}>
                {columns.map((c) => (
                  <TableCell key={c.id}>
                    {c.sortable === false ? (
                      c.label
                    ) : (
                      <TableSortLabel
                        active={orderBy === c.id}
                        direction={orderBy === c.id ? order : 'asc'}
                        onClick={() => requestSort(c.id)}
                        sx={{ color: 'white' }}
                      >
                        {c.label}
                      </TableSortLabel>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedJobEntries.map((entry, index) => (
                <TableRow 
                  key={entry.id}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      transform: 'scale(1.01)',
                      transition: 'all 0.2s ease-in-out'
                    },
                    animation: `fadeIn 0.5s ease-in-out ${index * 0.1}s`
                  }}
                >
                  <TableCell>
                    <Button
                      variant="text"
                      onClick={() => navigate(`/production/job-entries/job/${entry.job_number}`)}
                      sx={{ fontWeight: 'bold', p: 0, minWidth: 'auto' }}
                    >
                      {entry.job_number}
                    </Button>
                  </TableCell>
                  <TableCell>{entry.party_name}</TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      onClick={() => openWorkOrderDialog(entry)}
                      sx={{ p: 0, minWidth: 'auto' }}
                    >
                      {entry.work_order_id ? (workOrderLabelById.get(String(entry.work_order_id)) || String(entry.work_order_id)) : '-'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={entry.department}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }}>
                      {entry.job_description ? 
                        entry.job_description.substring(0, 50) + '...' : 
                        '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>{entry.gatepass_number || '-'}</TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <Select
                        value={entry.status || 'DISMANTLE'}
                        onChange={(e) => handleRowStatusChange(entry.id, e.target.value)}
                        sx={{
                          borderRadius: 2,
                          backgroundColor: 'rgba(255, 255, 255, 0.85)',
                        }}
                      >
                        {jobStatusOptions.map((s) => (
                          <MenuItem key={s} value={s}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={s}
                                color={statusColors[s] || 'default'}
                                size="small"
                                sx={{ borderRadius: 1, fontWeight: 'bold' }}
                              />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        value={
                          Object.prototype.hasOwnProperty.call(remarksDraftById, entry.id)
                            ? (remarksDraftById[entry.id] ?? '')
                            : (entry.status_remarks ?? '')
                        }
                        onChange={(e) => {
                          const val = e.target.value
                          setRemarksDraftById((prev) => ({ ...prev, [entry.id]: val }))
                        }}
                        placeholder="Remarks"
                        sx={{ minWidth: 200 }}
                      />
                      <Tooltip title="Save Remarks">
                        <span>
                          <IconButton
                            onClick={() => handleSaveStatusRemarks(entry.id)}
                            size="small"
                            disabled={savingRemarksId === entry.id || !Object.prototype.hasOwnProperty.call(remarksDraftById, entry.id)}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {formatDate(entry.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleEdit(entry.id)}
                          size="small"
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(102, 126, 234, 0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Set Work Order">
                        <IconButton
                          color="primary"
                          onClick={() => openWorkOrderDialog(entry)}
                          size="small"
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(102, 126, 234, 0.1)',
                              transform: 'scale(1.1)',
                            },
                          }}
                        >
                          <FactCheckIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Export PDF">
                        <IconButton 
                          color="secondary" 
                          onClick={() => handlePDFExport(entry)}
                          size="small"
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(220, 0, 78, 0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <PdfIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          color="error" 
                          onClick={() => setDeleteDialog({ open: true, id: entry.id })}
                          size="small"
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Floating Action Button for Bulk Export */}
      <Zoom in={true}>
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            '&:hover': {
              background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
            }
          }}
          onClick={() => {
            // Implement bulk export functionality
            setNotification({
              open: true,
              message: 'Bulk export feature coming soon!',
              severity: 'info'
            })
          }}
        >
          <DownloadIcon />
        </Fab>
      </Zoom>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, id: null })}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this job entry? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDelete(deleteDialog.id)} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={notification.severity} 
          onClose={handleCloseNotification}
          sx={{ borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <Dialog open={woDialog.open} onClose={closeWorkOrderDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Link Work Order</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <SearchableSelect
              label="Work Order"
              value={woDialog.work_order_id}
              onChange={(next) => setWoDialog((p) => ({ ...p, work_order_id: next }))}
              options={workOrderOptions}
              placeholder="Select work order"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeWorkOrderDialog}>Cancel</Button>
          <Button variant="contained" onClick={saveWorkOrderLink}>Save</Button>
        </DialogActions>
      </Dialog>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </Box>
  )
}

export default JobEntryList
