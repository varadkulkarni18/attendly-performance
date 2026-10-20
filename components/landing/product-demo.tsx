'use client'

import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { SectionLabel } from '@/components/brand'
import {
  DEFAULT_LOW_ATTENDANCE_THRESHOLD,
  formatPercentage,
  isBelowThreshold,
  summarizeCounts,
} from '@/lib/attendance'
import { classComparison, studentSubjects } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

const views = [
  {
    id: 'admin',
    label: 'Admin',
    title: 'Institution-wide, class by class.',
    body: 'Compare every class against the attendance threshold and spot problems before the term ends.',
  },
  {
    id: 'student',
    label: 'Student',
    title: 'My attendance, subject by subject.',
    body: 'Students see only their own records — with a clear warning the moment a subject falls below the line.',
  },
] as const

type ViewId = (typeof views)[number]['id']

export function ProductDemo() {
  const [view, setView] = useState<ViewId>('admin')
  const active = views.find((v) => v.id === view)!

  return (
    <section id="product" className="scroll-mt-16 border-t-4 border-black">
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-32 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionLabel index="01">One record, three views</SectionLabel>
            <h2 className="mt-6 font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">{active.title}</h2>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-muted-foreground">{active.body}</p>

            <div role="tablist" aria-label="Product views" className="mt-10 flex border-2 border-black">
              {views.map((v) => (
                <button
                  key={v.id}
                  role="tab"
                  type="button"
                  id={`tab-${v.id}`}
                  aria-selected={view === v.id}
                  aria-controls={`panel-${v.id}`}
                  onClick={() => setView(v.id)}
                  className={cn(
                    'focus-ring flex-1 px-4 py-3 font-mono text-xs uppercase tracking-widest transition-none',
                    view === v.id ? 'bg-black text-white' : 'bg-white hover:bg-muted',
                  )}
                >
                  {v.label} view
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The teacher view is the roster above. Every number on this page comes from the same calculation.
            </p>
          </div>

          <div
            role="tabpanel"
            id={`panel-${view}`}
            aria-labelledby={`tab-${view}`}
            className="texture-grid border-2 border-black bg-white"
          >
            {view === 'admin' ? <AdminPanel /> : <StudentPanel />}
          </div>
        </div>
      </div>
    </section>
  )
}

function Bar({ value }: { value: number | null }) {
  const pct = value ?? 0
  return (
    <div className="relative h-2.5 w-full border border-black bg-white" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 bg-black" style={{ width: `${pct}%` }} />
      <div
        className="absolute -inset-y-1.5 w-px bg-black"
        style={{ left: `${DEFAULT_LOW_ATTENDANCE_THRESHOLD}%` }}
      />
    </div>
  )
}

function AdminPanel() {
  return (
    <div>
      <div className="flex items-center justify-between border-b-2 border-black bg-white px-5 py-4">
        <p className="font-display text-lg">Class-wise attendance · October</p>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Threshold {DEFAULT_LOW_ATTENDANCE_THRESHOLD}%
        </p>
      </div>
      <ul className="divide-y divide-border-light bg-white">
        {classComparison.map((row) => {
          const summary = summarizeCounts(row)
          const low = isBelowThreshold(summary.percentage)
          return (
            <li key={row.className} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[15px]">{row.className}</p>
                  <p className="font-display text-xl sm:hidden">{formatPercentage(summary.percentage)}</p>
                </div>
                <div className="mt-2">
                  <Bar value={summary.percentage} />
                </div>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {summary.attended} attended / {summary.eligible} eligible · {row.excused} excused
                </p>
              </div>
              <div className="hidden w-28 text-right sm:block">
                <p className="font-display text-2xl leading-none">{formatPercentage(summary.percentage)}</p>
                {low && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest underline underline-offset-2">
                    Below threshold
                  </p>
                )}
              </div>
              {low && (
                <p className="font-mono text-[10px] uppercase tracking-widest underline underline-offset-2 sm:hidden">
                  Below threshold
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StudentPanel() {
  const overall = summarizeCounts(
    studentSubjects.reduce(
      (acc, s) => ({
        present: acc.present + s.present,
        late: acc.late + s.late,
        absent: acc.absent + s.absent,
        excused: acc.excused + s.excused,
      }),
      { present: 0, late: 0, absent: 0, excused: 0 },
    ),
  )
  const lowSubjects = studentSubjects.filter((s) => isBelowThreshold(summarizeCounts(s).percentage))

  return (
    <div className="bg-white">
      <div className="grid grid-cols-[1fr_auto] items-end gap-4 border-b-2 border-black px-5 py-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Diya Kapoor · CS-2102 · Overall
          </p>
          <p className="mt-1 font-display text-5xl leading-none tracking-tight">
            {formatPercentage(overall.percentage)}
          </p>
        </div>
        <p className="text-right font-mono text-[11px] leading-relaxed text-muted-foreground">
          {overall.attended} attended
          <br />
          {overall.absent} missed
        </p>
      </div>

      {lowSubjects.length > 0 && (
        <div role="note" className="flex gap-3 border-b border-black bg-black px-5 py-3 text-white">
          <AlertTriangle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-sm leading-relaxed">
            {lowSubjects.map((s) => s.subject).join(', ')} {lowSubjects.length > 1 ? 'are' : 'is'} below{' '}
            {DEFAULT_LOW_ATTENDANCE_THRESHOLD}%. Attend the next sessions to recover, or raise a correction request.
          </p>
        </div>
      )}

      <table className="w-full text-left">
        <caption className="sr-only">Subject-wise attendance</caption>
        <thead>
          <tr className="border-b border-black font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <th scope="col" className="px-5 py-2.5 font-normal">Subject</th>
            <th scope="col" className="hidden px-2 py-2.5 text-right font-normal sm:table-cell">Attended</th>
            <th scope="col" className="hidden px-2 py-2.5 text-right font-normal sm:table-cell">Eligible</th>
            <th scope="col" className="px-5 py-2.5 text-right font-normal">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {studentSubjects.map((s) => {
            const summary = summarizeCounts(s)
            const low = isBelowThreshold(summary.percentage)
            return (
              <tr key={s.code}>
                <td className="px-5 py-3">
                  <p className="text-[15px] leading-tight">{s.subject}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{s.code}</p>
                </td>
                <td className="hidden px-2 py-3 text-right font-mono text-sm sm:table-cell">{summary.attended}</td>
                <td className="hidden px-2 py-3 text-right font-mono text-sm sm:table-cell">{summary.eligible}</td>
                <td className="px-5 py-3 text-right">
                  <span className={cn('font-display text-xl', low && 'underline decoration-2 underline-offset-4')}>
                    {formatPercentage(summary.percentage)}
                  </span>
                  {low && <span className="sr-only"> — below threshold</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
