import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  Divider,
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
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { salesAPI } from '../../services/api'
import { formatDateTime } from '../../utils/dateFormat'
import SearchableSelect from '../../components/SearchableSelect'

const statusOptions = ['Draft', 'Submitted']

function SalesQuotationForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const [searchParams] = useSearchParams()
  const enquiryIdParam = searchParams.get('enquiry_id')

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, control, setValue, getValues } = useForm({
    defaultValues: {
      enquiry_id: enquiryIdParam ? Number(enquiryIdParam) : null,
      quotation_no: '',
      quotation_date: new Date().toISOString().slice(0, 10),
      to_name: '',
      to_address: '',
      subject: '',
      ref_no: '',
      dear: 'Sir',
      intro_text: '',
      terms_text: '',
      term_price: '',
      term_escalation: '',
      term_transportation: '',
      term_taxes: '',
      term_inspection: '',
      term_delivery: '',
      term_payment: '',
      term_guarantee: '',
      term_scope: '',
      term_validity: '',
      term_note: '',
      notes_text: '',
      status: 'Draft',
      items: [
        { sl_no: 1, description: '', quantity: 1, unit: 'no', rate: '', amount: '' },
      ],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' })

  const handleCloseNotification = () => setNotification((p) => ({ ...p, open: false }))

  const calcAmount = (qty, rate) => {
    const q = qty === '' || qty === null || qty === undefined ? NaN : Number(qty)
    const r = rate === '' || rate === null || rate === undefined ? NaN : Number(rate)
    if (!Number.isFinite(q) || !Number.isFinite(r)) return ''
    return Number((q * r).toFixed(2))
  }

  const totals = useMemo(() => {
    const items = getValues('items') || []
    const total = items.reduce((sum, it) => {
      const a = it?.amount === '' || it?.amount === null || it?.amount === undefined ? NaN : Number(it.amount)
      return sum + (Number.isFinite(a) ? a : 0)
    }, 0)
    return { total }
  }, [getValues, fields])

  useEffect(() => {
    const prefillFromEnquiry = async () => {
      const enquiryId = enquiryIdParam ? Number(enquiryIdParam) : null
      if (!Number.isFinite(enquiryId)) return

      try {
        const res = await salesAPI.getEnquiry(enquiryId)
        const e = res.data
        setValue('enquiry_id', enquiryId)
        if (e?.customer_name) setValue('to_name', e.customer_name)
        if (e?.reference) setValue('ref_no', e.reference)
        if (e?.job_scope) setValue('subject', `ARC for ${e.job_scope}`)
        if (e?.particulars && !getValues('intro_text')) {
          setValue('intro_text', String(e.particulars))
        }
      } catch (err) {
        console.error('Error pre-filling from enquiry:', err)
      }
    }

    if (!isEdit) prefillFromEnquiry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiryIdParam, isEdit, setValue])

  useEffect(() => {
    const loadQuotation = async () => {
      if (!isEdit) return
      setLoading(true)
      try {
        const res = await salesAPI.getSalesQuotation(id)
        const q = res.data
        Object.keys(q || {}).forEach((k) => {
          if (k === 'items') return
          if (q[k] === null || q[k] === undefined) return
          if (k === 'quotation_date' && q[k]) {
            setValue('quotation_date', String(q[k]).slice(0, 10))
            return
          }
          setValue(k, q[k])
        })

        const items = Array.isArray(q.items) ? q.items : []
        replace(
          items.length
            ? items.map((it, idx) => ({
                sl_no: it.sl_no ?? idx + 1,
                description: it.description || '',
                quantity: it.quantity ?? 1,
                unit: it.unit || 'no',
                rate: it.rate ?? '',
                amount: it.amount ?? '',
              }))
            : [{ sl_no: 1, description: '', quantity: 1, unit: 'no', rate: '', amount: '' }]
        )
      } catch (err) {
        console.error('Error loading quotation:', err)
        setNotification({ open: true, message: 'Failed to load quotation', severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    loadQuotation()
  }, [id, isEdit, replace, setValue])

  const onSubmit = async (data) => {
    try {
      const payload = { ...data }
      payload.enquiry_id = payload.enquiry_id ? Number(payload.enquiry_id) : null
      payload.items = (payload.items || []).map((it, idx) => {
        const qty = it.quantity === '' || it.quantity === null || it.quantity === undefined ? null : Number(it.quantity)
        const rate = it.rate === '' || it.rate === null || it.rate === undefined ? null : Number(it.rate)
        const amount = it.amount === '' || it.amount === null || it.amount === undefined ? null : Number(it.amount)
        return {
          sl_no: it.sl_no ?? idx + 1,
          description: it.description,
          quantity: Number.isFinite(qty) ? qty : null,
          unit: it.unit,
          rate: Number.isFinite(rate) ? rate : null,
          amount: Number.isFinite(amount) ? amount : (Number.isFinite(qty) && Number.isFinite(rate) ? qty * rate : null),
        }
      })

      if (isEdit) {
        await salesAPI.updateSalesQuotation(id, payload)
        setNotification({ open: true, message: 'Quotation updated', severity: 'success' })
      } else {
        await salesAPI.createSalesQuotation(payload)
        setNotification({ open: true, message: 'Quotation created', severity: 'success' })
      }
      setTimeout(() => navigate('/sales/quotations'), 600)
    } catch (err) {
      console.error('Error saving quotation:', err)
      const message = err?.response?.data?.error || err?.message || 'Failed to save quotation'
      setNotification({ open: true, message, severity: 'error' })
    }
  }

  const handleExportPDF = async () => {
    if (!isEdit) {
      setNotification({ open: true, message: 'Please save the quotation first', severity: 'error' })
      return
    }
    try {
      const res = await salesAPI.exportSalesQuotationPDF(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `sales_quotation_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting quotation PDF:', err)
      const message = err?.response?.data?.error || err?.message || 'Failed to export PDF'
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
            {isEdit ? 'Edit Quotation' : 'New Quotation'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {isEdit ? (
              <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleExportPDF}>
                Export PDF
              </Button>
            ) : null}
            <Button variant="outlined" onClick={() => navigate('/sales/quotations')}>
              Back to Quotations
            </Button>
          </Box>
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Enquiry ID"
                disabled
                value={getValues('enquiry_id') ?? ''}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Quotation No"
                {...register('quotation_no')}
                placeholder={isEdit ? '' : 'Auto'}
                disabled={!isEdit}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Quotation Date"
                InputLabelProps={{ shrink: true }}
                {...register('quotation_date')}
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="To (Name)" {...register('to_name')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ref No"
                {...register('ref_no')}
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="To (Address)"
                multiline
                rows={2}
                {...register('to_address')}
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject"
                multiline
                rows={2}
                {...register('subject')}
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Dear" {...register('dear')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="Status"
                    value={field.value || 'Draft'}
                    onChange={field.onChange}
                    options={statusOptions.map((s) => ({ label: s, value: s }))}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="h6">Letter / Terms</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Intro Text"
                multiline
                rows={4}
                {...register('intro_text')}
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="subtitle1">Terms & Condition</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Price" multiline rows={3} {...register('term_price')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Escalation" multiline rows={3} {...register('term_escalation')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Transportation" multiline rows={3} {...register('term_transportation')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Taxes" multiline rows={3} {...register('term_taxes')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Inspection" multiline rows={3} {...register('term_inspection')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Delivery" multiline rows={3} {...register('term_delivery')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Payment" multiline rows={3} {...register('term_payment')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Guarantee" multiline rows={3} {...register('term_guarantee')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Scope" multiline rows={3} {...register('term_scope')} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Validity" multiline rows={3} {...register('term_validity')} size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Note" multiline rows={3} {...register('term_note')} size="small" />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                {...register('notes_text')}
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="h6">Items</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12}>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 80 }}>Sl No</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell sx={{ width: 120 }}>Qty</TableCell>
                      <TableCell sx={{ width: 120 }}>Unit</TableCell>
                      <TableCell sx={{ width: 140 }}>Rate</TableCell>
                      <TableCell sx={{ width: 160 }}>Amount</TableCell>
                      <TableCell sx={{ width: 70 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fields.map((f, idx) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            {...register(`items.${idx}.sl_no`)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            {...register(`items.${idx}.description`)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            inputProps={{ step: '0.01' }}
                            {...register(`items.${idx}.quantity`, {
                              onChange: (e) => {
                                const qty = e.target.value
                                const rate = getValues(`items.${idx}.rate`)
                                const amount = calcAmount(qty, rate)
                                setValue(`items.${idx}.amount`, amount)
                              },
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth {...register(`items.${idx}.unit`)} />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            inputProps={{ step: '0.01' }}
                            {...register(`items.${idx}.rate`, {
                              onChange: (e) => {
                                const rate = e.target.value
                                const qty = getValues(`items.${idx}.quantity`)
                                const amount = calcAmount(qty, rate)
                                setValue(`items.${idx}.amount`, amount)
                              },
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" fullWidth {...register(`items.${idx}.amount`)} />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Remove">
                            <span>
                              <IconButton size="small" color="error" onClick={() => remove(idx)} disabled={fields.length <= 1}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell colSpan={7}>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => append({ sl_no: fields.length + 1, description: '', quantity: 1, unit: 'no', rate: '', amount: '' })}
                        >
                          Add Item
                        </Button>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={5} align="right" sx={{ fontWeight: 800 }}>
                        Total
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {`₹ ${Number(totals.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/sales/quotations')} disabled={loading}>
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
                  {isEdit ? 'Update' : 'Create'} Quotation
                </Button>
              </Box>
            </Grid>

            {isEdit ? (
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Last updated: {(() => {
                    return formatDateTime(getValues('updated_at'))
                  })()}
                </Typography>
              </Grid>
            ) : null}
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

export default SalesQuotationForm
