import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material'
import {
  salesAPI,
  productionAPI,
  procurementAPI,
  accountingAPI,
  storeAPI,
} from '../services/api'
import { format } from 'date-fns'

const rangeOptions = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 365 days', value: 365 },
  { label: 'All time', value: 'all' },
  { label: 'Custom', value: 'custom' },
]

const toNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const parseDate = (v) => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

const startOfDay = (d) => {
  const x = d instanceof Date ? new Date(d) : new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const endOfDay = (d) => {
  const x = d instanceof Date ? new Date(d) : new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

const toInputDate = (d) => {
  if (!d) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getRangeBounds = (rangeValue, customFrom, customTo) => {
  if (rangeValue === 'all') return { start: null, end: null, effectiveDays: 'all' }

  if (rangeValue === 'custom') {
    const from = customFrom ? startOfDay(customFrom) : null
    const to = customTo ? endOfDay(customTo) : null
    const start = from && to ? (from <= to ? from : to) : (from || null)
    const end = from && to ? (from <= to ? to : from) : (to || null)
    const effectiveDays = start && end
      ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
      : 0
    return { start, end, effectiveDays }
  }

  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - Number(rangeValue))
  return { start, end, effectiveDays: Number(rangeValue) }
}

const inRange = (d, rangeValue, customFrom, customTo) => {
  if (!d) return false
  const { start, end } = getRangeBounds(rangeValue, customFrom, customTo)
  if (!start && !end) return true
  if (start && d < start) return false
  if (end && d > end) return false
  return true
}

const getAnyDate = (obj, keys) => {
  for (const k of keys) {
    const d = parseDate(obj?.[k])
    if (d) return d
  }
  return null
}

const buildTimeSeries = (items, getDateFn, rangeValue, customFrom, customTo) => {
  const filtered = (items || []).filter((x) => inRange(getDateFn(x), rangeValue, customFrom, customTo))
  if (filtered.length === 0) return []

  const { effectiveDays } = getRangeBounds(rangeValue, customFrom, customTo)
  const useDaily = effectiveDays !== 'all' && Number(effectiveDays) > 0 && Number(effectiveDays) <= 90
  const keyFor = (d) => (useDaily ? format(d, 'dd/MM') : format(d, 'MMM yy'))

  const map = new Map()
  filtered.forEach((x) => {
    const d = getDateFn(x)
    if (!d) return
    const k = keyFor(d)
    map.set(k, (map.get(k) || 0) + 1)
  })

  const labels = Array.from(map.keys())
  const data = labels.map((label) => ({ label, value: map.get(label) || 0 }))
  return data
}

const summarizeStatus = (items, getStatusFn) => {
  const map = new Map()
  ;(items || []).forEach((x) => {
    const raw = getStatusFn(x)
    const st = raw === null || raw === undefined || raw === '' ? 'Unknown' : String(raw)
    map.set(st, (map.get(st) || 0) + 1)
  })
  const out = Array.from(map.entries()).map(([label, value]) => ({ label, value }))
  out.sort((a, b) => b.value - a.value)
  return out
}

const palette = ['#667eea', '#764ba2', '#2e7d32', '#ed6c02', '#d32f2f', '#0288d1', '#6d4c41', '#7b1fa2']

const StatTile = ({ title, value, subtitle, color }) => (
  <Card
    sx={{
      height: '100%',
      borderRadius: 3,
      color: '#fff',
      background: `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.08) 120%)`,
      boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
      border: '1px solid rgba(255,255,255,0.18)',
    }}
  >
    <CardContent>
      <Typography sx={{ opacity: 0.9, fontWeight: 700, letterSpacing: 0.4 }}>{title}</Typography>
      <Typography sx={{ fontSize: 34, fontWeight: 900, mt: 0.5, lineHeight: 1.1 }}>{value}</Typography>
      {subtitle ? (
        <Typography sx={{ opacity: 0.9, mt: 0.5, fontSize: 12, fontWeight: 600 }}>{subtitle}</Typography>
      ) : null}
    </CardContent>
  </Card>
)

const ChartCard = ({ title, children }) => (
  <Paper
    sx={{
      p: 2,
      borderRadius: 3,
      background: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.25)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
      height: '100%',
    }}
  >
    <Typography sx={{ fontWeight: 900, fontSize: 14, mb: 1, letterSpacing: 0.4 }}>{title}</Typography>
    {children}
  </Paper>
)

const EmptyState = ({ label }) => (
  <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{label}</Typography>
  </Box>
)

const SimpleLineChart = ({ data, height = 180, color = '#667eea' }) => {
  const w = 640
  const h = height
  const pad = 18
  const max = Math.max(1, ...data.map((d) => toNum(d.value)))
  const points = data
    .map((d, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1)
      const y = h - pad - (toNum(d.value) * (h - pad * 2)) / max
      return { x, y, v: toNum(d.value), label: d.label }
    })
    .filter(Boolean)

  const path = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  const last = points[points.length - 1]

  return (
    <Box sx={{ width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <path
          d={`${path} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`}
          fill="url(#lineFill)"
          opacity="1"
        />
        {last ? <circle cx={last.x} cy={last.y} r="5" fill={color} /> : null}
      </svg>
      {data?.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, color: 'text.secondary' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{data[0]?.label}</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{data[data.length - 1]?.label}</Typography>
        </Box>
      ) : null}
    </Box>
  )
}

const SimpleBarChart = ({ data, height = 180 }) => {
  const w = 640
  const h = height
  const pad = 18
  const max = Math.max(1, ...data.map((d) => toNum(d.value)))
  const barW = (w - pad * 2) / Math.max(1, data.length)
  return (
    <Box sx={{ width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        {data.map((d, i) => {
          const v = toNum(d.value)
          const bh = (v * (h - pad * 2)) / max
          const x = pad + i * barW + barW * 0.18
          const y = h - pad - bh
          const bw = barW * 0.64
          const c = palette[i % palette.length]
          return <rect key={d.label} x={x} y={y} width={bw} height={Math.max(2, bh)} rx="6" fill={c} opacity="0.95" />
        })}
      </svg>
      {data?.length ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
          {data.slice(0, 6).map((d, i) => (
            <Box key={d.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 2, bgcolor: palette[i % palette.length] }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>
                {d.label}: {toNum(d.value)}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  )
}

const SimpleDonutChart = ({ data, height = 180 }) => {
  const w = 320
  const h = height
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.33
  const stroke = Math.max(10, Math.round(r * 0.38))
  const total = data.reduce((s, x) => s + toNum(x.value), 0)
  if (!total) return <EmptyState label="No data" />

  let acc = 0
  const slices = data.map((d, i) => {
    const v = toNum(d.value)
    const p = v / total
    const a0 = acc
    const a1 = acc + p
    acc = a1

    const start = a0 * Math.PI * 2 - Math.PI / 2
    const end = a1 * Math.PI * 2 - Math.PI / 2
    const x0 = cx + r * Math.cos(start)
    const y0 = cy + r * Math.sin(start)
    const x1 = cx + r * Math.cos(end)
    const y1 = cy + r * Math.sin(end)
    const large = end - start > Math.PI ? 1 : 0
    const path = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
    return { path, color: palette[i % palette.length], label: d.label, value: v }
  })

  const top = [...data].sort((a, b) => toNum(b.value) - toNum(a.value))[0]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, alignItems: 'center' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eaeaf5" strokeWidth={stroke} />
        {slices.map((s, idx) => (
          <path key={idx} d={s.path} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="round" />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="900" fill="#111827">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fontWeight="700" fill="#6b7280">
          total
        </text>
      </svg>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 900 }}>Top</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary' }}>
          {top?.label || '-'}: {toNum(top?.value)}
        </Typography>
        <Divider />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {data.slice(0, 5).map((d, i) => (
            <Box key={d.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: 2, bgcolor: palette[i % palette.length] }} />
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary' }} noWrap>
                  {d.label}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 900 }}>{toNum(d.value)}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

function Dashboard() {
  const [rangeValue, setRangeValue] = useState(30)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(null)
  const [customTo, setCustomTo] = useState(null)
  const [customFromDraft, setCustomFromDraft] = useState('')
  const [customToDraft, setCustomToDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    enquiries: [],
    workOrders: [],
    checklists: [],
    purchaseOrders: [],
    bills: [],
    payments: [],
    skus: [],
    issues: [],
  })

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        const [enquiries, workOrders, checklists, pos, bills, payments, skus, issues] = await Promise.all([
          salesAPI.getEnquiries(),
          salesAPI.getWorkOrders(),
          productionAPI.getChecklists(),
          procurementAPI.getPurchaseOrders(),
          accountingAPI.getBills(),
          accountingAPI.getPayments(),
          storeAPI.getSKUs(),
          storeAPI.getIssues(),
        ])
        setData({
          enquiries: enquiries.data || [],
          workOrders: workOrders.data || [],
          checklists: checklists.data || [],
          purchaseOrders: pos.data || [],
          bills: bills.data || [],
          payments: payments.data || [],
          skus: skus.data || [],
          issues: issues.data || [],
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const scoped = useMemo(() => {
    const scope = (items, getDateFn) => (items || []).filter((x) => inRange(getDateFn(x), rangeValue, customFrom, customTo))

    const enquiries = scope(data.enquiries, (x) => getAnyDate(x, ['created_at', 'due_date']))
    const workOrders = scope(data.workOrders, (x) => getAnyDate(x, ['wo_date', 'created_at']))
    const checklists = scope(data.checklists, (x) => getAnyDate(x, ['sheet_date', 'created_at']))
    const purchaseOrders = scope(data.purchaseOrders, (x) => getAnyDate(x, ['po_date', 'created_at']))
    const bills = scope(data.bills, (x) => getAnyDate(x, ['bill_date', 'created_at']))
    const payments = scope(data.payments, (x) => getAnyDate(x, ['payment_date', 'created_at']))
    const issues = scope(data.issues, (x) => getAnyDate(x, ['created_at', 'issue_date']))

    const salesTrend = buildTimeSeries(enquiries, (x) => getAnyDate(x, ['created_at', 'due_date']), rangeValue, customFrom, customTo)
    const productionTrend = buildTimeSeries(checklists, (x) => getAnyDate(x, ['sheet_date', 'created_at']), rangeValue, customFrom, customTo)
    const procurementTrend = buildTimeSeries(purchaseOrders, (x) => getAnyDate(x, ['po_date', 'created_at']), rangeValue, customFrom, customTo)
    const accountingTrend = buildTimeSeries(payments, (x) => getAnyDate(x, ['payment_date', 'created_at']), rangeValue, customFrom, customTo)

    const enquiryStatus = summarizeStatus(enquiries, (x) => x?.status)
    const workOrderStatus = summarizeStatus(workOrders, (x) => x?.status)
    const billStatus = summarizeStatus(bills, (x) => x?.status)

    const topDueBills = [...bills]
      .map((b) => ({
        label: b?.bill_number ? String(b.bill_number) : `Bill ${b?.id ?? ''}`,
        value: Math.max(0, toNum(b?.current_due ?? (toNum(b?.payable_value) - toNum(b?.total_paid))))
      }))
      .filter((x) => toNum(x.value) > 0)
      .sort((a, b) => toNum(b.value) - toNum(a.value))
      .slice(0, 6)

    const totalSalesValue = enquiries.reduce((s, e) => s + toNum(e?.quoted_value), 0)
    const totalWOValue = workOrders.reduce((s, w) => s + toNum(w?.wo_value), 0)
    const totalPOValue = purchaseOrders.reduce((s, p) => s + toNum(p?.po_value), 0)
    const totalBillValue = bills.reduce((s, b) => s + toNum(b?.bill_value), 0)
    const totalPaid = payments.reduce((s, p) => s + toNum(p?.payment_amount), 0)
    const totalDue = bills.reduce((s, b) => s + Math.max(0, toNum(b?.current_due ?? (toNum(b?.payable_value) - toNum(b?.total_paid)))), 0)

    return {
      enquiries,
      workOrders,
      checklists,
      purchaseOrders,
      bills,
      payments,
      issues,
      totals: {
        enquiries: enquiries.length,
        workOrders: workOrders.length,
        checklists: checklists.length,
        purchaseOrders: purchaseOrders.length,
        bills: bills.length,
        payments: payments.length,
        skus: (data.skus || []).length,
        issues: issues.length,
        totalSalesValue,
        totalWOValue,
        totalPOValue,
        totalBillValue,
        totalPaid,
        totalDue,
      },
      charts: {
        salesTrend,
        productionTrend,
        procurementTrend,
        accountingTrend,
        enquiryStatus,
        workOrderStatus,
        billStatus,
        topDueBills,
      },
    }
  }, [data, rangeValue, customFrom, customTo])

  const openCustomDialog = () => {
    setCustomFromDraft(customFrom ? toInputDate(customFrom) : '')
    setCustomToDraft(customTo ? toInputDate(customTo) : '')
    setCustomDialogOpen(true)
  }

  const applyCustomRange = () => {
    const from = customFromDraft ? parseDate(customFromDraft) : null
    const to = customToDraft ? parseDate(customToDraft) : null
    setCustomFrom(from)
    setCustomTo(to)
    setRangeValue('custom')
    setCustomDialogOpen(false)
  }

  const handleRangeChange = (next) => {
    if (next === 'custom') {
      setRangeValue('custom')
      openCustomDialog()
      return
    }
    setRangeValue(next)
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
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box>
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
              Business Dashboard
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary', fontWeight: 700, fontSize: 13 }}>
              Sales, Production, Procurement, Accounting & Inventory — at a glance
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Range</InputLabel>
            <Select label="Range" value={rangeValue} onChange={(e) => handleRangeChange(e.target.value)}>
              {rangeOptions.map((r) => (
                <MenuItem key={String(r.value)} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {loading ? <LinearProgress sx={{ mt: 2 }} /> : null}
      </Paper>

      <Dialog open={customDialogOpen} onClose={() => setCustomDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Custom Range</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, mt: 1 }}>
            <TextField
              label="From"
              type="date"
              value={customFromDraft}
              onChange={(e) => setCustomFromDraft(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
            <TextField
              label="To"
              type="date"
              value={customToDraft}
              onChange={(e) => setCustomToDraft(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={applyCustomRange}>Apply</Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile title="Enquiries" value={scoped.totals.enquiries} subtitle={`Quoted: ₹${Math.round(scoped.totals.totalSalesValue)}`} color="#667eea" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile title="Work Orders" value={scoped.totals.workOrders} subtitle={`WO Value: ₹${Math.round(scoped.totals.totalWOValue)}`} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile title="Purchase Orders" value={scoped.totals.purchaseOrders} subtitle={`PO Value: ₹${Math.round(scoped.totals.totalPOValue)}`} color="#9c27b0" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile title="Bills" value={scoped.totals.bills} subtitle={`Due: ₹${Math.round(scoped.totals.totalDue)}`} color="#d32f2f" />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatTile title="Payments" value={scoped.totals.payments} subtitle={`Paid: ₹${Math.round(scoped.totals.totalPaid)}`} color="#0288d1" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile title="Production" value={scoped.totals.checklists} subtitle="Checklists" color="#ed6c02" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile title="Inventory" value={scoped.totals.skus} subtitle={`Issues: ${scoped.totals.issues}`} color="#6d4c41" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile title="Outstanding Bills" value={scoped.charts.topDueBills.length} subtitle="Top dues tracked" color="#764ba2" />
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Sales Trend (Enquiries)">
            {scoped.charts.salesTrend.length ? (
              <SimpleLineChart data={scoped.charts.salesTrend} color="#667eea" />
            ) : (
              <EmptyState label="No enquiries in selected range" />
            )}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Accounting Trend (Payments)">
            {scoped.charts.accountingTrend.length ? (
              <SimpleLineChart data={scoped.charts.accountingTrend} color="#0288d1" />
            ) : (
              <EmptyState label="No payments in selected range" />
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartCard title="Sales Pipeline (Enquiry Status)">
            {scoped.charts.enquiryStatus.length ? (
              <SimpleDonutChart data={scoped.charts.enquiryStatus} />
            ) : (
              <EmptyState label="No enquiry status data" />
            )}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <ChartCard title="Work Orders (Status)">
            {scoped.charts.workOrderStatus.length ? (
              <SimpleDonutChart data={scoped.charts.workOrderStatus} />
            ) : (
              <EmptyState label="No work order status data" />
            )}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <ChartCard title="Bills (Status)">
            {scoped.charts.billStatus.length ? (
              <SimpleDonutChart data={scoped.charts.billStatus} />
            ) : (
              <EmptyState label="No bill status data" />
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Procurement Trend (Purchase Orders)">
            {scoped.charts.procurementTrend.length ? (
              <SimpleLineChart data={scoped.charts.procurementTrend} color="#9c27b0" />
            ) : (
              <EmptyState label="No purchase orders in selected range" />
            )}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Production Trend (Checklists)">
            {scoped.charts.productionTrend.length ? (
              <SimpleLineChart data={scoped.charts.productionTrend} color="#ed6c02" />
            ) : (
              <EmptyState label="No checklists in selected range" />
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12}>
          <ChartCard title="Top Outstanding Bills (Current Due)">
            {scoped.charts.topDueBills.length ? (
              <SimpleBarChart data={scoped.charts.topDueBills} />
            ) : (
              <EmptyState label="No outstanding bills in selected range" />
            )}
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard

