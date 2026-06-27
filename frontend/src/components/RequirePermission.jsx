import React, { useMemo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authStorage } from '../services/api'

function canPage(user, moduleKey, pageKey, action) {
  if (!user) return false
  if (user.role === 'chairman') return true

  const perms = user.permissions
  if (!perms || typeof perms !== 'object') return false

  const modulePerms = perms[moduleKey]
  if (!modulePerms || typeof modulePerms !== 'object') return false

  const pages = modulePerms.pages
  if (!pages || typeof pages !== 'object') {
    return modulePerms[action] === true
  }

  const pagePerms = pages[pageKey]
  if (!pagePerms || typeof pagePerms !== 'object') return false

  return pagePerms[action] === true
}

function RequirePermission({ moduleKey, pageKey, action = 'view', children }) {
  const location = useLocation()
  const user = authStorage.getUser()

  const ok = useMemo(() => canPage(user, moduleKey, pageKey, action), [user, moduleKey, pageKey, action])

  if (!ok) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children
}

export default RequirePermission
