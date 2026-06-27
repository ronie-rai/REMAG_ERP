import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Snackbar,
  Alert,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { procurementAPI, storeAPI } from '../../services/api'
import SearchableSelect from '../../components/SearchableSelect'

function PurchaseOrderFromIndentsForm() {
  const navigate = useNavigate()

  const initialForm = useMemo(
    () => ({
      vendor_id: '',
      po_date: new Date().toISOString().slice(0, 10),
      lead_time_days: 0,
      advance_payment: 0,
    }),
    []
  )

  const [formData, setFormData] = useState(initialForm)
  const [vendors, setVendors] = useState([])
  const [approvedIndents, setApprovedIndents] = useState([])
  const [selectedIndentIds, setSelectedIndentIds] = useState([])
  const [skuAgg, setSkuAgg] = useState([])
  const [prices, setPrices] = useState({})
  const [poQty, setPoQty] = useState({})
  const [removedSkus, setRemovedSkus] = useState(() => new Set())
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    const load = async () => {
      try {
        const [vRes, iRes] = await Promise.all([
          procurementAPI.getVendors(),
          procurementAPI.getIndents({ status: 'Approved' }),
        ])
        setVendors(vRes.data || [])
        setApprovedIndents(iRes.data || [])
      } catch (error) {
        console.error('Error loading vendors/indents:', error)
        const message = error?.response?.data?.error || error?.message || 'Failed to load data'
        setNotification({ open: true, message, severity: 'error' })
      }
    }

    load()
  }, [])

  const handleCloseNotification = () => setNotification((p) => ({ ...p, open: false }))

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
  }

  const toggleIndent = async (indentId) => {
    const next = selectedIndentIds.includes(indentId)
      ? selectedIndentIds.filter((id) => id !== indentId)
      : [...selectedIndentIds, indentId]

    setSelectedIndentIds(next)

    if (next.length === 0) {
      setSkuAgg([])
      setPrices({})
      setPoQty({})
      setRemovedSkus(new Set())
      return
    }

    // Load remaining summary from backend (authoritative)
    try {
      setLoading(true)
      const remainingRes = await procurementAPI.getPOFromIndentsRemaining(next)
      const rows = (remainingRes.data || []).map((r) => ({
        sku_id: r.sku_id,
        sku_code: r.sku_code,
        item_name: r.item_name,
        unit: r.unit,
        indent_qty: Number(r.indent_qty) || 0,
        ordered_qty: Number(r.ordered_qty) || 0,
        remaining_qty: Math.max(0, Number(r.remaining_qty) || 0),
      }))
      setSkuAgg(rows)

      // Prefill price with latest rate from SKU listing
      const skuList = await storeAPI.getSKUs()
      const latestRateMap = new Map((skuList.data || []).map((s) => [s.id, s.latest_rate]))
      const nextPrices = {}
      const nextPoQty = {}
      rows.forEach((r) => {
        nextPrices[r.sku_id] = latestRateMap.get(r.sku_id) ?? ''
        nextPoQty[r.sku_id] = r.remaining_qty
      })
      setPrices(nextPrices)
      setPoQty(nextPoQty)
      setRemovedSkus(new Set())
    } catch (error) {
      console.error('Error aggregating items:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to aggregate indent items'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const updatePrice = (skuId, value) => {
    setPrices((p) => ({ ...p, [skuId]: value }))
  }

  const updatePoQty = (skuId, value) => {
    setPoQty((p) => ({ ...p, [skuId]: value }))
  }

  const removeSku = (skuId) => {
    setRemovedSkus((prev) => {
      const next = new Set(prev)
      next.add(skuId)
      return next
    })
    setPoQty((p) => ({ ...p, [skuId]: 0 }))
  }

  const totalValue = useMemo(() => {
    return skuAgg.reduce((sum, r) => {
      const unitPrice = Number(prices[r.sku_id]) || 0
      const qty = Number(poQty[r.sku_id]) || 0
      return sum + qty * unitPrice
    }, 0)
  }, [skuAgg, prices, poQty])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.vendor_id) {
      setNotification({ open: true, message: 'Please select a vendor', severity: 'error' })
      return
    }

    if (selectedIndentIds.length === 0) {
      setNotification({ open: true, message: 'Select at least one Approved indent', severity: 'error' })
      return
    }

    setLoading(true)
    try {
      const payload = {
        vendor_id: Number(formData.vendor_id),
        indent_ids: selectedIndentIds,
        po_date: formData.po_date,
        lead_time_days: Number(formData.lead_time_days) || 0,
        advance_payment: Number(formData.advance_payment) || 0,
        prices,
        items: skuAgg
          .map((r) => ({ sku_id: r.sku_id, quantity: Number(poQty[r.sku_id]) || 0 }))
          .filter((it) => Number(it.quantity) > 0),
      }

      await procurementAPI.createPurchaseOrderFromIndents(payload)
      setNotification({ open: true, message: 'Purchase Order created successfully', severity: 'success' })
      setTimeout(() => navigate('/procurement/purchase-orders'), 700)
    } catch (error) {
      console.error('Error creating PO:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to create PO'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
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
            New Purchase Order (From Indents)
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/procurement/purchase-orders')}>
            Back to Purchase Orders
          </Button>
        </Box>
      </Paper>

      <Paper
        sx={{
          p: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: 3,
        }}
      >
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <SearchableSelect
                label="Vendor"
                value={formData.vendor_id}
                onChange={(next) => setFormData((p) => ({ ...p, vendor_id: next }))}
                options={(vendors || []).map((v) => ({
                  label: v.vendor_name,
                  value: v.id,
                }))}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="PO Date"
                type="date"
                name="po_date"
                value={formData.po_date}
                onChange={handleChange}
                size="small"
                disabled={loading}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Lead Time (days)"
                type="number"
                name="lead_time_days"
                value={formData.lead_time_days}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Advance Payment"
                type="number"
                name="advance_payment"
                value={formData.advance_payment}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                Select Approved Indents
              </Typography>
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>Indent Number</TableCell>
                      <TableCell>Indent Type</TableCell>
                      <TableCell>Approved At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {approvedIndents.map((i) => (
                      <TableRow key={i.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedIndentIds.includes(i.id)}
                            onChange={() => toggleIndent(i.id)}
                            disabled={loading}
                          />
                        </TableCell>
                        <TableCell>{i.indent_number}</TableCell>
                        <TableCell>{i.indent_type || '-'}</TableCell>
                        <TableCell>{i.approved_at ? new Date(i.approved_at).toLocaleString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                    {approvedIndents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No approved indents available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                PO Items
              </Typography>
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>SKU</TableCell>
                      <TableCell>Item Name</TableCell>
                      <TableCell align="right">Indent Qty</TableCell>
                      <TableCell align="right">Ordered Qty</TableCell>
                      <TableCell align="right">Remaining Qty</TableCell>
                      <TableCell align="right">PO Qty</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {skuAgg.filter((r) => !removedSkus.has(r.sku_id)).map((r) => {
                      const unitPrice = Number(prices[r.sku_id]) || 0
                      const qty = Number(poQty[r.sku_id]) || 0
                      const total = qty * unitPrice
                      return (
                        <TableRow key={r.sku_id} hover>
                          <TableCell padding="checkbox">
                            <Tooltip title="Remove SKU">
                              <span>
                                <IconButton
                                  onClick={() => removeSku(r.sku_id)}
                                  size="small"
                                  disabled={loading}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{r.sku_code || r.sku_id}</TableCell>
                          <TableCell>{r.item_name}</TableCell>
                          <TableCell align="right">{r.indent_qty}</TableCell>
                          <TableCell align="right">{r.ordered_qty}</TableCell>
                          <TableCell align="right">{r.remaining_qty}</TableCell>
                          <TableCell align="right">
                            <TextField
                              value={poQty[r.sku_id] ?? ''}
                              onChange={(e) => {
                                const v = Number(e.target.value)
                                const clamped = Number.isFinite(v) ? Math.min(Math.max(0, v), r.remaining_qty) : 0
                                updatePoQty(r.sku_id, clamped)
                              }}
                              type="number"
                              size="small"
                              disabled={loading || r.remaining_qty <= 0}
                              inputProps={{ style: { textAlign: 'right' }, min: 0, max: r.remaining_qty }}
                            />
                          </TableCell>
                          <TableCell>{r.unit || '-'}</TableCell>
                          <TableCell align="right">
                            <TextField
                              value={prices[r.sku_id] ?? ''}
                              onChange={(e) => updatePrice(r.sku_id, e.target.value)}
                              type="number"
                              size="small"
                              disabled={loading}
                              inputProps={{ style: { textAlign: 'right' } }}
                            />
                          </TableCell>
                          <TableCell align="right">{total.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })}
                    {skuAgg.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} align="center">
                          Select approved indents to see aggregated items
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Total: {totalValue.toFixed(2)}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/procurement/purchase-orders')} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                    },
                  }}
                >
                  {loading ? 'Creating...' : 'Create PO'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

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

export default PurchaseOrderFromIndentsForm
