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

function DCDataSheetPrint() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [printScale, setPrintScale] = useState(1)
  const contentRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const res = await productionAPI.getDCMotorDataSheet(id)
        setRecord(res.data)
      } catch (e) {
        console.error('Error loading DC motor data sheet:', e)
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
    <Box
      sx={{
        p: 2,
        '@media print': { p: 0 },
      }}
    >
      <style>{`
        @page { size: A4; margin: 8mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header, nav, aside { display: none !important; }
          .MuiDrawer-root, .MuiAppBar-root { display: none !important; }
          .MuiButtonBase-root, .MuiIconButton-root { box-shadow: none !important; }
          .dc-ds-print-scale {
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
        <Box ref={contentRef} className="dc-ds-print-scale">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 0.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800 }}>DC MOTOR DATA SHEET</Typography>
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
          </Grid>

          <Divider sx={{ my: 0.75 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.5 }}>BASIC SPECIFICATIONS</Typography>
          <Grid container spacing={1} sx={{ '& .MuiTypography-root': { fontSize: 10 } }}>
            {[
              ['POWER (KW)', record?.power_kw],
              ['CAPACITY (HP)', record?.capacity_hp],
              ['VOLTAGE (VOLTS)', record?.voltage_volts],
              ['CURRENT (AMP)', record?.current_amp],
              ['SPEED (RPM)', record?.speed_rpm],
              ['TYPE', record?.type],
              ['CLASS OF INSULATION', record?.class_of_insulation],
              ['SERIAL NUMBER (SL NO.)', record?.serial_number_sl_no],
              ['TOTAL WEIGHT', record?.total_weight],
              ['YEAR OF MFG.', record?.year_of_mfg],
              ['STATUS', record?.status],
            ].map(([label, value]) => (
              <Grid item xs={6} key={label}>
                <Typography sx={{ fontWeight: 800 }}>{label}</Typography>
                <Typography>{safe(value)}</Typography>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 0.75 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.5 }}>ARMATURE WINDING DETAILS</Typography>
          <Grid container spacing={1} sx={{ '& .MuiTypography-root': { fontSize: 10 } }}>
            {[
              ['TYPE OF WINDING', record?.type_of_winding],
              ['TYPE OF CONDUCTOR', record?.type_of_conductor],
              ['NO. OF SLOTS', record?.no_of_slots],
              ['SLOT SIZE', record?.slot_size],
              ['NO. OF TURNS IN EACH COIL', record?.no_of_turns_in_each_coil],
              ['CONDUCTOR SIZE', record?.conductor_size],
              ['WIRES IN EACH COIL', record?.wires_in_each_coil],
              ['NO. OF COILS IN SERIES / SET', record?.no_of_coils_in_series_set],
              ['COMMUTATOR PITCH (BOTTOM COIL)', record?.commutator_pitch_bottom_coil],
              ['COMMUTATOR PITCH (TOP COIL)', record?.commutator_pitch_top_coil],
              ['COMMUTATOR PITCH OF EQUILIZER', record?.commutator_pitch_of_equilizer],
              ['NO. OF PARALLEL STRIPS', record?.no_of_parallel_strips],
              ['CONDUCTOR SIZE OF EQUILIZER RING', record?.conductor_size_of_equilizer_ring],
              ['WINDING PITCH (SLOT PITCH)', record?.winding_pitch_slot_pitch],
              ['WEIGHT OF EACH SET OF COILS', record?.weight_of_each_set_of_coils],
              ['TOTAL SET OF COILS', record?.total_set_of_coils],
            ].map(([label, value]) => (
              <Grid item xs={6} key={label}>
                <Typography sx={{ fontWeight: 800 }}>{label}</Typography>
                <Typography>{safe(value)}</Typography>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 0.5, breakInside: 'avoid' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.5 }}>WINDING DETAILS OF FIELD COILS</Typography>
            <TableContainer
              component={Box}
              sx={{
                '& table': { tableLayout: 'fixed' },
                '& .MuiTableCell-root': { py: 0.35, px: 0.6, fontSize: 9 },
                '& input': { fontSize: 9 },
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: '34%' }}>DETAILS</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '22%' }}>MAIN POLE</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '22%' }}>INTER POLE</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '22%' }}>COMPENSATING WINDING</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>1. TYPE OF CONDUCTOR ( STRIP/ WIRE )</TableCell>
                    <TableCell>{safe(record?.type_of_conductor_main_pole)}</TableCell>
                    <TableCell>{safe(record?.type_of_conductor_inter_pole)}</TableCell>
                    <TableCell>{safe(record?.type_of_conductor_compensating_winding)}</TableCell>
                  </TableRow>
                <TableRow>
                  <TableCell>2. CONDUCTOR SIZE</TableCell>
                  <TableCell>{safe(record?.conductor_size_main_pole)}</TableCell>
                  <TableCell>{safe(record?.conductor_size_inter_pole)}</TableCell>
                  <TableCell>{safe(record?.conductor_size_compensating_winding)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>3. NO. OF TURNS IN EACH LAYER</TableCell>
                  <TableCell>{safe(record?.no_of_turns_in_each_layer_main_pole)}</TableCell>
                  <TableCell>{safe(record?.no_of_turns_in_each_layer_inter_pole)}</TableCell>
                  <TableCell>{safe(record?.no_of_turns_in_each_layer_compensating_winding)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>4. TOTAL NO. OF LAYER</TableCell>
                  <TableCell>{safe(record?.total_no_of_layer_main_pole)}</TableCell>
                  <TableCell>{safe(record?.total_no_of_layer_inter_pole)}</TableCell>
                  <TableCell>{safe(record?.total_no_of_layer_compensating_winding)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>5. TOTAL NO. OF TURNS</TableCell>
                  <TableCell>{safe(record?.total_no_of_turns_main_pole)}</TableCell>
                  <TableCell>{safe(record?.total_no_of_turns_inter_pole)}</TableCell>
                  <TableCell>{safe(record?.total_no_of_turns_compensating_winding)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>6. RESISTANCE OF COIL</TableCell>
                  <TableCell>{safe(record?.resistance_of_coil_main_pole)}</TableCell>
                  <TableCell>{safe(record?.resistance_of_coil_inter_pole)}</TableCell>
                  <TableCell>{safe(record?.resistance_of_coil_compensating_winding)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>7. WEIGHT OF EACH COIL</TableCell>
                  <TableCell>{safe(record?.weight_of_each_coil_main_pole)}</TableCell>
                  <TableCell>{safe(record?.weight_of_each_coil_inter_pole)}</TableCell>
                  <TableCell>{safe(record?.weight_of_each_coil_compensating_winding)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>8. CORE DIMENTION ( IN MM )</TableCell>
                  <TableCell>{safe(record?.core_dimension_mm_main_pole)}</TableCell>
                  <TableCell>{safe(record?.core_dimension_mm_inter_pole)}</TableCell>
                  <TableCell>{safe(record?.core_dimension_mm_compensating_winding)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>9. CORE INSULATION THICKNESS ( IN MM )</TableCell>
                  <TableCell>{safe(record?.core_insulation_thickness_mm_main_pole)}</TableCell>
                  <TableCell>{safe(record?.core_insulation_thickness_mm_inter_pole)}</TableCell>
                  <TableCell>{safe(record?.core_insulation_thickness_mm_compensating_winding)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>10. COIL SIZE AFTER INSULATION (IN MM )</TableCell>
                  <TableCell>{safe(record?.coil_size_after_insulation_mm_main_pole)}</TableCell>
                  <TableCell>{safe(record?.coil_size_after_insulation_mm_inter_pole)}</TableCell>
                  <TableCell>{safe(record?.coil_size_after_insulation_mm_compensating_winding)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        </Box>
      </Paper>
    </Box>
  )
}

export default DCDataSheetPrint
