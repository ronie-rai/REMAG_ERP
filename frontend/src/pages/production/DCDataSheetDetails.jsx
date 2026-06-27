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

function DCDataSheetDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await productionAPI.getDCMotorDataSheet(id)
        setRecord(res.data)
      } catch (e) {
        console.error('Error loading DC motor data sheet:', e)
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
            DC Motor Data Sheets Details
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(`/production/dc-data-sheets/${id}/print`)}
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
                ['Final Test Date', record?.final_test_date],
              ].map(([label, value]) => (
                <Grid item xs={12} sm={6} md={3} key={label}>
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
              {[
                ['Power (KW)', record?.power_kw],
                ['Voltage (Volts)', record?.voltage_volts],
                ['Current (Amp)', record?.current_amp],
                ['Speed (RPM)', record?.speed_rpm],
                ['Capacity (HP)', record?.capacity_hp],
                ['Make', record?.make],
                ['Type', record?.type],
                ['Class of Insulation', record?.class_of_insulation],
                ['Serial Number (SL No.)', record?.serial_number_sl_no],
                ['Total Weight', record?.total_weight],
                ['Year of Mfg.', record?.year_of_mfg],
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
              Armature Winding Details
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                ['Type of Winding', record?.type_of_winding],
                ['Type of Conductor', record?.type_of_conductor],
                ['No. of Slots', record?.no_of_slots],
                ['Slot Size', record?.slot_size],
                ['No. of Turns in Each Coil', record?.no_of_turns_in_each_coil],
                ['Conductor Size', record?.conductor_size],
                ['Wires in Each Coil', record?.wires_in_each_coil],
                ['No. of Coils in Series / Set', record?.no_of_coils_in_series_set],
                ['Commutator Pitch (Bottom Coil)', record?.commutator_pitch_bottom_coil],
                ['Commutator Pitch (Top Coil)', record?.commutator_pitch_top_coil],
                ['Commutator Pitch of Equilizer', record?.commutator_pitch_of_equilizer],
                ['No. of Parallel Strips', record?.no_of_parallel_strips],
                ['Conductor Size of Equilizer Ring', record?.conductor_size_of_equilizer_ring],
                ['Winding Pitch (Slot Pitch)', record?.winding_pitch_slot_pitch],
                ['Weight of Each Set of Coils', record?.weight_of_each_set_of_coils],
                ['Total Set of Coils', record?.total_set_of_coils],
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
              Field Coil Details
            </Typography>
            <TableContainer component={Box} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: '34%' }}>Details</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '22%' }}>Main Pole</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '22%' }}>Inter Pole</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '22%' }}>Compensating Winding</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    {
                      label: '1. TYPE OF CONDUCTOR ( STRIP/ WIRE )',
                      a: 'type_of_conductor_main_pole',
                      b: 'type_of_conductor_inter_pole',
                      c: 'type_of_conductor_compensating_winding',
                    },
                    {
                      label: '2. CONDUCTOR SIZE',
                      a: 'conductor_size_main_pole',
                      b: 'conductor_size_inter_pole',
                      c: 'conductor_size_compensating_winding',
                    },
                    {
                      label: '3. NO. OF TURNS IN EACH LAYER',
                      a: 'no_of_turns_in_each_layer_main_pole',
                      b: 'no_of_turns_in_each_layer_inter_pole',
                      c: 'no_of_turns_in_each_layer_compensating_winding',
                    },
                    {
                      label: '4. TOTAL NO. OF LAYER',
                      a: 'total_no_of_layer_main_pole',
                      b: 'total_no_of_layer_inter_pole',
                      c: 'total_no_of_layer_compensating_winding',
                    },
                    {
                      label: '5. TOTAL NO. OF TURNS',
                      a: 'total_no_of_turns_main_pole',
                      b: 'total_no_of_turns_inter_pole',
                      c: 'total_no_of_turns_compensating_winding',
                    },
                    {
                      label: '6. RESISTANCE OF COIL',
                      a: 'resistance_of_coil_main_pole',
                      b: 'resistance_of_coil_inter_pole',
                      c: 'resistance_of_coil_compensating_winding',
                    },
                    {
                      label: '7. WEIGHT OF EACH COIL',
                      a: 'weight_of_each_coil_main_pole',
                      b: 'weight_of_each_coil_inter_pole',
                      c: 'weight_of_each_coil_compensating_winding',
                    },
                    {
                      label: '8. CORE DIMENTION ( IN MM )',
                      a: 'core_dimension_mm_main_pole',
                      b: 'core_dimension_mm_inter_pole',
                      c: 'core_dimension_mm_compensating_winding',
                    },
                    {
                      label: '9. CORE INSULATION THICKNESS ( IN MM )',
                      a: 'core_insulation_thickness_mm_main_pole',
                      b: 'core_insulation_thickness_mm_inter_pole',
                      c: 'core_insulation_thickness_mm_compensating_winding',
                    },
                    {
                      label: '10. COIL SIZE AFTER INSULATION (IN MM )',
                      a: 'coil_size_after_insulation_mm_main_pole',
                      b: 'coil_size_after_insulation_mm_inter_pole',
                      c: 'coil_size_after_insulation_mm_compensating_winding',
                    },
                  ].map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.[row.a])}</TableCell>
                      <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.[row.b])}</TableCell>
                      <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.[row.c])}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              Other Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Other Details of Motor</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.other_details_of_motor)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Weight of Copper / Aluminium Scrap</Typography>
                <Typography variant="body2">{safe(record?.weight_of_copper_aluminium_scrap)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Types of Bearing and Bearing No. (Load Side)</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.types_of_bearing_and_bearing_no_load_side)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Types of Bearing and Bearing No. (Back Side)</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.types_of_bearing_and_bearing_no_back_side)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Diagrams</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.diagrams)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Status</Typography>
                <Typography variant="body2">{safe(record?.status)}</Typography>
              </Grid>
            </Grid>
          </>
        )}
      </Paper>
    </Box>
  )
}

export default DCDataSheetDetails
