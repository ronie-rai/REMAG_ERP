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
import { procurementAPI } from '../../services/api'

function VendorForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const initialFormData = useMemo(
    () => ({
      vendor_name: '',
      vendor_address: '',
      contact_person: '',
      contact_number: '',
      email: '',
      gst_number: '',
    }),
    []
  )

  const [formData, setFormData] = useState(initialFormData)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    if (!isEdit) return

    const fetchVendor = async () => {
      setLoading(true)
      try {
        const res = await procurementAPI.getVendor(id)
        setFormData((prev) => ({ ...prev, ...res.data }))
      } catch (error) {
        console.error('Error fetching vendor:', error)
        const message = error?.response?.data?.error || error?.message || 'Failed to load vendor'
        setNotification({ open: true, message, severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchVendor()
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

    if (!formData.vendor_name.trim()) {
      setNotification({ open: true, message: 'Vendor Name is required', severity: 'error' })
      return
    }

    setLoading(true)
    try {
      const payload = { ...formData }
      if (isEdit) {
        await procurementAPI.updateVendor(id, payload)
      } else {
        await procurementAPI.createVendor(payload)
      }

      setNotification({ open: true, message: 'Saved successfully', severity: 'success' })
      setTimeout(() => navigate('/procurement/vendors'), 700)
    } catch (error) {
      console.error('Error saving vendor:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to save vendor'
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
            {isEdit ? 'Edit Vendor' : 'New Vendor'}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/procurement/vendors')}>
            Back to Vendors
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
                label="Vendor Name"
                name="vendor_name"
                value={formData.vendor_name}
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
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ADDRESS"
                name="vendor_address"
                value={formData.vendor_address}
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

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/procurement/vendors')} disabled={loading}>
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
                  {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'} Vendor
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

export default VendorForm
