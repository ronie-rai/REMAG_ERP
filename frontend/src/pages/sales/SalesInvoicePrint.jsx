import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, Divider, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { salesAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'
import { format } from 'date-fns'

function SalesInvoicePrint() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const res = await salesAPI.getSalesInvoice(id)
        setInvoice(res.data)
      } catch (e) {
        console.error('Error loading invoice:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!invoice) return
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [invoice])

  const safeDate = (v) => formatDate(v)

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading invoice...</Typography>
      </Box>
    )
  }

  if (!invoice) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Invoice not found</Typography>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Back
        </Button>
      </Box>
    )
  }

  const items = Array.isArray(invoice.items) ? invoice.items : []

  return (
    <Box sx={{ p: 2, '@media print': { p: 0 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, '@media print': { display: 'none' } }}>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button variant="contained" onClick={() => window.print()}>
          Print
        </Button>
      </Box>

      <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #ddd' }}>
        <Typography variant="h5" fontWeight="bold" align="center">
          TAX INVOICE
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Invoice No:
            </Typography>
            <Typography variant="body2">{invoice.invoice_no || '-'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Invoice Date:
            </Typography>
            <Typography variant="body2">{safeDate(invoice.invoice_date)}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 1, fontWeight: 'bold' }}>
              Bill To
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Name:
            </Typography>
            <Typography variant="body2">{invoice.bill_to_name || '-'}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Address:
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {invoice.bill_to_address || '-'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              GSTIN:
            </Typography>
            <Typography variant="body2">{invoice.bill_to_gstin || '-'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              State Code:
            </Typography>
            <Typography variant="body2">{invoice.bill_to_state_code || '-'}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 1, fontWeight: 'bold' }}>
              Place of Work
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Name:
            </Typography>
            <Typography variant="body2">{invoice.place_of_work_name || '-'}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Address:
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {invoice.place_of_work_address || '-'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              GSTIN:
            </Typography>
            <Typography variant="body2">{invoice.place_of_work_gstin || '-'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              State Code:
            </Typography>
            <Typography variant="body2">{invoice.place_of_work_state_code || '-'}</Typography>
          </Grid>

          <Grid item xs={4}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              LOI No:
            </Typography>
            <Typography variant="body2">{invoice.loi_no || '-'}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Gate Pass No:
            </Typography>
            <Typography variant="body2">{invoice.gate_pass_no || '-'}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Delivery Note No:
            </Typography>
            <Typography variant="body2">{invoice.delivery_note_no || '-'}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Delivery Date:
            </Typography>
            <Typography variant="body2">{safeDate(invoice.delivery_date)}</Typography>
          </Grid>
          <Grid item xs={8}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Job Numbers:
            </Typography>
            <Typography variant="body2">{invoice.job_numbers || '-'}</Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
          Service Details
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sl</TableCell>
              <TableCell>Description of Service</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>SAC Code</TableCell>
              <TableCell>Rate</TableCell>
              <TableCell>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow key={idx}>
                <TableCell>{it.sl_no ?? idx + 1}</TableCell>
                <TableCell>{it.description || '-'}</TableCell>
                <TableCell>{it.quantity ?? '-'}</TableCell>
                <TableCell>{it.unit || '-'}</TableCell>
                <TableCell>{it.sac_code || '-'}</TableCell>
                <TableCell>{it.rate ?? '-'}</TableCell>
                <TableCell>{it.amount ?? '-'}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No items
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Taxable Amount:
            </Typography>
            <Typography variant="body2">
              {Number.isFinite(Number(invoice.taxable_amount)) ? Number(invoice.taxable_amount).toFixed(2) : '-'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              CGST ({invoice.cgst_percent ?? 0}%):
            </Typography>
            <Typography variant="body2">
              {Number.isFinite(Number(invoice.cgst_amount)) ? Number(invoice.cgst_amount).toFixed(2) : '-'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              IGST ({invoice.igst_percent ?? 0}%):
            </Typography>
            <Typography variant="body2">
              {Number.isFinite(Number(invoice.igst_amount)) ? Number(invoice.igst_amount).toFixed(2) : '-'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Grand Total:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {Number.isFinite(Number(invoice.total_amount)) ? Number(invoice.total_amount).toFixed(2) : '-'}
            </Typography>
          </Grid>
        </Grid>

        {invoice.remarks ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Remarks:
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {invoice.remarks}
            </Typography>
          </>
        ) : null}
      </Paper>
    </Box>
  )
}

export default SalesInvoicePrint
