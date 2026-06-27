import React, { useMemo } from 'react'
import { Autocomplete, TextField } from '@mui/material'

const normalizeOptions = (options) => {
  const list = Array.isArray(options) ? options : []

  return list
    .map((o) => {
      if (o === null || o === undefined) return null
      if (typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, 'value')) {
        const label = Object.prototype.hasOwnProperty.call(o, 'label') ? o.label : String(o.value)
        return { label: label ?? '', value: o.value }
      }
      return { label: String(o), value: o }
    })
    .filter(Boolean)
}

function SearchableSelect({
  label,
  value,
  onChange,
  options,
  multiple = false,
  size = 'small',
  fullWidth = true,
  disabled = false,
  error = false,
  helperText,
  placeholder,
  getOptionLabel,
  isOptionEqualToValue,
}) {
  const normalized = useMemo(() => normalizeOptions(options), [options])

  const selectedOption = useMemo(() => {
    if (multiple) {
      const arr = Array.isArray(value) ? value : []
      const set = new Set(arr.map((v) => String(v)))
      return normalized.filter((o) => set.has(String(o.value)))
    }

    const found = normalized.find((o) => String(o.value) === String(value))
    return found || null
  }, [multiple, normalized, value])

  return (
    <Autocomplete
      options={normalized}
      multiple={multiple}
      value={selectedOption}
      onChange={(_, next) => {
        if (multiple) {
          const nextArr = Array.isArray(next) ? next : []
          onChange(nextArr.map((x) => x.value))
          return
        }
        onChange(next ? next.value : '')
      }}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      getOptionLabel={
        getOptionLabel || ((o) => {
          if (!o) return ''
          return o.label ?? ''
        })
      }
      isOptionEqualToValue={
        isOptionEqualToValue || ((opt, val) => {
          if (!opt || !val) return false
          return String(opt.value) === String(val.value)
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          InputLabelProps={(multiple ? (Array.isArray(selectedOption) && selectedOption.length > 0) : !!selectedOption) || placeholder ? { shrink: true } : {}}
        />
      )}
    />
  )
}

export default SearchableSelect
