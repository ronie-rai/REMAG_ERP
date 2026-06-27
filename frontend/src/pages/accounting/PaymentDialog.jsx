import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
} from '@mui/material'
import SearchableSelect from '../../components/SearchableSelect'

const paymentModeOptions = ['Cash', 'NEFT', 'RTGS', 'UPI', 'Cheque', 'Card', 'Other']

function PaymentDialog({ open, title, initialValue, onClose, onSubmit, submitting }) {
  const initial = useMemo(
    () =>
      initialValue || {
        payment_type: 'Customer Payment',
        payment_amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_mode: 'NEFT',
        reference_number: '',
        remarks: '',
      },
    [initialValue]
  )

  const [form, setForm] = useState(initial)

  React.useEffect(() => {
    setForm(initial)
  }, [initial])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleSubmit = () => {
    onSubmit(form)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Payment Date"
              type="date"
              name="payment_date"
              value={form.payment_date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              name="payment_amount"
              value={form.payment_amount}
              onChange={handleChange}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SearchableSelect
              label="Mode"
              value={form.payment_mode}
              onChange={(next) => setForm((p) => ({ ...p, payment_mode: next }))}
              options={paymentModeOptions.map((m) => ({ label: m, value: m }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Reference / UTR / Cheque No"
              name="reference_number"
              value={form.reference_number}
              onChange={handleChange}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Remarks"
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              size="small"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PaymentDialog
