import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  MenuItem,
  Divider,
} from '@mui/material'
import { productionAPI } from '../../services/api'

function DataSheetForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const [motorType, setMotorType] = useState('AC Motor')
  const [checklists, setChecklists] = useState([])
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm()

  const currentMotorType = watch('motor_type') || motorType

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        const response = await productionAPI.getChecklists()
        setChecklists(response.data)
      } catch (error) {
        console.error('Error fetching checklists:', error)
      }
    }
    fetchChecklists()
  }, [])

  useEffect(() => {
    if (isEdit) {
      const fetchDataSheet = async () => {
        try {
          const response = await productionAPI.getDataSheet(id)
          const data = response.data
          if (data.motor_type) {
            setMotorType(data.motor_type)
          }
          Object.keys(data).forEach((key) => {
            if (data[key] !== null) {
              setValue(key, data[key])
            }
          })
        } catch (error) {
          console.error('Error fetching data sheet:', error)
        }
      }
      fetchDataSheet()
    } else {
      setValue('motor_type', motorType)
    }
  }, [id, isEdit, setValue])

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await productionAPI.updateDataSheet(id, data)
      } else {
        await productionAPI.createDataSheet(data)
      }
      navigate('/production/checklists')
    } catch (error) {
      console.error('Error saving data sheet:', error)
      alert('Failed to save data sheet')
    }
  }

  const handleExportPDF = async () => {
    if (!id) {
      alert('Please save the data sheet first')
      return
    }
    try {
      const response = await productionAPI.exportDataSheetPDF(id)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `data_sheet_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF')
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
            {isEdit ? 'Edit Data Sheet' : 'New Data Sheet'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isEdit && (
              <Button variant="outlined" onClick={handleExportPDF}>
                Export PDF
              </Button>
            )}
            <Button variant="outlined" onClick={() => navigate('/production/ac-data-sheets')}>
              Back to Data Sheets
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Checklist"
                select
                {...register('job_sheet_id', { required: 'Required' })}
                error={!!errors.job_sheet_id}
                helperText={errors.job_sheet_id?.message}
              >
                {checklists.map((js) => (
                  <MenuItem key={js.id} value={js.id}>
                    {js.job_number}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Motor Type"
                select
                {...register('motor_type', { required: 'Required' })}
                error={!!errors.motor_type}
                helperText={errors.motor_type?.message}
                value={motorType}
                onChange={(e) => {
                  setMotorType(e.target.value)
                  setValue('motor_type', e.target.value)
                }}
              >
                <MenuItem value="AC Motor">AC Motor</MenuItem>
                <MenuItem value="DC Motor/Generator">DC Motor/Generator</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Nameplate Details</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Make" {...register('nameplate_make')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Model" {...register('nameplate_model')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Rating (kW)"
                {...register('nameplate_rating_kw')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Voltage" {...register('nameplate_voltage')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Current" {...register('nameplate_current')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Speed (RPM)"
                {...register('nameplate_speed_rpm')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Frequency (Hz)"
                {...register('nameplate_frequency_hz')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Frame" {...register('nameplate_frame')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Serial No." {...register('nameplate_serial')} />
            </Grid>

            {currentMotorType === 'AC Motor' ? (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="h6">Stator Winding Details</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Stator Slots"
                    {...register('stator_slots')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Winding Type" {...register('stator_winding_type')} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Coil Pitch" {...register('stator_coil_pitch')} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Conductors per Slot"
                    {...register('stator_conductors_per_slot')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Conductor Size" {...register('stator_conductor_size')} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Winding Resistance"
                    {...register('stator_winding_resistance')}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="h6">Rotor Winding Details</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Rotor Slots"
                    {...register('rotor_slots')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Winding Type" {...register('rotor_winding_type')} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Coil Pitch" {...register('rotor_coil_pitch')} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Conductors per Slot"
                    {...register('rotor_conductors_per_slot')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Conductor Size" {...register('rotor_conductor_size')} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Winding Resistance"
                    {...register('rotor_winding_resistance')}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="h6">Bearings</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Drive End" {...register('bearing_drive_end')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Non-Drive End" {...register('bearing_non_drive_end')} />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="h6">Armature Winding</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Armature Slots"
                    {...register('armature_slots')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Winding Type"
                    select
                    {...register('armature_winding_type')}
                  >
                    <MenuItem value="Lap">Lap</MenuItem>
                    <MenuItem value="Wave">Wave</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Direction"
                    select
                    {...register('armature_winding_direction')}
                  >
                    <MenuItem value="Progressive">Progressive</MenuItem>
                    <MenuItem value="Retrogressive">Retrogressive</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Conductors"
                    {...register('armature_conductors')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Conductor Size" {...register('armature_conductor_size')} />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="h6">Field Coils</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Number of Coils"
                    {...register('field_coils')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Turns per Coil"
                    {...register('field_coil_turns')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Resistance"
                    {...register('field_coil_resistance')}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="h6">Pole Details</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth type="number" label="Number of Poles" {...register('poles')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Pole Pitch" {...register('pole_pitch')} />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/production/ac-data-sheets')}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                    },
                  }}
                >
                  {isEdit ? 'Update' : 'Create'} Data Sheet
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  )
}

export default DataSheetForm

