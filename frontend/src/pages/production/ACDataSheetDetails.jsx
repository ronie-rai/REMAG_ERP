import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Divider,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { productionAPI } from '../../services/api'

function ACDataSheetDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await productionAPI.getACMotorDataSheet(id)
        setRecord(res.data)
      } catch (e) {
        console.error('Error loading AC motor data sheet:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const entries = useMemo(() => {
    if (!record || typeof record !== 'object') return []
    const excluded = new Set(['created_at', 'updated_at'])
    return Object.entries(record).filter(([k]) => !excluded.has(k))
  }, [record])

  const safe = (v) => (v === null || v === undefined || v === '' ? '-' : String(v))

  const formatLabel = (key) => {
    const raw = String(key || '')
    const spaced = raw.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
    if (!spaced) return ''
    return spaced
      .split(' ')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(' ')
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
            AC Motor Data Sheet Details
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(`/production/ac-data-sheets/${id}/print`)}
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
              Job No: {record.job_no ?? '-'}
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              Job Number and Basic Details
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                ['Captain', record?.captain],
                ['Date', record?.sheet_date],
                ['Party', record?.party],
              ].map(([label, value]) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {safe(value)}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              Name Plate Details
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Final Test Date</Typography>
                <Typography variant="body2">{safe(record?.final_test_date)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Slip Ring</Typography>
                <Typography variant="body2">{safe(record?.slip_ring)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Cage</Typography>
                <Typography variant="body2">{safe(record?.cage)}</Typography>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              Basic Specifications
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                ['Power (KW)', record?.power_kw],
                ['Capacity (HP)', record?.capacity_hp],
                ['Voltage (Volts)', record?.voltage_volts],
                ['Current (Amp)', record?.current_amp],
                ['Frequency (Hz)', record?.frequency_hz],
                ['Speed (RPM)', record?.speed_rpm],
                ['Phase', record?.phase],
                ['Connection - Y/Δ', record?.connection_y_delta],
                ['Type', record?.type],
                ['Class of Insulation', record?.class_of_insulation],
                ['Serial Number (SL No.)', record?.serial_number_sl_no],
                ['Power Factor (PF)', record?.power_factor_pf],
                ['Rotor Current (Amp)', record?.rotor_current_amp],
                ['Rotor Voltage (Volts)', record?.rotor_voltage_volts],
                ['Frame', record?.frame],
                ['Total Weight', record?.total_weight],
                ['Year of Mfg.', record?.year_of_mfg],
                ['Make', record?.make],
              ].map(([label, value]) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {safe(value)}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              Winding Details
            </Typography>
            <TableContainer component={Box} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: '34%' }}>Winding Details</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '33%' }}>Stator</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '33%' }}>Rotor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { label: '1. No. of Slots', s: 'no_of_slots_stator', r: 'no_of_slots_rotor' },
                    { label: '2. Slot (Width x Height x Length)', s: 'slot_width_height_length_stator', r: 'slot_width_height_length_rotor' },
                    { label: '3. Slot Insulation', s: 'slot_insulation_stator', r: 'slot_insulation_rotor' },
                    { label: '4. Total Set of Coils', s: 'total_set_of_coils_stator', r: 'total_set_of_coils_rotor' },
                    { label: '5. No. of Coils in Series per Set', s: 'no_of_coils_in_series_per_set_stator', r: 'no_of_coils_in_series_per_set_rotor' },
                    { label: '6. Wedges Size and Quantity', s: 'wedges_size_and_quantity_stator', r: 'wedges_size_and_quantity_rotor' },
                    { label: '7. Type of RTDs', s: 'type_of_rtds_stator', r: 'type_of_rtds_rotor' },
                    { label: '8. Space Heater', s: 'space_heater_stator', r: 'space_heater_rotor' },
                    { label: '9. No. of Strips / Turns in Each Coil', s: 'no_of_strips_turns_in_each_coil_stator', r: 'no_of_strips_turns_in_each_coil_rotor' },
                    { label: '10. Size of the Conductor (Bare)', s: 'size_of_conductor_bare_stator', r: 'size_of_conductor_bare_rotor' },
                    { label: '11. Conductor Size with Insulation', s: 'conductor_size_with_insulation_stator', r: 'conductor_size_with_insulation_rotor' },
                    { label: '12. Coil Dimension', s: 'coil_dimension_stator', r: 'coil_dimension_rotor' },
                  ].map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.[row.s])}</TableCell>
                      <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.[row.r])}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              Additional Details
            </Typography>
            <Grid container spacing={2}>
              {[
                ['Type of Winding', record?.type_of_winding],
                ['Type of Conductor', record?.type_of_conductor],
                ['Overhang Projection of Coils (Connection Side)', record?.overhang_projection_coils_connection_side],
                ['Overhang Projection of Coils (Back Side)', record?.overhang_projection_coils_back_side],
                ['Winding Pitch (Connection Side)', record?.winding_pitch_connection_side],
                ['No. of Terminal Leads', record?.no_of_terminal_leads],
                ['Weight of Copper / Aluminium Scrap', record?.weight_of_copper_aluminium_scrap],
                ['Type of Bearing and Bearing No. (Load Side)', record?.type_of_bearing_and_bearing_no_load_side],
                ['Type of Bearing and Bearing No. (Back Side)', record?.type_of_bearing_and_bearing_no_back_side],
                ['Direction of the Coupling End (Left/Right/Top)', record?.direction_of_coupling_end],
                ['Status', record?.status],
              ].map(([label, value]) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {safe(value)}
                  </Typography>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Diagram
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {safe(record?.diagram)}
                </Typography>
              </Grid>
            </Grid>
          </>
        )}
      </Paper>
    </Box>
  )
}

export default ACDataSheetDetails
