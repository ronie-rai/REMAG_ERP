import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material'
import { salesAPI } from '../../services/api'
import { authStorage } from '../../services/api'

function ClientForm() {
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

  const initialFormData = useMemo(
    () => ({
      client_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gst_number: '',
      pan_number: '',
      client_rating: '',
    }),
    []
  )

  const [formData, setFormData] = useState(initialFormData)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    if (!isEdit) return

    const fetchClient = async () => {
      setLoading(true)
      try {
        const res = await salesAPI.getClient(id)
        setFormData((prev) => ({ ...prev, ...res.data }))
      } catch (error) {
        console.error('Error fetching client:', error)
        const message = error?.response?.data?.error || error?.message || 'Failed to load client'
        setNotification({ open: true, message, severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isEdit && !canEdit) {
      setNotification({ open: true, message: 'Forbidden', severity: 'error' })
      return
    }

    if (!isEdit && !canCreate) {
      setNotification({ open: true, message: 'Forbidden', severity: 'error' })
      return
    }

    if (!formData.client_name.trim()) {
      setNotification({ open: true, message: 'Client Name is required', severity: 'error' })
      return
    }

    setLoading(true)
    try {
      const payload = { ...formData }
      if (isEdit) {
        await salesAPI.updateClient(id, payload)
      } else {
        await salesAPI.createClient(payload)
      }

      setNotification({ open: true, message: 'Saved successfully', severity: 'success' })
      setTimeout(() => navigate('/sales/clients'), 700)
    } catch (error) {
      console.error('Error saving client:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to save client'
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
            {isEdit ? 'Edit Client' : 'New Client'}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/sales/clients')}>
            Back to Clients
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
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Client Name"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                required
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ADDRESS"
                name="address"
                value={formData.address}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="ZIP"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="GSTIN/UIN"
                name="gst_number"
                value={formData.gst_number}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="PAN Number"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Client Rating"
                name="client_rating"
                value={formData.client_rating}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 1, max: 10, step: 1 }}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/sales/clients')} disabled={loading}>
                  Cancel
                </Button>
                {isEdit ? (
                  canEdit ? (
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
                      {loading ? 'Saving...' : 'Update'} Client
                    </Button>
                  ) : null
                ) : (
                  canCreate ? (
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
                      {loading ? 'Saving...' : 'Create'} Client
                    </Button>
                  ) : null
                )}
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

export default ClientForm
