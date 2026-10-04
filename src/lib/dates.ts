// Calendar dates are handled as 'YYYY-MM-DD' strings. Arithmetic runs on UTC
// midnights so daylight saving changes never shift a day.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  return toISODate(parseISODate(value)) === value
}

function parseISODate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || !timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/** Today's date in the given IANA time zone. */
export function todayIn(timeZone: string) {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** The usual first day of the week in a time zone: Sunday (0) in the Americas, Monday (1) almost everywhere else. */
export function defaultWeekStart(timeZone: string) {
  return timeZone.startsWith('America/') ? 0 : 1
}

/** The current hour (0–23) in the given time zone. */
export function hourIn(timeZone: string) {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date())
  )
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return toISODate(date)
}

/** 0 = Sunday … 6 = Saturday, matching split_day_schedule.weekday. */
export function dayOfWeek(iso: string) {
  return parseISODate(iso).getUTCDay()
}

/** The first day of the week containing `iso`. `weekStartsOn`: 0 = Sunday, 1 = Monday. */
export function startOfWeek(iso: string, weekStartsOn: number) {
  const day = parseISODate(iso).getUTCDay()
  return addDays(iso, -((day - weekStartsOn + 7) % 7))
}

/** Every date from `from` to `to`, inclusive. */
export function eachDay(from: string, to: string) {
  const days: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}

export function monthOf(iso: string) {
  return iso.slice(0, 7)
}

export function isValidMonth(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) && isValidISODate(`${value}-01`)
}

export function monthBounds(month: string) {
  const start = `${month}-01`
  const next = parseISODate(start)
  next.setUTCMonth(next.getUTCMonth() + 1)
  return { start, end: addDays(toISODate(next), -1) }
}

export function addMonths(month: string, months: number) {
  const date = parseISODate(`${month}-01`)
  date.setUTCMonth(date.getUTCMonth() + months)
  return monthOf(toISODate(date))
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(parseISODate(iso))
}

export function formatMonth(month: string) {
  return formatDate(`${month}-01`, { month: 'long', year: 'numeric' })
}

/** Weekday names in display order, starting from `weekStartsOn`. */
export function weekdayLabels(weekStartsOn: number, style: 'narrow' | 'short' | 'long' = 'short') {
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) =>
    formatDate(addDays('2023-01-01', weekStartsOn + i), { weekday: style })
  )
}
