import React, { useEffect, useMemo, useState } from 'react'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material'
import { Refresh as RefreshIcon, Undo as UndoIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { storeAPI } from '../../services/api'
import { getComparator, stableSort } from '../../utils/tableSort'

function IssueList() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('id')

  const [returnDialog, setReturnDialog] = useState({ open: false, issue: null, lines: [], remark: '' })
  const [returnItems, setReturnItems] = useState({})

  const [voidDialog, setVoidDialog] = useState({ open: false, issue: null, remark: '' })

  const fetchIssues = async () => {
    setLoading(true)
    try {
      const res = await storeAPI.getIssues()
      setIssues(res.data || [])
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Error fetching issues'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIssues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns = useMemo(
    () => [
      { id: 'id', label: 'ID', getValue: (it) => it.id },
      { id: 'issued_to', label: 'Issued To', getValue: (it) => it.issued_to },
      { id: 'issue_date', label: 'Issue Date', getValue: (it) => it.issue_date },
      { id: 'issued_qty', label: 'Issued Qty', getValue: (it) => it.issued_qty },
      { id: 'returned_qty', label: 'Returned Qty', getValue: (it) => it.returned_qty },
      { id: 'outstanding_qty', label: 'Outstanding', getValue: (it) => it.outstanding_qty },
      { id: 'status', label: 'Status', getValue: (it) => it.status || 'Active' },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const sortedIssues = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return issues
    return stableSort(issues, getComparator(order, col.getValue))
  }, [columns, issues, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  const openReturn = async (issue) => {
    try {
      const res = await storeAPI.getIssue(issue.id)
      const lines = Array.isArray(res.data?.lines) ? res.data.lines : []
      setReturnItems({})
      setReturnDialog({ open: true, issue: res.data, lines, remark: '' })
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load issue details'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const closeReturn = () => {
    setReturnDialog({ open: false, issue: null, lines: [], remark: '' })
    setReturnItems({})
  }

  const submitReturn = async () => {
    if (!returnDialog.issue) return
    const items = (returnDialog.lines || [])
      .map((l) => ({ sku_id: l.sku_id, qty: Number(returnItems[l.sku_id]) }))
      .filter((x) => Number.isFinite(x.qty) && x.qty > 0)

    if (items.length === 0) {
      setNotification({ open: true, message: 'Enter return qty for at least 1 SKU', severity: 'error' })
      return
    }

    try {
      await storeAPI.returnIssue(returnDialog.issue.id, {
        return_date: new Date().toISOString().slice(0, 10),
        remarks: returnDialog.remark,
        items,
      })
      setNotification({ open: true, message: 'Returned successfully', severity: 'success' })
      closeReturn()
      await fetchIssues()
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Return failed'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const openVoid = (issue) => {
    setVoidDialog({ open: true, issue, remark: '' })
  }

  const closeVoid = () => setVoidDialog({ open: false, issue: null, remark: '' })

  const submitVoid = async () => {
    if (!voidDialog.issue) return
    try {
      await storeAPI.voidIssue(voidDialog.issue.id, {
        void_date: new Date().toISOString().slice(0, 10),
        remarks: voidDialog.remark,
      })
      setNotification({ open: true, message: 'Issue voided and stock adjusted', severity: 'success' })
      closeVoid()
      await fetchIssues()
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Void failed'
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
            Issues
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchIssues} disabled={loading}>
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
                <TableCell key={c.id} align={c.id.includes('_qty') ? 'right' : undefined}>
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
            {sortedIssues.map((it) => (
              <TableRow key={it.id} hover>
                <TableCell>{it.id}</TableCell>
                <TableCell>{it.issued_to}</TableCell>
                <TableCell>{it.issue_date ? String(it.issue_date).slice(0, 10) : '-'}</TableCell>
                <TableCell align="right">{it.issued_qty ?? 0}</TableCell>
                <TableCell align="right">{it.returned_qty ?? 0}</TableCell>
                <TableCell align="right">{it.outstanding_qty ?? 0}</TableCell>
                <TableCell>{it.status || 'Active'}</TableCell>
                <TableCell>
                  <Tooltip title="Return Unused">
                    <span>
                      <IconButton onClick={() => openReturn(it)} size="small" disabled={(Number(it.outstanding_qty) || 0) <= 0}>
                        <UndoIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Void Issue (return all outstanding)">
                    <span>
                      <IconButton onClick={() => openVoid(it)} size="small" color="error" disabled={(Number(it.outstanding_qty) || 0) <= 0}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {issues.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No issues found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={returnDialog.open} onClose={closeReturn} maxWidth="md" fullWidth>
        <DialogTitle>Return to Store (Issue #{returnDialog.issue?.id})</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {(returnDialog.lines || []).map((l) => (
              <React.Fragment key={l.sku_id}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SKU"
                    value={`${l.sku_code || ''} - ${l.item_name || ''}`}
                    InputProps={{ readOnly: true }}
                    size="small"
                    margin="dense"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Outstanding"
                    value={l.outstanding_qty ?? 0}
                    InputProps={{ readOnly: true }}
                    size="small"
                    margin="dense"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Return Qty"
                    type="number"
                    value={returnItems[l.sku_id] ?? ''}
                    onChange={(e) =>
                      setReturnItems((p) => ({
                        ...p,
                        [l.sku_id]: e.target.value,
                      }))
                    }
                    inputProps={{ min: 0, max: Number(l.outstanding_qty) || 0 }}
                    size="small"
                    margin="dense"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </React.Fragment>
            ))}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                value={returnDialog.remark}
                onChange={(e) => setReturnDialog((p) => ({ ...p, remark: e.target.value }))}
                size="small"
                margin="dense"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReturn}>Cancel</Button>
          <Button variant="contained" onClick={submitReturn}>
            Return
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={voidDialog.open} onClose={closeVoid} maxWidth="sm" fullWidth>
        <DialogTitle>Void Issue #{voidDialog.issue?.id}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will return all outstanding qty back to store stock.
          </Typography>
          <TextField
            fullWidth
            label="Remarks"
            value={voidDialog.remark}
            onChange={(e) => setVoidDialog((p) => ({ ...p, remark: e.target.value }))}
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeVoid}>Cancel</Button>
          <Button variant="contained" color="error" onClick={submitVoid}>
            Void
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

export default IssueList
