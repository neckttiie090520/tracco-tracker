export type Era = 'CE' | 'BE'

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function safeParseDate(input?: string | Date | null): Date | null {
  if (!input) return null
  const d = input instanceof Date ? input : new Date(input)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Format a date as DD/MM/YY with configurable era (CE/BE).
 * Returns '-' if the date is invalid or missing.
 */
export function formatDateShort(input?: string | Date | null, era: Era = 'CE'): string {
  const d = safeParseDate(input)
  if (!d) return '-'
  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  let year = d.getFullYear()
  if (era === 'BE') year += 543
  // Use 2-digit year
  const yy = `${year}`.slice(-2)
  return `${day}/${month}/${yy}` + (era === 'BE' ? ' (พ.ศ.)' : '')
}

/**
 * Format a date with time as DD/MM/YY HH:mm; returns '-' if invalid.
 */
export function formatDateTimeShort(input?: string | Date | null, era: Era = 'CE'): string {
  const d = safeParseDate(input)
  if (!d) return '-'
  const date = formatDateShort(d, era).replace(/ \(พ\.ศ\.\)$/,'')
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  return `${date} ${hh}:${mm}` + (era === 'BE' ? ' (พ.ศ.)' : '')
}

