import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { procurementAPI } from '../../services/api'

function IndentApprovals() {
  const [indents, setIndents] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const closeNotification = () => setNotification((p) => ({ ...p, open: false }))

  const fetchRaised = async () => {
    setLoading(true)
    try {
      const res = await procurementAPI.getIndents({ status: 'Raised' })
      setIndents(res.data || [])
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load indents'
      setNotification({ open: true, message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRaised()
  }, [])

  const approve = async (indent) => {
    setLoading(true)
    try {
      await procurementAPI.approveIndent(indent.id)
      setNotification({ open: true, message: `Approved ${indent.indent_number}`, severity: 'success' })
      await fetchRaised()
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to approve'
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
      <Paper sx={{ p: 3, mb: 3, background: 'rgba(255, 255, 255, 0.9)' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Approve Indents
        </Typography>
      </Paper>

      <TableContainer component={Paper} sx={{ background: 'rgba(255, 255, 255, 0.95)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Indent Number</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {indents.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.indent_number}</TableCell>
                <TableCell>{i.indent_type}</TableCell>
                <TableCell>{i.status}</TableCell>
                <TableCell>{i.created_at ? new Date(i.created_at).toLocaleDateString() : '-'}</TableCell>
                <TableCell align="right">
                  <Button variant="contained" size="small" onClick={() => approve(i)} disabled={loading}>
                    Approve
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {indents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No Raised indents.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={notification.severity} onClose={closeNotification}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default IndentApprovals
