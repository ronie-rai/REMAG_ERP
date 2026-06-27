import React from 'react'
import { Box, Button, Paper, Typography } from '@mui/material'
import { authStorage } from '../services/api'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo)
  }

  handleLogout = () => {
    authStorage.clear()
    window.location.href = '/login'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 2,
        }}
      >
        <Paper sx={{ p: 3, width: '100%', maxWidth: 720 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            The app crashed while rendering your account. Please logout and login again. If it still happens, share the
            browser console error so we can fix the exact cause.
          </Typography>

          <Paper variant="outlined" sx={{ mt: 2, p: 2, background: '#fafafa' }}>
            <Typography variant="subtitle2">Error</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {String(this.state.error?.message || this.state.error || 'Unknown error')}
            </Typography>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end' }}>
            <Button variant="contained" color="error" onClick={this.handleLogout}>
              Logout
            </Button>
          </Box>
        </Paper>
      </Box>
    )
  }
}

export default ErrorBoundary
