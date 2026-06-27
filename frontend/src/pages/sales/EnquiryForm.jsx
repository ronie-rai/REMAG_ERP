import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Autocomplete,
} from '@mui/material'
import { salesAPI } from '../../services/api'
import { authStorage } from '../../services/api'
import SearchableSelect from '../../components/SearchableSelect'

function EnquiryForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const user = authStorage.getUser()
  const isChairman = user?.role === 'chairman'
  const permissions = user?.permissions || null
  const can = (moduleKey, action) => {
    if (isChairman) return true
    if (!permissions || typeof permissions !== 'object') return false
    const modulePerms = permissions[moduleKey]
    if (!modulePerms || typeof modulePerms !== 'object') return false
    return modulePerms[action] === true
  }

  const canCreate = can('sales', 'create')
  const canEdit = can('sales', 'edit')
  const { register, handleSubmit, formState: { errors }, reset, control } = useForm({
    defaultValues: {
      input_channel: '',
      customer_name: '',
      particulars: '',
      job_scope: '',
      due_date: '',
      reference: '',
      contact_number: '',
      website_link: '',
      client_id: '',
    },
  })
  const [clients, setClients] = useState([])

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await salesAPI.getClients()
        setClients(res.data || [])
      } catch (error) {
        console.error('Error fetching clients:', error)
      }
    }

    fetchClients()
  }, [])

  useEffect(() => {
    if (!isEdit) return

    const fetchEnquiry = async () => {
      try {
        const res = await salesAPI.getEnquiry(id)
        const e = res.data || {}

        reset({
          input_channel: e.input_channel || '',
          customer_name: e.customer_name || '',
          particulars: e.particulars || '',
          job_scope: e.job_scope || '',
          due_date: e.due_date ? String(e.due_date).slice(0, 10) : '',
          reference: e.reference || '',
          contact_number: e.contact_number || '',
          website_link: e.website_link || '',
          client_id: e.client_id || '',
        })
      } catch (error) {
        console.error('Error fetching enquiry:', error)
        alert('Failed to load enquiry')
      }
    }

    fetchEnquiry()
  }, [id, isEdit, reset])

  const onSubmit = async (data) => {
    try {
      if (isEdit && !canEdit) {
        alert('Forbidden')
        return
      }
      if (!isEdit && !canCreate) {
        alert('Forbidden')
        return
      }

      const payload = { ...data }
      if (payload.client_id === '') payload.client_id = null

      if (!isEdit) {
        payload.status = 'Update Status'
      }

      if (isEdit) {
        await salesAPI.updateEnquiry(id, payload)
      } else {
        await salesAPI.createEnquiry(payload)
      }
      navigate('/sales/enquiries')
    } catch (error) {
      console.error('Error creating enquiry:', error)
      alert('Failed to create enquiry')
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
            {isEdit ? 'Edit Enquiry' : 'New Enquiry'}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/sales/enquiries')}>
            Back to Enquiries
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
            <Grid item xs={12} md={6}>
              <Controller
                name="input_channel"
                control={control}
                rules={{ required: 'Required' }}
                render={({ field: { onChange, value } }) => (
                  <SearchableSelect
                    label="Input Channel"
                    value={value || ''}
                    onChange={onChange}
                    options={[
                      { label: 'GeM Portal', value: 'GeM Portal' },
                      { label: 'Email', value: 'Email' },
                      { label: 'Call', value: 'Call' },
                      { label: 'WhatsApp', value: 'WhatsApp' },
                      { label: 'Other', value: 'Other' },
                    ]}
                    error={!!errors.input_channel}
                    helperText={errors.input_channel?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="customer_name"
                control={control}
                rules={{ required: 'Required' }}
                render={({ field: { onChange, value } }) => (
                  <Autocomplete
                    freeSolo
                    options={(clients || []).map((c) => c.client_name).filter(Boolean)}
                    value={value || ''}
                    onChange={(_, next) => onChange(next || '')}
                    onInputChange={(_, next) => onChange(next || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Customer Name"
                        error={!!errors.customer_name}
                        helperText={errors.customer_name?.message}
                        size="small"
                        InputLabelProps={value ? { shrink: true } : {}}
                      />
                    )}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Particulars"
                {...register('particulars')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="job_scope"
                control={control}
                rules={{ required: 'Required' }}
                render={({ field: { onChange, value } }) => (
                  <SearchableSelect
                    label="Job Scope"
                    value={value || ''}
                    onChange={onChange}
                    options={[
                      { label: 'Rewinding', value: 'Rewinding' },
                      { label: 'Overhauling', value: 'Overhauling' },
                      { label: 'Machining', value: 'Machining' },
                      { label: 'Rewinding & Overhauling', value: 'Rewinding & Overhauling' },
                      { label: 'Rewinding & Machining', value: 'Rewinding & Machining' },
                      { label: 'Overhauling & Machining', value: 'Overhauling & Machining' },
                      { label: 'Rewinding & Overhauling & Machining', value: 'Rewinding & Overhauling & Machining' },
                      { label: 'Supply', value: 'Supply' },
                      { label: 'In House Service', value: 'In House Service' },
                    ]}
                    error={!!errors.job_scope}
                    helperText={errors.job_scope?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                InputLabelProps={{ shrink: true }}
                {...register('due_date')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Reference"
                {...register('reference')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Number"
                {...register('contact_number')}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website Link"
                {...register('website_link')}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/sales/enquiries')}>
                  Cancel
                </Button>
                {isEdit ? (
                  canEdit ? (
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
                      Update Enquiry
                    </Button>
                  ) : null
                ) : (
                  canCreate ? (
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
                      Create Enquiry
                    </Button>
                  ) : null
                )}
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  )
}

export default EnquiryForm

