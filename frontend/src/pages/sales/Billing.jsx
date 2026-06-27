import React, { useEffect, useMemo, useState } from 'react'
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
  TableHead,
  TableRow,
  Snackbar,
  Alert,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { jobEntryAPI, salesAPI } from '../../services/api'
import SearchableSelect from '../../components/SearchableSelect'

function Billing() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [jobEntries, setJobEntries] = useState([])

  const [formData, setFormData] = useState({
    job_entry_ids: [],
    invoice_date: new Date().toISOString().slice(0, 10),

    bill_to_name: '',
    bill_to_address: '',
    bill_to_gstin: '',
    bill_to_state_code: '',

    place_of_work_name: '',
    place_of_work_address: '',
    place_of_work_gstin: '',
    place_of_work_state_code: '',

    loi_no: '',
    gate_pass_no: '',
    delivery_note_no: '',
    delivery_date: '',

    remarks: '',

    items: [
      {
        sl_no: 1,
        description: '',
        quantity: 1,
        unit: 'no',
        sac_code: '',
        rate: '',
        amount: '',
      },
    ],
  })

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const loadJobEntries = async () => {
    try {
      const res = await jobEntryAPI.getJobEntries()
      setJobEntries(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error('Error loading job entries:', e)
      setJobEntries([])
    }
  }

  useEffect(() => {
    loadJobEntries()
  }, [])

  const inferStateCodeFromGstin = (gstin) => {
    if (!gstin) return ''
    const s = String(gstin).trim()
    const m = s.match(/^(\d{2})/)
    return m ? m[1] : ''
  }

  const jobOptions = useMemo(() => {
    return (jobEntries || []).map((je) => ({
      label: `${je.job_number}${je.party_name ? ` - ${je.party_name}` : ''}`,
      value: String(je.id),
      data: je,
    }))
  }, [jobEntries])

  const selectedJobs = useMemo(() => {
    const ids = Array.isArray(formData.job_entry_ids) ? formData.job_entry_ids : []
    const idSet = new Set(ids.map((x) => String(x)))
    return (jobEntries || []).filter((x) => idSet.has(String(x.id)))
  }, [formData.job_entry_ids, jobEntries])

  const selectedPartyName = useMemo(() => {
    const parties = Array.from(new Set(selectedJobs.map((j) => (j?.party_name || '').trim()).filter(Boolean)))
    if (parties.length === 1) return parties[0]
    if (parties.length > 1) return 'Multiple'
    return ''
  }, [selectedJobs])

  const filteredJobOptions = useMemo(() => {
    if (!selectedPartyName || selectedPartyName === 'Multiple') return jobOptions
    return jobOptions.filter((o) => (o?.data?.party_name || '') === selectedPartyName)
  }, [jobOptions, selectedPartyName])

  const handleJobsChange = (nextIds) => {
    const ids = Array.isArray(nextIds) ? nextIds : []
    const idSet = new Set(ids.map((x) => String(x)))
    const jobs = (jobEntries || []).filter((x) => idSet.has(String(x.id)))
    const parties = Array.from(new Set(jobs.map((j) => (j?.party_name || '').trim()).filter(Boolean)))

    if (parties.length > 1) {
      setNotification({ open: true, message: 'Please select Job Numbers from the same client only', severity: 'error' })
      return
    }

    setFormData((p) => ({ ...p, job_entry_ids: ids }))
  }

  const computeTaxSplit = (taxableAmount, billToGstin) => {
    const base = Number.isFinite(Number(taxableAmount)) ? Number(taxableAmount) : 0
    const stateCode = inferStateCodeFromGstin(billToGstin)
    const cgstPercent = stateCode === '22' ? 18 : 9
    const igstPercent = stateCode === '22' ? 0 : 9
    const cgstAmount = Number(((base * cgstPercent) / 100).toFixed(2))
    const igstAmount = Number(((base * igstPercent) / 100).toFixed(2))
    const totalAmount = Number((base + cgstAmount + igstAmount).toFixed(2))
    return {
      stateCode,
      cgstPercent,
      igstPercent,
      cgstAmount,
      igstAmount,
      gstPercent: cgstPercent + igstPercent,
      gstAmount: cgstAmount + igstAmount,
      totalAmount,
    }
  }

  const calcAmount = (qty, rate) => {
    const q = qty === '' || qty === null || qty === undefined ? NaN : Number(qty)
    const r = rate === '' || rate === null || rate === undefined ? NaN : Number(rate)
    if (!Number.isFinite(q) || !Number.isFinite(r)) return ''
    return Number((q * r).toFixed(2))
  }

  const totals = useMemo(() => {
    const items = Array.isArray(formData.items) ? formData.items : []
    const taxable = items.reduce((sum, it) => {
      const a = it?.amount === '' || it?.amount === null || it?.amount === undefined ? NaN : Number(it.amount)
      return sum + (Number.isFinite(a) ? a : 0)
    }, 0)
    const tax = computeTaxSplit(taxable, formData.bill_to_gstin)
    return {
      taxable: Number(taxable.toFixed(2)),
      ...tax,
    }
  }, [formData.bill_to_gstin, formData.items])

  useEffect(() => {
    const code = inferStateCodeFromGstin(formData.bill_to_gstin)
    setFormData((p) => ({
      ...p,
      bill_to_state_code: p.bill_to_state_code ? p.bill_to_state_code : code,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.bill_to_gstin])

  useEffect(() => {
    const code = inferStateCodeFromGstin(formData.place_of_work_gstin)
    setFormData((p) => ({
      ...p,
      place_of_work_state_code: p.place_of_work_state_code ? p.place_of_work_state_code : code,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.place_of_work_gstin])

  useEffect(() => {
    const prefillBillToFromClient = async () => {
      const jobs = selectedJobs || []
      const clientIds = Array.from(new Set(jobs.map((j) => j?.client_id).filter((x) => Number.isFinite(Number(x)))))
      if (clientIds.length !== 1) {
        setFormData((p) => ({
          ...p,
          bill_to_name: p.bill_to_name || selectedPartyName || '',
        }))
        return
      }

      try {
        const res = await salesAPI.getClient(Number(clientIds[0]))
        const c = res.data
        const addrParts = [c?.address, c?.city, c?.state, c?.pincode].map((x) => (x ? String(x).trim() : '')).filter(Boolean)
        const address = addrParts.join(', ')
        const gstin = c?.gst_number ? String(c.gst_number) : ''
        const stateCode = inferStateCodeFromGstin(gstin)

        setFormData((p) => ({
          ...p,
          bill_to_name: p.bill_to_name || c?.client_name || selectedPartyName || '',
          bill_to_address: p.bill_to_address || address,
          bill_to_gstin: p.bill_to_gstin || gstin,
          bill_to_state_code: p.bill_to_state_code || stateCode,
        }))
      } catch (e) {
        console.error('Error pre-filling Bill To from client:', e)
        setFormData((p) => ({
          ...p,
          bill_to_name: p.bill_to_name || selectedPartyName || '',
        }))
      }
    }

    if ((selectedJobs || []).length) prefillBillToFromClient()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartyName, selectedJobs])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (idx, key, value) => {
    setFormData((prev) => {
      const items = Array.isArray(prev.items) ? [...prev.items] : []
      const row = { ...(items[idx] || {}) }
      row[key] = value
      if (key === 'quantity' || key === 'rate') {
        row.amount = calcAmount(row.quantity, row.rate)
      }
      items[idx] = row
      return { ...prev, items }
    })
  }

  const addItemRow = () => {
    setFormData((prev) => {
      const items = Array.isArray(prev.items) ? [...prev.items] : []
      const nextSl = items.length + 1
      items.push({ sl_no: nextSl, description: '', quantity: 1, unit: 'no', sac_code: '', rate: '', amount: '' })
      return { ...prev, items }
    })
  }

  const removeItemRow = (idx) => {
    setFormData((prev) => {
      const items = Array.isArray(prev.items) ? [...prev.items] : []
      if (items.length <= 1) return prev
      items.splice(idx, 1)
      const reSl = items.map((it, i) => ({ ...it, sl_no: i + 1 }))
      return { ...prev, items: reSl }
    })
  }

  const closeNotification = () => setNotification((p) => ({ ...p, open: false }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!Array.isArray(formData.job_entry_ids) || formData.job_entry_ids.length === 0) {
      setNotification({ open: true, message: 'At least one Job Number is required', severity: 'error' })
      return
    }

    if (selectedPartyName === 'Multiple') {
      setNotification({ open: true, message: 'Please select Job Numbers from the same client only', severity: 'error' })
      return
    }

    const items = Array.isArray(formData.items) ? formData.items : []
    const hasAnyRow = items.some((it) => String(it?.description || '').trim() !== '' || Number(it?.amount) > 0)
    if (!hasAnyRow) {
      setNotification({ open: true, message: 'At least one invoice item is required', severity: 'error' })
      return
    }

    setLoading(true)
    try {
      const normalizedItems = (formData.items || []).map((it, idx) => {
        const qty = it?.quantity === '' || it?.quantity === null || it?.quantity === undefined ? null : Number(it.quantity)
        const rate = it?.rate === '' || it?.rate === null || it?.rate === undefined ? null : Number(it.rate)
        const amount = it?.amount === '' || it?.amount === null || it?.amount === undefined ? null : Number(it.amount)
        return {
          sl_no: it?.sl_no ?? idx + 1,
          description: it?.description || null,
          quantity: Number.isFinite(qty) ? qty : null,
          unit: it?.unit || null,
          sac_code: it?.sac_code || null,
          rate: Number.isFinite(rate) ? rate : null,
          amount: Number.isFinite(amount) ? amount : (Number.isFinite(qty) && Number.isFinite(rate) ? qty * rate : null),
        }
      })

      const payload = {
        job_entry_ids: formData.job_entry_ids.map((x) => Number(x)).filter((x) => Number.isFinite(x)),
        invoice_date: formData.invoice_date || null,

        bill_to_name: formData.bill_to_name || null,
        bill_to_address: formData.bill_to_address || null,
        bill_to_gstin: formData.bill_to_gstin || null,
        bill_to_state_code: formData.bill_to_state_code || null,

        place_of_work_name: formData.place_of_work_name || null,
        place_of_work_address: formData.place_of_work_address || null,
        place_of_work_gstin: formData.place_of_work_gstin || null,
        place_of_work_state_code: formData.place_of_work_state_code || null,

        loi_no: formData.loi_no || null,
        gate_pass_no: formData.gate_pass_no || null,
        delivery_note_no: formData.delivery_note_no || null,
        delivery_date: formData.delivery_date || null,

        items: normalizedItems,

        cgst_percent: totals.cgstPercent,
        igst_percent: totals.igstPercent,
        remarks: formData.remarks || null,
      }

      await salesAPI.createSalesInvoice(payload)

      setNotification({ open: true, message: 'Invoice created successfully. Status updated to Delivered.', severity: 'success' })
      setTimeout(() => navigate('/sales/payment-received'), 800)
    } catch (error) {
      console.error('Error creating invoice:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to create invoice'
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
            Tax Invoice
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/sales/payment-received')}>Back</Button>
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
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <SearchableSelect
                label="Job Number"
                options={filteredJobOptions}
                value={Array.isArray(formData.job_entry_ids) ? formData.job_entry_ids : []}
                multiple
                onChange={handleJobsChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Party"
                value={selectedPartyName}
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                name="invoice_date"
                label="Invoice Date"
                value={formData.invoice_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="loi_no"
                label="LOI No."
                value={formData.loi_no}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="gate_pass_no"
                label="Gate Pass No."
                value={formData.gate_pass_no}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="delivery_note_no"
                label="Delivery Note No."
                value={formData.delivery_note_no}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                name="delivery_date"
                label="Delivery Date"
                value={formData.delivery_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="bill_to_state_code"
                label="Bill To State Code"
                value={formData.bill_to_state_code}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="bill_to_name"
                label="Bill To Name"
                value={formData.bill_to_name}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="bill_to_gstin"
                label="Bill To GSTIN"
                value={formData.bill_to_gstin}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                name="bill_to_address"
                label="Bill To Address"
                value={formData.bill_to_address}
                onChange={handleChange}
                multiline
                minRows={2}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="place_of_work_state_code"
                label="Place of Work State Code"
                value={formData.place_of_work_state_code}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="place_of_work_name"
                label="Place of Work Name"
                value={formData.place_of_work_name}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="place_of_work_gstin"
                label="Place of Work GSTIN"
                value={formData.place_of_work_gstin}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                name="place_of_work_address"
                label="Place of Work Address"
                value={formData.place_of_work_address}
                onChange={handleChange}
                multiline
                minRows={2}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 1 }}>Service Details</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 60 }}>Sl</TableCell>
                    <TableCell>Description of Service</TableCell>
                    <TableCell sx={{ width: 90 }}>Qty</TableCell>
                    <TableCell sx={{ width: 90 }}>Unit</TableCell>
                    <TableCell sx={{ width: 120 }}>SAC Code</TableCell>
                    <TableCell sx={{ width: 120 }}>Rate</TableCell>
                    <TableCell sx={{ width: 140 }}>Amount</TableCell>
                    <TableCell sx={{ width: 110 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(formData.items || []).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.sl_no ?? idx + 1}</TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          value={row.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          value={row.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          value={row.sac_code}
                          onChange={(e) => handleItemChange(idx, 'sac_code', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          value={row.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          value={row.amount}
                          onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => removeItemRow(idx)} disabled={(formData.items || []).length <= 1}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" onClick={addItemRow}>Add Row</Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6">Totals</Typography>
              <Typography variant="body2">Taxable Amount: {totals.taxable.toFixed(2)}</Typography>
              <Typography variant="body2">CGST ({totals.cgstPercent}%): {totals.cgstAmount.toFixed(2)}</Typography>
              <Typography variant="body2">IGST ({totals.igstPercent}%): {totals.igstAmount.toFixed(2)}</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                Grand Total: {totals.totalAmount.toFixed(2)}
              </Typography>
            </Grid>

            <Grid item xs={12} md={12}>
              <TextField
                fullWidth
                name="remarks"
                label="Remarks"
                value={formData.remarks}
                onChange={handleChange}
                multiline
                minRows={2}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
                }}
              >
                {loading ? 'Saving...' : 'Generate Invoice'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={closeNotification}>
        <Alert onClose={closeNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Billing
