import React, { useEffect, useState } from 'react'
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

function ChecklistView() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(false)

  const formatLabel = React.useCallback((key) => {
    if (!key) return ''

    const overrides = {
      id: 'ID',
      job_number: 'Job Number',
      work_order_id: 'Work Order ID',
      party_name: 'Party Name',
      party_address: 'Party Address',
      party_contact: 'Party Contact',
      received_date: 'Received Date',
      completion_date: 'Completion Date',
    }
    if (overrides[key]) return overrides[key]

    const acronyms = new Set(['id', 'de', 'nde', 'ac', 'dc', 'kw', 'hp', 'rpm'])

    return String(key)
      .split('_')
      .filter(Boolean)
      .map((part) => {
        const lower = part.toLowerCase()
        if (acronyms.has(lower)) return lower.toUpperCase()
        return lower.charAt(0).toUpperCase() + lower.slice(1)
      })
      .join(' ')
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await productionAPI.getChecklist(id)
        setRecord(res.data)
      } catch (e) {
        console.error('Error loading checklist:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const entries = React.useMemo(() => {
    if (!record || typeof record !== 'object') return []
    const excluded = new Set(['created_at', 'updated_at'])
    return Object.entries(record).filter(([k]) => !excluded.has(k))
  }, [record])

  const safe = React.useCallback((v) => (v === null || v === undefined || v === '' ? '-' : String(v)), [])

  const safeDate = React.useCallback((value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return safe(value)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }, [safe])

  const Field = React.useCallback(
    ({ label, value, xs = 12, md = 4 }) => (
      <Grid item xs={xs} md={md}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', fontWeight: 700 }}>
          {safe(value)}
        </Typography>
      </Grid>
    ),
    [safe]
  )

  const StatusWithRemarks = React.useCallback(
    ({ label, statusKey, remarksKey }) => (
      <>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {safe(record?.[statusKey])}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            {label} Remarks
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontWeight: 700 }}>
            {safe(record?.[remarksKey])}
          </Typography>
        </Grid>
      </>
    ),
    [record, safe]
  )

  const sections = React.useMemo(() => {
    const get = (k) => record?.[k]
    return [
      {
        title: 'JOB DETAILS',
        keys: ['job_number', 'date', 'party_name', 'department'],
      },
      {
        title: 'BASIC SPECIFICATIONS',
        keys: ['kw_hp', 'voltage', 'phase', 'current', 'speed_rpm', 'sl_no', 'type', 'weight_kg', 'make', 'connection'],
      },
      {
        title: 'WINDING DETAILS',
        keys: ['stator_winding', 'stator_winding_remarks', 'rotor_winding', 'rotor_winding_remarks'],
      },
      {
        title: 'BEARING DETAILS',
        keys: [
          'bearing_bearing_seat_de',
          'bearing_bearing_seat_de_remarks',
          'bearing_bearing_seat_nde',
          'bearing_bearing_seat_nde_remarks',
        ],
      },
      {
        title: 'CORE DETAILS',
        keys: ['core_stator', 'core_stator_remarks', 'core_rotor', 'core_rotor_remarks'],
      },
      {
        title: 'ADDITIONAL COMPONENTS',
        keys: [
          'rotor_shaft',
          'rotor_shaft_remarks',
          'rotor_ring_bar',
          'rotor_ring_bar_remarks',
          'rtd_temp_detector',
          'rtd_temp_detector_remarks',
          'space_heater',
          'space_heater_remarks',
          'fan_cover',
          'fan_cover_remarks',
        ],
      },
      {
        title: 'GREASE CUP DETAILS',
        keys: ['grease_cup_de', 'grease_cup_de_remarks', 'grease_cup_nde', 'grease_cup_nde_remarks'],
      },
      {
        title: 'BEARING HOUSING',
        keys: ['bearing_housing_de', 'bearing_housing_de_remarks', 'bearing_housing_nde', 'bearing_housing_nde_remarks'],
      },
      {
        title: 'TERMINAL DETAILS',
        keys: ['btd', 'btd_remarks', 'terminal_block', 'terminal_block_remarks', 'terminal_box', 'terminal_box_remarks'],
      },
      {
        title: 'FINAL DETAILS',
        keys: [
          'foot_leg',
          'foot_leg_remarks',
          'circlip_lock',
          'circlip_lock_remarks',
          'keys',
          'keys_remarks',
          'carbon_brush_rocker_arm',
          'carbon_brush_rocker_arm_remarks',
          'others',
        ],
      },
    ]
      .map((s) => ({
        ...s,
        rows: (s.keys || [])
          .map((k) => ({ key: k, label: formatLabel(k), value: get(k) }))
          .filter((r) => r.value !== null && r.value !== undefined && String(r.value) !== ''),
      }))
      .filter((s) => s.rows.length)
  }, [formatLabel, record])

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
            Checklist Details
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(`/production/checklists/${id}/print`)}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
              }}
            >
              Print
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
        {loading ? (
          <Typography>Loading...</Typography>
        ) : !record ? (
          <Typography>No record found</Typography>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Checklist #{record.id}
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              JOB DETAILS
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Field label="Job Number" value={record?.job_number} md={3} />
              <Field label="Date" value={safeDate(record?.date)} md={3} />
              <Field label="Party Name" value={record?.party_name} md={3} />
              <Field label="Department" value={record?.department} md={3} />
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              BASIC SPECIFICATIONS
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Field label="KW / HP" value={record?.kw_hp} md={3} />
              <Field label="Voltage (V)" value={record?.voltage} md={3} />
              <Field label="Phase" value={record?.phase} md={3} />
              <Field label="Current (A)" value={record?.current} md={3} />
              <Field label="Speed (RPM)" value={record?.speed_rpm} md={3} />
              <Field label="SL No" value={record?.sl_no} md={3} />
              <Field label="Type" value={record?.type} md={3} />
              <Field label="Weight (KG)" value={record?.weight_kg} md={3} />
              <Field label="Make" value={record?.make} md={3} />
              <Field label="Connection" value={record?.connection} md={3} />
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              WINDING DETAILS
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <StatusWithRemarks label="Stator Winding" statusKey="stator_winding" remarksKey="stator_winding_remarks" />
              <StatusWithRemarks label="Rotor Winding" statusKey="rotor_winding" remarksKey="rotor_winding_remarks" />
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              BEARING DETAILS
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <StatusWithRemarks label="Bearing & Bearing Seat (DE)" statusKey="bearing_bearing_seat_de" remarksKey="bearing_bearing_seat_de_remarks" />
              <StatusWithRemarks label="Bearing & Bearing Seat (NDE)" statusKey="bearing_bearing_seat_nde" remarksKey="bearing_bearing_seat_nde_remarks" />
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              CORE DETAILS
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <StatusWithRemarks label="Core (Stator)" statusKey="core_stator" remarksKey="core_stator_remarks" />
              <StatusWithRemarks label="Core (Rotor)" statusKey="core_rotor" remarksKey="core_rotor_remarks" />
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              ADDITIONAL COMPONENTS
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <StatusWithRemarks label="Rotor Shaft" statusKey="rotor_shaft" remarksKey="rotor_shaft_remarks" />
              <StatusWithRemarks label="Rotor Ring / Bar" statusKey="rotor_ring_bar" remarksKey="rotor_ring_bar_remarks" />
              <StatusWithRemarks label="RTD / Temp. Detector" statusKey="rtd_temp_detector" remarksKey="rtd_temp_detector_remarks" />
              <StatusWithRemarks label="Space Heater" statusKey="space_heater" remarksKey="space_heater_remarks" />
              <StatusWithRemarks label="Fan / Cover" statusKey="fan_cover" remarksKey="fan_cover_remarks" />
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              GREASE CUP DETAILS
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <StatusWithRemarks label="Grease Cup (DE)" statusKey="grease_cup_de" remarksKey="grease_cup_de_remarks" />
              <StatusWithRemarks label="Grease Cup (NDE)" statusKey="grease_cup_nde" remarksKey="grease_cup_nde_remarks" />
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              BEARING HOUSING
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <StatusWithRemarks label="Bearing Housing (DE)" statusKey="bearing_housing_de" remarksKey="bearing_housing_de_remarks" />
              <StatusWithRemarks label="Bearing Housing (NDE)" statusKey="bearing_housing_nde" remarksKey="bearing_housing_nde_remarks" />
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              TERMINAL DETAILS
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <StatusWithRemarks label="BTD" statusKey="btd" remarksKey="btd_remarks" />
              <StatusWithRemarks label="Terminal Block" statusKey="terminal_block" remarksKey="terminal_block_remarks" />
              <StatusWithRemarks label="Terminal Box" statusKey="terminal_box" remarksKey="terminal_box_remarks" />
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              FINAL DETAILS
            </Typography>
            <Grid container spacing={2}>
              <StatusWithRemarks label="Foot / Leg" statusKey="foot_leg" remarksKey="foot_leg_remarks" />
              <StatusWithRemarks label="Circlip / Lock" statusKey="circlip_lock" remarksKey="circlip_lock_remarks" />
              <StatusWithRemarks label="Keys" statusKey="keys" remarksKey="keys_remarks" />
              <StatusWithRemarks label="Carbon / Brush / Rocker Arm" statusKey="carbon_brush_rocker_arm" remarksKey="carbon_brush_rocker_arm_remarks" />
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Others
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {safe(record?.others)}
                </Typography>
              </Grid>
            </Grid>
          </>
        )}
      </Paper>
    </Box>
  )
}

export default ChecklistView
