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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { storeAPI } from '../../services/api'

const unitOptions = [
  'Nos',
  'Kg',
  'Gram',
  'Ltr',
  'Ml',
  'Mtr',
  'Cm',
  'Mm',
  'Sqft',
  'Sqm',
  'Set',
  'Box',
  'Packet',
]

function SKUForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const initialFormData = useMemo(
    () => ({
      sku_code: '',
      item_name: '',
      size_type: '',
      category: '',
      unit: '',
      max_level: '',
    }),
    []
  )

  const [formData, setFormData] = useState(initialFormData)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    if (!isEdit) return

    const fetchSKU = async () => {
      setLoading(true)
      try {
        const res = await storeAPI.getSKU(id)
        setFormData((prev) => ({
          ...prev,
          ...res.data,
          max_level: res.data?.max_level ?? '',
        }))
      } catch (error) {
        console.error('Error fetching SKU:', error)
        const message = error?.response?.data?.error || error?.message || 'Failed to load SKU'
        setNotification({ open: true, message, severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchSKU()
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

    if (!formData.sku_code.trim()) {
      setNotification({ open: true, message: 'SKU Code is required', severity: 'error' })
      return
    }

    if (!formData.item_name.trim()) {
      setNotification({ open: true, message: 'Item Name is required', severity: 'error' })
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        max_level: formData.max_level === '' ? null : Number(formData.max_level),
      }

      if (isEdit) {
        await storeAPI.updateSKU(id, payload)
      } else {
        await storeAPI.createSKU(payload)
      }

      setNotification({ open: true, message: 'Saved successfully', severity: 'success' })
      setTimeout(() => navigate('/store/skus'), 700)
    } catch (error) {
      console.error('Error saving SKU:', error)
      const message = error?.response?.data?.error || error?.message || 'Failed to save SKU'
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
            {isEdit ? 'Edit SKU' : 'New SKU'}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/store/skus')}>
            Back to SKUs
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
                label="SKU Code"
                name="sku_code"
                value={formData.sku_code}
                onChange={handleChange}
                required
                size="small"
                disabled={loading || isEdit}
                helperText={isEdit ? 'SKU code cannot be changed' : ''}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Item Name"
                name="item_name"
                value={formData.item_name}
                onChange={handleChange}
                required
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Size/Type"
                name="size_type"
                value={formData.size_type}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="unit-label">Unit</InputLabel>
                <Select
                  labelId="unit-label"
                  label="Unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  disabled={loading}
                >
                  {unitOptions.map((u) => (
                    <MenuItem key={u} value={u}>
                      {u}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Level"
                name="max_level"
                value={formData.max_level}
                onChange={handleChange}
                type="number"
                size="small"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/store/skus')} disabled={loading}>
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
                  {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'} SKU
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

export default SKUForm
