import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  Grid,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material'
import { jobEntryAPI, salesAPI } from '../../services/api'
import SearchableSelect from '../../components/SearchableSelect'

const scopeOfWorkOptions = [
  'Rewinding',
  'Rewinding & Machining',
  'Rewinding & Overhauling',
  'Overhauling & Machining',
  'Overhauling and Balancing',
  'Machining',
  'Machining & Balancing',
  'Coil Supply',
  'Supply'
]

const jobTypeOptions = [
  'HT MOTOR',
  'LT MOTOR',
  'DC MOTOR',
  'TRANSFORMER',
  'RECTIFIER',
  'MAGNET',
  'OTHER'
]

const statusOptions = [
  'DISMANTLE',
  'CLEAN',
  'CHECK LIST',
  'DATA SHEET',
  'RAW MATERIAL PURCHASE',
  'RAW MATERIAL RECEIVED',
  'CORE/SLOT CLEANING',
  'COIL PRODUCTION',
  'MACHINING',
  'SAMPLE COIL TEST',
  'IN HOUSE INSPECTION',
  'ASSEMBLY',
  'IN HOUSE RUN TEST',
  'FINAL RUN TEST WITH CLIENT',
  'PAINT',
  'READY TO DISPATCH',
  'DISPATCH',
  'DELIVERED',
  'HOLD',
  'WARRENTY CLAIM'
]

function JobEntryForm() {
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const editingId = params.id || searchParams.get('id')
  
  const [formData, setFormData] = useState({
    party_name: '',
    work_order_id: '',
    department: '',
    job_description: '',
    gatepass_number: '',
    scope_of_work: '',
    machining: '',
    job_type: '',
    spares_received: '',
    status: 'New Job'
  })
  
  const [clients, setClients] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [nextJobNumber, setNextJobNumber] = useState(1)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [scrapDialog, setScrapDialog] = useState({ open: false, jobEntryId: null })
  const [dataSheetDialog, setDataSheetDialog] = useState({ open: false, jobEntryId: null, jobNumber: null })
  const [testReportDialog, setTestReportDialog] = useState({ open: false, jobEntryId: null, jobNumber: null })
  const [scrapData, setScrapData] = useState({ weight_kg: '', scrap_type: 'Copper' })

  useEffect(() => {
    fetchClients()
    fetchWorkOrders()
    fetchNextJobNumber()
    if (editingId) {
      fetchJobEntry(editingId)
    }
  }, [editingId])

  const fetchClients = async () => {
    try {
      const response = await salesAPI.getClients()
      setClients(response.data)
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchWorkOrders = async () => {
    try {
      const response = await salesAPI.getWorkOrders()
      setWorkOrders(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching work orders:', error)
      setWorkOrders([])
    }
  }

  const workOrderOptions = useMemo(() => {
    return (workOrders || []).map((wo) => ({
      label: `${wo.wo_number || wo.id}${wo.wo_date ? ` - ${wo.wo_date}` : ''}`,
      value: String(wo.id),
      data: wo,
    }))
  }, [workOrders])

  const fetchNextJobNumber = async () => {
    try {
      const response = await jobEntryAPI.getNextJobNumber()
      setNextJobNumber(response.data.nextJobNumber)
    } catch (error) {
      console.error('Error fetching next job number:', error)
    }
  }

  const fetchJobEntry = async (id) => {
    try {
      const response = await jobEntryAPI.getJobEntry(id)
      const data = response.data || {}
      setFormData((prev) => ({
        ...prev,
        ...data,
      }))
    } catch (error) {
      console.error('Error fetching job entry:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let response
      const payload = {
        ...formData,
        work_order_id: formData.work_order_id === '' ? null : Number(formData.work_order_id),
      }
      if (editingId) {
        response = await jobEntryAPI.updateJobEntry(editingId, payload)
      } else {
        response = await jobEntryAPI.createJobEntry(payload)
      }

      if (response.data.requiresChecklist) {
        setNotification({
          open: true,
          message: response.data.message || 'Please create checklist for this job',
          severity: 'info'
        })
        navigate(`/production/checklists/new?job_no=${response.data.job_number}`)
      }
      
      setNotification({
        open: true,
        message: `Job entry ${editingId ? 'updated' : 'created'} successfully!`,
        severity: 'success'
      })
      
      setTimeout(() => {
        navigate('/production/job-entries')
      }, 1500)
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Error saving job entry'
      setNotification({
        open: true,
        message,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await jobEntryAPI.updateJobEntryStatus(
        editingId || formData.id, 
        { status: newStatus }
      )

      if (response.data.requiresIndent) {
        setNotification({
          open: true,
          message: response.data.message || 'Please create indent for this job',
          severity: 'info'
        })
        navigate(`/procurement/indents/new?job_number=${response.data.job_number}&afterStatus=${encodeURIComponent(newStatus)}&jobEntryId=${response.data.id}`)
        return
      }

      if (response.data.requiresMachining) {
        setNotification({
          open: true,
          message: response.data.message || 'Please create machining entry for this job',
          severity: 'info'
        })
        navigate(`/production/machining?job_number=${response.data.job_number}&afterStatus=${encodeURIComponent(newStatus)}&jobEntryId=${response.data.id}`)
        return
      }
      
      setFormData(prev => ({ ...prev, status: newStatus }))
      
      // Handle special status responses
      if (response.data.requiresDataSheet) {
        setDataSheetDialog({ 
          open: true, 
          jobEntryId: editingId || response.data.id,
          jobNumber: response.data.job_number
        })
      }
      
      if (response.data.requiresTestReport) {
        setTestReportDialog({ 
          open: true, 
          jobEntryId: editingId || response.data.id,
          jobNumber: response.data.job_number
        })
      }
      
      setNotification({
        open: true,
        message: response.data.message || 'Status updated successfully',
        severity: 'success'
      })
    } catch (error) {
      setNotification({
        open: true,
        message: 'Error updating status',
        severity: 'error'
      })
    }
  }

  const handleScrapSubmit = async () => {
    try {
      await jobEntryAPI.createScrapRecord(scrapDialog.jobEntryId, scrapData)
      setScrapDialog({ open: false, jobEntryId: null })
      setScrapData({ weight_kg: '', scrap_type: 'Copper' })
      setNotification({
        open: true,
        message: 'Scrap record created successfully',
        severity: 'success'
      })
    } catch (error) {
      setNotification({
        open: true,
        message: 'Error creating scrap record',
        severity: 'error'
      })
    }
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
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
            Job Entry
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/production/job-entries')}>
            Back to Job Entries
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
                label="Job Number"
                value={editingId ? formData.job_number : nextJobNumber}
                disabled
                helperText="Auto-generated"
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <SearchableSelect
                label="Party Name"
                value={formData.party_name}
                onChange={(next) => setFormData((p) => ({ ...p, party_name: next }))}
                options={(clients || []).map((client) => ({
                  label: client.client_name,
                  value: client.client_name,
                }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <SearchableSelect
                label="Department"
                value={formData.department}
                onChange={(next) => setFormData((p) => ({ ...p, department: next }))}
                options={[
                  { label: 'Production', value: 'Production' },
                  { label: 'Maintenance', value: 'Maintenance' },
                  { label: 'Quality', value: 'Quality' },
                ]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Gatepass Number"
                name="gatepass_number"
                value={formData.gatepass_number}
                onChange={handleChange}
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Job Description"
                name="job_description"
                value={formData.job_description}
                onChange={handleChange}
                multiline
                rows={3}
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <SearchableSelect
                label="Scope of Work"
                value={formData.scope_of_work}
                onChange={(next) => setFormData((p) => ({ ...p, scope_of_work: next }))}
                options={scopeOfWorkOptions.map((option) => ({ label: option, value: option }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <SearchableSelect
                label="Work Order"
                value={formData.work_order_id ? String(formData.work_order_id) : ''}
                onChange={(next) => setFormData((p) => ({ ...p, work_order_id: next }))}
                options={workOrderOptions}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Machining"
                name="machining"
                value={formData.machining}
                onChange={handleChange}
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <SearchableSelect
                label="Job Type"
                value={formData.job_type}
                onChange={(next) => setFormData((p) => ({ ...p, job_type: next }))}
                options={jobTypeOptions.map((option) => ({ label: option, value: option }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Spares Received"
                name="spares_received"
                value={formData.spares_received}
                onChange={handleChange}
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <SearchableSelect
                label="Status"
                value={formData.status}
                onChange={(next) => setFormData((p) => ({ ...p, status: next }))}
                options={statusOptions.map((option) => ({ label: option, value: option }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
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
                  {loading ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/production/job-entries')}
                >
                  Cancel
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Scrap Input Dialog */}
      <Dialog open={scrapDialog.open} onClose={() => setScrapDialog({ open: false, jobEntryId: null })}>
        <DialogTitle>Add Scrap Record</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Scrap Weight (kg)"
            value={scrapData.weight_kg}
            onChange={(e) => setScrapData(prev => ({ ...prev, weight_kg: e.target.value }))}
            type="number"
            margin="dense"
          />
          <SearchableSelect
            label="Scrap Type"
            value={scrapData.scrap_type}
            onChange={(next) => setScrapData((p) => ({ ...p, scrap_type: next }))}
            options={[
              { label: 'Copper', value: 'Copper' },
              { label: 'Aluminium', value: 'Aluminium' },
            ]}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScrapDialog({ open: false, jobEntryId: null })}>
            Cancel
          </Button>
          <Button onClick={handleScrapSubmit} variant="contained">
            Save Scrap Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Data Sheet Dialog */}
      <Dialog open={dataSheetDialog.open} onClose={() => setDataSheetDialog({ open: false, jobEntryId: null, jobNumber: null })}>
        <DialogTitle>Create Data Sheet</DialogTitle>
        <DialogContent>
          <Typography>
            Please create a data sheet for Job Number: {dataSheetDialog.jobNumber}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDataSheetDialog({ open: false, jobEntryId: null, jobNumber: null })}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              navigate(`/production/ac-data-sheets/new?job_no=${dataSheetDialog.jobNumber}`)
              setDataSheetDialog({ open: false, jobEntryId: null, jobNumber: null })
            }} 
            variant="contained"
          >
            Create AC Motor Data Sheet
          </Button>
          <Button 
            onClick={() => {
              navigate(`/production/dc-data-sheets/new?job_no=${dataSheetDialog.jobNumber}`)
              setDataSheetDialog({ open: false, jobEntryId: null, jobNumber: null })
            }} 
            variant="contained"
          >
            Create DC Motor Data Sheet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Report Dialog */}
      <Dialog open={testReportDialog.open} onClose={() => setTestReportDialog({ open: false, jobEntryId: null, jobNumber: null })}>
        <DialogTitle>Create Test Report</DialogTitle>
        <DialogContent>
          <Typography>
            Please create a test report for Job Number: {testReportDialog.jobNumber}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestReportDialog({ open: false, jobEntryId: null, jobNumber: null })}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              navigate(`/production/test-reports/new?job_number=${testReportDialog.jobNumber}`)
              setTestReportDialog({ open: false, jobEntryId: null, jobNumber: null })
            }} 
            variant="contained"
          >
            Create Test Report
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert severity={notification.severity} onClose={handleCloseNotification}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default JobEntryForm
