import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Divider,
} from '@mui/material'
import { format } from 'date-fns'
import { jobEntryAPI, productionAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'

function ChecklistDetails() {
  const navigate = useNavigate()
  const { jobNumber } = useParams()
  const [jobEntry, setJobEntry] = useState(null)
  const [checklists, setChecklists] = useState([])

  useEffect(() => {
    const fetch = async () => {
      try {
        const [jeRes, clRes] = await Promise.all([
          jobEntryAPI.getJobEntryByJobNumber(jobNumber),
          productionAPI.getChecklistsByJobNumber(jobNumber),
        ])
        setJobEntry(jeRes.data)
        setChecklists(clRes.data || [])
      } catch (error) {
        console.error('Error fetching job entry details:', error)
      }
    }
    if (jobNumber) fetch()
  }, [jobNumber])

  const receivedDate = jobEntry?.timestamp || jobEntry?.created_at

  const safeFormatDate = (value) => formatDate(value)

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
            Checklist Details
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
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
        {!jobEntry ? (
          <Typography>Loading...</Typography>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Job Entry
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Job No.</Typography>
                <Typography variant="body1" fontWeight="bold">{jobEntry.job_number}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Party Name</Typography>
                <Typography variant="body1">{jobEntry.party_name || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Job Type</Typography>
                <Typography variant="body1">{jobEntry.job_type || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Received Date</Typography>
                <Typography variant="body1">{safeFormatDate(receivedDate)}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 1 }}>
              Checklists
            </Typography>
            {checklists.length === 0 ? (
              <Typography>No checklists found for this Job No.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {checklists.map((c) => (
                  <Paper key={c.id} sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography fontWeight="bold">Checklist #{c.id}</Typography>
                      <Button variant="outlined" onClick={() => navigate(`/production/checklists/${c.id}`)}>
                        Open
                      </Button>
                    </Box>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={3}>
                        <Typography variant="subtitle2">Make</Typography>
                        <Typography variant="body2">{c.make || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="subtitle2">Type</Typography>
                        <Typography variant="body2">{c.type || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="subtitle2">Serial No</Typography>
                        <Typography variant="body2">{c.sl_no || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="subtitle2">Date</Typography>
                        <Typography variant="body2">{safeFormatDate(c.date)}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  )
}

export default ChecklistDetails
