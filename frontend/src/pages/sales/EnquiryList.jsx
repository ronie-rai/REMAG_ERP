import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Select,
  MenuItem,
  FormControl,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Collapse,
  Grid,
} from '@mui/material'
import { Delete as DeleteIcon, Edit as EditIcon, RequestQuote as RequestQuoteIcon } from '@mui/icons-material'
import { salesAPI } from '../../services/api'
import { formatDate, formatDateTime } from '../../utils/dateFormat'
import { format } from 'date-fns'
import { authStorage } from '../../services/api'
import { getComparator, stableSort } from '../../utils/tableSort'

const statusOptions = [
  'Update Status',
  'Quoted',
  'Enquiry Cancelled',
  'No Update',
  'Evaluated',
  'Technical Evaluation',
  'Technical Qualified',
  'Disqualified',
  'Financial Evaluation',
  'RA Invited',
  'RA Not Invited',
  'Representation Clarification Pending',
  'L1',
  'Not L1',
  'Approval Pending',
  'W/O Received'
]

const statusUpdateOptions = ['Quoted', 'Enquiry Cancelled']

const canSelectStatus = (enquiry, nextStatus) => {
  const status = String(enquiry?.status || '')
  const allowAll = status === 'Quoted' || status === 'Enquiry Cancelled' || Number(enquiry?.has_submitted_quotation) === 1
  if (allowAll) return true
  if (nextStatus === 'Update Status') return false
  return statusUpdateOptions.includes(nextStatus)
}

const getStatusUpdateValue = (enquiry) => {
  const status = String(enquiry?.status || '')
  return status || 'Update Status'
}

function EnquiryList() {
  const navigate = useNavigate()
  const [enquiries, setEnquiries] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [expanded, setExpanded] = useState(() => new Set())
  const [timelineByEnquiry, setTimelineByEnquiry] = useState({})
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, enquiry: null })
  const [quoteDialog, setQuoteDialog] = useState({ open: false, enquiryId: null, value: '', applyStatus: false })

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('enquiry_no')

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

  const toggleExpand = (enquiryId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(enquiryId)) next.delete(enquiryId)
      else next.add(enquiryId)
      return next
    })
  }

  const loadTimeline = async (enquiryId) => {
    try {
      const res = await salesAPI.getEnquiryTimeline(enquiryId)
      const timeline = Array.isArray(res.data?.timeline) ? res.data.timeline : []
      setTimelineByEnquiry((prev) => ({ ...prev, [enquiryId]: timeline }))
    } catch (error) {
      console.error('Error fetching enquiry timeline:', error)
      setTimelineByEnquiry((prev) => ({ ...prev, [enquiryId]: [] }))
    }
  }

  const columns = useMemo(
    () => [
      { id: 'enquiry_no', label: 'Enquiry No', getValue: (e) => e.enquiry_no },
      { id: 'customer_name', label: 'Customer Name', getValue: (e) => e.customer_name },
      { id: 'input_channel', label: 'Input Channel', getValue: (e) => e.input_channel },
      { id: 'particulars', label: 'Particulars', getValue: (e) => e.particulars },
      { id: 'due_date', label: 'Due Date', getValue: (e) => e.due_date },
      { id: 'status', label: 'Status', getValue: (e) => e.status },
      { id: 'quoted_value', label: 'Quoted Value', getValue: (e) => e.quoted_value },
      {
        id: 'wo_status',
        label: 'W/O Status',
        getValue: (e) => {
          const related = (workOrders || []).filter((wo) => wo.enquiry_id === e.id)
          if (!related.length) return ''
          const last = related
            .slice()
            .sort((a, b) => {
              const da = Date.parse(a?.created_at || a?.wo_date || '')
              const db = Date.parse(b?.created_at || b?.wo_date || '')
              return (Number.isFinite(db) ? db : 0) - (Number.isFinite(da) ? da : 0)
            })[0]
          return last?.wo_number || 'Work Order'
        },
      },
      { id: 'status_update', label: 'Status Update', sortable: false },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    [workOrders]
  )

  const sortedEnquiries = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return enquiries
    return stableSort(enquiries, getComparator(order, col.getValue))
  }, [columns, enquiries, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  useEffect(() => {
    const ids = Array.from(expanded)
    ids.forEach((id) => {
      if (timelineByEnquiry[id] === undefined) {
        loadTimeline(id)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const canCreate = can('sales', 'create')
  const canEdit = can('sales', 'edit')
  const canDelete = can('sales', 'delete')

  const openQuoteDialog = (enquiryId, currentValue, applyStatus) => {
    setQuoteDialog({
      open: true,
      enquiryId,
      value: currentValue !== null && currentValue !== undefined ? String(currentValue) : '',
      applyStatus,
    })
  }

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const response = await salesAPI.getEnquiries()
        setEnquiries(response.data)
      } catch (error) {
        console.error('Error fetching enquiries:', error)
        const message = error?.response?.data?.error || error?.message || 'Error fetching enquiries'
        setNotification({ open: true, message, severity: 'error' })
      }
    }

    const fetchWorkOrders = async () => {
      try {
        const res = await salesAPI.getWorkOrders()
        setWorkOrders(res.data || [])
      } catch (error) {
        console.error('Error fetching work orders:', error)
        const message = error?.response?.data?.error || error?.message || 'Error fetching work orders'
        setNotification({ open: true, message, severity: 'error' })
      }
    }

    fetchEnquiries()
    fetchWorkOrders()
  }, [])

  const getWorkOrdersForEnquiry = (enquiryId) => {
    return (workOrders || []).filter((wo) => wo.enquiry_id === enquiryId)
  }

  const formatWOReceivedDate = (wo) => {
    const d = wo?.created_at || wo?.wo_date
    if (!d) return '-'
    try {
      return formatDate(d)
    } catch (e) {
      return '-'
    }
  }

  const handleQuoteSave = async () => {
    try {
      if (!canEdit) {
        setNotification({ open: true, message: 'Forbidden', severity: 'error' })
        return
      }
      const vRaw = quoteDialog.value
      const v = vRaw === '' || vRaw === null || vRaw === undefined ? NaN : Number(vRaw)
      if (!Number.isFinite(v) || v < 0) {
        setNotification({ open: true, message: 'Enter a valid quoted value (>= 0)', severity: 'error' })
        return
      }

      const enquiryId = quoteDialog.enquiryId
      if (quoteDialog.applyStatus) {
        await salesAPI.updateEnquiryStatus(enquiryId, { status: 'Quoted', quoted_value: v })
      } else {
        await salesAPI.updateEnquiryQuotedValue(enquiryId, { quoted_value: v })
      }

      setEnquiries((prev) =>
        prev.map((enquiry) =>
          enquiry.id === enquiryId
            ? {
                ...enquiry,
                quoted_value: v,
                ...(quoteDialog.applyStatus ? { status: 'Quoted' } : {}),
              }
            : enquiry
        )
      )

      setNotification({ open: true, message: 'Quoted value saved successfully', severity: 'success' })
      setQuoteDialog({ open: false, enquiryId: null, value: '', applyStatus: false })
    } catch (error) {
      console.error('Error saving quoted value:', error)
      const message = error?.response?.data?.error || error?.message || 'Error saving quoted value'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleStatusChange = async (enquiryId, newStatus) => {
    try {
      if (!canEdit) {
        setNotification({ open: true, message: 'Forbidden', severity: 'error' })
        return
      }

      if (newStatus === '') {
        return
      }

      if (newStatus === 'Update Status') {
        return
      }
      if (newStatus === 'Quoted') {
        const current = enquiries.find((e) => e.id === enquiryId)?.quoted_value
        openQuoteDialog(enquiryId, current, true)
        return
      }
      await salesAPI.updateEnquiryStatus(enquiryId, { status: newStatus })
      
      // Update local state
      setEnquiries(prev => 
        prev.map(enquiry => 
          enquiry.id === enquiryId 
            ? { ...enquiry, status: newStatus }
            : enquiry
        )
      )

      // If status is 'W/O Received', navigate to work order form
      if (newStatus === 'W/O Received') {
        navigate(`/sales/work-orders/new?enquiry_id=${enquiryId}`)
      }
    } catch (error) {
      console.error('Error updating enquiry status:', error)
      const message = error?.response?.data?.error || error?.message || 'Error updating enquiry status'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleDeleteClick = (enquiry) => {
    if (!canDelete) {
      setNotification({ open: true, message: 'Forbidden', severity: 'error' })
      return
    }
    setDeleteDialog({ open: true, enquiry })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.enquiry) return
    try {
      await salesAPI.deleteEnquiry(deleteDialog.enquiry.id)
      setEnquiries((prev) => prev.filter((e) => e.id !== deleteDialog.enquiry.id))
      setNotification({ open: true, message: 'Enquiry deleted successfully', severity: 'success' })
    } catch (error) {
      console.error('Error deleting enquiry:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to delete enquiry'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setDeleteDialog({ open: false, enquiry: null })
    }
  }

  const handleCloseNotification = () => setNotification((p) => ({ ...p, open: false }))

  const getStatusColor = (status) => {
    switch (status) {
      case 'W/O Received':
        return 'success'
      case 'L1':
        return 'primary'
      case 'Technical Qualified':
        return 'info'
      case 'Disqualified':
        return 'error'
      case 'Approval Pending':
        return 'warning'
      default:
        return 'default'
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
            Enquiries
          </Typography>
          {canCreate ? (
            <Button
              variant="contained"
              onClick={() => navigate('/sales/enquiries/new')}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                },
              }}
            >
              New Enquiry
            </Button>
          ) : null}
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
            {sortedEnquiries.map((enquiry) => {
              const isExpanded = expanded.has(enquiry.id)
              return (
              <React.Fragment key={enquiry.id}>
              <TableRow hover>
                <TableCell>
                  <Button
                    variant="text"
                    onClick={() => toggleExpand(enquiry.id)}
                    sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
                  >
                    {enquiry.enquiry_no}
                  </Button>
                </TableCell>
                <TableCell>{enquiry.customer_name}</TableCell>
                <TableCell>{enquiry.input_channel}</TableCell>
                <TableCell>{enquiry.particulars}</TableCell>
                <TableCell>
                  {formatDate(enquiry.due_date)}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={enquiry.status} 
                    color={getStatusColor(enquiry.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>
                      {enquiry.quoted_value !== null && enquiry.quoted_value !== undefined && enquiry.quoted_value !== ''
                        ? `₹ ${Number(enquiry.quoted_value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                        : '-'}
                    </span>
                    <Tooltip title="Edit quoted value">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => openQuoteDialog(enquiry.id, enquiry.quoted_value, false)}
                          disabled={!canEdit || enquiry.quoted_value === null || enquiry.quoted_value === undefined || enquiry.quoted_value === ''}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  {(() => {
                    const related = getWorkOrdersForEnquiry(enquiry.id)
                    if (!related.length) return '-'
                    return related.map((wo) => (
                      <div key={wo.id}>
                        {`${wo.wo_number || 'Work Order'} - ${formatWOReceivedDate(wo)}`}
                      </div>
                    ))
                  })()}
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                      value={getStatusUpdateValue(enquiry)}
                      onChange={(e) => handleStatusChange(enquiry.id, e.target.value)}
                      displayEmpty
                      disabled={!canEdit}
                    >
                      {statusOptions.map((option) => {
                        const locked = !canSelectStatus(enquiry, option)
                        return (
                          <MenuItem
                            key={option}
                            value={option}
                            disabled={locked}
                            sx={
                              locked
                                ? {
                                  opacity: 0.45,
                                  filter: 'grayscale(1)',
                                }
                                : undefined
                            }
                          >
                            {option}
                          </MenuItem>
                        )
                      })}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Tooltip title="Edit">
                      <IconButton onClick={() => navigate(`/sales/enquiries/${enquiry.id}/edit`)} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}

                  <Tooltip title="Create Quotation">
                    <span>
                      <IconButton
                        onClick={() => navigate(`/sales/quotations/new?enquiry_id=${enquiry.id}`)}
                        size="small"
                        disabled={!canEdit}
                        color="primary"
                      >
                        <RequestQuoteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {canDelete ? (
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDeleteClick(enquiry)} size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell colSpan={10} sx={{ py: 0 }}>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Enquiry No</Typography>
                          <Typography variant="body2">{enquiry.enquiry_no || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Customer Name</Typography>
                          <Typography variant="body2">{enquiry.customer_name || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Contact Number</Typography>
                          <Typography variant="body2">{enquiry.contact_number || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Due Date</Typography>
                          <Typography variant="body2">{formatDate(enquiry.due_date)}</Typography>
                        </Grid>

                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Job Scope</Typography>
                          <Typography variant="body2">{enquiry.job_scope || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Reference</Typography>
                          <Typography variant="body2">{enquiry.reference || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Website Link</Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{enquiry.website_link || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Status</Typography>
                          <Typography variant="body2">{enquiry.status || '-'}</Typography>
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Particulars</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{enquiry.particulars || '-'}</Typography>
                        </Grid>

                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Work Orders</Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => navigate(`/sales/work-orders?enquiry_id=${enquiry.id}`)}
                              >
                                View Work Orders
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => navigate(`/sales/quotations/new?enquiry_id=${enquiry.id}`)}
                                disabled={!canEdit}
                              >
                                Quotation
                              </Button>
                            </Box>
                          </Box>
                          {(() => {
                            const related = getWorkOrdersForEnquiry(enquiry.id)
                            if (!related.length) {
                              return <Typography variant="body2">-</Typography>
                            }
                            return (
                              <Box sx={{ mt: 1, display: 'grid', gap: 0.75 }}>
                                {related.map((wo) => (
                                  <Paper
                                    key={wo.id}
                                    variant="outlined"
                                    sx={{
                                      p: 1,
                                      borderRadius: 2,
                                      background: 'rgba(102, 126, 234, 0.04)',
                                      borderColor: 'rgba(102, 126, 234, 0.25)',
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                        {wo.wo_number || 'Work Order'}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                        Received: {formatWOReceivedDate(wo)}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        WO Date: {formatDate(wo.wo_date)}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        Value: {wo.wo_value ?? '-'}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        Status: {wo.status || '-'}
                                      </Typography>
                                      <Button
                                        size="small"
                                        onClick={() => navigate(`/sales/work-orders/${wo.id}/edit`)}
                                        disabled={!canEdit}
                                        sx={{ ml: 'auto' }}
                                      >
                                        Open
                                      </Button>
                                    </Box>
                                  </Paper>
                                ))}
                              </Box>
                            )
                          })()}
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Timeline</Typography>
                          <Paper
                            variant="outlined"
                            sx={{
                              mt: 1,
                              borderRadius: 2,
                              background: 'rgba(102, 126, 234, 0.03)',
                              borderColor: 'rgba(102, 126, 234, 0.2)',
                            }}
                          >
                            <List dense disablePadding>
                              {(timelineByEnquiry[enquiry.id] || []).length ? (
                                (timelineByEnquiry[enquiry.id] || []).map((ev, idx) => {
                                  const when = formatDateTime(ev?.created_at_iso)
                                  const who = ev?.username || 'System'
                                  return (
                                    <React.Fragment key={ev.id || idx}>
                                      <ListItem sx={{ px: 1.5, py: 0.75 }}>
                                        <ListItemText
                                          primary={ev?.message || '-'}
                                          secondary={`${when} · ${who}`}
                                        />
                                      </ListItem>
                                      {idx < (timelineByEnquiry[enquiry.id] || []).length - 1 ? <Divider component="li" /> : null}
                                    </React.Fragment>
                                  )
                                })
                              ) : (
                                <ListItem sx={{ px: 1.5, py: 0.75 }}>
                                  <ListItemText primary="-" />
                                </ListItem>
                              )}
                            </List>
                          </Paper>
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

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, enquiry: null })}>
        <DialogTitle>Delete Enquiry</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{deleteDialog.enquiry?.enquiry_no || `#${deleteDialog.enquiry?.id}`}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, enquiry: null })}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={quoteDialog.open} onClose={() => setQuoteDialog({ open: false, enquiryId: null, value: '', applyStatus: false })}>
        <DialogTitle>Enter Quoted Value (Rs.)</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Quoted Value (₹)"
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            value={quoteDialog.value}
            onChange={(e) => setQuoteDialog((p) => ({ ...p, value: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuoteDialog({ open: false, enquiryId: null, value: '', applyStatus: false })}>Cancel</Button>
          <Button onClick={handleQuoteSave} variant="contained">Save</Button>
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

export default EnquiryList

