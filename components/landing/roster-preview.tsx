'use client'

import { Check, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusGlyph } from '@/components/brand'
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  formatPercentage,
  summarizeAttendance,
} from '@/lib/attendance'
import { heroRoster } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

export function RosterPreview() {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(heroRoster.map((s) => [s.id, s.status])),
  )

  const summary = useMemo(() => summarizeAttendance(Object.values(statuses)), [statuses])
  const changed = heroRoster.some((s) => statuses[s.id] !== s.status)

  const setStatus = (id: string, status: AttendanceStatus) => setStatuses((prev) => ({ ...prev, [id]: status }))

  return (
    <div className="border-2 border-black bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Mon, 12 Oct · Period 2 · 10:00
          </p>
          <p className="mt-1 font-display text-lg leading-tight">CS201 Data Structures — Year 2, Sec A</p>
        </div>
        <span className="border border-black px-2 py-1 font-mono text-[11px] uppercase tracking-widest">
          {changed ? 'Unsaved changes' : 'Live demo'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-border-light px-4 py-2.5 sm:px-5">
        <button
          type="button"
          onClick={() => setStatuses(Object.fromEntries(heroRoster.map((s) => [s.id, 'present'])))}
          className="focus-ring inline-flex min-h-9 items-center gap-2 font-mono text-[11px] uppercase tracking-widest underline-offset-4 hover:underline"
        >
          <Check size={14} strokeWidth={1.5} aria-hidden="true" />
          Mark all present
        </button>
        <button
          type="button"
          disabled={!changed}
          onClick={() => setStatuses(Object.fromEntries(heroRoster.map((s) => [s.id, s.status])))}
          className="focus-ring inline-flex min-h-9 items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground underline-offset-4 enabled:hover:text-black enabled:hover:underline disabled:opacity-40"
        >
          <RotateCcw size={13} strokeWidth={1.5} aria-hidden="true" />
          Reset
        </button>
      </div>

      <ul className="divide-y divide-border-light">
        {heroRoster.map((student) => (
          <li key={student.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
            <div className="min-w-0">
              <p className="truncate text-[15px] leading-tight">{student.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{student.rollNo}</p>
            </div>
            <fieldset className="flex shrink-0">
              <legend className="sr-only">Attendance for {student.name}</legend>
              {ATTENDANCE_STATUSES.map((option, index) => {
                const active = statuses[student.id] === option.value
                return (
                  <label
                    key={option.value}
                    title={option.label}
                    className={cn(
                      'grid size-9 cursor-pointer place-items-center border border-black font-mono text-xs transition-none has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black',
                      index > 0 && '-ml-px',
                      active ? 'bg-black text-white' : 'bg-white text-black hover:bg-muted',
                    )}
                  >
                    <input
                      type="radio"
                      name={`status-${student.id}`}
                      value={option.value}
                      checked={active}
                      onChange={() => setStatus(student.id, option.value)}
                      className="sr-only"
                    />
                    <span aria-hidden="true">{option.short}</span>
                    <span className="sr-only">{option.label}</span>
                  </label>
                )
              })}
            </fieldset>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-4 border-t-2 border-black">
        {ATTENDANCE_STATUSES.map((option) => (
          <div key={option.value} className="border-r border-border-light px-3 py-3 last:border-r-0 sm:px-4">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <StatusGlyph status={option.value} className="size-2.5 text-black" />
              {option.label}
            </p>
            <p className="mt-1 font-display text-2xl leading-none">{summary[option.value]}</p>
          </div>
        ))}
      </div>
      <div className="flex items-baseline justify-between bg-black px-4 py-3 text-white sm:px-5" aria-live="polite">
        <span className="font-mono text-[11px] uppercase tracking-widest text-white/70">
          Session attendance · {summary.attended} of {summary.eligible} eligible
        </span>
        <span className="font-display text-2xl">{formatPercentage(summary.percentage)}</span>
      </div>
    </div>
  )
}
