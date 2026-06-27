import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Paper,
  Typography,
} from '@mui/material'
import { jobEntryAPI, productionAPI, salesAPI } from '../../services/api'
import { formatDate } from '../../utils/dateFormat'

function TestReportDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(false)
  const [jobEntry, setJobEntry] = useState(null)
  const [workOrder, setWorkOrder] = useState(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await productionAPI.getTestReport(id)
        setRecord(res.data)
      } catch (e) {
        console.error('Error loading test report:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    const loadJobEntry = async () => {
      setJobEntry(null)
      setWorkOrder(null)

      const jobNoRaw = record?.job_no ?? record?.job_id
      const jobNo = Number(jobNoRaw)
      if (!Number.isFinite(jobNo)) return

      try {
        const jeRes = await jobEntryAPI.getJobEntryByJobNumber(jobNo)
        const je = jeRes?.data || null
        setJobEntry(je)

        const woId = Number(je?.work_order_id)
        if (!Number.isFinite(woId)) return

        try {
          const woRes = await salesAPI.getWorkOrder(woId)
          setWorkOrder(woRes?.data || null)
        } catch (e) {
          console.error('Error loading work order:', e)
        }
      } catch (e) {
        console.error('Error loading job entry:', e)
      }
    }

    if (!record) return
    loadJobEntry()
  }, [record])

  const safe = (v) => (v === null || v === undefined || v === '' ? '-' : String(v))

  const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== ''

  const measurements = useMemo(() => {
    if (!record?.measurements_json) return null
    try {
      const parsed = JSON.parse(record.measurements_json)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }, [record])

  const getMRaw = (key) => (measurements ? measurements?.[key] : undefined)
  const getM = (key) => (hasValue(getMRaw(key)) ? String(getMRaw(key)) : '')

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
            Test Report Details
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(`/production/test-reports/${id}/print`)}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': { background: 'linear-gradient(45deg, #5a6fd8, #6a4190)' },
              }}
            >
              Print
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
        {loading ? (
          <Typography>Loading...</Typography>
        ) : !record ? (
          <Typography>No record found</Typography>
        ) : (
          <>
            <style>{`
              .tr-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
              }
              .tr-table td,
              .tr-table th {
                border: 1px solid #000;
                padding: 6px 8px;
                vertical-align: top;
              }
              .tr-head {
                font-weight: 800;
              }
              .tr-section {
                font-weight: 900;
                text-align: center;
                background: #f2f2f2;
              }
              .tr-subtitle {
                font-weight: 800;
                text-align: center;
              }
            `}</style>

            <table className="tr-table">
              <tbody>
                <tr>
                  <td className="tr-head" style={{ width: '18%' }}>Repairer</td>
                  <td style={{ width: '57%' }}>Remag Electros Pvt. Ltd., B/35 Industrial Estate, Rourkela-4</td>
                  <td className="tr-head" style={{ width: '10%' }}>#JOB ID</td>
                  <td style={{ width: '15%' }}>{safe(record?.job_no ?? record?.job_id)}</td>
                </tr>
                <tr>
                  <td className="tr-head">Service Order No</td>
                  <td colSpan={3}>{safe(workOrder?.wo_number ?? record?.service_order_no ?? record?.service_order)}</td>
                </tr>
                <tr>
                  <td className="tr-head">Gate Pass No.</td>
                  <td colSpan={3}>{safe(jobEntry?.gatepass_number ?? record?.gate_pass_no ?? record?.gate_pass)}</td>
                </tr>
                <tr>
                  <td className="tr-head">Date of Testing</td>
                  <td colSpan={3}>{formatDate(record?.date_of_testing)}</td>
                </tr>

                <tr>
                  <td className="tr-section" colSpan={4}>NAMEPLATE DETAILS</td>
                </tr>
                <tr>
                  <td className="tr-head">KW / HP</td>
                  <td>
                    {safe(record?.kw)} / {safe(record?.hp)}
                  </td>
                  <td className="tr-head">DUTY</td>
                  <td>{safe(record?.duty ?? measurements?.duty)}</td>
                </tr>
                <tr>
                  <td className="tr-head">VOLTAGE (V)</td>
                  <td>{safe(record?.volts)}</td>
                  <td className="tr-head">FREQUENCY</td>
                  <td>{safe(record?.frequency ?? measurements?.frequency)}</td>
                </tr>
                <tr>
                  <td className="tr-head">CURRENT (A)</td>
                  <td>{safe(record?.current)}</td>
                  <td className="tr-head">SL NO</td>
                  <td>{safe(record?.sl_no)}</td>
                </tr>
                <tr>
                  <td className="tr-head">SPEED (RPM)</td>
                  <td>{safe(record?.rpm)}</td>
                  <td className="tr-head">MAKE</td>
                  <td>{safe(record?.make)}</td>
                </tr>

                {hasValue(getMRaw('ir_pp')) || hasValue(getMRaw('ir_pe')) ? (
                  <>
                    <tr>
                      <td className="tr-subtitle" colSpan={4}>IR Value</td>
                    </tr>
                    {hasValue(getMRaw('ir_pp')) ? (
                      <tr>
                        <td className="tr-head">Phase to Phase</td>
                        <td colSpan={3}>{getM('ir_pp')}</td>
                      </tr>
                    ) : null}
                    {hasValue(getMRaw('ir_pe')) ? (
                      <tr>
                        <td className="tr-head">Phase to Earth</td>
                        <td colSpan={3}>{getM('ir_pe')}</td>
                      </tr>
                    ) : null}
                  </>
                ) : null}

                {(() => {
                  const irPiRows = [
                    { ph: 'RE', kv: 'ir_pi_re_kv', s15: 'ir_pi_re_60', s60: 'ir_pi_re_600', pi: 'ir_pi_re_pi' },
                    { ph: 'YE', kv: 'ir_pi_ye_kv', s15: 'ir_pi_ye_60', s60: 'ir_pi_ye_600', pi: 'ir_pi_ye_pi' },
                    { ph: 'BE', kv: 'ir_pi_be_kv', s15: 'ir_pi_be_60', s60: 'ir_pi_be_600', pi: 'ir_pi_be_pi' },
                  ].filter((r) => [r.kv, r.s15, r.s60, r.pi].some((k) => hasValue(getMRaw(k))))

                  const polarityRows = [
                    { ph: 'RY', v: 'polarity_voltage_ry', c: 'polarity_current_r' },
                    { ph: 'YB', v: 'polarity_voltage_yb', c: 'polarity_current_y' },
                    { ph: 'BR', v: 'polarity_voltage_br', c: 'polarity_current_b' },
                  ].filter((r) => hasValue(getMRaw(r.v)) || hasValue(getMRaw(r.c)))

                  if (!irPiRows.length && !polarityRows.length) return null

                  return (
                    <tr>
                      {irPiRows.length && polarityRows.length ? (
                        <>
                          <td colSpan={2} style={{ padding: 0 }}>
                            <table className="tr-table" style={{ border: 0, width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td className="tr-subtitle" colSpan={5}>IR/PI</td>
                                </tr>
                                <tr>
                                  <td className="tr-head" style={{ width: '22%' }}></td>
                                  <td className="tr-head" style={{ width: '19%' }}>Voltage Applied</td>
                                  <td className="tr-head" style={{ width: '19%' }}>15 sec</td>
                                  <td className="tr-head" style={{ width: '19%' }}>60 sec</td>
                                  <td className="tr-head" style={{ width: '21%' }}>PI</td>
                                </tr>
                                {irPiRows.map((r) => (
                                  <tr key={r.ph}>
                                    <td className="tr-head">{r.ph}</td>
                                    <td>{getM(r.kv)}</td>
                                    <td>{getM(r.s15)}</td>
                                    <td>{getM(r.s60)}</td>
                                    <td>{getM(r.pi)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>

                          <td colSpan={2} style={{ padding: 0 }}>
                            <table className="tr-table" style={{ border: 0, width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td className="tr-subtitle" colSpan={2}>
                                    5. Polarity: <span style={{ fontWeight: 800 }}>poles found ok.</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="tr-head">Voltage Applied</td>
                                  <td className="tr-head">Current Achieved</td>
                                </tr>
                                {polarityRows.map((r) => (
                                  <tr key={r.ph}>
                                    <td>
                                      <span className="tr-head">{r.ph}</span> {getM(r.v)}
                                    </td>
                                    <td>
                                      <span className="tr-head">{r.ph === 'RY' ? 'R' : r.ph === 'YB' ? 'Y' : 'B'}</span> {getM(r.c)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </>
                      ) : irPiRows.length ? (
                        <td colSpan={4} style={{ padding: 0 }}>
                          <table className="tr-table" style={{ border: 0, width: '100%' }}>
                            <tbody>
                              <tr>
                                <td className="tr-subtitle" colSpan={5}>IR/PI</td>
                              </tr>
                              <tr>
                                <td className="tr-head" style={{ width: '22%' }}></td>
                                <td className="tr-head" style={{ width: '19%' }}>Voltage Applied</td>
                                <td className="tr-head" style={{ width: '19%' }}>15 sec</td>
                                <td className="tr-head" style={{ width: '19%' }}>60 sec</td>
                                <td className="tr-head" style={{ width: '21%' }}>PI</td>
                              </tr>
                              {irPiRows.map((r) => (
                                <tr key={r.ph}>
                                  <td className="tr-head">{r.ph}</td>
                                  <td>{getM(r.kv)}</td>
                                  <td>{getM(r.s15)}</td>
                                  <td>{getM(r.s60)}</td>
                                  <td>{getM(r.pi)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      ) : (
                        <td colSpan={4} style={{ padding: 0 }}>
                          <table className="tr-table" style={{ border: 0, width: '100%' }}>
                            <tbody>
                              <tr>
                                <td className="tr-subtitle" colSpan={2}>
                                  5. Polarity: <span style={{ fontWeight: 800 }}>poles found ok.</span>
                                </td>
                              </tr>
                              <tr>
                                <td className="tr-head">Voltage Applied</td>
                                <td className="tr-head">Current Achieved</td>
                              </tr>
                              {polarityRows.map((r) => (
                                <tr key={r.ph}>
                                  <td>
                                    <span className="tr-head">{r.ph}</span> {getM(r.v)}
                                  </td>
                                  <td>
                                    <span className="tr-head">{r.ph === 'RY' ? 'R' : r.ph === 'YB' ? 'Y' : 'B'}</span> {getM(r.c)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      )}
                    </tr>
                  )
                })()}

                {(() => {
                  const wrRows = [
                    { ph: 'R1R2', k: 'wr_r1r2' },
                    { ph: 'Y1Y2', k: 'wr_y1y2' },
                    { ph: 'B1B2', k: 'wr_b1b2' },
                  ].filter((r) => hasValue(getMRaw(r.k)))

                  const wiRows = [
                    { ph: 'R1R2', k: 'wi_r1r2' },
                    { ph: 'Y1Y2', k: 'wi_y1y2' },
                    { ph: 'B1B2', k: 'wi_b1b2' },
                  ].filter((r) => hasValue(getMRaw(r.k)))

                  if (!wrRows.length && !wiRows.length) return null

                  return (
                    <tr>
                      {wrRows.length && wiRows.length ? (
                        <>
                          <td colSpan={2} style={{ padding: 0 }}>
                            <table className="tr-table" style={{ border: 0, width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td className="tr-subtitle" colSpan={2}>Winding Resistance</td>
                                </tr>
                                {wrRows.map((r) => (
                                  <tr key={r.ph}>
                                    <td className="tr-head" style={{ width: '45%' }}>{r.ph}</td>
                                    <td style={{ width: '55%' }}>{getM(r.k)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>

                          <td colSpan={2} style={{ padding: 0 }}>
                            <table className="tr-table" style={{ border: 0, width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td className="tr-subtitle" colSpan={2}>Winding Inductance</td>
                                </tr>
                                {wiRows.map((r) => (
                                  <tr key={r.ph}>
                                    <td className="tr-head" style={{ width: '45%' }}>{r.ph}</td>
                                    <td style={{ width: '55%' }}>{getM(r.k)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </>
                      ) : wrRows.length ? (
                        <td colSpan={4} style={{ padding: 0 }}>
                          <table className="tr-table" style={{ border: 0, width: '100%' }}>
                            <tbody>
                              <tr>
                                <td className="tr-subtitle" colSpan={2}>Winding Resistance</td>
                              </tr>
                              {wrRows.map((r) => (
                                <tr key={r.ph}>
                                  <td className="tr-head" style={{ width: '45%' }}>{r.ph}</td>
                                  <td style={{ width: '55%' }}>{getM(r.k)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      ) : (
                        <td colSpan={4} style={{ padding: 0 }}>
                          <table className="tr-table" style={{ border: 0, width: '100%' }}>
                            <tbody>
                              <tr>
                                <td className="tr-subtitle" colSpan={2}>Winding Inductance</td>
                              </tr>
                              {wiRows.map((r) => (
                                <tr key={r.ph}>
                                  <td className="tr-head" style={{ width: '45%' }}>{r.ph}</td>
                                  <td style={{ width: '55%' }}>{getM(r.k)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      )}
                    </tr>
                  )
                })()}

                {(() => {
                  const blockRows = [
                    { ph: 'RY', v: 'block_rotor_voltage_ry', c: 'block_rotor_current_r', cur: 'R' },
                    { ph: 'YB', v: 'block_rotor_voltage_yb', c: 'block_rotor_current_y', cur: 'Y' },
                    { ph: 'BR', v: 'block_rotor_voltage_br', c: 'block_rotor_current_b', cur: 'B' },
                  ].filter((r) => hasValue(getMRaw(r.v)) || hasValue(getMRaw(r.c)))

                  const runRows = [
                    { ph: 'RY', v: 'run_test_voltage_ry', c: 'run_test_current_r', cur: 'R' },
                    { ph: 'YB', v: 'run_test_voltage_yb', c: 'run_test_current_y', cur: 'Y' },
                    { ph: 'BR', v: 'run_test_voltage_br', c: 'run_test_current_b', cur: 'B' },
                  ].filter((r) => hasValue(getMRaw(r.v)) || hasValue(getMRaw(r.c)))

                  const showRunRpm = hasValue(getMRaw('run_test_rpm'))
                  const showRun = runRows.length || showRunRpm

                  if (!blockRows.length && !showRun) return null

                  return (
                    <tr>
                      {blockRows.length && showRun ? (
                        <>
                          <td colSpan={2} style={{ padding: 0 }}>
                            <table className="tr-table" style={{ border: 0, width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td className="tr-subtitle" colSpan={3}>Block Rotor</td>
                                </tr>
                                <tr>
                                  <td className="tr-head" style={{ width: '22%' }}></td>
                                  <td className="tr-head" style={{ width: '39%' }}>Voltage Applied</td>
                                  <td className="tr-head" style={{ width: '39%' }}>Current Achieved</td>
                                </tr>
                                {blockRows.map((r) => (
                                  <tr key={r.ph}>
                                    <td className="tr-head">{r.ph}</td>
                                    <td>{getM(r.v)}</td>
                                    <td>
                                      <span className="tr-head">{r.cur}</span> {getM(r.c)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>

                          <td colSpan={2} style={{ padding: 0 }}>
                            <table className="tr-table" style={{ border: 0, width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td className="tr-subtitle" colSpan={3}>
                                    Run test
                                    {showRunRpm ? (
                                      <>
                                        {' '}
                                        <span style={{ fontWeight: 800 }}>RPM: {getM('run_test_rpm')}</span>
                                      </>
                                    ) : null}
                                  </td>
                                </tr>
                                {runRows.length ? (
                                  <>
                                    <tr>
                                      <td className="tr-head" style={{ width: '22%' }}></td>
                                      <td className="tr-head" style={{ width: '39%' }}>Voltage Applied</td>
                                      <td className="tr-head" style={{ width: '39%' }}>Current Achieved</td>
                                    </tr>
                                    {runRows.map((r) => (
                                      <tr key={r.ph}>
                                        <td className="tr-head">{r.ph}</td>
                                        <td>{getM(r.v)}</td>
                                        <td>
                                          <span className="tr-head">{r.cur}</span> {getM(r.c)}
                                        </td>
                                      </tr>
                                    ))}
                                  </>
                                ) : null}
                              </tbody>
                            </table>
                          </td>
                        </>
                      ) : blockRows.length ? (
                        <td colSpan={4} style={{ padding: 0 }}>
                          <table className="tr-table" style={{ border: 0, width: '100%' }}>
                            <tbody>
                              <tr>
                                <td className="tr-subtitle" colSpan={3}>Block Rotor</td>
                              </tr>
                              <tr>
                                <td className="tr-head" style={{ width: '22%' }}></td>
                                <td className="tr-head" style={{ width: '39%' }}>Voltage Applied</td>
                                <td className="tr-head" style={{ width: '39%' }}>Current Achieved</td>
                              </tr>
                              {blockRows.map((r) => (
                                <tr key={r.ph}>
                                  <td className="tr-head">{r.ph}</td>
                                  <td>{getM(r.v)}</td>
                                  <td>
                                    <span className="tr-head">{r.cur}</span> {getM(r.c)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      ) : (
                        <td colSpan={4} style={{ padding: 0 }}>
                          <table className="tr-table" style={{ border: 0, width: '100%' }}>
                            <tbody>
                              <tr>
                                <td className="tr-subtitle" colSpan={3}>
                                  Run test
                                  {showRunRpm ? (
                                    <>
                                      {' '}
                                      <span style={{ fontWeight: 800 }}>RPM: {getM('run_test_rpm')}</span>
                                    </>
                                  ) : null}
                                </td>
                              </tr>
                              {runRows.length ? (
                                <>
                                  <tr>
                                    <td className="tr-head" style={{ width: '22%' }}></td>
                                    <td className="tr-head" style={{ width: '39%' }}>Voltage Applied</td>
                                    <td className="tr-head" style={{ width: '39%' }}>Current Achieved</td>
                                  </tr>
                                  {runRows.map((r) => (
                                    <tr key={r.ph}>
                                      <td className="tr-head">{r.ph}</td>
                                      <td>{getM(r.v)}</td>
                                      <td>
                                        <span className="tr-head">{r.cur}</span> {getM(r.c)}
                                      </td>
                                    </tr>
                                  ))}
                                </>
                              ) : null}
                            </tbody>
                          </table>
                        </td>
                      )}
                    </tr>
                  )
                })()}

                {(() => {
                  const vibDe = ['vibration_axial_de', 'vibration_horizontal_de', 'vibration_vertical_de', 'vibration_temp_de']
                  const vibNde = ['vibration_axial_nde', 'vibration_horizontal_nde', 'vibration_vertical_nde', 'vibration_temp_nde']
                  const showDe = vibDe.some((k) => hasValue(getMRaw(k)))
                  const showNde = vibNde.some((k) => hasValue(getMRaw(k)))
                  const showVibration = showDe || showNde

                  const hvRows = [
                    { ph: 'R', kv: 'hv_test_kv_r', ma: 'hv_test_ma_r' },
                    { ph: 'Y', kv: 'hv_test_kv_y', ma: 'hv_test_ma_y' },
                    { ph: 'B', kv: 'hv_test_kv_b', ma: 'hv_test_ma_b' },
                  ].filter((r) => hasValue(getMRaw(r.kv)) || hasValue(getMRaw(r.ma)))

                  if (!showVibration && !hvRows.length) return null

                  return (
                    <tr>
                      {showVibration && hvRows.length ? (
                        <>
                          <td colSpan={2} style={{ padding: 0 }}>
                            <table className="tr-table" style={{ border: 0, width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td className="tr-subtitle" colSpan={5}>Vibration</td>
                                </tr>
                                <tr>
                                  <td className="tr-head" style={{ width: '22%' }}></td>
                                  <td className="tr-head" style={{ width: '19.5%' }}>Axial</td>
                                  <td className="tr-head" style={{ width: '19.5%' }}>Horizontal</td>
                                  <td className="tr-head" style={{ width: '19.5%' }}>Vertical</td>
                                  <td className="tr-head" style={{ width: '19.5%' }}>Temp (°C)</td>
                                </tr>
                                {showDe ? (
                                  <tr>
                                    <td className="tr-head">DE</td>
                                    <td>{getM('vibration_axial_de')}</td>
                                    <td>{getM('vibration_horizontal_de')}</td>
                                    <td>{getM('vibration_vertical_de')}</td>
                                    <td>{getM('vibration_temp_de')}</td>
                                  </tr>
                                ) : null}
                                {showNde ? (
                                  <tr>
                                    <td className="tr-head">NDE</td>
                                    <td>{getM('vibration_axial_nde')}</td>
                                    <td>{getM('vibration_horizontal_nde')}</td>
                                    <td>{getM('vibration_vertical_nde')}</td>
                                    <td>{getM('vibration_temp_nde')}</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </td>

                          <td colSpan={2} style={{ padding: 0 }}>
                            <table className="tr-table" style={{ border: 0, width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td className="tr-subtitle" colSpan={3}>HV</td>
                                </tr>
                                <tr>
                                  <td className="tr-head" style={{ width: '22%' }}></td>
                                  <td className="tr-head" style={{ width: '39%' }}>KV</td>
                                  <td className="tr-head" style={{ width: '39%' }}>mA</td>
                                </tr>
                                {hvRows.map((r) => (
                                  <tr key={r.ph}>
                                    <td className="tr-head">{r.ph}</td>
                                    <td>{getM(r.kv)}</td>
                                    <td>{getM(r.ma)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </>
                      ) : showVibration ? (
                        <td colSpan={4} style={{ padding: 0 }}>
                          <table className="tr-table" style={{ border: 0, width: '100%' }}>
                            <tbody>
                              <tr>
                                <td className="tr-subtitle" colSpan={5}>Vibration</td>
                              </tr>
                              <tr>
                                <td className="tr-head" style={{ width: '22%' }}></td>
                                <td className="tr-head" style={{ width: '19.5%' }}>Axial</td>
                                <td className="tr-head" style={{ width: '19.5%' }}>Horizontal</td>
                                <td className="tr-head" style={{ width: '19.5%' }}>Vertical</td>
                                <td className="tr-head" style={{ width: '19.5%' }}>Temp (°C)</td>
                              </tr>
                              {showDe ? (
                                <tr>
                                  <td className="tr-head">DE</td>
                                  <td>{getM('vibration_axial_de')}</td>
                                  <td>{getM('vibration_horizontal_de')}</td>
                                  <td>{getM('vibration_vertical_de')}</td>
                                  <td>{getM('vibration_temp_de')}</td>
                                </tr>
                              ) : null}
                              {showNde ? (
                                <tr>
                                  <td className="tr-head">NDE</td>
                                  <td>{getM('vibration_axial_nde')}</td>
                                  <td>{getM('vibration_horizontal_nde')}</td>
                                  <td>{getM('vibration_vertical_nde')}</td>
                                  <td>{getM('vibration_temp_nde')}</td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </td>
                      ) : (
                        <td colSpan={4} style={{ padding: 0 }}>
                          <table className="tr-table" style={{ border: 0, width: '100%' }}>
                            <tbody>
                              <tr>
                                <td className="tr-subtitle" colSpan={3}>HV</td>
                              </tr>
                              <tr>
                                <td className="tr-head" style={{ width: '22%' }}></td>
                                <td className="tr-head" style={{ width: '39%' }}>KV</td>
                                <td className="tr-head" style={{ width: '39%' }}>mA</td>
                              </tr>
                              {hvRows.map((r) => (
                                <tr key={r.ph}>
                                  <td className="tr-head">{r.ph}</td>
                                  <td>{getM(r.kv)}</td>
                                  <td>{getM(r.ma)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      )}
                    </tr>
                  )
                })()}

                {hasValue(getMRaw('tan_delta')) ? (
                  <tr>
                    <td className="tr-head">TAN DELTA</td>
                    <td colSpan={3}>{getM('tan_delta')}</td>
                  </tr>
                ) : null}
                {hasValue(getMRaw('surge_comparison')) ? (
                  <tr>
                    <td className="tr-head">SURGE COMPARISION</td>
                    <td colSpan={3}>{getM('surge_comparison')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </>
        )}
      </Paper>
    </Box>
  )
}

export default TestReportDetails
