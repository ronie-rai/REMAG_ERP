export const normalizeSortValue = (value) => {
  if (value === null || value === undefined) return null

  if (value instanceof Date) {
    const t = value.getTime()
    return Number.isFinite(t) ? t : null
  }

  const v = typeof value === 'string' ? value.trim() : value

  if (typeof v === 'number') return Number.isFinite(v) ? v : null

  if (typeof v === 'boolean') return v ? 1 : 0

  if (typeof v === 'string') {
    if (!v) return ''

    const n = Number(v)
    if (Number.isFinite(n) && String(n) === v) return n

    const dt = Date.parse(v)
    if (Number.isFinite(dt) && /\d{4}-\d{2}-\d{2}/.test(v)) return dt

    return v.toLowerCase()
  }

  try {
    return String(v).toLowerCase()
  } catch {
    return null
  }
}

export const compareValues = (aRaw, bRaw) => {
  const a = normalizeSortValue(aRaw)
  const b = normalizeSortValue(bRaw)

  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export const getComparator = (order, getValue) => {
  const dir = order === 'desc' ? -1 : 1
  return (rowA, rowB) => dir * compareValues(getValue(rowA), getValue(rowB))
}

export const stableSort = (array, comparator) => {
  const stabilized = (array || []).map((el, index) => [el, index])
  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0])
    if (order !== 0) return order
    return a[1] - b[1]
  })
  return stabilized.map((el) => el[0])
}
