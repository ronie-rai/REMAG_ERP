import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Divider,
  Grid,
  Paper,
  Typography,
} from '@mui/material'
import { productionAPI } from '../../services/api'

function ChecklistPrint() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [printScale, setPrintScale] = useState(1)
  const contentRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const res = await productionAPI.getChecklist(id)
        setRecord(res.data)
      } catch (e) {
        console.error('Error loading checklist:', e)
      }
    }
    load()
  }, [id])

  const safe = (v) => (v === null || v === undefined || v === '' ? '-' : String(v))

  const safeDate = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return safe(value)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  const formatLabel = (key) => {
    if (!key) return ''

    const overrides = {
      id: 'ID',
      job_number: 'Job Number',
      party_name: 'Party Name',
      department: 'Department',
      date: 'Date',
      kw_hp: 'KW / HP',
      voltage: 'Voltage (V)',
      phase: 'Phase',
      current: 'Current (A)',
      speed_rpm: 'Speed (RPM)',
      sl_no: 'SL NO',
      weight_kg: 'Weight (KG)',
      make: 'Make',
      connection: 'Connection',
    }
    if (overrides[key]) return overrides[key]

    const acronyms = new Set(['id', 'de', 'nde', 'kw', 'hp', 'rpm', 'kg'])
    return String(key)
      .split('_')
      .filter(Boolean)
      .map((part) => {
        const lower = part.toLowerCase()
        if (acronyms.has(lower)) return lower.toUpperCase()
        return lower.charAt(0).toUpperCase() + lower.slice(1)
      })
      .join(' ')
  }

  const sectionTitles = useMemo(
    () => [
      'JOB DETAILS',
      'BASIC SPECIFICATIONS',
      'WINDING DETAILS',
      'BEARING DETAILS',
      'CORE DETAILS',
      'ADDITIONAL COMPONENTS',
      'GREASE CUP DETAILS',
      'BEARING HOUSING',
      'TERMINAL DETAILS',
      'FINAL DETAILS',
    ],
    []
  )

  const computeScaleToOnePage = () => {
    const el = contentRef.current
    if (!el) return

    const contentHeight = el.scrollHeight
    if (!contentHeight) return

    const a4HeightPx = 1122
    const pageHeightPx = a4HeightPx - 80
    const next = Math.max(0.55, Math.min(1, pageHeightPx / contentHeight))
    setPrintScale(next)
  }

  useEffect(() => {
    if (!record) return
    const raf = requestAnimationFrame(() => computeScaleToOnePage())
    const t = setTimeout(() => {
      window.print()
    }, 300)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [record])

  return (
    <Box sx={{ p: 2, '@media print': { p: 0 } }}>
      <style>{`
        @page { size: A4; margin: 8mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header, nav, aside { display: none !important; }
          .MuiDrawer-root, .MuiAppBar-root { display: none !important; }
          .MuiButtonBase-root, .MuiIconButton-root { box-shadow: none !important; }
          .checklist-print-scale {
            transform: scale(${printScale});
            transform-origin: top left;
            width: calc(100% / ${printScale});
          }
        }
      `}</style>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, '@media print': { display: 'none' } }}>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button variant="contained" onClick={() => window.print()}>
          Print
        </Button>
      </Box>

      <Paper
        sx={{
          p: 1.5,
          boxShadow: 'none',
          border: '1px solid #ddd',
          '@media print': { border: 'none' },
        }}
      >
        <Box ref={contentRef} className="checklist-print-scale">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 0.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800 }}>CHECKLIST</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>ID: {record?.id || id}</Typography>
          </Box>
          <Divider sx={{ my: 0.75 }} />

          <Typography sx={{ fontSize: 11, fontWeight: 900, mb: 0.35 }}>JOB DETAILS</Typography>
          <Grid container spacing={1} sx={{ mb: 0.85, '& .MuiTypography-root': { fontSize: 9.5 } }}>
            <Grid item xs={3}>
              <Typography sx={{ fontWeight: 800 }}>JOB NUMBER</Typography>
              <Typography>{safe(record?.job_number)}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography sx={{ fontWeight: 800 }}>DATE</Typography>
              <Typography>{safeDate(record?.date)}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography sx={{ fontWeight: 800 }}>PARTY NAME</Typography>
              <Typography>{safe(record?.party_name)}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography sx={{ fontWeight: 800 }}>DEPARTMENT</Typography>
              <Typography>{safe(record?.department)}</Typography>
            </Grid>
          </Grid>

          <Typography sx={{ fontSize: 11, fontWeight: 900, mb: 0.35 }}>BASIC SPECIFICATIONS</Typography>
          <Grid container spacing={1} sx={{ mb: 0.85, '& .MuiTypography-root': { fontSize: 9.5 } }}>
            {[
              ['KW / HP', record?.kw_hp],
              ['VOLTAGE (V)', record?.voltage],
              ['PHASE', record?.phase],
              ['CURRENT (A)', record?.current],
              ['SPEED (RPM)', record?.speed_rpm],
              ['SL NO', record?.sl_no],
              ['TYPE', record?.type],
              ['WEIGHT (KG)', record?.weight_kg],
              ['MAKE', record?.make],
              ['CONNECTION', record?.connection],
            ]
              .filter(([, v]) => v !== null && v !== undefined && String(v) !== '')
              .map(([label, value]) => (
                <Grid item xs={3} key={label}>
                  <Typography sx={{ fontWeight: 800 }}>{label}</Typography>
                  <Typography>{safe(value)}</Typography>
                </Grid>
              ))}
          </Grid>

          {(
            [
              {
                title: 'WINDING DETAILS',
                items: [
                  { label: 'STATOR WINDING', status: 'stator_winding', remarks: 'stator_winding_remarks' },
                  { label: 'ROTOR WINDING', status: 'rotor_winding', remarks: 'rotor_winding_remarks' },
                ],
              },
              {
                title: 'BEARING DETAILS',
                items: [
                  {
                    label: 'BEARING & BEARING SEAT (DE)',
                    status: 'bearing_bearing_seat_de',
                    remarks: 'bearing_bearing_seat_de_remarks',
                  },
                  {
                    label: 'BEARING & BEARING SEAT (NDE)',
                    status: 'bearing_bearing_seat_nde',
                    remarks: 'bearing_bearing_seat_nde_remarks',
                  },
                ],
              },
              {
                title: 'CORE DETAILS',
                items: [
                  { label: 'CORE (STATOR)', status: 'core_stator', remarks: 'core_stator_remarks' },
                  { label: 'CORE (ROTOR)', status: 'core_rotor', remarks: 'core_rotor_remarks' },
                ],
              },
              {
                title: 'ADDITIONAL COMPONENTS',
                items: [
                  { label: 'ROTOR SHAFT', status: 'rotor_shaft', remarks: 'rotor_shaft_remarks' },
                  { label: 'ROTOR RING / BAR', status: 'rotor_ring_bar', remarks: 'rotor_ring_bar_remarks' },
                  { label: 'RTD / TEMP. DETECTOR', status: 'rtd_temp_detector', remarks: 'rtd_temp_detector_remarks' },
                  { label: 'SPACE HEATER', status: 'space_heater', remarks: 'space_heater_remarks' },
                  { label: 'FAN / COVER', status: 'fan_cover', remarks: 'fan_cover_remarks' },
                ],
              },
              {
                title: 'GREASE CUP DETAILS',
                items: [
                  { label: 'GREASE CUP (DE)', status: 'grease_cup_de', remarks: 'grease_cup_de_remarks' },
                  { label: 'GREASE CUP (NDE)', status: 'grease_cup_nde', remarks: 'grease_cup_nde_remarks' },
                ],
              },
              {
                title: 'BEARING HOUSING',
                items: [
                  { label: 'BEARING HOUSING (DE)', status: 'bearing_housing_de', remarks: 'bearing_housing_de_remarks' },
                  { label: 'BEARING HOUSING (NDE)', status: 'bearing_housing_nde', remarks: 'bearing_housing_nde_remarks' },
                ],
              },
              {
                title: 'TERMINAL DETAILS',
                items: [
                  { label: 'BTD', status: 'btd', remarks: 'btd_remarks' },
                  { label: 'TERMINAL BLOCK', status: 'terminal_block', remarks: 'terminal_block_remarks' },
                  { label: 'TERMINAL BOX', status: 'terminal_box', remarks: 'terminal_box_remarks' },
                ],
              },
              {
                title: 'FINAL DETAILS',
                items: [
                  { label: 'FOOT / LEG', status: 'foot_leg', remarks: 'foot_leg_remarks' },
                  { label: 'CIRCLIP / LOCK', status: 'circlip_lock', remarks: 'circlip_lock_remarks' },
                  { label: 'KEYS', status: 'keys', remarks: 'keys_remarks' },
                  {
                    label: 'CARBON / BRUSH / ROCKER ARM',
                    status: 'carbon_brush_rocker_arm',
                    remarks: 'carbon_brush_rocker_arm_remarks',
                  },
                ],
              },
            ]
              .map((sec) => ({
                ...sec,
                rows: (sec.items || []).filter(
                  (it) =>
                    (record?.[it.status] !== null && record?.[it.status] !== undefined && String(record?.[it.status]) !== '') ||
                    (record?.[it.remarks] !== null && record?.[it.remarks] !== undefined && String(record?.[it.remarks]) !== '')
                ),
              }))
              .filter((s) => s.rows.length)
          ).map((sec) => (
            <Box key={sec.title} sx={{ mb: 0.85, breakInside: 'avoid' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 900, mb: 0.35 }}>{sec.title}</Typography>
              <Grid container spacing={1} sx={{ '& .MuiTypography-root': { fontSize: 9.5 } }}>
                {sec.rows.map((it) => (
                  <React.Fragment key={it.label}>
                    <Grid item xs={6}>
                      <Typography sx={{ fontWeight: 800 }}>{it.label}</Typography>
                      <Typography>{safe(record?.[it.status])}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontWeight: 800 }}>{it.label} REMARKS</Typography>
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.[it.remarks])}</Typography>
                    </Grid>
                  </React.Fragment>
                ))}
                {sec.title === 'FINAL DETAILS' ? (
                  <Grid item xs={12}>
                    <Typography sx={{ fontWeight: 800 }}>OTHERS</Typography>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.others)}</Typography>
                  </Grid>
                ) : null}
              </Grid>
            </Box>
          ))}

          {sectionTitles.length ? null : null}
        </Box>
      </Paper>
    </Box>
  )
}

export default ChecklistPrint
