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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import { productionAPI } from '../../services/api'
import { format } from 'date-fns'
import { getComparator, stableSort } from '../../utils/tableSort'

function ChecklistList() {
  const navigate = useNavigate()
  const [checklists, setChecklists] = useState([])
  const [deleteDialog, setDeleteDialog] = useState({ open: false, checklist: null })
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('job_number')

  const columns = useMemo(
    () => [
      { id: 'job_number', label: 'Job Number', getValue: (c) => c.job_number },
      { id: 'job_type', label: 'Job Type', getValue: (c) => c.job_type },
      { id: 'party_name', label: 'Party Name', getValue: (c) => c.party_name },
      {
        id: 'received_date',
        label: 'Received Date',
        getValue: (c) =>
          c.received_date || c.receivedDate || c.timestamp || c.created_at || null,
      },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const sortedChecklists = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return checklists
    return stableSort(checklists, getComparator(order, col.getValue))
  }, [checklists, columns, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  const safeFormatDate = (value) => {
    if (!value) return '-'
    const rawStr = String(value || '').trim()

    const match = rawStr.match(/(\d{4}-\d{2}-\d{2})/)
    if (match?.[1]) {
      const prefix = match[1]
      const d2 = new Date(prefix)
      if (!Number.isNaN(d2.getTime())) {
        try {
          return format(d2, 'dd-MMM-yyyy')
        } catch {
          return prefix
        }
      }
      return prefix
    }

    const d = new Date(value)
    if (Number.isNaN(d.getTime())) {
      return rawStr || '-'
    }
    try {
      return format(d, 'dd-MMM-yyyy')
    } catch {
      return '-'
    }
  }

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        const response = await productionAPI.getChecklists()
        setChecklists(response.data)
      } catch (error) {
        console.error('Error fetching checklists:', error)
        const message = error?.response?.data?.error || error?.message || 'Error fetching checklists'
        setNotification({ open: true, message, severity: 'error' })
      }
    }
    fetchChecklists()
  }, [])

  const handleCloseNotification = () => {
    setNotification((p) => ({ ...p, open: false }))
  }

  const handleDeleteClick = (checklist) => {
    setDeleteDialog({ open: true, checklist })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.checklist) return
    try {
      await productionAPI.deleteChecklist(deleteDialog.checklist.id)
      setChecklists((prev) => prev.filter((c) => c.id !== deleteDialog.checklist.id))
      setNotification({ open: true, message: 'Checklist deleted successfully', severity: 'success' })
    } catch (error) {
      console.error('Error deleting checklist:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to delete checklist'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setDeleteDialog({ open: false, checklist: null })
    }
  }

  const handleExportPDF = async (id) => {
    try {
      const response = await productionAPI.exportChecklistPDF(id)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `checklist_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF')
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            Checklists
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/production/checklists/new')}
            sx={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              '&:hover': {
                background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
              },
            }}
          >
            New Checklist
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
            {sortedChecklists.map((checklist) => (
              <TableRow key={checklist.id}>
                <TableCell>
                  <Button
                    variant="text"
                    onClick={() => navigate(`/production/checklists/job/${checklist.job_number}`)}
                    sx={{ fontWeight: 'bold', p: 0, minWidth: 'auto' }}
                  >
                    {checklist.job_number}
                  </Button>
                </TableCell>
                <TableCell>{checklist.job_type}</TableCell>
                <TableCell>{checklist.party_name}</TableCell>
                <TableCell>
                  {safeFormatDate(
                    checklist.received_date ||
                      checklist.receivedDate ||
                      checklist.timestamp ||
                      checklist.created_at ||
                      null
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/production/checklists/${checklist.id}/edit`)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(checklist)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Export PDF">
                    <IconButton size="small" onClick={() => handleExportPDF(checklist.id)}>
                      <PictureAsPdfIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, checklist: null })}>
        <DialogTitle>Delete Checklist</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{deleteDialog.checklist?.job_number || `#${deleteDialog.checklist?.id}`}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, checklist: null })}>Cancel</Button>
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

export default ChecklistList

