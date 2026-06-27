import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Refresh as RefreshIcon } from '@mui/icons-material'
import { procurementAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'
import { format } from 'date-fns'
import { getComparator, stableSort } from '../../utils/tableSort'

function GRNList() {
  const navigate = useNavigate()
  const [grns, setGrns] = useState([])
  const [loading, setLoading] = useState(false)

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('grn_number')

  const columns = useMemo(
    () => [
      { id: 'grn_number', label: 'GRN Number', getValue: (g) => g.grn_number },
      { id: 'grn_date', label: 'GRN Date', getValue: (g) => g.grn_date },
      { id: 'po_number', label: 'PO No', getValue: (g) => g.po_number || g.po_id },
      { id: 'received_quantity', label: 'Received Qty', getValue: (g) => g.received_quantity },
      { id: 'status', label: 'Status', getValue: (g) => g.status },
    ],
    []
  )

  const sortedGrns = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col) return grns
    return stableSort(grns, getComparator(order, col.getValue))
  }, [columns, grns, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  const fetchGRNs = async () => {
    setLoading(true)
    try {
      const res = await procurementAPI.getGRNs()
      setGrns(res.data || [])
    } catch (error) {
      console.error('Error fetching GRNs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGRNs()
  }, [])

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
            GRNs
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchGRNs} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              onClick={() => navigate('/procurement/grns/new')}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
              }}
            >
              New GRN
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: 3,
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.id}>
                  <TableSortLabel
                    active={orderBy === c.id}
                    direction={orderBy === c.id ? order : 'asc'}
                    onClick={() => requestSort(c.id)}
                  >
                    {c.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedGrns.map((g) => (
              <TableRow key={g.id} hover>
                <TableCell>{g.grn_number}</TableCell>
                <TableCell>{formatDate(g.grn_date)}</TableCell>
                <TableCell>{g.po_number || g.po_id || '-'}</TableCell>
                <TableCell>{g.received_quantity ?? '-'}</TableCell>
                <TableCell>{g.status || '-'}</TableCell>
              </TableRow>
            ))}
            {grns.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No GRNs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default GRNList
