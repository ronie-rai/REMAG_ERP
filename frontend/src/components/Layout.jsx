import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  Collapse,
  CssBaseline,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Button from '@mui/material/Button'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import BusinessIcon from '@mui/icons-material/Business'
import BuildIcon from '@mui/icons-material/Build'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HistoryIcon from '@mui/icons-material/History'

import { auditAPI, authStorage } from '../services/api'

const drawerWidth = 240

const menuItems = [
  { text: 'DASHBOARD', icon: <DashboardIcon />, path: '/dashboard' },
  {
    text: 'SALES & CRM',
    icon: <BusinessIcon />,
    children: [
      { text: 'ENQUIRIES', path: '/sales/enquiries' },
      { text: 'QUOTATIONS', path: '/sales/quotations' },
      { text: 'WORK ORDERS', path: '/sales/work-orders' },
      { text: 'BILLING', path: '/sales/billing' },
      { text: 'ALL BILLS', path: '/sales/payment-received' },
      { text: 'CLIENTS', path: '/sales/clients' },
    ],
  },
  {
    text: 'PRODUCTION',
    icon: <BuildIcon />,
    children: [
      { text: 'JOB ENTRIES', path: '/production/job-entries' },
      { text: 'CHECKLISTS', path: '/production/checklists' },
      { text: 'MACHINING', path: '/production/machining' },
      {
        text: 'DATA SHEET',
        children: [
          { text: 'AC MOTOR', path: '/production/ac-data-sheets' },
          { text: 'DC MOTOR', path: '/production/dc-data-sheets' },
        ],
      },
      { text: 'TEST REPORT', path: '/production/test-reports' },
    ],
  },
  {
    text: 'PROCUREMENT',
    icon: <ShoppingCartIcon />,
    children: [
      { text: 'INDENTS', path: '/procurement/indents' },
      { text: 'APPROVE INDENTS', path: '/procurement/indents/approvals' },
      { text: 'PURCHASE ORDERS', path: '/procurement/purchase-orders' },
      { text: 'GRN', path: '/procurement/grns' },
      { text: 'VENDORS', path: '/procurement/vendors' },
    ],
  },
  {
    text: 'STORE',
    icon: <Inventory2Icon />,
    children: [
      { text: 'SKUS', path: '/store/skus' },
      { text: 'ADVANCE BOOKING', path: '/store/advance-booking' },
      { text: 'ISSUES', path: '/store/issues' },
    ],
  },
  {
    text: 'ACCOUNTING',
    icon: <AccountBalanceIcon />,
    children: [
      { text: 'BILLS', path: '/accounting/bills' },
      { text: 'PAYMENTS', path: '/accounting/payments' },
    ],
  },
  {
    text: 'ADMIN',
    icon: <BusinessIcon />,
    children: [{ text: 'USERS', path: '/admin/users' }],
  },
]

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const navigate = useNavigate()
  const location = useLocation()

  const theme = useTheme()
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'))

  const token = authStorage.getToken()
  const user = authStorage.getUser()
  const isChairman = user?.role === 'chairman'
  const permissions = user?.permissions || null

  const hasModulePermission = (moduleKey) => {
    if (isChairman) return true
    if (!permissions || typeof permissions !== 'object') return false
    const modulePerms = permissions[moduleKey]
    if (!modulePerms || typeof modulePerms !== 'object') return false
    const directActions = Object.entries(modulePerms)
      .filter(([k]) => k !== 'pages')
      .map(([, v]) => v)
    if (directActions.some((v) => v === true)) return true

    const pages = modulePerms.pages
    if (!pages || typeof pages !== 'object') return false
    return Object.values(pages).some((pagePerms) => {
      if (!pagePerms || typeof pagePerms !== 'object') return false
      return Object.values(pagePerms).some((v) => v === true)
    })
  }

  const can = (moduleKey, action) => {
    if (isChairman) return true
    if (!permissions || typeof permissions !== 'object') return false
    const modulePerms = permissions[moduleKey]
    if (!modulePerms || typeof modulePerms !== 'object') return false
    return modulePerms[action] === true
  }

  const canPage = (moduleKey, pageKey, action) => {
    if (isChairman) return true
    if (!permissions || typeof permissions !== 'object') return false
    const modulePerms = permissions[moduleKey]
    if (!modulePerms || typeof modulePerms !== 'object') return false

    const pages = modulePerms.pages
    if (!pages || typeof pages !== 'object') {
      return modulePerms[action] === true
    }

    const pagePerms = pages[pageKey]
    if (!pagePerms || typeof pagePerms !== 'object') return false
    return pagePerms[action] === true
  }

  const pathToPageKey = (path) => {
    if (!path) return null
    if (path.startsWith('/sales/enquiries')) return { module: 'sales', page: 'enquiries' }
    if (path.startsWith('/sales/work-orders')) return { module: 'sales', page: 'work_orders' }
    if (path.startsWith('/sales/clients')) return { module: 'sales', page: 'clients' }

    if (path.startsWith('/production/job-entries')) return { module: 'production', page: 'job_entries' }
    if (path.startsWith('/production/checklists')) return { module: 'production', page: 'checklists' }
    if (path.startsWith('/production/machining')) return { module: 'production', page: 'machining' }
    if (path.startsWith('/production/ac-data-sheets')) return { module: 'production', page: 'ac_data_sheets' }
    if (path.startsWith('/production/dc-data-sheets')) return { module: 'production', page: 'dc_data_sheets' }
    if (path.startsWith('/production/test-reports')) return { module: 'production', page: 'test_reports' }

    if (path.startsWith('/procurement/indents/approvals')) return { module: 'procurement', page: 'indents' }
    if (path.startsWith('/procurement/indents')) return { module: 'procurement', page: 'indents' }
    if (path.startsWith('/procurement/purchase-orders')) return { module: 'procurement', page: 'purchase_orders' }
    if (path.startsWith('/procurement/grns')) return { module: 'procurement', page: 'grns' }
    if (path.startsWith('/procurement/vendors')) return { module: 'procurement', page: 'vendors' }

    if (path.startsWith('/store/skus')) return { module: 'store', page: 'skus' }
    if (path.startsWith('/store/issues')) return { module: 'store', page: 'issues' }
    if (path.startsWith('/store/advance-booking')) return { module: 'store', page: 'advance_booking' }

    if (path.startsWith('/accounting/bills')) return { module: 'accounting', page: 'bills' }
    if (path.startsWith('/accounting/payments')) return { module: 'accounting', page: 'payments' }

    return null
  }

  const groupKeys = useMemo(
    () => menuItems.filter((i) => i.children).map((i) => i.text),
    []
  )

  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {}
    groupKeys.forEach((k) => {
      initial[k] = false
    })
    return initial
  })

  const [openSubGroups, setOpenSubGroups] = useState({})

  useEffect(() => {
    if (isSmUp && mobileOpen) {
      setMobileOpen(false)
    }
  }, [isSmUp, mobileOpen])

  useEffect(() => {
    const next = {}
    groupKeys.forEach((k) => {
      next[k] = openGroups[k] || false
    })

    const nextSub = {}

    menuItems
      .filter((i) => i.children)
      .forEach((group) => {
        const hasActiveChild = group.children.some((c) => location.pathname === c.path)
        if (hasActiveChild) next[group.text] = true

        group.children
          .filter((c) => c.children)
          .forEach((sub) => {
            const subKey = `${group.text}::${sub.text}`
            const hasActiveGrandChild = sub.children.some((gc) => location.pathname === gc.path)
            nextSub[subKey] = hasActiveGrandChild ? true : (openSubGroups[subKey] || false)
            if (hasActiveGrandChild) next[group.text] = true
          })
      })

    setOpenGroups(next)
    setOpenSubGroups(nextSub)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = () => {
    authStorage.clear()
    navigate('/', { replace: true })
  }

  const handleLogsToggle = () => {
    setLogsOpen((v) => !v)
  }

  useEffect(() => {
    const loadLogs = async () => {
      if (!token || !logsOpen) return
      try {
        setLogsLoading(true)
        const res = await auditAPI.getLogs({ limit: 100 })
        setLogs(Array.isArray(res.data?.logs) ? res.data.logs : [])
      } catch {
        setLogs([])
      } finally {
        setLogsLoading(false)
      }
    }

    loadLogs()
  }, [token, logsOpen])

  const formatLogTime = (value) => {
    try {
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
    } catch {
      return String(value)
    }
  }

  const getLogTimeValue = (log) => {
    if (!log || typeof log !== 'object') return null
    return log.created_at_iso || log.created_at || null
  }

  const handleNavigation = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  const handleGroupToggle = (groupText) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupText]: !prev[groupText],
    }))
  }

  const handleSubGroupToggle = (groupText, subText) => {
    const key = `${groupText}::${subText}`
    setOpenSubGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          ERP System
        </Typography>
      </Toolbar>
      <List>
        {menuItems
          .filter((item) => {
            if (item.text === 'ADMIN') return isChairman
            if (item.text === 'SALES & CRM') return hasModulePermission('sales')
            if (item.text === 'PRODUCTION') return hasModulePermission('production')
            if (item.text === 'PROCUREMENT') return hasModulePermission('procurement')
            if (item.text === 'STORE') return hasModulePermission('store')
            if (item.text === 'ACCOUNTING') return hasModulePermission('accounting')
            return true
          })
          .map((item) => (
          <React.Fragment key={item.text}>
            {item.children ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleGroupToggle(item.text)}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: 12,
                        lineHeight: 1.2,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        noWrap: true,
                      }}
                    />
                    {openGroups[item.text] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={openGroups[item.text]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children
                      .filter((child) => {
                        if (child.path === '/procurement/indents/approvals') {
                          const meta = pathToPageKey(child.path)
                          if (meta) return canPage(meta.module, meta.page, 'approve')
                          return can('procurement', 'approve')
                        }
                        if (child.path) {
                          const meta = pathToPageKey(child.path)
                          if (meta) return canPage(meta.module, meta.page, 'view')
                        }
                        return true
                      })
                      .map((child) => (
                      <React.Fragment key={child.path || child.text}>
                        {child.children ? (
                          <>
                            <ListItem disablePadding>
                              <ListItemButton onClick={() => handleSubGroupToggle(item.text, child.text)} sx={{ pl: 4 }}>
                                <ListItemText
                                  primary={child.text}
                                  primaryTypographyProps={{
                                    fontSize: 11,
                                    lineHeight: 1.2,
                                    fontWeight: 700,
                                    letterSpacing: 0.4,
                                    noWrap: true,
                                  }}
                                />
                                {openSubGroups[`${item.text}::${child.text}`] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </ListItemButton>
                            </ListItem>
                            <Collapse in={openSubGroups[`${item.text}::${child.text}`]} timeout="auto" unmountOnExit>
                              <List component="div" disablePadding>
                                {child.children.map((grandChild) => (
                                  <ListItem key={grandChild.path} disablePadding>
                                    <ListItemButton
                                      onClick={() => handleNavigation(grandChild.path)}
                                      selected={location.pathname === grandChild.path}
                                      sx={{ pl: 6 }}
                                    >
                                      <ListItemText
                                        primary={grandChild.text}
                                        primaryTypographyProps={{
                                          fontSize: 11,
                                          lineHeight: 1.2,
                                          fontWeight: 600,
                                          letterSpacing: 0.3,
                                          noWrap: true,
                                        }}
                                      />
                                    </ListItemButton>
                                  </ListItem>
                                ))}
                              </List>
                            </Collapse>
                          </>
                        ) : (
                          <ListItem disablePadding>
                            <ListItemButton
                              onClick={() => handleNavigation(child.path)}
                              selected={location.pathname === child.path}
                              sx={{ pl: 4 }}
                            >
                              <ListItemText
                                primary={child.text}
                                primaryTypographyProps={{
                                  fontSize: 11,
                                  lineHeight: 1.2,
                                  fontWeight: 600,
                                  letterSpacing: 0.3,
                                  noWrap: true,
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: 12,
                      lineHeight: 1.2,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      noWrap: true,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )}
          </React.Fragment>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Remag Electros
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {token ? (
            <>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {user?.username ? `User: ${user.username}` : 'User'}
              </Typography>
              {isChairman ? (
                <IconButton color="inherit" onClick={handleLogsToggle} aria-label="activity log" sx={{ mr: 1 }}>
                  <HistoryIcon />
                </IconButton>
              ) : null}
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : null}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>

      {isChairman ? (
        <Drawer
          anchor="right"
          open={logsOpen}
          onClose={handleLogsToggle}
          sx={{
            '& .MuiDrawer-paper': {
              width: { xs: '100%', sm: 420 },
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              Activity Log
            </Typography>
          </Toolbar>
          {logsLoading ? <LinearProgress /> : null}
          <List dense>
            {logs.map((l) => (
              <ListItem key={l.id} divider>
                <ListItemText
                  primary={`${l.module || 'app'}: ${l.action || ''}`}
                  secondary={`${formatLogTime(getLogTimeValue(l))}${l.username ? ` • ${l.username}` : ''}${l.path ? ` • ${l.path}` : ''}`}
                />
              </ListItem>
            ))}
            {!logsLoading && logs.length === 0 ? (
              <ListItem>
                <ListItemText primary="No activity yet" />
              </ListItem>
            ) : null}
          </List>
        </Drawer>
      ) : null}
    </Box>
  )
}

export default Layout

