import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { jobEntryAPI, procurementAPI, storeAPI } from '../../services/api'
import SearchableSelect from '../../components/SearchableSelect'

function IndentForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [searchParams] = useSearchParams()

  const initialFormData = useMemo(
    () => ({
      indent_date: new Date().toISOString().slice(0, 10),
      indent_type: 'Manual',
      job_sheet_id: '',
      job_number: '',
      items: [{ sku_id: '', quantity: '', remarks: '' }],
    }),
    []
  )

  const [formData, setFormData] = useState(initialFormData)
  const [skus, setSkus] = useState([])
  const [jobNumbers, setJobNumbers] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    const fetchSKUs = async () => {
      try {
        const res = await storeAPI.getSKUs()
        setSkus(res.data || [])
      } catch (error) {
        console.error('Error fetching SKUs:', error)
        const message = error?.response?.data?.error || error?.message || 'Failed to load SKU list'
        setNotification({ open: true, message, severity: 'error' })
      }
    }

    fetchSKUs()
  }, [])

  useEffect(() => {
    const fetchJobNumbers = async () => {
      try {
        const res = await jobEntryAPI.getJobEntries()
        const nums = (res.data || [])
          .map((e) => e?.job_number)
          .filter((n) => n !== null && n !== undefined && n !== '')
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n))
        nums.sort((a, b) => b - a)
        setJobNumbers(nums)
      } catch (error) {
        console.error('Error fetching job numbers:', error)
      }
    }
    fetchJobNumbers()
  }, [])

  useEffect(() => {
    const qJob = searchParams.get('job_number')
    if (!isEdit && qJob) {
      const n = Number(qJob)
      if (Number.isFinite(n)) {
        setFormData((p) => ({ ...p, job_number: String(n) }))
      }
    }
  }, [isEdit, searchParams])

  useEffect(() => {
    const fetchIndent = async () => {
      if (!isEdit) return

      setLoading(true)
      try {
        const res = await procurementAPI.getIndent(id)
        const indent = res.data

        setFormData({
          indent_date: indent.indent_date ? String(indent.indent_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
          indent_type: indent.indent_type || 'Manual',
          job_sheet_id: indent.job_sheet_id ?? '',
          job_number: indent.job_number ?? '',
          items:
            Array.isArray(indent.items) && indent.items.length
              ? indent.items.map((it) => ({
                  sku_id: it.sku_id ?? '',
                  quantity: it.quantity ?? '',
                  remarks: it.remarks ?? '',
                }))
              : [{ sku_id: '', quantity: '', remarks: '' }],
        })
      } catch (error) {
        console.error('Error fetching indent:', error)
        const message = error?.response?.data?.error || error?.message || 'Failed to load indent'
        setNotification({ open: true, message, severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchIndent()
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const nextItems = [...prev.items]
      nextItems[index] = { ...nextItems[index], [field]: value }
      return { ...prev, items: nextItems }
    })
  }

  const addRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { sku_id: '', quantity: '', remarks: '' }],
    }))
  }

  const removeRow = (index) => {
    setFormData((prev) => {
      const nextItems = prev.items.filter((_, i) => i !== index)
      return { ...prev, items: nextItems.length ? nextItems : [{ sku_id: '', quantity: '', remarks: '' }] }
    })
  }

  const handleCloseNotification = () => {
    setNotification((p) => ({ ...p, open: false }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const items = formData.items
      .map((it) => ({
        sku_id: it.sku_id,
        quantity: it.quantity === '' ? null : Number(it.quantity),
        remarks: it.remarks,
      }))
      .filter((it) => it.sku_id && it.quantity && Number.isFinite(it.quantity))

    if (items.length === 0) {
      setNotification({ open: true, message: 'Add at least one item with SKU and quantity', severity: 'error' })
      return
    }

    setLoading(true)
    try {
      const payload = {
        indent_date: formData.indent_date,
        indent_type: formData.indent_type,
        job_sheet_id: formData.job_sheet_id === '' ? null : Number(formData.job_sheet_id),
        job_number: formData.job_number === '' ? null : Number(formData.job_number),
        items,
      }

      if (isEdit) {
        await procurementAPI.updateIndent(id, payload)
        setNotification({ open: true, message: 'Indent updated successfully', severity: 'success' })
      } else {
        await procurementAPI.createIndent(payload)
        setNotification({ open: true, message: 'Indent created successfully', severity: 'success' })

        const afterStatus = searchParams.get('afterStatus')
        const jobEntryId = searchParams.get('jobEntryId')
        if (afterStatus && jobEntryId) {
          try {
            await jobEntryAPI.updateJobEntryStatus(Number(jobEntryId), { status: afterStatus, confirmed: true })
          } catch (err) {
            console.error('Failed to confirm job entry status after indent save:', err)
          }
          setTimeout(() => navigate('/production/job-entries'), 700)
          return
        }
      }

      setTimeout(() => navigate('/procurement/indents'), 700)
    } catch (error) {
      console.error('Error saving indent:', error)
      const message = error?.response?.data?.error || error?.message || (isEdit ? 'Failed to update indent' : 'Failed to create indent')
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
            {isEdit ? 'Edit Indent' : 'New Indent'}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/procurement/indents')}>
            Back to Indents
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
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Indent Date"
                name="indent_date"
                type="date"
                value={formData.indent_date}
                onChange={handleChange}
                size="small"
                disabled={loading}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Indent Type"
                name="indent_type"
                value={formData.indent_type}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Checklist ID (optional)"
                name="job_sheet_id"
                value={formData.job_sheet_id}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <SearchableSelect
                label="Job Number (optional)"
                value={formData.job_number}
                onChange={(next) => setFormData((p) => ({ ...p, job_number: next }))}
                options={[
                  { label: 'None', value: '' },
                  ...jobNumbers.map((n) => ({ label: String(n), value: String(n) })),
                ]}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                Items
              </Typography>

              <Grid container spacing={2}>
                {formData.items.map((it, idx) => (
                  <React.Fragment key={idx}>
                    <Grid item xs={12} md={5}>
                      <SearchableSelect
                        label="SKU"
                        value={it.sku_id}
                        onChange={(next) => handleItemChange(idx, 'sku_id', next)}
                        options={(skus || []).map((s) => ({
                          label: `${s.sku_code} - ${s.item_name}`,
                          value: s.id,
                        }))}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Qty"
                        type="number"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        size="small"
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Remarks"
                        value={it.remarks}
                        onChange={(e) => handleItemChange(idx, 'remarks', e.target.value)}
                        size="small"
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconButton onClick={() => removeRow(idx)} disabled={loading} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </React.Fragment>
                ))}

                <Grid item xs={12}>
                  <Button onClick={addRow} startIcon={<AddIcon />} disabled={loading}>
                    Add Item
                  </Button>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/procurement/indents')} disabled={loading}>
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
                  {loading ? 'Saving...' : isEdit ? 'Update Indent' : 'Create Indent'}
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

export default IndentForm
