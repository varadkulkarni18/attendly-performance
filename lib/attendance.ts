export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export const ATTENDANCE_STATUSES: { value: AttendanceStatus; label: string; short: string }[] = [
  { value: 'present', label: 'Present', short: 'P' },
  { value: 'absent', label: 'Absent', short: 'A' },
  { value: 'late', label: 'Late', short: 'L' },
  { value: 'excused', label: 'Excused', short: 'E' },
]

export const DEFAULT_LOW_ATTENDANCE_THRESHOLD = 75

export interface AttendanceSummary {
  present: number
  absent: number
  late: number
  excused: number
  attended: number
  eligible: number
  percentage: number | null
}

export function summarizeAttendance(statuses: AttendanceStatus[]): AttendanceSummary {
  const counts = { present: 0, absent: 0, late: 0, excused: 0 }
  for (const status of statuses) counts[status] += 1

  const attended = counts.present + counts.late
  const eligible = statuses.length - counts.excused
  const percentage = eligible === 0 ? null : Math.round((attended / eligible) * 1000) / 10

  return { ...counts, attended, eligible, percentage }
}

export function summarizeCounts(counts: Pick<AttendanceSummary, 'present' | 'absent' | 'late' | 'excused'>) {
  const statuses: AttendanceStatus[] = [
    ...Array<AttendanceStatus>(counts.present).fill('present'),
    ...Array<AttendanceStatus>(counts.absent).fill('absent'),
    ...Array<AttendanceStatus>(counts.late).fill('late'),
    ...Array<AttendanceStatus>(counts.excused).fill('excused'),
  ]
  return summarizeAttendance(statuses)
}

export function formatPercentage(value: number | null) {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

export function isBelowThreshold(value: number | null, threshold = DEFAULT_LOW_ATTENDANCE_THRESHOLD) {
  return value !== null && value < threshold
}
