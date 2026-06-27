import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Snackbar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { productionAPI, jobEntryAPI } from '../../services/api'

const statusOptions = ['Draft', 'In Progress', 'Completed']

const intFields = [
  'job_no',
  'no_of_slots',
  'no_of_turns_in_each_coil',
  'wires_in_each_coil',
  'no_of_coils_in_series_set',
  'total_set_of_coils',
  'no_of_poles',
]

function DCDataSheetForm() {
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const editingId = params.id || searchParams.get('id')
  const jobNoParam = searchParams.get('job_no')

  const isEdit = !!editingId
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
        const res = await productionAPI.getDCMotorDataSheet(editingId)
        Object.keys(res.data).forEach((key) => {
          if (res.data[key] !== null) {
            setValue(key, res.data[key])
          }
        })
      } catch (e) {
        console.error('Error fetching DC data sheet:', e)
        setNotification({ open: true, message: 'Failed to load record', severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchSheet()
  }, [editingId, isEdit, setValue])

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
        await productionAPI.updateDCMotorDataSheet(editingId, payload)
      } else {
        await productionAPI.createDCMotorDataSheet(payload)
      }
      setNotification({ open: true, message: `Saved successfully`, severity: 'success' })
      setTimeout(() => navigate('/production/dc-data-sheets'), 700)
    } catch (e) {
      console.error('Error saving DC data sheet:', e)
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
            {isEdit ? 'Edit DC Motor Data Sheet' : 'New DC Motor Data Sheet'}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/production/dc-data-sheets')}>
            Back to DC Motor Data Sheets
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="FINAL TEST DATE"
                InputLabelProps={{ shrink: true }}
                {...register('final_test_date')}
              />
            </Grid>

            {/* Name Plate Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Name Plate Details</Typography>
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
                label="CURRENT (AMP)"
                {...register('current_amp')}
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
                label="CAPACITY (HP)"
                {...register('capacity_hp')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="MAKE"
                {...register('make')}
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
                label="TOTAL WEIGHT"
                {...register('total_weight')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="YEAR OF MFG."
                {...register('year_of_mfg')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="NOTE"
                {...register('note')}
              />
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
                label="TYPE OF WINDING"
                {...register('type_of_winding')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="TYPE OF CONDUCTOR"
                {...register('type_of_conductor')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="NO. OF SLOTS"
                {...register('no_of_slots')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="SLOT SIZE"
                {...register('slot_size')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="NO. OF TURNS IN EACH COIL"
                {...register('no_of_turns_in_each_coil')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="CONDUCTOR SIZE"
                {...register('conductor_size')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="WIRES IN EACH COIL"
                {...register('wires_in_each_coil')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="NO. OF COILS IN SERIES / SET"
                {...register('no_of_coils_in_series_set')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="COMMUTATOR PITCH (BOTTOM COIL)"
                {...register('commutator_pitch_bottom_coil')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="COMMUTATOR PITCH (TOP COIL)"
                {...register('commutator_pitch_top_coil')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="COMMUTATOR PITCH OF EQUILIZER"
                {...register('commutator_pitch_of_equilizer')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="NO. OF PARALLEL STRIPS"
                {...register('no_of_parallel_strips')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="CONDUCTOR SIZE OF EQUILIZER RING"
                {...register('conductor_size_of_equilizer_ring')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="WINDING PITCH ( SLOT PITCH )"
                {...register('winding_pitch_slot_pitch')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="WEIGHT OF EACH SET OF COILS"
                {...register('weight_of_each_set_of_coils')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="TOTAL SET OF COILS"
                {...register('total_set_of_coils')}
              />
            </Grid>

            {/* Field Coil Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Field Coil Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: '34%' }}>WINDING DETAILS OF FIELD COILS</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '22%' }}>MAIN POLE</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '22%' }}>INTER POLE</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '22%' }}>COMPENSATING WINDING</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>1. TYPE OF CONDUCTOR ( STRIP/ WIRE )</TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('type_of_conductor_main_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('type_of_conductor_inter_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('type_of_conductor_compensating_winding')} />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>2. CONDUCTOR SIZE</TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('conductor_size_main_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('conductor_size_inter_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('conductor_size_compensating_winding')} />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>3. NO. OF TURNS IN EACH LAYER</TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" type="number" {...register('no_of_turns_in_each_layer_main_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" type="number" {...register('no_of_turns_in_each_layer_inter_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          {...register('no_of_turns_in_each_layer_compensating_winding')}
                        />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>4. TOTAL NO. OF LAYER</TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" type="number" {...register('total_no_of_layer_main_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" type="number" {...register('total_no_of_layer_inter_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" type="number" {...register('total_no_of_layer_compensating_winding')} />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>5. TOTAL NO. OF TURNS</TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('total_no_of_turns_main_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('total_no_of_turns_inter_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('total_no_of_turns_compensating_winding')} />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>6. RESISTANCE OF COIL</TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('resistance_of_coil_main_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('resistance_of_coil_inter_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('resistance_of_coil_compensating_winding')} />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>7. WEIGHT OF EACH COIL</TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('weight_of_each_coil_main_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('weight_of_each_coil_inter_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('weight_of_each_coil_compensating_winding')} />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>8. CORE DIMENTION ( IN MM )</TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('core_dimension_mm_main_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('core_dimension_mm_inter_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('core_dimension_mm_compensating_winding')} />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>9. CORE INSULATION THICKNESS ( IN MM )</TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('core_insulation_thickness_mm_main_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('core_insulation_thickness_mm_inter_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('core_insulation_thickness_mm_compensating_winding')} />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>10. COIL SIZE AFTER INSULATION (IN MM )</TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('coil_size_after_insulation_mm_main_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('coil_size_after_insulation_mm_inter_pole')} />
                      </TableCell>
                      <TableCell>
                        <TextField fullWidth size="small" {...register('coil_size_after_insulation_mm_compensating_winding')} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Other Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Other Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="OTHER DETAILS OF MOTOR"
                {...register('other_details_of_motor')}
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
                label="TYPES OF BEARING AND BEARING NO. (LOAD SIDE)"
                {...register('types_of_bearing_and_bearing_no_load_side')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="TYPES OF BEARING AND BEARING NO. (BACK SIDE)"
                {...register('types_of_bearing_and_bearing_no_back_side')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="DIAGRAMS"
                {...register('diagrams')}
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
                <Button variant="outlined" onClick={() => navigate('/production/dc-data-sheets')}>
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
                  {isEdit ? 'Update' : 'Create'} DC Motor Data Sheet
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

 export default DCDataSheetForm

