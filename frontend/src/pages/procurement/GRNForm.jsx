import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  Divider,
} from '@mui/material'
import { procurementAPI, storeAPI } from '../../services/api'
import SearchableSelect from '../../components/SearchableSelect'

function GRNForm() {
  const navigate = useNavigate()
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [skus, setSkus] = useState([])
  const [poItems, setPoItems] = useState([])
  const [poSummary, setPoSummary] = useState([])
  const [selectedPO, setSelectedPO] = useState(null)
  const [loading, setLoading] = useState(false)

  const [poId, setPoId] = useState('')
  const [grnDate, setGrnDate] = useState(new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')
  const [items, setItems] = useState([{ sku_id: '', po_qty: '', received_qty: '', pending_qty: '', rate: '' }])

  useEffect(() => {
    setItems([{ sku_id: '', po_qty: '', received_qty: '', pending_qty: '', rate: '' }])
  }, [poId])

  useEffect(() => {
    const load = async () => {
      try {
        const [poRes, skuRes] = await Promise.all([
          procurementAPI.getPurchaseOrders(),
          storeAPI.getSKUs(),
        ])
        setPurchaseOrders(poRes.data || [])
        setSkus(skuRes.data || [])
      } catch (e) {
        console.error('Error loading GRN dependencies:', e)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadPoItems = async () => {
      if (!poId) {
        setPoItems([])
        setPoSummary([])
        setSelectedPO(null)
        return
      }
      try {
        const [res, sumRes] = await Promise.all([
          procurementAPI.getPurchaseOrder(poId),
          procurementAPI.getGRNPOSummary(poId),
        ])
        setSelectedPO(res.data || null)
        const itemsRes = Array.isArray(res.data?.items) ? res.data.items : []
        setPoItems(itemsRes)
        setPoSummary(Array.isArray(sumRes.data) ? sumRes.data : [])
      } catch (e) {
        console.error('Error loading PO items:', e)
        setPoItems([])
        setPoSummary([])
        setSelectedPO(null)
      }
    }

    loadPoItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId])

  const filteredSkus = React.useMemo(() => {
    if (!poId) return skus

    const sum = Array.isArray(poSummary) ? poSummary : []
    const ids = new Set(
      sum
        .map((x) => Number(x?.sku_id))
        .filter((id) => Number.isFinite(id) && id > 0)
    )

    if (ids.size > 0) {
      return (skus || []).filter((s) => ids.has(Number(s?.id)))
    }

    if (!Array.isArray(poItems) || poItems.length === 0) return skus
    const names = new Set(
      poItems
        .map((it) => (it?.item_name ?? '').toString().trim().toLowerCase())
        .filter(Boolean)
    )
    if (names.size === 0) return skus
    return (skus || []).filter((s) => names.has((s?.item_name ?? '').toString().trim().toLowerCase()))
  }, [poId, poItems, poSummary, skus])

  const getSummaryForSku = (skuId) => {
    const id = Number(skuId)
    if (!Number.isFinite(id)) return null
    const src = Array.isArray(poSummary) ? poSummary : []
    return src.find((x) => Number(x?.sku_id) === id) || null
  }

  const allowedSkuIds = React.useMemo(() => {
    if (!poId) return null
    const src = Array.isArray(poSummary) ? poSummary : []
    return new Set(
      src
        .filter((x) => Number.isFinite(Number(x?.sku_id)) && (Number(x?.pending_qty) || 0) > 0)
        .map((x) => Number(x.sku_id))
    )
  }, [poId, poSummary])

  const allowedHasId = (set, id) => {
    const n = Number(id)
    if (!Number.isFinite(n)) return false
    return set.has(n)
  }

  const getSelectableSkusForRow = (rowIdx) => {
    const base = allowedSkuIds
      ? (filteredSkus || []).filter((s) => allowedHasId(allowedSkuIds, s?.id))
      : filteredSkus

    const selectedIds = new Set(
      (items || [])
        .map((x, i) => (i === rowIdx ? null : Number(x?.sku_id)))
        .filter((id) => Number.isFinite(id) && id > 0)
    )

    return (base || []).filter((s) => !selectedIds.has(Number(s?.id)))
  }

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const handleSkuChange = (idx, skuId) => {
    const nextId = Number(skuId)
    if (Number.isFinite(nextId)) {
      const dup = items.findIndex((x, i) => i !== idx && Number(x?.sku_id) === nextId)
      if (dup !== -1) {
        alert('This SKU is already selected in another row')
        return
      }
    }
    const sum = getSummaryForSku(skuId)
    updateItem(idx, {
      sku_id: skuId,
      po_qty: sum?.ordered_qty ?? '',
      pending_qty: sum?.pending_qty ?? '',
      received_qty: '',
      rate: sum?.unit_price ?? '',
    })
  }

  const handleReceivedQtyChange = (idx, value) => {
    const raw = value === '' ? '' : Number(value)
    const pend = Number(items[idx]?.pending_qty)
    if (value === '') {
      updateItem(idx, { received_qty: '' })
      return
    }
    if (!Number.isFinite(raw)) {
      updateItem(idx, { received_qty: value })
      return
    }
    if (Number.isFinite(pend) && raw > pend) {
      updateItem(idx, { received_qty: pend })
      return
    }
    updateItem(idx, { received_qty: value })
  }

  const addLine = () => {
    setItems((prev) => [...prev, { sku_id: '', po_qty: '', received_qty: '', pending_qty: '', rate: '' }])
  }

  const removeLine = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!poId) {
      alert('PO is required')
      return
    }

    const receivedBySku = new Map()
    for (const it of items) {
      const skuId = Number(it.sku_id)
      const recv = Number(it.received_qty)
      if (!Number.isFinite(skuId) || skuId <= 0) continue
      if (!Number.isFinite(recv) || recv <= 0) continue
      receivedBySku.set(skuId, (receivedBySku.get(skuId) || 0) + recv)
    }

    const over = Array.from(receivedBySku.entries()).find(([skuId, totalRecv]) => {
      const sum = getSummaryForSku(skuId)
      const pend = Number(sum?.pending_qty)
      if (!Number.isFinite(pend)) return false
      return totalRecv > pend
    })

    if (over) {
      alert('Received Qty cannot be greater than Pending Qty')
      return
    }

    const invalid = items.find((it) => {
      const recv = Number(it.received_qty)
      const pend = Number(it.pending_qty)
      if (!Number.isFinite(recv) || recv <= 0) return false
      if (!Number.isFinite(pend)) return false
      return recv > pend
    })

    if (invalid) {
      alert('Received Qty cannot be greater than Pending Qty')
      return
    }

    const normalizedItems = items
      .map((it) => ({
        sku_id: Number(it.sku_id),
        quantity: Number(it.received_qty),
        rate: it.rate === '' ? null : Number(it.rate),
      }))
      .filter((it) => Number.isFinite(it.sku_id) && Number.isFinite(it.quantity) && it.quantity > 0)

    if (normalizedItems.length === 0) {
      alert('Please add at least 1 item')
      return
    }

    setLoading(true)
    try {
      await procurementAPI.createGRN({
        po_id: Number(poId),
        grn_date: grnDate,
        remarks,
        items: normalizedItems,
      })
      navigate('/procurement/grns')
    } catch (error) {
      console.error('Error creating GRN:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to create GRN'
      alert(message)
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
            New GRN
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/procurement/grns')}>
            Back to GRNs
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
        <form onSubmit={onSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <SearchableSelect
                label="Purchase Order"
                value={poId}
                onChange={(next) => setPoId(next)}
                options={[
                  { label: 'Select', value: '' },
                  ...(purchaseOrders || []).map((po) => ({
                    label: po.po_number || `PO ${po.id}`,
                    value: String(po.id),
                  })),
                ]}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="GRN Date"
                InputLabelProps={{ shrink: true }}
                value={grnDate}
                onChange={(e) => setGrnDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Grid>

            {poId && selectedPO ? (
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 2,
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        PO Number
                      </Typography>
                      <Typography variant="subtitle2">{selectedPO.po_number || `PO ${selectedPO.id}`}</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Vendor
                      </Typography>
                      <Typography variant="subtitle2">{selectedPO.vendor_name || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        PO Date
                      </Typography>
                      <Typography variant="subtitle2">{selectedPO.po_date || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Items
                      </Typography>
                      <Typography variant="subtitle2">{Array.isArray(selectedPO.items) ? selectedPO.items.length : 0}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ) : null}

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Items</Typography>
              </Divider>
            </Grid>

            {items.map((it, idx) => (
              <React.Fragment key={idx}>
                <Grid item xs={12} md={5}>
                  <SearchableSelect
                    label="SKU"
                    value={it.sku_id}
                    onChange={(next) => handleSkuChange(idx, next)}
                    options={[
                      { label: 'Select', value: '' },
                      ...getSelectableSkusForRow(idx).map((s) => ({
                        label: `${s.sku_code} - ${s.item_name}`,
                        value: s.id,
                      })),
                    ]}
                    disabled={loading || !poId}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="PO Qty"
                    value={it.po_qty}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Pending Qty"
                    value={it.pending_qty}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Received Qty"
                    value={it.received_qty}
                    onChange={(e) => handleReceivedQtyChange(idx, e.target.value)}
                    inputProps={{ min: 0, max: it.pending_qty === '' ? undefined : Number(it.pending_qty) }}
                    error={Boolean(it.received_qty) && Number(it.received_qty) > Number(it.pending_qty)}
                    helperText={
                      Boolean(it.received_qty) && Number(it.received_qty) > Number(it.pending_qty)
                        ? 'Received Qty cannot be more than Pending Qty'
                        : ' '
                    }
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    onClick={() => removeLine(idx)}
                    disabled={items.length === 1 || loading}
                  >
                    Remove
                  </Button>
                </Grid>
              </React.Fragment>
            ))}

            <Grid item xs={12}>
              <Button variant="outlined" onClick={addLine} disabled={!poId || loading}>
                Add Item
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/procurement/grns')}>
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
                  Create GRN
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  )
}

export default GRNForm
