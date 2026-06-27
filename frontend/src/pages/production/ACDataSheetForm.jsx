import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormControlLabel,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { productionAPI } from '../../services/api'

const statusOptions = ['Draft', 'In Progress', 'Completed']

const intFields = [
  'job_no',
  'no_of_slots_stator',
  'total_set_of_coils_stator',
  'no_of_coils_in_series_per_set_stator',
  'no_of_strips_turns_in_each_coil_stator',
  'no_of_slots_rotor',
  'total_set_of_coils_rotor',
  'no_of_coils_in_series_per_set_rotor',
  'no_of_strips_turns_in_each_coil_rotor',
  'no_of_terminal_leads',
]

const phaseOptions = ['1', '3']
const connectionOptions = ['Star', 'Delta']
const windingTypeOptions = [
  'Lap Progressive',
  'Lap Retrogressive',
  'Wave Progressive',
  'Wave Retrogressive',
]
const conductorTypeOptions = [
  'Copper Wire',
  'Copper Strip',
  'Aluminium Wire',
  'Aluminium Strip',
]

function ACDataSheetForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const jobNoParam = searchParams.get('job_no')

  const isEdit = !!id
  const { register, handleSubmit, formState: { errors }, control, setValue, getValues, watch } = useForm()
  const [jobNumbers, setJobNumbers] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const selectedJobNo = watch('job_no')

  useEffect(() => {
    const fetchJobNumbers = async () => {
      try {
        const response = await productionAPI.getJobNumbers()
        setJobNumbers(response.data)
      } catch (error) {
        console.error('Error fetching job numbers:', error)
      }
    }
    fetchJobNumbers()

    if (!isEdit) {
      const current = getValues('sheet_date')
      if (!current) {
        const today = new Date().toISOString().slice(0, 10)
        setValue('sheet_date', today)
      }
    }

    if (!isEdit && jobNoParam) {
      const n = Number(jobNoParam)
      if (!Number.isNaN(n)) {
        setValue('job_no', n)
      }
    }

    if (!isEdit) return

    const fetchSheet = async () => {
      setLoading(true)
      try {
        const res = await productionAPI.getACMotorDataSheet(id)
        Object.keys(res.data).forEach((key) => {
          if (res.data[key] !== null) {
            setValue(key, res.data[key])
          }
        })
      } catch (e) {
        console.error('Error fetching AC data sheet:', e)
        setNotification({ open: true, message: 'Failed to load record', severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchSheet()
  }, [id, isEdit, setValue])

  useEffect(() => {
    if (!selectedJobNo) return
    const selected = (jobNumbers || []).find((j) => String(j.job_number) === String(selectedJobNo))
    if (!selected) return

    const currentParty = getValues('party')
    if (isEdit && currentParty) return
    if (selected.party_name) setValue('party', selected.party_name)
  }, [getValues, isEdit, jobNumbers, selectedJobNo, setValue])

  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }))
  }

  const normalizePayload = (data) => {
    const payload = { ...data }

    if (payload.slip_ring === true) payload.slip_ring = 'Yes'
    else if (payload.slip_ring === false) payload.slip_ring = 'No'
    if (payload.cage === true) payload.cage = 'Yes'
    else if (payload.cage === false) payload.cage = 'No'

    intFields.forEach((key) => {
      if (payload[key] === '') payload[key] = null
      if (payload[key] !== null && payload[key] !== undefined && payload[key] !== '') {
        const n = Number(payload[key])
        payload[key] = Number.isNaN(n) ? null : n
      }
    })
    return payload
  }

  const onSubmit = async (data) => {
    if (!data.job_no) {
      setNotification({ open: true, message: 'Job Number is required', severity: 'error' })
      return
    }

    setLoading(true)
    try {
      const payload = normalizePayload(data)
      if (isEdit) {
        await productionAPI.updateACMotorDataSheet(id, payload)
      } else {
        await productionAPI.createACMotorDataSheet(payload)
      }
      setNotification({ open: true, message: `Saved successfully`, severity: 'success' })
      setTimeout(() => navigate('/production/ac-data-sheets'), 700)
    } catch (e) {
      console.error('Error saving AC data sheet:', e)
      const message =
        e?.response?.data?.error ||
        e?.message ||
        'Failed to save'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
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
            {isEdit ? 'Edit AC Motor Data Sheet' : 'New AC Motor Data Sheet'}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/production/ac-data-sheets')}>
            Back to AC Motor Data Sheets
          </Button>
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
            {/* Job Number and Basic Details */}
            <Grid item xs={12} md={6}>
              <Controller
                name="job_no"
                control={control}
                rules={{ required: 'Required' }}
                render={({ field: { onChange, value } }) => (
                  <FormControl fullWidth>
                    <InputLabel>Job Number</InputLabel>
                    <Select
                      value={value || ''}
                      onChange={onChange}
                      label="Job Number"
                    >
                      {jobNumbers.map((job) => (
                        <MenuItem key={job.job_number} value={job.job_number}>
                          {job.job_number} - {job.party_name} ({job.department})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="CAPTAIN"
                {...register('captain')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="DATE"
                InputLabelProps={{ shrink: true }}
                {...register('sheet_date')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="PARTY"
                {...register('party')}
              />
            </Grid>

            {/* Name Plate Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Name Plate Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="FINAL TEST DATE"
                InputLabelProps={{ shrink: true }}
                {...register('final_test_date')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="slip_ring"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    label="Slip Ring"
                    control={
                      <Checkbox
                        checked={String(field.value || '').toLowerCase() === 'yes'}
                        onChange={(e) => field.onChange(e.target.checked ? 'Yes' : 'No')}
                      />
                    }
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="cage"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    label="Cage"
                    control={
                      <Checkbox
                        checked={String(field.value || '').toLowerCase() === 'yes'}
                        onChange={(e) => field.onChange(e.target.checked ? 'Yes' : 'No')}
                      />
                    }
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="MAKE"
                {...register('make')}
              />
            </Grid>

            {/* Basic Specifications */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Basic Specifications</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="POWER (KW)"
                {...register('power_kw')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="VOLTAGE (VOLTS)"
                {...register('voltage_volts')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="FREQUENCY (HZ)"
                {...register('frequency_hz')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="CURRENT (AMP)"
                {...register('current_amp')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="CAPACITY (HP)"
                {...register('capacity_hp')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="YEAR OF MFG."
                InputLabelProps={{ shrink: true }}
                {...register('year_of_mfg')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="TYPE"
                {...register('type')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="CLASS OF INSULATION"
                {...register('class_of_insulation')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="SERIAL NUMBER (SL NO.)"
                {...register('serial_number_sl_no')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="POWER FACTOR (PF)"
                {...register('power_factor_pf')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="ROTOR CURRENT(AMP)"
                {...register('rotor_current_amp')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="ROTOR VOLTAGE (VOLTS)"
                {...register('rotor_voltage_volts')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="TOTAL WEIGHT"
                {...register('total_weight')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="FRAME"
                {...register('frame')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="SPEED (RPM)"
                {...register('speed_rpm')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="PHASE"
                {...register('phase')}
              >
                {phaseOptions.map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="CONNECTION - Y/Δ"
                {...register('connection_y_delta')}
              >
                {connectionOptions.map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Armature Winding Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Armature Winding Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="TYPE OF WINDING"
                {...register('type_of_winding')}
              >
                {windingTypeOptions.map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="TYPE OF CONDUCTOR"
                {...register('type_of_conductor')}
              >
                {conductorTypeOptions.map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Winding Details</Typography>
              </Divider>
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Winding Details</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Stator</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Rotor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { label: '1. No. of Slots', s: 'no_of_slots_stator', r: 'no_of_slots_rotor', type: 'number' },
                      { label: '2. Slot (Width x Height x Length)', s: 'slot_width_height_length_stator', r: 'slot_width_height_length_rotor' },
                      { label: '3. Slot Insulation', s: 'slot_insulation_stator', r: 'slot_insulation_rotor' },
                      { label: '4. Total Set of Coils', s: 'total_set_of_coils_stator', r: 'total_set_of_coils_rotor', type: 'number' },
                      { label: '5. No. of Coils in Series per Set', s: 'no_of_coils_in_series_per_set_stator', r: 'no_of_coils_in_series_per_set_rotor', type: 'number' },
                      { label: '6. Wedges Size and Quantity', s: 'wedges_size_and_quantity_stator', r: 'wedges_size_and_quantity_rotor' },
                      { label: '7. Type of RTDs', s: 'type_of_rtds_stator', r: 'type_of_rtds_rotor' },
                      { label: '8. Space Heater', s: 'space_heater_stator', r: 'space_heater_rotor' },
                      { label: '9. No. of Strips / Turns in Each Coil', s: 'no_of_strips_turns_in_each_coil_stator', r: 'no_of_strips_turns_in_each_coil_rotor', type: 'number' },
                      { label: '10. Size of the Conductor (Bare)', s: 'size_of_conductor_bare_stator', r: 'size_of_conductor_bare_rotor' },
                      { label: '11. Conductor Size with Insulation', s: 'conductor_size_with_insulation_stator', r: 'conductor_size_with_insulation_rotor' },
                      { label: '12. Coil Dimension', s: 'coil_dimension_stator', r: 'coil_dimension_rotor' },
                    ].map((row) => (
                      <TableRow key={row.label}>
                        <TableCell sx={{ width: '34%' }}>{row.label}</TableCell>
                        <TableCell sx={{ width: '33%' }}>
                          <TextField
                            fullWidth
                            size="small"
                            type={row.type || 'text'}
                            {...register(row.s)}
                          />
                        </TableCell>
                        <TableCell sx={{ width: '33%' }}>
                          <TextField
                            fullWidth
                            size="small"
                            type={row.type || 'text'}
                            {...register(row.r)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Additional Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Additional Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="OVERHANG PROJECTION OF COILS (CONNECTION SIDE)"
                {...register('overhang_projection_coils_connection_side')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="OVERHANG PROJECTION OF COILS (BACK SIDE)"
                {...register('overhang_projection_coils_back_side')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="WINDING PITCH (CONNECTION SIDE)"
                {...register('winding_pitch_connection_side')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="NO. OF TERMINAL LEADS"
                {...register('no_of_terminal_leads')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="WEIGHT OF COPPER / ALUMINIUM SCRAP"
                {...register('weight_of_copper_aluminium_scrap')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="TYPE OF BEARING AND BEARING NO. (LOAD SIDE)"
                {...register('type_of_bearing_and_bearing_no_load_side')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="TYPE OF BEARING AND BEARING NO. (BACK SIDE)"
                {...register('type_of_bearing_and_bearing_no_back_side')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="DIRECTION OF THE COUPLING END WHEN (LEFT/ RIGHT/TOP)"
                {...register('direction_of_coupling_end')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="DIAGRAM"
                {...register('diagram')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="STATUS"
                {...register('status')}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/production/ac-data-sheets')}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                    },
                  }}
                >
                  {isEdit ? 'Update' : 'Create'} AC Motor Data Sheet
                </Button>
              </Box>
            </Grid>
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

export default ACDataSheetForm
