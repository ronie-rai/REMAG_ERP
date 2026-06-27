import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import SearchableSelect from '../../components/SearchableSelect'

function WorkOrderForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const [searchParams] = useSearchParams()
  const enquiryId = searchParams.get('enquiry_id')

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

  const [loading, setLoading] = useState(false)
  const [enquiries, setEnquiries] = useState([])
  const [formData, setFormData] = useState({
    enquiry_id: enquiryId ? Number(enquiryId) : '',
    wo_link: '',
    wo_number: '',
    wo_date: '',
    wo_value: '',
    wo_delivery: '',
    status: 'Received',
  })
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const toDateInput = (v) => {
    if (!v) return ''
    const s = String(v)
    return s.length >= 10 ? s.slice(0, 10) : s
  }

  useEffect(() => {
    if (isEdit) return
    if (enquiryId) {
      setFormData((prev) => ({ ...prev, enquiry_id: Number(enquiryId) }))
    }
  }, [enquiryId, isEdit])

  useEffect(() => {
    const fetchPendingEnquiries = async () => {
      try {
        const res = await salesAPI.getEnquiriesPendingWorkOrders()
        setEnquiries(res.data || [])
      } catch (error) {
        console.error('Error fetching enquiries pending work orders:', error)
      }
    }

    fetchPendingEnquiries()
  }, [])

  useEffect(() => {
    if (!isEdit) return

    const fetchWorkOrder = async () => {
      setLoading(true)
      try {
        const res = await salesAPI.getWorkOrder(id)
        const wo = res.data || {}

        setFormData({
          enquiry_id: wo.enquiry_id || '',
          wo_link: wo.wo_link || '',
          wo_number: wo.wo_number || '',
          wo_date: toDateInput(wo.wo_date),
          wo_value: wo.wo_value ?? '',
          wo_delivery: toDateInput(wo.wo_delivery),
          status: wo.status || 'Received',
        })

        if (wo.enquiry_id && !enquiries.some((e) => e.id === wo.enquiry_id)) {
          try {
            const er = await salesAPI.getEnquiry(wo.enquiry_id)
            const e = er.data
            if (e) setEnquiries((prev) => [{ id: e.id, enquiry_no: e.enquiry_no, customer_name: e.customer_name }, ...prev])
          } catch (e) {
            // ignore
          }
        }
      } catch (error) {
        console.error('Error fetching work order:', error)
        const message = error?.response?.data?.error || error?.message || 'Failed to load work order'
        setNotification({ open: true, message, severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchWorkOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (!formData.enquiry_id) {
      setNotification({ open: true, message: 'Enquiry ID is required', severity: 'error' })
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        enquiry_id: formData.enquiry_id === '' ? null : Number(formData.enquiry_id),
        wo_value: formData.wo_value === '' ? null : Number(formData.wo_value),
      }

      if (isEdit) {
        await salesAPI.updateWorkOrder(id, payload)
      } else {
        await salesAPI.createWorkOrder(payload)
      }

      setNotification({ open: true, message: isEdit ? 'Work Order updated successfully' : 'Work Order created successfully', severity: 'success' })
      setTimeout(() => navigate('/sales/work-orders'), 800)
    } catch (error) {
      console.error('Error creating work order:', error)
      const message =
        error?.response?.data?.error ||
        error?.message ||
        (isEdit ? 'Failed to update work order' : 'Failed to create work order')
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
            {isEdit ? 'Edit Work Order' : 'New Work Order'}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/sales/work-orders')}>
            Back to Work Orders
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
              <SearchableSelect
                label="Enquiry ID"
                value={formData.enquiry_id}
                onChange={(next) => setFormData((p) => ({ ...p, enquiry_id: next }))}
                options={(enquiries || []).map((e) => ({
                  label: e.enquiry_no ? `${e.enquiry_no} - ${e.customer_name}` : `${e.id} - ${e.customer_name}`,
                  value: e.id,
                }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="WO Number"
                name="wo_number"
                value={formData.wo_number}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="WO Date"
                name="wo_date"
                value={formData.wo_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="WO Value"
                name="wo_value"
                value={formData.wo_value}
                onChange={handleChange}
                type="number"
                inputProps={{ step: '0.01' }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Delivery Date"
                name="wo_delivery"
                value={formData.wo_delivery}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="WO Link"
                name="wo_link"
                value={formData.wo_link}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/sales/work-orders')} disabled={loading}>
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
                      {loading ? 'Saving...' : 'Update Work Order'}
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
                      {loading ? 'Saving...' : 'Create Work Order'}
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

export default WorkOrderForm
