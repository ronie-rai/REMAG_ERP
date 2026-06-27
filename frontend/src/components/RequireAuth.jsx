import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Box, LinearProgress } from '@mui/material'
import { authAPI, authStorage } from '../services/api'

function RequireAuth({ children }) {
  const location = useLocation()
  const token = authStorage.getToken()
  const [checking, setChecking] = useState(true)
  const [ok, setOk] = useState(false)

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  useEffect(() => {
    let alive = true

    const check = async () => {
      try {
        const res = await authAPI.me()
        const user = res.data?.user || null
        if (!alive) return

        authStorage.setAuth({ token, user })
        setOk(true)
      } catch {
        if (!alive) return
        authStorage.clear()
        setOk(false)
      } finally {
        if (!alive) return
        setChecking(false)
      }
    }

    check()
    return () => {
      alive = false
    }
    // token is the current token snapshot; if it changes, re-check.
  }, [token])

  if (checking) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!ok) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default RequireAuth
