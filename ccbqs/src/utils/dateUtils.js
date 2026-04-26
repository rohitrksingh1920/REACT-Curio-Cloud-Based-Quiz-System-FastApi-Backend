/**
 * dateUtils.js
 * ------------
 * All date/time formatting helpers for the Curio React frontend.
 * Every function converts to IST (Asia/Kolkata, UTC+5:30) before display.
 *
 * Usage:
 *   import { formatIST, timeAgoIST, formatDateIST, formatTimeIST } from '../utils/dateUtils'
 */

const IST_LOCALE  = 'en-IN'
const IST_TZ      = 'Asia/Kolkata'

/**
 * Full IST datetime string.
 * e.g. "20 Jun 2026, 10:30 AM"
 */
export function formatIST(isoString, opts = {}) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString(IST_LOCALE, {
    timeZone: IST_TZ,
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    ...opts,
  })
}

/**
 * Date only — no time.
 * e.g. "20 Jun 2026"
 */
export function formatDateIST(dateStr) {
  if (!dateStr) return '—'
  // dateStr is a plain date like "2026-06-20" (no time component)
  // Append T00:00:00+05:30 to parse as IST midnight, avoiding UTC-shift artefacts
  const iso = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00+05:30`
  return new Date(iso).toLocaleDateString(IST_LOCALE, {
    timeZone: IST_TZ,
    day:      'numeric',
    month:    'short',
    year:     'numeric',
  })
}

/**
 * Time only in IST 12-hour format.
 * e.g. "10:30 AM"
 * Accepts either "HH:MM" string or a full ISO datetime string.
 */
export function formatTimeIST(timeStr) {
  if (!timeStr) return '—'
  // If it's a plain HH:MM, build a dummy IST datetime so toLocaleTimeString works
  const iso = timeStr.includes('T')
    ? timeStr
    : `2000-01-01T${timeStr}:00+05:30`
  return new Date(iso).toLocaleTimeString(IST_LOCALE, {
    timeZone: IST_TZ,
    hour:     '2-digit',
    minute:   '2-digit',
  })
}

/**
 * "Time ago" in IST context.
 * Computes the diff between now (IST) and the given ISO timestamp.
 * e.g. "5 mins ago", "Yesterday", "3 days ago"
 */
export function timeAgoIST(isoString) {
  if (!isoString) return ''
  const diff  = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)

  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins} min${mins > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

/**
 * Compact IST datetime for leaderboard / tables.
 * e.g. "20 Jun, 2:45 PM"
 */
export function formatCompactIST(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString(IST_LOCALE, {
    timeZone: IST_TZ,
    day:    'numeric',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

/**
 * IST-aware countdown: returns seconds remaining from now until the given ISO string.
 * Negative if in the past.
 */
export function secondsUntilIST(isoString) {
  if (!isoString) return 0
  return Math.floor((new Date(isoString).getTime() - Date.now()) / 1000)
}
