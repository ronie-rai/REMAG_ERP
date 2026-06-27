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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Collapse,
} from '@mui/material'
import { procurementAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'
import { format } from 'date-fns'
import { Download as DownloadIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import { getComparator, stableSort } from '../../utils/tableSort'

function PurchaseOrderList() {
  const navigate = useNavigate()
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, po: null })
  const [expanded, setExpanded] = useState(() => new Set())
  const [poDetails, setPoDetails] = useState({})
  const [grnDialog, setGrnDialog] = useState({ open: false, po: null, grns: [], loading: false })
  const [expandedGrns, setExpandedGrns] = useState(() => new Set())

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('po_number')

  const columns = useMemo(
    () => [
      { id: 'po_number', label: 'PO Number', getValue: (po) => po.po_number },
      { id: 'po_date', label: 'PO Date', getValue: (po) => po.po_date },
      { id: 'po_value', label: 'PO Value', getValue: (po) => po.po_value },
      { id: 'expected_delivery_date', label: 'Expected Delivery', getValue: (po) => po.expected_delivery_date },
      { id: 'status', label: 'Status', getValue: (po) => po.receipt_status || po.status },
      { id: 'grn', label: 'GRN', sortable: false },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const sortedPurchaseOrders = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return purchaseOrders
    return stableSort(purchaseOrders, getComparator(order, col.getValue))
  }, [columns, order, orderBy, purchaseOrders])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  const fetchPOs = async () => {
    try {
      const response = await procurementAPI.getPurchaseOrders()
      setPurchaseOrders(response.data)
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      const message = error?.response?.data?.error || error?.message || 'Error fetching purchase orders'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleDownload = async (po) => {
    try {
      const res = await procurementAPI.exportPurchaseOrderPDF(po.id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `purchase_order_${po.po_number || po.id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PO PDF:', error)
    }
  }

  useEffect(() => {
    fetchPOs()
  }, [])

  const openDelete = (po) => setDeleteDialog({ open: true, po })
  const closeDelete = () => setDeleteDialog({ open: false, po: null })

  const toggleExpand = async (po) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(po.id)) next.delete(po.id)
      else next.add(po.id)
      return next
    })

    if (!poDetails[po.id]) {
      try {
        const res = await procurementAPI.getPurchaseOrder(po.id)
        setPoDetails((p) => ({ ...p, [po.id]: res.data }))
      } catch (error) {
        console.error('Error fetching PO details:', error)
        const message = error?.response?.data?.error || error?.message || 'Failed to fetch PO details'
        setNotification({ open: true, message, severity: 'error' })
      }
    }
  }

  const openGrns = async (po) => {
    setGrnDialog({ open: true, po, grns: [], loading: true })
    try {
      const res = await procurementAPI.getGRNsByPO(po.id)
      setGrnDialog({ open: true, po, grns: res.data || [], loading: false })
    } catch (error) {
      console.error('Error fetching GRNs for PO:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to fetch GRNs'
      setNotification({ open: true, message, severity: 'error' })
      setGrnDialog({ open: true, po, grns: [], loading: false })
    }
  }

  const closeGrns = () => setGrnDialog({ open: false, po: null, grns: [], loading: false })

  const toggleExpandGrn = (grnId) => {
    setExpandedGrns((prev) => {
      const next = new Set(prev)
      if (next.has(grnId)) next.delete(grnId)
      else next.add(grnId)
      return next
    })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.po) return
    try {
      await procurementAPI.deletePurchaseOrder(deleteDialog.po.id)
      setNotification({ open: true, message: 'Purchase Order deleted successfully', severity: 'success' })
      closeDelete()
      await fetchPOs()
    } catch (error) {
      console.error('Error deleting PO:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to delete Purchase Order'
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
            Purchase Orders
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/procurement/purchase-orders/new-from-indents')}
            sx={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
            }}
          >
            New PO
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
            {sortedPurchaseOrders.map((po) => {
              const isExpanded = expanded.has(po.id)
              const details = poDetails[po.id]
              const items = details?.items || []
              return (
                <React.Fragment key={po.id}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="text"
                        onClick={() => toggleExpand(po)}
                        sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
                      >
                        {po.po_number}
                      </Button>
                    </TableCell>
                    <TableCell>{formatDate(po.po_date)}</TableCell>
                    <TableCell>{po.po_value}</TableCell>
                    <TableCell>{formatDate(po.expected_delivery_date)}</TableCell>
                    <TableCell>{po.receipt_status || po.status}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => openGrns(po)}
                        disabled={!po.has_grn}
                      >
                        GRN
                      </Button>
                    </TableCell>
                    <TableCell>
                      {!po.has_grn && (
                        <Tooltip title="Edit">
                          <IconButton onClick={() => navigate(`/procurement/purchase-orders/${po.id}/edit`)} size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Download PDF">
                        <IconButton onClick={() => handleDownload(po)} size="small">
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!po.has_grn && (
                        <Tooltip title="Delete">
                          <IconButton onClick={() => openDelete(po)} size="small" color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 0 }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            PO Details
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Vendor: {po.vendor_name || po.vendor_id || '-'}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            Ordered Qty: {po.total_ordered_qty ?? '-'} | Received Qty: {po.total_received_qty ?? '-'}
                          </Typography>

                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Item</TableCell>
                                <TableCell align="right">Qty</TableCell>
                                <TableCell align="right">Unit Price</TableCell>
                                <TableCell align="right">Total</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {items.map((it) => (
                                <TableRow key={it.id}>
                                  <TableCell>{it.item_name}</TableCell>
                                  <TableCell align="right">{it.quantity}</TableCell>
                                  <TableCell align="right">{it.unit_price}</TableCell>
                                  <TableCell align="right">{it.total_value}</TableCell>
                                </TableRow>
                              ))}
                              {items.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={4} align="center">
                                    Loading...
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
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

      <Dialog open={grnDialog.open} onClose={closeGrns} maxWidth="sm" fullWidth>
        <DialogTitle>GRNs - {grnDialog.po?.po_number || ''}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>GRN Number</TableCell>
                <TableCell>GRN Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Items</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(grnDialog.grns || []).map((g) => {
                let items = []
                try {
                  items = g.items ? JSON.parse(g.items) : []
                } catch (e) {
                  items = []
                }
                const isExpanded = expandedGrns.has(g.id)
                return (
                  <React.Fragment key={g.id}>
                    <TableRow hover>
                      <TableCell>
                        <Button
                          variant="text"
                          onClick={() => toggleExpandGrn(g.id)}
                          sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
                        >
                          {g.grn_number}
                        </Button>
                      </TableCell>
                      <TableCell>{formatDate(g.grn_date)}</TableCell>
                      <TableCell>{g.status || '-'}</TableCell>
                      <TableCell align="right">{items.length}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 1.5 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>SKU</TableCell>
                                  <TableCell>Item</TableCell>
                                  <TableCell align="right">Received Qty</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {items.map((it, idx) => (
                                  <TableRow key={`${g.id}-${it.sku_id || idx}`}>
                                    <TableCell>{it.sku_code || it.sku_id || '-'}</TableCell>
                                    <TableCell>{it.item_name || '-'}</TableCell>
                                    <TableCell align="right">{it.quantity ?? '-'}</TableCell>
                                  </TableRow>
                                ))}
                                {items.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={3} align="center">
                                      No items found
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                )
              })}
              {!grnDialog.loading && (grnDialog.grns || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No GRNs found
                  </TableCell>
                </TableRow>
              )}
              {grnDialog.loading && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeGrns}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={closeDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Purchase Order</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          Are you sure you want to delete PO <b>{deleteDialog.po?.po_number}</b>?
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
        <Alert
          severity={notification.severity}
          onClose={() => setNotification((p) => ({ ...p, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default PurchaseOrderList

