'use client'

import { useMemo, useState } from 'react'

export interface AttendanceFilterEntry {
  id: number
  classGroupId: number
  subjectName: string
  subjectCode: string
  groupName: string
  section: string
  dayOfWeek: number
}

interface AttendanceFiltersProps {
  mode: 'overview' | 'lecture'
  entries: AttendanceFilterEntry[]
  selectedGroupId: string
  selectedEntryId: string
  selectedDate: string
  selectedFrom: string
  selectedTo: string
}

function getDayOfWeek(date: string): number | undefined {
  if (!date) return undefined
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.getUTCDay()
}

const controlClassName =
  'h-11 w-full border border-neutral-300 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400'

export function AttendanceFilters({
  mode,
  entries,
  selectedGroupId,
  selectedEntryId,
  selectedDate,
  selectedFrom,
  selectedTo,
}: AttendanceFiltersProps) {
  const [date, setDate] = useState(mode === 'lecture' ? selectedDate : '')
  const [groupId, setGroupId] = useState(selectedGroupId)
  const [entryId, setEntryId] = useState(selectedEntryId)
  const [from, setFrom] = useState(selectedFrom)
  const [to, setTo] = useState(selectedTo)

  const dayOfWeek = getDayOfWeek(date)
  const entriesForDay = useMemo(
    () => mode !== 'lecture' || dayOfWeek === undefined
      ? []
      : entries.filter((entry) => entry.dayOfWeek === dayOfWeek),
    [entries, mode, dayOfWeek],
  )

  const availableEntries = mode === 'overview' ? entries : entriesForDay
  const groups = useMemo(() => {
    const byGroup = new Map<number, { id: number; name: string; section: string; label: string }>()
    for (const entry of availableEntries) {
      if (!byGroup.has(entry.classGroupId)) {
        byGroup.set(entry.classGroupId, {
          id: entry.classGroupId,
          name: entry.groupName,
          section: entry.section,
          label: `${entry.groupName} · Section ${entry.section}`,
        })
      }
    }
    return [...byGroup.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [availableEntries])

  const effectiveGroupId = groups.some((group) => String(group.id) === groupId)
    ? groupId
    : ''
  const subjects = useMemo(
    () => availableEntries
      .filter((entry) => entry.classGroupId === Number(effectiveGroupId))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    [availableEntries, effectiveGroupId],
  )
  const effectiveEntryId = subjects.some((entry) => String(entry.id) === entryId)
    ? entryId
    : ''

  function resetHref() {
    return `/teacher/attendance?view=${mode}`
  }

  return (
    <form
      action="/teacher/attendance"
      method="get"
      className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 ${mode === 'overview' ? 'xl:grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(160px,1fr)_auto_auto]' : 'xl:grid-cols-[minmax(170px,1fr)_minmax(200px,1.2fr)_minmax(200px,1.2fr)_auto_auto]'} xl:items-start`}
    >
      <input type="hidden" name="view" value={mode} />

      {mode === 'overview' ? (
        <>
          <label className="block min-w-0 text-sm">
            <span className="mb-2 block font-serif text-base">Class / section</span>
            <select
              className={controlClassName}
              name="group"
              value={effectiveGroupId}
              onChange={(event) => setGroupId(event.target.value)}
            >
              <option value="">Select class / section</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
            </select>
          </label>
          <label className="block min-w-0 text-sm">
            <span className="mb-2 block font-serif text-base">From date</span>
            <input className={controlClassName} type="date" name="from" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="block min-w-0 text-sm">
            <span className="mb-2 block font-serif text-base">To date</span>
            <input className={controlClassName} type="date" name="to" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <button type="submit" disabled={!effectiveGroupId || !from || !to || from > to} className="mt-0 h-11 border border-black bg-black px-5 text-sm text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300 xl:mt-[32px]">Apply filters</button>
        </>
      ) : (
        <>
          <label className="block min-w-0 text-sm">
            <span className="mb-2 block font-serif text-base">Lecture date</span>
            <input className={controlClassName} type="date" name="date" value={date} onChange={(event) => { setDate(event.target.value); setGroupId(''); setEntryId('') }} />
            {date && dayOfWeek !== undefined && <span className="mt-1 block text-xs text-neutral-500">{new Intl.DateTimeFormat('en-IN', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`))}</span>}
          </label>
          <label className="block min-w-0 text-sm">
            <span className="mb-2 block font-serif text-base">Class / section</span>
            <select className={controlClassName} name="group" value={effectiveGroupId} disabled={!date || groups.length === 0} onChange={(event) => { setGroupId(event.target.value); setEntryId('') }}>
              <option value="">{!date ? 'Select date first' : groups.length ? 'Select class / section' : 'No classes scheduled'}</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
            </select>
          </label>
          <label className="block min-w-0 text-sm">
            <span className="mb-2 block font-serif text-base">Subject / timetable</span>
            <select className={controlClassName} name="entry" value={effectiveEntryId} disabled={!effectiveGroupId || subjects.length === 0} onChange={(event) => setEntryId(event.target.value)}>
              <option value="">{!effectiveGroupId ? 'Select class / section first' : 'Select scheduled subject'}</option>
              {subjects.map((entry) => <option key={entry.id} value={entry.id}>{entry.subjectCode} — {entry.subjectName}</option>)}
            </select>
          </label>
          <button type="submit" disabled={!date || !effectiveGroupId || !effectiveEntryId} className="mt-0 h-11 border border-black bg-black px-5 text-sm text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300 xl:mt-[32px]">Apply filters</button>
        </>
      )}

      <a href={resetHref()} className="mt-0 inline-flex h-11 items-center justify-center border border-neutral-300 px-5 text-sm transition-colors hover:border-black xl:mt-[32px]">Reset</a>
    </form>
  )
}
