import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { procurementAPI } from '../../services/api'
import SearchableSelect from '../../components/SearchableSelect'

function PurchaseOrderEditForm() {
  const navigate = useNavigate()
  const { id } = useParams()

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
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
  }

  const load = async () => {
    setLoading(true)
    try {
      const [vRes, poRes] = await Promise.all([procurementAPI.getVendors(), procurementAPI.getPurchaseOrder(id)])
      setVendors(vRes.data || [])

      const po = poRes.data || {}
      setFormData({
        vendor_id: po.vendor_id ?? '',
        po_date: po.po_date ? String(po.po_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        lead_time_days: po.lead_time_days ?? 0,
        advance_payment: po.advance_payment ?? 0,
      })
      setItems((po.items || []).map((it) => ({ ...it, _removed: false })))
    } catch (error) {
      console.error('Error loading PO:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to load Purchase Order'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const updateItem = (itemId, key, value) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, [key]: value } : it))
    )
  }

  const removeItem = (itemId) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, _removed: true } : it)))
  }

  const totalValue = useMemo(() => {
    return items
      .filter((it) => !it._removed)
      .reduce((sum, it) => {
        const qty = Number(it.quantity) || 0
        const rate = Number(it.unit_price) || 0
        return sum + qty * rate
      }, 0)
  }, [items])

  const submit = async (e) => {
    e.preventDefault()

    if (!formData.vendor_id) {
      setNotification({ open: true, message: 'Please select a vendor', severity: 'error' })
      return
    }

    const payloadItems = items
      .filter((it) => !it._removed)
      .map((it) => ({
        item_name: it.item_name,
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
        sku_id: it.sku_id ?? null,
        indent_id: it.indent_id ?? null,
      }))
      .filter((it) => it.item_name && it.quantity > 0)

    if (payloadItems.length === 0) {
      setNotification({ open: true, message: 'At least one item is required', severity: 'error' })
      return
    }

    setLoading(true)
    try {
      await procurementAPI.updatePurchaseOrder(id, {
        vendor_id: Number(formData.vendor_id),
        po_date: formData.po_date,
        lead_time_days: Number(formData.lead_time_days) || 0,
        advance_payment: Number(formData.advance_payment) || 0,
        items: payloadItems,
      })

      setNotification({ open: true, message: 'Purchase Order updated successfully', severity: 'success' })
      setTimeout(() => navigate('/procurement/purchase-orders'), 700)
    } catch (error) {
      console.error('Error updating PO:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to update Purchase Order'
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
            Edit Purchase Order
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
        <form onSubmit={submit}>
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
                PO Items
              </Typography>
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>Item Name</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.filter((it) => !it._removed).map((it) => {
                      const qty = Number(it.quantity) || 0
                      const rate = Number(it.unit_price) || 0
                      const total = qty * rate
                      return (
                        <TableRow key={it.id} hover>
                          <TableCell padding="checkbox">
                            <Tooltip title="Remove">
                              <span>
                                <IconButton onClick={() => removeItem(it.id)} size="small" disabled={loading}>
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{it.item_name}</TableCell>
                          <TableCell align="right">
                            <TextField
                              value={it.quantity ?? ''}
                              onChange={(e) => updateItem(it.id, 'quantity', e.target.value)}
                              type="number"
                              size="small"
                              disabled={loading}
                              inputProps={{ style: { textAlign: 'right' }, min: 0 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              value={it.unit_price ?? ''}
                              onChange={(e) => updateItem(it.id, 'unit_price', e.target.value)}
                              type="number"
                              size="small"
                              disabled={loading}
                              inputProps={{ style: { textAlign: 'right' }, min: 0 }}
                            />
                          </TableCell>
                          <TableCell align="right">{total.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })}

                    {items.filter((it) => !it._removed).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No items
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
                    '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
                  }}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

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

export default PurchaseOrderEditForm
