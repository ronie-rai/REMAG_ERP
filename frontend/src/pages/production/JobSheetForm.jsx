import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Divider,
} from '@mui/material'
import { productionAPI, salesAPI } from '../../services/api'
import SearchableSelect from '../../components/SearchableSelect'

function ChecklistForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { register, handleSubmit, formState: { errors }, control, setValue, getValues } = useForm()
  const [jobNumbers, setJobNumbers] = useState([])

  const statusOptions = ['Ok', 'Damaged', 'Missing', 'Repairable', 'NA']

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
      const currentDate = getValues('date')
      if (!currentDate) setValue('date', new Date().toISOString().slice(0, 10))
    }

    if (isEdit) {
      const fetchChecklist = async () => {
        try {
          const response = await productionAPI.getChecklist(id)
          const data = response.data
          Object.keys(data).forEach((key) => {
            if (data[key] !== null) {
              setValue(key, data[key])
            }
          })
        } catch (error) {
          console.error('Error fetching checklist:', error)
        }
      }
      fetchChecklist()
    }
  }, [id, isEdit, setValue])

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await productionAPI.updateChecklist(id, data)
      } else {
        await productionAPI.createChecklist(data)
      }
      navigate('/production/checklists')
    } catch (error) {
      console.error('Error saving checklist:', error)
      const status = error?.response?.status
      const message = error?.response?.data?.error || error?.message
      alert(`Failed to save checklist${status ? ` (HTTP ${status})` : ''}${message ? `: ${message}` : ''}`)
    }
  }

  const handleExportPDF = async () => {
    if (!id) {
      alert('Please save the checklist first')
      return
    }
    try {
      const response = await productionAPI.exportChecklistPDF(id)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `checklist_${id}.pdf`)
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
            {isEdit ? 'Edit Checklist' : 'New Checklist'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isEdit && (
              <Button variant="outlined" onClick={handleExportPDF}>
                Export PDF
              </Button>
            )}
            <Button variant="outlined" onClick={() => navigate('/production/checklists')}>
              Back to Checklists
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
            {/* Job Number and Basic Details */}
            <Grid item xs={12} md={6}>
              <Controller
                name="job_number"
                control={control}
                rules={{ required: 'Required' }}
                render={({ field: { onChange, value } }) => (
                  <SearchableSelect
                    label="Job Number"
                    value={value || ''}
                    onChange={(nextJobNo) => {
                      onChange(nextJobNo)

                      if (isEdit) return

                      const selected = (jobNumbers || []).find((j) => j.job_number === nextJobNo)
                      if (selected) {
                        const currentDate = getValues('date')

                        setValue('party_name', selected.party_name || '')
                        setValue('department', selected.department || '')
                        if (!currentDate) setValue('date', new Date().toISOString().slice(0, 10))
                      }
                    }}
                    options={(jobNumbers || []).map((job) => ({
                      label: `${job.job_number} - ${job.party_name} (${job.department})`,
                      value: job.job_number,
                    }))}
                    error={!!errors.job_number}
                    helperText={errors.job_number?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                InputLabelProps={{ shrink: true }}
                {...register('date')}
              />
            </Grid>

            {/* Basic Specifications */}
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="KW / HP" {...register('kw_hp')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="VOLTAGE (V)" {...register('voltage')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="PHASE" {...register('phase')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="CURRENT (A)" {...register('current')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="SPEED (RPM)" {...register('speed_rpm')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="SL NO" {...register('sl_no')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="TYPE" {...register('type')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="WEIGHT (KG)" {...register('weight_kg')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="MAKE" {...register('make')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="CONNECTION" {...register('connection')} />
            </Grid>

            {/* Party Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Party Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="PARTY NAME" {...register('party_name')} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="DEPARTMENT" {...register('department')} />
            </Grid>

            {/* Winding Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Winding Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="stator_winding"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="STATOR WINDING"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="STATOR WINDING REMARKS"
                {...register('stator_winding_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="rotor_winding"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="ROTOR WINDING"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="ROTOR WINDING REMARKS"
                {...register('rotor_winding_remarks')}
              />
            </Grid>

            {/* Bearing Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Bearing Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="bearing_bearing_seat_de"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="BEARING & BEARING SEAT (DE)"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="BEARING & BEARING SEAT (DE) REMARKS"
                {...register('bearing_bearing_seat_de_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="bearing_bearing_seat_nde"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="BEARING & BEARING SEAT (NDE)"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="BEARING & BEARING SEAT (NDE) REMARKS"
                {...register('bearing_bearing_seat_nde_remarks')}
              />
            </Grid>

            {/* Core Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Core Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="core_stator"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="CORE (STATOR)"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="CORE (STATOR) REMARKS"
                {...register('core_stator_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="core_rotor"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="CORE (ROTOR)"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="CORE (ROTOR) REMARKS"
                {...register('core_rotor_remarks')}
              />
            </Grid>

            {/* Additional Components */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Additional Components</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="rotor_shaft"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="ROTOR SHAFT"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="ROTOR SHAFT REMARKS"
                {...register('rotor_shaft_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="rotor_ring_bar"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="ROTOR RING / BAR"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="ROTOR RING / BAR REMARKS"
                {...register('rotor_ring_bar_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="rtd_temp_detector"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="RTD / TEMP. DETECTOR"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="RTD / TEMP. DETECTOR REMARKS"
                {...register('rtd_temp_detector_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="space_heater"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="SPACE HEATER"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="SPACE HEATER REMARKS"
                {...register('space_heater_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="fan_cover"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="FAN / COVER"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="FAN / COVER REMARKS"
                {...register('fan_cover_remarks')}
              />
            </Grid>

            {/* Grease Cup Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Grease Cup Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="grease_cup_de"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="GREASE CUP (DE)"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="GREASE CUP (DE) REMARKS"
                {...register('grease_cup_de_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="grease_cup_nde"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="GREASE CUP (NDE)"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="GREASE CUP (NDE) REMARKS"
                {...register('grease_cup_nde_remarks')}
              />
            </Grid>

            {/* Bearing Housing */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Bearing Housing</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="bearing_housing_de"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="BEARING HOUSING (DE)"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="BEARING HOUSING (DE) REMARKS"
                {...register('bearing_housing_de_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="bearing_housing_nde"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="BEARING HOUSING (NDE)"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="BEARING HOUSING (NDE) REMARKS"
                {...register('bearing_housing_nde_remarks')}
              />
            </Grid>

            {/* Terminal Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Terminal Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="btd"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="BTD"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="BTD REMARKS"
                {...register('btd_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="terminal_block"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="TERMINAL BLOCK"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="TERMINAL BLOCK REMARKS"
                {...register('terminal_block_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="terminal_box"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="TERMINAL BOX"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="TERMINAL BOX REMARKS"
                {...register('terminal_box_remarks')}
              />
            </Grid>

            {/* Final Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Final Details</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="foot_leg"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="FOOT / LEG"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="FOOT / LEG REMARKS"
                {...register('foot_leg_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="circlip_lock"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="CIRCLIP / LOCK"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="CIRCLIP / LOCK REMARKS"
                {...register('circlip_lock_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="keys"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="KEYS"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="KEYS REMARKS"
                {...register('keys_remarks')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="carbon_brush_rocker_arm"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="CARBON / BRUSH / ROCKER ARM"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="CARBON / BRUSH / ROCKER ARM REMARKS"
                {...register('carbon_brush_rocker_arm_remarks')}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="others"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="OTHERS"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/production/checklists')}>
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
                  {isEdit ? 'Update' : 'Create'} Checklist
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  )
}

export default ChecklistForm

