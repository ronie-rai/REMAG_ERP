import React, { useEffect, useRef, useState } from 'react'
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

function ACDataSheetPrint() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [printScale, setPrintScale] = useState(1)
  const contentRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const res = await productionAPI.getACMotorDataSheet(id)
        setRecord(res.data)
      } catch (e) {
        console.error('Error loading AC motor data sheet:', e)
      }
    }
    load()
  }, [id])

  const safe = (v) => (v === null || v === undefined || v === '' ? '-' : String(v))

  const computeScaleToOnePage = () => {
    const el = contentRef.current
    if (!el) return

    const contentHeight = el.scrollHeight
    if (!contentHeight) return

    const a4HeightPx = 1122
    const pageHeightPx = a4HeightPx - 80
    const next = Math.max(0.62, Math.min(1, pageHeightPx / contentHeight))
    setPrintScale(next)
  }

  useEffect(() => {
    if (!record) return
    const raf = requestAnimationFrame(() => computeScaleToOnePage())
    const t = setTimeout(() => window.print(), 300)
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
          .ac-ds-print-scale {
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
        <Box ref={contentRef} className="ac-ds-print-scale">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 0.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800 }}>AC MOTOR DATA SHEET</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>JOB NO: {record?.job_no ?? '-'}</Typography>
          </Box>
          <Divider sx={{ my: 0.75 }} />

          <Grid container spacing={1} sx={{ '& .MuiTypography-root': { fontSize: 10 } }}>
            <Grid item xs={6}>
              <Typography sx={{ fontWeight: 800 }}>CAPTAIN</Typography>
              <Typography>{safe(record?.captain)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontWeight: 800 }}>DATE</Typography>
              <Typography>{safe(record?.sheet_date)}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography sx={{ fontWeight: 800 }}>PARTY</Typography>
              <Typography>{safe(record?.party)}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 0.75 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.5 }}>NAME PLATE DETAILS</Typography>
          <Grid container spacing={1} sx={{ '& .MuiTypography-root': { fontSize: 10 } }}>
            <Grid item xs={6}>
              <Typography sx={{ fontWeight: 800 }}>FINAL TEST DATE</Typography>
              <Typography>{safe(record?.final_test_date)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontWeight: 800 }}>MAKE</Typography>
              <Typography>{safe(record?.make)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontWeight: 800 }}>SLIP RING</Typography>
              <Typography>{safe(record?.slip_ring)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontWeight: 800 }}>CAGE</Typography>
              <Typography>{safe(record?.cage)}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 0.75 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.5 }}>BASIC SPECIFICATIONS</Typography>
          <Grid container spacing={1} sx={{ '& .MuiTypography-root': { fontSize: 10 } }}>
            {[
              ['POWER (KW)', record?.power_kw],
              ['CAPACITY (HP)', record?.capacity_hp],
              ['VOLTAGE (VOLTS)', record?.voltage_volts],
              ['CURRENT (AMP)', record?.current_amp],
              ['FREQUENCY (HZ)', record?.frequency_hz],
              ['SPEED (RPM)', record?.speed_rpm],
              ['PHASE', record?.phase],
              ['CONNECTION - Y/Δ', record?.connection_y_delta],
              ['TYPE', record?.type],
              ['CLASS OF INSULATION', record?.class_of_insulation],
              ['SERIAL NUMBER (SL NO.)', record?.serial_number_sl_no],
              ['FRAME', record?.frame],
              ['POWER FACTOR (PF)', record?.power_factor_pf],
              ['ROTOR CURRENT (AMP)', record?.rotor_current_amp],
              ['ROTOR VOLTAGE (VOLTS)', record?.rotor_voltage_volts],
              ['TOTAL WEIGHT', record?.total_weight],
              ['YEAR OF MFG.', record?.year_of_mfg],
            ].map(([label, value]) => (
              <Grid item xs={6} key={label}>
                <Typography sx={{ fontWeight: 800 }}>{label}</Typography>
                <Typography>{safe(value)}</Typography>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 0.75 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.5 }}>WINDING DETAILS</Typography>
          <TableContainer
            component={Box}
            sx={{
              breakInside: 'avoid',
              '& table': { tableLayout: 'fixed' },
              '& .MuiTableCell-root': { py: 0.35, px: 0.6, fontSize: 9, verticalAlign: 'top' },
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, width: '34%' }}>WINDING DETAILS</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: '33%' }}>STATOR</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: '33%' }}>ROTOR</TableCell>
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

          <Divider sx={{ my: 0.75 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.5 }}>ADDITIONAL DETAILS</Typography>
          <Grid container spacing={1} sx={{ '& .MuiTypography-root': { fontSize: 10 } }}>
            {[
              ['TYPE OF WINDING', record?.type_of_winding],
              ['TYPE OF CONDUCTOR', record?.type_of_conductor],
              ['OVERHANG PROJECTION OF COILS (CONNECTION SIDE)', record?.overhang_projection_coils_connection_side],
              ['OVERHANG PROJECTION OF COILS (BACK SIDE)', record?.overhang_projection_coils_back_side],
              ['WINDING PITCH (CONNECTION SIDE)', record?.winding_pitch_connection_side],
              ['NO. OF TERMINAL LEADS', record?.no_of_terminal_leads],
              ['WEIGHT OF COPPER / ALUMINIUM SCRAP', record?.weight_of_copper_aluminium_scrap],
              ['TYPE OF BEARING AND BEARING NO. (LOAD SIDE)', record?.type_of_bearing_and_bearing_no_load_side],
              ['TYPE OF BEARING AND BEARING NO. (BACK SIDE)', record?.type_of_bearing_and_bearing_no_back_side],
              ['DIRECTION OF THE COUPLING END WHEN (LEFT/ RIGHT/TOP)', record?.direction_of_coupling_end],
              ['STATUS', record?.status],
            ].map(([label, value]) => (
              <Grid item xs={6} key={label}>
                <Typography sx={{ fontWeight: 800 }}>{label}</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{safe(value)}</Typography>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Typography sx={{ fontWeight: 800 }}>DIAGRAM</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{safe(record?.diagram)}</Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  )
}

export default ACDataSheetPrint
