import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Button,
  Link,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Collapse,
  Grid,
} from '@mui/material'
import { Refresh as RefreshIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import { salesAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'
import { format } from 'date-fns'
import { authStorage } from '../../services/api'
import { getComparator, stableSort } from '../../utils/tableSort'

function WorkOrderList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, workOrder: null })

  const [activeEnquiryId, setActiveEnquiryId] = useState(() => {
    const q = searchParams.get('enquiry_id')
    const n = q === null ? null : Number(q)
    return Number.isFinite(n) ? n : null
  })

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('wo_number')

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

  const toggleExpand = (woId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(woId)) next.delete(woId)
      else next.add(woId)
      return next
    })
  }

  const canCreate = can('sales', 'create')
  const canEdit = can('sales', 'edit')
  const canDelete = can('sales', 'delete')

  const handleCloseNotification = () => setNotification((p) => ({ ...p, open: false }))

  useEffect(() => {
    const q = searchParams.get('enquiry_id')
    const n = q === null ? null : Number(q)
    setActiveEnquiryId(Number.isFinite(n) ? n : null)
  }, [searchParams])

  useEffect(() => {
    const fetchWorkOrders = async () => {
      setLoading(true)
      try {
        const response = await salesAPI.getWorkOrders()
        setWorkOrders(response.data)
      } catch (error) {
        console.error('Error fetching work orders:', error)
        const message = error?.response?.data?.error || error?.message || 'Error fetching work orders'
        setNotification({ open: true, message, severity: 'error' })
      } finally {
        setLoading(false)
      }
    }
    fetchWorkOrders()
  }, [])

  const handleDeleteClick = (workOrder) => {
    if (!canDelete) {
      setNotification({ open: true, message: 'Forbidden', severity: 'error' })
      return
    }
    setDeleteDialog({ open: true, workOrder })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.workOrder) return
    try {
      await salesAPI.deleteWorkOrder(deleteDialog.workOrder.id)
      setWorkOrders((prev) => prev.filter((w) => w.id !== deleteDialog.workOrder.id))
      setNotification({ open: true, message: 'Work order deleted successfully', severity: 'success' })
    } catch (error) {
      console.error('Error deleting work order:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to delete work order'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setDeleteDialog({ open: false, workOrder: null })
    }
  }

  const columns = useMemo(
    () => [
      { id: 'wo_number', label: 'WO Number', getValue: (w) => w.wo_number },
      { id: 'wo_date', label: 'WO Date', getValue: (w) => w.wo_date },
      { id: 'wo_value', label: 'WO Value', getValue: (w) => w.wo_value },
      { id: 'wo_delivery', label: 'Delivery Date', getValue: (w) => w.wo_delivery },
      { id: 'status', label: 'Status', getValue: (w) => w.status },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const filteredWorkOrders = useMemo(() => {
    const list = Array.isArray(workOrders) ? workOrders : []
    if (!activeEnquiryId) return list
    return list.filter((w) => Number(w.enquiry_id) === Number(activeEnquiryId))
  }, [activeEnquiryId, workOrders])

  const sortedWorkOrders = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return filteredWorkOrders
    return stableSort(filteredWorkOrders, getComparator(order, col.getValue))
  }, [columns, filteredWorkOrders, order, orderBy])

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
            Work Orders
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="Refresh">
              <IconButton onClick={() => window.location.reload()} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            {activeEnquiryId ? (
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.delete('enquiry_id')
                    return next
                  })
                }}
              >
                Clear Filter (Enquiry ID: {activeEnquiryId})
              </Button>
            ) : null}
            <Button
              variant="contained"
              onClick={() => navigate('/sales/work-orders/new')}
              disabled={!canCreate}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                },
              }}
            >
              Add New Work Order
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{
          mt: 2,
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
            {sortedWorkOrders.map((wo) => {
              const isExpanded = expanded.has(wo.id)
              return (
              <React.Fragment key={wo.id}>
              <TableRow hover>
                <TableCell>
                  <Button
                    variant="text"
                    onClick={() => toggleExpand(wo.id)}
                    sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
                  >
                    {wo.wo_number}
                  </Button>
                </TableCell>
                <TableCell>
                  {formatDate(wo.wo_date)}
                </TableCell>
                <TableCell>{wo.wo_value}</TableCell>
                <TableCell>
                  {formatDate(wo.wo_delivery)}
                </TableCell>
                <TableCell>{wo.status}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <Tooltip title="Edit">
                      <IconButton onClick={() => navigate(`/sales/work-orders/${wo.id}/edit`)} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {canDelete ? (
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDeleteClick(wo)} size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell colSpan={6} sx={{ py: 0 }}>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>WO Number</Typography>
                          <Typography variant="body2">{wo.wo_number || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>WO Date</Typography>
                          <Typography variant="body2">{formatDate(wo.wo_date)}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>WO Value</Typography>
                          <Typography variant="body2">{wo.wo_value ?? '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Delivery Date</Typography>
                          <Typography variant="body2">{formatDate(wo.wo_delivery)}</Typography>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>WO Link</Typography>
                          {wo.wo_link ? (
                            <Link
                              href={wo.wo_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                              sx={{ wordBreak: 'break-word', display: 'inline-block' }}
                            >
                              {wo.wo_link}
                            </Link>
                          ) : (
                            <Typography variant="body2">-</Typography>
                          )}
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Status</Typography>
                          <Typography variant="body2">{wo.status || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Enquiry ID</Typography>
                          <Typography variant="body2">{wo.enquiry_id ?? '-'}</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
              </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, workOrder: null })}>
        <DialogTitle>Delete Work Order</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{deleteDialog.workOrder?.wo_number || `#${deleteDialog.workOrder?.id}`}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, workOrder: null })}>Cancel</Button>
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

export default WorkOrderList

