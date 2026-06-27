import React, { useEffect, useMemo, useState } from 'react'
import {
  useNavigate
} from 'react-router-dom'
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  TextField,
  InputAdornment,
  Tooltip,
  Fab,
  Zoom,
  Backdrop,
  CircularProgress,
} from '@mui/material'
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { productionAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'
import { generateTestReportPDF } from '../../utils/pdfGeneratorFallback'
import { format } from 'date-fns'
import { getComparator, stableSort } from '../../utils/tableSort'

function TestReportList() {
  const navigate = useNavigate()
  const [testReports, setTestReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' })
  const [searchTerm, setSearchTerm] = useState('')

  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('report_id')

  useEffect(() => {
    fetchTestReports()
  }, [])

  const fetchTestReports = async () => {
    setLoading(true)
    try {
      const response = await productionAPI.getTestReports()
      setTestReports(response.data)
    } catch (error) {
      console.error('Error fetching test reports:', error)
      setNotification({
        open: true,
        message: 'Error fetching test reports',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (id) => {
    navigate(`/production/test-reports/${id}/edit`)
  }

  const handleDelete = async (id) => {
    try {
      await productionAPI.deleteTestReport(id)
      setTestReports(prev => prev.filter(report => report.id !== id))
      setNotification({
        open: true,
        message: 'Test report deleted successfully',
        severity: 'success'
      })
      setDeleteDialog({ open: false, id: null })
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Error deleting test report',
        severity: 'error'
      })
    }
  }

  const handlePDFExport = async (testReport) => {
    setPdfLoading(true)
    try {
      await generateTestReportPDF(testReport)
      setNotification({
        open: true,
        message: 'PDF generated successfully',
        severity: 'success'
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      setNotification({
        open: true,
        message: 'Error generating PDF',
        severity: 'error'
      })
    } finally {
      setPdfLoading(false)
    }
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  const filteredTestReports = useMemo(() => testReports.filter(report => 
    report.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.report_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.sl_no?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [testReports, searchTerm])

  const columns = useMemo(
    () => [
      { id: 'report_id', label: 'Report ID', getValue: (r) => r.report_id },
      { id: 'job_no', label: 'Job No', getValue: (r) => r.job_no },
      { id: 'customer', label: 'Customer', getValue: (r) => r.customer },
      { id: 'repairer', label: 'Repairer', getValue: (r) => r.repairer },
      { id: 'make', label: 'Make', getValue: (r) => r.make },
      { id: 'sl_no', label: 'Serial No', getValue: (r) => r.sl_no },
      { id: 'power', label: 'Power', getValue: (r) => r.power },
      { id: 'voltage', label: 'Voltage', getValue: (r) => r.voltage },
      { id: 'speed', label: 'Speed', getValue: (r) => r.speed },
      { id: 'test_date', label: 'Test Date', getValue: (r) => r.test_date },
      { id: 'witness', label: 'Witness', getValue: (r) => r.witness },
      { id: 'actions', label: 'Actions', sortable: false },
    ],
    []
  )

  const sortedTestReports = useMemo(() => {
    const col = columns.find((c) => c.id === orderBy)
    if (!col || col.sortable === false) return filteredTestReports
    return stableSort(filteredTestReports, getComparator(order, col.getValue))
  }, [columns, filteredTestReports, order, orderBy])

  const requestSort = (colId) => {
    if (orderBy === colId) {
      setOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(colId)
    setOrder('asc')
  }

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      p: 3,
      borderRadius: 2
    }}>
      <Backdrop open={pdfLoading} sx={{ zIndex: 9999 }}>
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Header with Glassmorphism Effect */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold'
            }}
          >
            Test Reports
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchTestReports} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button 
              variant="contained" 
              onClick={() => navigate('/production/test-reports/new')}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                }
              }}
            >
              New Test Report
            </Button>
          </Box>
        </Box>

        {/* Search Section */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by customer, report ID, make, or serial number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{
              maxWidth: 600,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
              }
            }}
          />
        </Box>
      </Paper>

      {/* Main Table with Modern Styling */}
      <Paper sx={{ 
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '& th': { color: 'white', fontWeight: 'bold' }
              }}>
                {columns.map((c) => (
                  <TableCell key={c.id}>
                    {c.sortable === false ? (
                      c.label
                    ) : (
                      <TableSortLabel
                        active={orderBy === c.id}
                        direction={orderBy === c.id ? order : 'asc'}
                        onClick={() => requestSort(c.id)}
                        sx={{ color: 'white' }}
                      >
                        {c.label}
                      </TableSortLabel>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTestReports.map((report, index) => (
                <TableRow 
                  key={report.id}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      transform: 'scale(1.01)',
                      transition: 'all 0.2s ease-in-out'
                    },
                    animation: `fadeIn 0.5s ease-in-out ${index * 0.1}s`
                  }}
                >
                  <TableCell>
                    <Chip
                      label={report.report_id}
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/production/test-reports/${report.id}`)}
                      sx={{ borderRadius: 1, cursor: 'pointer' }}
                    />
                  </TableCell>
                  <TableCell>
                    {report.job_no ? (
                      <Button
                        variant="text"
                        onClick={() => navigate(`/production/test-reports/${report.id}`)}
                        sx={{ fontWeight: 'bold', p: 0, minWidth: 'auto' }}
                      >
                        {report.job_no}
                      </Button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{report.customer}</TableCell>
                  <TableCell>{report.repairer}</TableCell>
                  <TableCell>
                    <Chip 
                      label={report.make}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>{report.sl_no}</TableCell>
                  <TableCell>{report.kw} kW / {report.hp} HP</TableCell>
                  <TableCell>{report.volts} V</TableCell>
                  <TableCell>{report.rpm} RPM</TableCell>
                  <TableCell>
                    {formatDate(report.date_of_testing)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ maxWidth: 150 }}>
                      {report.witness_name ? 
                        `${report.witness_name}${report.witness_designation ? ` - ${report.witness_designation}` : ''}` : 
                        '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleEdit(report.id)}
                          size="small"
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(102, 126, 234, 0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Export PDF">
                        <IconButton 
                          color="secondary" 
                          onClick={() => handlePDFExport(report)}
                          size="small"
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(220, 0, 78, 0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <PdfIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          color="error" 
                          onClick={() => setDeleteDialog({ open: true, id: report.id })}
                          size="small"
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Floating Action Button for Bulk Export */}
      <Zoom in={true}>
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            '&:hover': {
              background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
            }
          }}
          onClick={() => {
            setNotification({
              open: true,
              message: 'Bulk export feature coming soon!',
              severity: 'info'
            })
          }}
        >
          <DownloadIcon />
        </Fab>
      </Zoom>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, id: null })}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this test report? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDelete(deleteDialog.id)} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={notification.severity} 
          onClose={handleCloseNotification}
          sx={{ borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </Box>
  )
}

export default TestReportList
