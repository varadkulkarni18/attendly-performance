'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

type GroupOption = {
  id: number
  name: string
  section: string | null
  academicYear: string
}

type SubjectOption = {
  classGroupId: number
  code: string
  name: string
}

type AttendanceFiltersProps = {
  groups: GroupOption[]
  subjects: SubjectOption[]
  filtersApplied: boolean
  query: string
  groupId?: number
  subjectCode: string
  fromDate: string
  toDate: string
  selectedStatus: string
}

const fieldClass =
  'box-border h-11 w-full min-w-0 rounded-none border border-neutral-200 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-500 focus:ring-1 focus:ring-neutral-200'

const labelClass =
  'mb-2 flex h-4 items-center font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500'

function labelForGroup(group: GroupOption): string {
  return group.name + (group.section ? ' · ' + group.section : '')
}

export function AttendanceFilters({
  groups,
  subjects,
  filtersApplied,
  query,
  groupId,
  subjectCode,
  fromDate,
  toDate,
  selectedStatus,
}: AttendanceFiltersProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>(
    filtersApplied && groupId !== undefined ? String(groupId) : '',
  )

  const [selectedSubject, setSelectedSubject] = useState<string>(
    filtersApplied ? subjectCode : '',
  )

  // When no class is selected, show the distinct subjects used across all classes.
  // When a class is selected, only show subjects assigned to that class group.
  const availableSubjects = useMemo(() => {
    const scoped = selectedGroup
      ? subjects.filter(
          (subject) => subject.classGroupId === Number(selectedGroup),
        )
      : subjects

    const seen = new Set<string>()

    return scoped.filter((subject) => {
      const key = subject.code + '::' + subject.name
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [selectedGroup, subjects])

  useEffect(() => {
    if (
      selectedSubject &&
      !availableSubjects.some((subject) => subject.code === selectedSubject)
    ) {
      setSelectedSubject('')
    }
  }, [availableSubjects, selectedSubject])

  return (
    <form
      action="/admin/attendance"
      method="GET"
      className="grid grid-cols-1 gap-x-3 gap-y-4 border border-neutral-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-12"
    >
      <input type="hidden" name="apply" value="1" />
      <input type="hidden" name="page" value="1" />

      <label className="block min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-4">
        <span className={labelClass}>Search</span>
        <span className="relative block">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            name="q"
            defaultValue={filtersApplied ? query : ''}
            placeholder="Class or subject..."
            className={fieldClass + ' appearance-none pl-9 pr-3'}
          />
        </span>
      </label>

      <label className="block min-w-0 sm:col-span-1 lg:col-span-1 xl:col-span-2">
        <span className={labelClass}>Class group / section</span>
        <select
          name="group"
          value={selectedGroup}
          onChange={(event) => {
            setSelectedGroup(event.target.value)
            setSelectedSubject('')
          }}
          className={fieldClass}
        >
          <option value="">All class groups</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {labelForGroup(group)}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-0 sm:col-span-1 lg:col-span-2 xl:col-span-2">
        <span className={labelClass}>Subject</span>
        <select
          name="subject"
          value={selectedSubject}
          onChange={(event) => setSelectedSubject(event.target.value)}
          className={fieldClass}
        >
          <option value="">All subjects</option>
          {availableSubjects.map((subject) => (
            <option
              key={
                subject.classGroupId +
                '-' +
                subject.code +
                '-' +
                subject.name
              }
              value={subject.code}
            >
              {subject.name} ({subject.code})
            </option>
          ))}
        </select>
        <span className="mt-1 block min-h-3 text-[10px] leading-3 text-neutral-400">
          {selectedGroup
            ? 'Subjects for selected class group.'
            : 'Showing subjects across all class groups.'}
        </span>
      </label>

      <label className="block min-w-0 sm:col-span-1 lg:col-span-2 xl:col-span-2">
        <span className={labelClass}>From date</span>
        <input
          type="date"
          name="from"
          defaultValue={filtersApplied ? fromDate : ''}
          max={toDate || undefined}
          className={fieldClass + ' px-2'}
        />
      </label>

      <label className="block min-w-0 sm:col-span-1 lg:col-span-2 xl:col-span-2">
        <span className={labelClass}>To date</span>
        <input
          type="date"
          name="to"
          defaultValue={filtersApplied ? toDate : ''}
          min={fromDate || undefined}
          className={fieldClass + ' px-2'}
        />
      </label>

      <label className="block min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-4">
        <span className={labelClass}>Attendance status</span>
        <select
          name="status"
          defaultValue={filtersApplied ? selectedStatus : 'all'}
          className={fieldClass}
        >
          <option value="all">All statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="excused">Excused</option>
        </select>
      </label>

      <div className="block min-w-0 sm:col-span-1 lg:col-span-2 xl:col-span-4">
        <span className={labelClass} aria-hidden="true">
          Actions
        </span>

        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="submit"
            className="inline-flex h-11 min-w-0 items-center justify-center gap-2 bg-neutral-950 px-3 text-sm text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
          >
            <Search size={15} aria-hidden="true" />
            Apply filters
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.assign('/admin/attendance')
            }}
            className="inline-flex h-11 min-w-0 items-center justify-center border border-neutral-200 px-3 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  )
}