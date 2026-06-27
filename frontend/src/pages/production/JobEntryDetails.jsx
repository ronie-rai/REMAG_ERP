import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Divider,
  Chip,
} from '@mui/material'
import { jobEntryAPI, productionAPI } from '../../services/api'
import { formatDate, formatDateTime } from '../../utils/dateFormat'

function JobEntryDetails() {
  const navigate = useNavigate()
  const { jobNumber } = useParams()
  const [jobEntry, setJobEntry] = useState(null)
  const [checklists, setChecklists] = useState([])
  const [statusHistory, setStatusHistory] = useState([])

  useEffect(() => {
    const fetch = async () => {
      try {
        const [jeRes, clRes] = await Promise.all([
          jobEntryAPI.getJobEntryByJobNumber(jobNumber),
          productionAPI.getChecklistsByJobNumber(jobNumber),
        ])
        setJobEntry(jeRes.data)
        setChecklists(clRes.data || [])

        if (jeRes?.data?.id) {
          try {
            const histRes = await jobEntryAPI.getJobEntryStatusHistory(jeRes.data.id)
            setStatusHistory(histRes.data || [])
          } catch (e) {
            console.error('Error fetching status history:', e)
          }
        }
      } catch (error) {
        console.error('Error fetching job entry details:', error)
      }
    }
    if (jobNumber) fetch()
  }, [jobNumber])

  const receivedDate = jobEntry?.timestamp || jobEntry?.created_at

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
            Job Entry Details
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate(`/production/job-entries/${jobEntry?.id}/edit`)} disabled={!jobEntry?.id}>
              Edit
            </Button>
            <Button variant="outlined" onClick={() => navigate('/production/job-entries')}>
              Back to Job Entries
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
                <Typography variant="body1">{formatDate(receivedDate)}</Typography>
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Department</Typography>
                <Typography variant="body1">{jobEntry.department || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Gatepass</Typography>
                <Typography variant="body1">{jobEntry.gatepass_number || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Scope of Work</Typography>
                <Typography variant="body1">{jobEntry.scope_of_work || '-'}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2">Job Description</Typography>
                <Typography variant="body1">{jobEntry.job_description || '-'}</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Machining</Typography>
                <Typography variant="body1">{jobEntry.machining || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Spares Received</Typography>
                <Typography variant="body1">{jobEntry.spares_received || '-'}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2">Status</Typography>
                <Chip label={jobEntry.status || 'New Job'} size="small" />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 1 }}>
              Status History
            </Typography>
            {statusHistory.length === 0 ? (
              <Typography>No status history found.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {statusHistory.map((h, idx) => {
                  const ts = formatDateTime(h.created_at)
                  return (
                    <Box
                      key={`${h.created_at || ''}-${idx}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 2,
                        p: 1.5,
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="subtitle2">{h.status || (h.status_remarks ? 'STATUS REMARKS UPDATED' : '-')}</Typography>
                        {h.status_remarks ? (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Remarks: {h.status_remarks}
                          </Typography>
                        ) : null}
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{ts}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Done By: {h.username || '-'}
                        </Typography>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 1 }}>
              Checklists
            </Typography>
            {checklists.length === 0 ? (
              <Typography>No checklists found for this Job No.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {checklists.map((c) => (
                  <Button
                    key={c.id}
                    variant="outlined"
                    onClick={() => navigate(`/production/checklists/job/${jobEntry.job_number}`)}
                    sx={{ justifyContent: 'space-between' }}
                  >
                    <span>Checklist #{c.id}</span>
                    <span>View</span>
                  </Button>
                ))}
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  )
}

export default JobEntryDetails
