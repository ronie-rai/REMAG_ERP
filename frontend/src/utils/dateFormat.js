import { format } from 'date-fns'

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export const formatDate = (value) => {
  const d = toDate(value)
  if (!d) return '-'
  try {
    return format(d, 'dd-MMM-yyyy')
  } catch {
    return '-'
  }
}

export const formatDateTime = (value) => {
  const d = toDate(value)
  if (!d) return '-'
  try {
    return format(d, 'dd-MM-yyyy hh:mm a')
  } catch {
    return '-'
  }
}
