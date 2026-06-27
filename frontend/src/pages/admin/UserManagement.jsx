import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import axios from 'axios'
import { authStorage } from '../../services/api'
import { getComparator, stableSort } from '../../utils/tableSort'

const modules = ['sales', 'production', 'procurement', 'store', 'accounting']
const actions = ['view', 'create', 'edit', 'delete', 'approve']

const pagesByModule = {
  sales: [
    { key: 'enquiries', label: 'Enquiries' },
    { key: 'quotations', label: 'Quotations' },
    { key: 'work_orders', label: 'Work Orders' },
    { key: 'clients', label: 'Clients' },
  ],
  production: [
    { key: 'job_entries', label: 'Job Entries' },
    { key: 'checklists', label: 'Checklists' },
    { key: 'machining', label: 'Machining' },
    { key: 'ac_data_sheets', label: 'AC Data Sheet' },
    { key: 'dc_data_sheets', label: 'DC Data Sheet' },
    { key: 'test_reports', label: 'Test Report' },
  ],
  procurement: [
    { key: 'indents', label: 'Indents' },
    { key: 'purchase_orders', label: 'Purchase Orders' },
    { key: 'grns', label: 'GRN' },
    { key: 'vendors', label: 'Vendors' },
  ],
  store: [
    { key: 'skus', label: 'SKUs' },
    { key: 'advance_booking', label: 'Advance Booking' },
    { key: 'issues', label: 'Issues' },
  ],
  accounting: [
    { key: 'bills', label: 'Bills' },
    { key: 'payments', label: 'Payments' },
  ],
}

function UserManagement() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const user = authStorage.getUser()
  const isChairman = user?.role === 'chairman'

  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('id')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [mode, setMode] = useState('create')

  const columns = useMemo(
    () => [
      { id: 'id', label: 'ID', getValue: (u) => u.id },
      { id: 'username', label: 'Username', getValue: (u) => u.username },
      { id: 'role', label: 'Role', getValue: (u) => u.role },
      { id: 'created_at', label: 'Created', getValue: (u) => u.created_at },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const sortedUsers = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return users
    return stableSort(users, getComparator(order, col.getValue))
  }, [columns, order, orderBy, users])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  const initialPermissions = useMemo(() => {
    const p = {}
    modules.forEach((m) => {
      p[m] = {}
      actions.forEach((a) => {
        p[m][a] = false
      })

      p[m].pages = {}
      ;(pagesByModule[m] || []).forEach((pg) => {
        p[m].pages[pg.key] = {}
        actions.forEach((a) => {
          p[m].pages[pg.key][a] = false
        })
      })
    })
    return p
  }, [])

  const [form, setForm] = useState({ username: '', password: '', role: 'user' })
  const [permissions, setPermissions] = useState(initialPermissions)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })

  const closeNotification = () => setNotification((p) => ({ ...p, open: false }))

  useEffect(() => {
    if (!isChairman) {
      navigate('/', { replace: true })
    }
  }, [isChairman, navigate])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await axios.get('/api/auth/users', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      })
      const usersRaw = Array.isArray(res.data?.users) ? res.data.users : []
      setUsers(usersRaw)
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load users'
      setNotification({ open: true, message, severity: 'error' })
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }

  const resetToCreate = () => {
    setMode('create')
    setSelectedUserId(null)
    setForm({ username: '', password: '', role: 'user' })
    setPermissions(initialPermissions)
  }

  const normalizePermissions = (raw) => {
    const src = raw && typeof raw === 'object' ? raw : {}
    const merged = JSON.parse(JSON.stringify(initialPermissions))

    modules.forEach((m) => {
      const msrc = src[m] && typeof src[m] === 'object' ? src[m] : {}
      actions.forEach((a) => {
        if (typeof msrc[a] === 'boolean') merged[m][a] = msrc[a]
      })

      const pages = msrc.pages && typeof msrc.pages === 'object' ? msrc.pages : {}
      ;(pagesByModule[m] || []).forEach((pg) => {
        const psrc = pages[pg.key] && typeof pages[pg.key] === 'object' ? pages[pg.key] : {}
        actions.forEach((a) => {
          if (typeof psrc[a] === 'boolean') merged[m].pages[pg.key][a] = psrc[a]
        })
      })
    })

    return merged
  }

  const startEdit = (u) => {
    setMode('edit')
    setSelectedUserId(u?.id ?? null)
    setForm({ username: u?.username || '', password: '', role: u?.role || 'user' })
    setPermissions(normalizePermissions(u?.permissions))
  }

  useEffect(() => {
    if (!isChairman) return
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChairman])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const toggle = (moduleKey, actionKey) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [actionKey]: !prev[moduleKey][actionKey] },
    }))
  }

  const togglePage = (moduleKey, pageKey, actionKey) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        pages: {
          ...(prev[moduleKey]?.pages || {}),
          [pageKey]: {
            ...((prev[moduleKey]?.pages || {})[pageKey] || {}),
            [actionKey]: !(((prev[moduleKey]?.pages || {})[pageKey] || {})[actionKey] === true),
          },
        },
      },
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'edit') {
        if (!selectedUserId) {
          setNotification({ open: true, message: 'Select a user to edit', severity: 'error' })
          return
        }

        await axios.put(
          `/api/auth/users/${selectedUserId}`,
          { role: form.role, permissions },
          { headers: { Authorization: token ? `Bearer ${token}` : '' } }
        )

        setNotification({ open: true, message: 'User access updated', severity: 'success' })
        await fetchUsers()
      } else {
        await axios.post(
          '/api/auth/register',
          { ...form, permissions },
          { headers: { Authorization: token ? `Bearer ${token}` : '' } }
        )

        setNotification({ open: true, message: 'User created', severity: 'success' })
        resetToCreate()
        await fetchUsers()
      }
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || (mode === 'edit' ? 'Failed to update user' : 'Failed to create user')
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
          User Management
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, background: 'rgba(255, 255, 255, 0.95)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6">All Users</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={fetchUsers} disabled={usersLoading}>
              {usersLoading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button variant="outlined" onClick={resetToCreate} disabled={loading || usersLoading}>
              New User
            </Button>
          </Stack>
        </Box>

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.id}>
                    {c.sortable === false ? (
                      c.label
                    ) : (
                      <TableSortLabel
                        active={orderBy === c.id}
                        direction={orderBy === c.id ? order : 'asc'}
                        onClick={() => requestSort(c.id)}
                      >
                        {c.label}
                      </TableSortLabel>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedUsers.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="outlined" onClick={() => startEdit(u)} disabled={loading}>
                      Edit Access
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    {usersLoading ? 'Loading...' : 'No users'}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 3, background: 'rgba(255, 255, 255, 0.95)' }}>
        <form onSubmit={submit}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {mode === 'edit' ? `Edit Access: ${form.username || 'User'}` : 'Create User'}
          </Typography>

          <TextField
            fullWidth
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            disabled={loading || mode === 'edit'}
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            disabled={loading || mode === 'edit'}
            sx={{ mt: 2 }}
          />

          <FormControl fullWidth sx={{ mt: 2 }} size="small">
            <InputLabel id="role-label">Role</InputLabel>
            <Select labelId="role-label" label="Role" name="role" value={form.role} onChange={handleChange} disabled={loading}>
              <MenuItem value="user">user</MenuItem>
              <MenuItem value="chairman">chairman</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Permissions
          </Typography>

          {modules.map((m) => (
            <Box key={m} sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 'bold', textTransform: 'uppercase', mb: 0.5 }}>{m}</Typography>

              <Typography variant="body2" sx={{ mt: 1, mb: 0.5, opacity: 0.8 }}>
                Module defaults (legacy)
              </Typography>
              <FormGroup row>
                {actions.map((a) => (
                  <FormControlLabel
                    key={`${m}-${a}`}
                    control={<Checkbox checked={permissions[m][a]} onChange={() => toggle(m, a)} />}
                    label={a}
                  />
                ))}
              </FormGroup>

              <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5, opacity: 0.8 }}>
                Pages
              </Typography>

              {(pagesByModule[m] || []).map((pg) => (
                <Box key={`${m}-${pg.key}`} sx={{ pl: 1.5, pb: 0.5 }}>
                  <Typography sx={{ fontWeight: 600 }}>{pg.label}</Typography>
                  <FormGroup row>
                    {actions.map((a) => (
                      <FormControlLabel
                        key={`${m}-${pg.key}-${a}`}
                        control={
                          <Checkbox
                            checked={permissions[m]?.pages?.[pg.key]?.[a] === true}
                            onChange={() => togglePage(m, pg.key, a)}
                          />
                        }
                        label={a}
                      />
                    ))}
                  </FormGroup>
                </Box>
              ))}
            </Box>
          ))}

          <Button type="submit" variant="contained" disabled={loading} sx={{ mt: 2 }}>
            {loading ? 'Saving...' : mode === 'edit' ? 'Update Access' : 'Create User'}
          </Button>
        </form>
      </Paper>

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

export default UserManagement
