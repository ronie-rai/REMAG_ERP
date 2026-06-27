import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  MenuItem,
  Divider,
} from '@mui/material'
import { productionAPI } from '../../services/api'

function TestReportForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues, control } = useForm()
  const [jobNumbers, setJobNumbers] = useState([])

  const makeReportId = () => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `TR${yyyy}${mm}${dd}${hh}${min}`
  }

  const measurementFields = useMemo(
    () => [
      { key: 'ir_pp', label: '2. IR VALUE (PHASE TO PHASE)' },
      { key: 'ir_pe', label: '2. IR VALUE (PHASE TO EARTH)' },

      { key: 'ir_pi_re_60', label: '3. IR/PI-RE (60 SEC)' },
      { key: 'ir_pi_ye_60', label: '3. IR/PI-YE (60 SEC)' },
      { key: 'ir_pi_be_60', label: '3. IR/PI-BE (60 SEC)' },
      { key: 'ir_pi_re_600', label: '3. IR/PI-RE (600 SEC)' },
      { key: 'ir_pi_ye_600', label: '3. IR/PI-YE (600 SEC)' },
      { key: 'ir_pi_be_600', label: '3. IR/PI-BE (600 SEC)' },
      { key: 'ir_pi_re_pi', label: '3. IR/PI-RE (PI)' },
      { key: 'ir_pi_ye_pi', label: '3. IR/PI-YE (PI)' },
      { key: 'ir_pi_be_pi', label: '3. IR/PI-BE (PI)' },
      { key: 'ir_pi_re_kv', label: '3. IR/PI-RE (KV)' },
      { key: 'ir_pi_ye_kv', label: '3. IR/PI-YE (KV)' },
      { key: 'ir_pi_be_kv', label: '3. IR/PI-BE (KV)' },

      { key: 'wr_r1r2', label: '4. WINDING RESISTANCE (R1R2)' },
      { key: 'wr_y1y2', label: '4. WINDING RESISTANCE (Y1Y2)' },
      { key: 'wr_b1b2', label: '4. WINDING RESISTANCE (B1B2)' },

      { key: 'wi_r1r2', label: '5. WINDING INDUCTANCE (R1R2)' },
      { key: 'wi_y1y2', label: '5. WINDING INDUCTANCE (Y1Y2)' },
      { key: 'wi_b1b2', label: '5. WINDING INDUCTANCE (B1B2)' },

      { key: 'poles_found_ok', label: '6. POLARITY' },
      { key: 'polarity_current_r', label: '6. POLARITY CURRENT (R)' },
      { key: 'polarity_current_y', label: '6. POLARITY CURRENT (Y)' },
      { key: 'polarity_current_b', label: '6. POLARITY CURRENT (B)' },
      { key: 'polarity_voltage_ry', label: '6. POLARITY VOLTAGE (RY)' },
      { key: 'polarity_voltage_yb', label: '6. POLARITY VOLTAGE (YB)' },
      { key: 'polarity_voltage_br', label: '6. POLARITY VOLTAGE (BR)' },

      { key: 'balance_current_r', label: '7. BALANCE (R)' },
      { key: 'balance_current_y', label: '7. BALANCE (Y)' },
      { key: 'balance_current_b', label: '7. BALANCE (B)' },
      { key: 'balance_voltage_ry', label: '7. BALANCE VOLTAGE (RY)' },
      { key: 'balance_voltage_yb', label: '7. BALANCE VOLTAGE (YB)' },
      { key: 'balance_voltage_br', label: '7. BALANCE VOLTAGE (BR)' },

      { key: 'block_rotor_current_r', label: '8. BLOCK ROTOR (R)' },
      { key: 'block_rotor_current_y', label: '8. BLOCK ROTOR (Y)' },
      { key: 'block_rotor_current_b', label: '8. BLOCK ROTOR (B)' },
      { key: 'block_rotor_voltage_ry', label: '8. BLOCK ROTOR VOLTAGE (RY)' },
      { key: 'block_rotor_voltage_yb', label: '8. BLOCK ROTOR VOLTAGE (YB)' },
      { key: 'block_rotor_voltage_br', label: '8. BLOCK ROTOR VOLTAGE (BR)' },

      { key: 'run_test_rpm', label: '9. RUN TEST (RPM)' },
      { key: 'run_test_current_r', label: '9. RUN TEST CURRENT (R)' },
      { key: 'run_test_current_y', label: '9. RUN TEST CURRENT (Y)' },
      { key: 'run_test_current_b', label: '9. RUN TEST CURRENT (B)' },
      { key: 'run_test_voltage_ry', label: '9. RUN TEST VOLTAGE (RY)' },
      { key: 'run_test_voltage_yb', label: '9. RUN TEST VOLTAGE (YB)' },
      { key: 'run_test_voltage_br', label: '9. RUN TEST VOLTAGE (BR)' },

      { key: 'vibration_axial_de', label: '10. VIBRATION (DE)' },
      { key: 'vibration_axial_nde', label: '10. VIBRATION (NDE)' },
      { key: 'vibration_horizontal_de', label: '10. VIBRATION HORIZONTAL (DE)' },
      { key: 'vibration_horizontal_nde', label: '10. VIBRATION HORIZONTAL (NDE)' },
      { key: 'vibration_vertical_de', label: '10. VIBRATION VERTICAL (DE)' },
      { key: 'vibration_vertical_nde', label: '10. VIBRATION VERTICAL (NDE)' },
      { key: 'vibration_temp_de', label: '10. VIBRATION TEMP (°C) (DE)' },
      { key: 'vibration_temp_nde', label: '10. VIBRATION TEMP (°C) (NDE)' },

      { key: 'hv_test_kv_r', label: '11. HV TEST KV (R)' },
      { key: 'hv_test_kv_y', label: '11. HV TEST KV (Y)' },
      { key: 'hv_test_kv_b', label: '11. HV TEST KV (B)' },
      { key: 'hv_test_ma_r', label: '11. HV TEST mA (R)' },
      { key: 'hv_test_ma_y', label: '11. HV TEST mA (Y)' },
      { key: 'hv_test_ma_b', label: '11. HV TEST mA (B)' },

      { key: 'tan_delta', label: '12. TAN DELTA' },
      { key: 'surge_comparison', label: '13. SURGE COMPARISION' },
    ],
    []
  )

  const measurementGroups = useMemo(() => {
    const groups = new Map()
    ;(measurementFields || []).forEach((f) => {
      const m = String(f.label || '').match(/^\s*(\d+)\s*\./)
      const num = m ? m[1] : 'Other'
      const title = num === 'Other' ? 'Other' : `${num}. ${String(f.label || '').replace(/^\s*\d+\s*\.\s*/, '').split('(')[0].trim()}`
      if (!groups.has(num)) groups.set(num, { num, title, fields: [] })
      groups.get(num).fields.push(f)
      if (groups.get(num).title === 'Other') groups.get(num).title = title
    })

    const order = Array.from(groups.keys()).sort((a, b) => {
      const na = Number(a)
      const nb = Number(b)
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
      if (Number.isFinite(na)) return -1
      if (Number.isFinite(nb)) return 1
      return String(a).localeCompare(String(b))
    })

    return order.map((k) => groups.get(k)).filter(Boolean)
  }, [measurementFields])

  const selectedJobNo = watch('job_no')

  useEffect(() => {
    const fetchJobNumbers = async () => {
      try {
        const response = await productionAPI.getJobNumbers()
        setJobNumbers(response.data)
      } catch (error) {
        console.error('Error fetching job numbers:', error)
      }
    }
    fetchJobNumbers()

    if (!isEdit) {
      const today = new Date().toISOString().slice(0, 10)
      setValue('date_of_testing', today)
      setValue('report_id', makeReportId())
    }

    if (isEdit) {
      const fetchTestReport = async () => {
        try {
          const response = await productionAPI.getTestReport(id)
          const data = response.data

          if (data?.measurements_json) {
            try {
              const parsed = JSON.parse(data.measurements_json)
              Object.keys(parsed || {}).forEach((k) => setValue(`measurements.${k}`, parsed[k]))
            } catch {
              // ignore
            }
          }

          Object.keys(data).forEach((key) => {
            if (data[key] !== null) {
              if (key === 'job_no') {
                setValue(
                  'job_no',
                  data.job_no === null || data.job_no === undefined || data.job_no === ''
                    ? ''
                    : String(data.job_no)
                )
                return
              }
              setValue(key, data[key])
            }
          })
        } catch (error) {
          console.error('Error fetching test report:', error)
        }
      }
      fetchTestReport()
    }
  }, [id, isEdit, setValue])

  useEffect(() => {
    if (!selectedJobNo) return
    const selected = jobNumbers.find((j) => String(j.job_number) === String(selectedJobNo))
    if (!selected) return
    if (selected.party_name) setValue('party_name', selected.party_name)
  }, [jobNumbers, selectedJobNo, setValue])

  useEffect(() => {
    if (!selectedJobNo) return
    const loadNameplate = async () => {
      try {
        const res = await productionAPI.getChecklistsByJobNumber(selectedJobNo)
        const rows = Array.isArray(res.data) ? res.data : []
        const latest = rows[0]
        if (!latest) return

        const parseKwHp = (kwHp) => {
          const raw = String(kwHp || '').trim()
          if (!raw) return { kw: '', hp: '' }
          const parts = raw.split(/\s*\/\s*|\s*,\s*/).filter(Boolean)
          if (parts.length >= 2) return { kw: parts[0], hp: parts[1] }
          return { kw: raw, hp: '' }
        }

        const existing = {
          kw: getValues('kw'),
          hp: getValues('hp'),
          volts: getValues('volts'),
          current: getValues('current'),
          rpm: getValues('rpm'),
          sl_no: getValues('sl_no'),
          make: getValues('make'),
        }

        const { kw, hp } = parseKwHp(latest.kw_hp)

        if (!existing.kw && kw) setValue('kw', kw)
        if (!existing.hp && hp) setValue('hp', hp)
        if (!existing.volts && latest.voltage) setValue('volts', latest.voltage)
        if (!existing.current && latest.current) setValue('current', latest.current)
        if (!existing.rpm && latest.speed_rpm) setValue('rpm', latest.speed_rpm)
        if (!existing.sl_no && latest.sl_no) setValue('sl_no', latest.sl_no)
        if (!existing.make && latest.make) setValue('make', latest.make)
      } catch (e) {
        console.error('Error loading checklist for nameplate details:', e)
      }
    }

    loadNameplate()
  }, [getValues, selectedJobNo, setValue])

  const onSubmit = async (data) => {
    try {
      const measurements = data.measurements || {}
      const payload = {
        report_id: data.report_id,
        job_no: data.job_no ? Number(data.job_no) : null,
        party_name: data.party_name,
        date_of_testing: data.date_of_testing,
        kw: data.kw,
        hp: data.hp,
        volts: data.volts,
        current: data.current,
        rpm: data.rpm,
        sl_no: data.sl_no,
        make: data.make,
        bearing_de: data.bearing_de,
        bearing_nde: data.bearing_nde,
        measurements_json: JSON.stringify(measurements),
      }

      if (isEdit) {
        await productionAPI.updateTestReport(id, payload)
      } else {
        await productionAPI.createTestReport(payload)
      }
      navigate('/production/test-reports')
    } catch (error) {
      console.error('Error saving test report:', error)
      const status = error?.response?.status
      const message = error?.response?.data?.error || error?.message
      alert(`Failed to save test report${status ? ` (HTTP ${status})` : ''}${message ? `: ${message}` : ''}`)
    }
  }

  const handleExportPDF = async () => {
    if (!id) {
      alert('Please save the test report first')
      return
    }
    try {
      const response = await productionAPI.exportTestReportPDF(id)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `test_report_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF')
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
            {isEdit ? 'Edit Test Report' : 'New Test Report'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isEdit && (
              <Button variant="outlined" onClick={handleExportPDF}>
                Export PDF
              </Button>
            )}
            <Button variant="outlined" onClick={() => navigate('/production/test-reports')}>
              Back to Test Reports
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="job_no"
                control={control}
                rules={{ required: 'Required' }}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="JOB NO."
                    select
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={!!errors.job_no}
                    helperText={errors.job_no?.message}
                  >
                    {jobNumbers.map((j) => (
                      <MenuItem key={j.job_number} value={String(j.job_number)}>
                        {j.job_number} - {j.party_name} ({j.department})
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="REPORT ID"
                InputProps={!isEdit ? { readOnly: true } : undefined}
                {...register('report_id', { required: 'Required' })}
                error={!!errors.report_id}
                helperText={errors.report_id?.message}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="DATE"
                InputLabelProps={{ shrink: true }}
                {...register('date_of_testing', { required: 'Required' })}
                error={!!errors.date_of_testing}
                helperText={errors.date_of_testing?.message}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="PARTY NAME"
                {...register('party_name')}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Motor Details</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField fullWidth label="KW" {...register('kw')} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="HP" {...register('hp')} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="VOLTAGE (V)" {...register('volts')} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="CURRENT (A)" {...register('current')} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="SPEED (RPM)" {...register('rpm')} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="SERIAL NO" {...register('sl_no')} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="MAKE" {...register('make')} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="1. BEARING (DE)" {...register('bearing_de')} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="1. BEARING (NDE)" {...register('bearing_nde')} />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Measurements</Typography>
              </Divider>
            </Grid>

            {measurementGroups.map((g) => (
              <Grid item xs={12} key={g.num}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    borderColor: 'rgba(102, 126, 234, 0.25)',
                    background: 'rgba(102, 126, 234, 0.03)',
                  }}
                >
                  <Typography sx={{ fontWeight: 900, fontSize: 13, mb: 1, letterSpacing: 0.3 }}>{g.title}</Typography>
                  <Grid container spacing={2}>
                    {g.fields.map((f) => (
                      <Grid item xs={12} sm={6} md={4} key={f.key}>
                        <TextField
                          fullWidth
                          size="small"
                          label={f.label}
                          {...register(`measurements.${f.key}`)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            ))}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/production/test-reports')}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                    },
                  }}
                >
                  {isEdit ? 'Update' : 'Create'} Test Report
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  )
}

export default TestReportForm

