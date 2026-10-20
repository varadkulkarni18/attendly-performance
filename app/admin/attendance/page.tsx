import Link from 'next/link'
import {
  and,
  asc,
  desc,
  eq,
  gte,
  lte,
} from 'drizzle-orm'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react'

import { AttendanceFilters } from '@/components/admin/attendance-filters'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  groupStudents,
  lectureAttendance,
  lectureSessions,
  timetableEntries,
} from '@/lib/db/schema'

type SearchParams = Promise<{
  q?: string
  group?: string
  subject?: string
  from?: string
  to?: string
  status?: string
  lecture?: string
  page?: string
  apply?: string
}>

const VALID_STATUSES = ['all', 'present', 'absent', 'late', 'excused']
const ATTENDANCE_THRESHOLD = 75

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T12:00:00Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatTime(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)

  if (!Number.isFinite(hour) || !minuteText) return value

  return `${hour % 12 || 12}:${minuteText} ${hour >= 12 ? 'PM' : 'AM'}`
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function StatusBadge({ status }: { status: string }) {
  const key = normalize(status)

  const styles: Record<string, string> = {
    present: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    absent: 'border-rose-200 bg-rose-50 text-rose-800',
    late: 'border-amber-200 bg-amber-50 text-amber-800',
    excused: 'border-neutral-200 bg-neutral-100 text-neutral-600',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    scheduled: 'border-neutral-200 bg-neutral-50 text-neutral-600',
    cancelled: 'border-rose-200 bg-rose-50 text-rose-800',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${
        styles[key] ??
        'border-neutral-200 bg-neutral-50 text-neutral-600'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}


function Stat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string | number
  detail: string
  icon: typeof Users
}) {
  return (
    <div className="flex min-h-[170px] flex-col bg-white p-5 sm:p-6">
      <div className="flex min-h-5 items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </p>
        <Icon
          size={17}
          strokeWidth={1.5}
          className="shrink-0 text-neutral-400"
        />
      </div>

      <p className="mt-5 font-display text-4xl leading-none tracking-tight tabular-nums text-neutral-950">
        {value}
      </p>

      <p className="mt-3 max-w-xs text-xs leading-5 text-neutral-500">
        {detail}
      </p>
    </div>
  )
}


function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-neutral-200 bg-white px-5 py-14 text-center">
      <ClipboardCheck
        size={22}
        strokeWidth={1.5}
        className="mx-auto text-neutral-400"
      />

      <h3 className="mt-4 font-display text-xl text-neutral-950">
        Nothing to display
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">
        {message}
      </p>
    </div>
  )
}

type GroupLabelInput = {
  name?: string | null
  groupName?: string | null
  section: string | null
}

function groupLabel(group: GroupLabelInput) {
  const name = group.name ?? group.groupName ?? 'Unknown class'

  return `${name}${group.section ? ` · ${group.section}` : ''}`
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const admin = await requireRole('admin')
  const params = await searchParams

  const requestedStudentPage = Math.max(
    1,
    Number.parseInt(params.page ?? '1', 10) || 1,
  )
  const STUDENTS_PER_PAGE = 10
  const filtersApplied = params.apply === '1'

  const query = filtersApplied ? params.q?.trim() ?? '' : ''

  const groupId =
    filtersApplied && params.group && /^\d+$/.test(params.group)
      ? Number(params.group)
      : undefined

  const subjectCode = filtersApplied ? params.subject ?? '' : ''
  const fromDate = filtersApplied && validDate(params.from) ? params.from! : ''
  const toDate = filtersApplied && validDate(params.to) ? params.to! : ''

  const selectedLecture =
    params.lecture && /^\d+$/.test(params.lecture)
      ? Number(params.lecture)
      : undefined

  const requestedStatus = filtersApplied ? params.status ?? 'all' : 'all'

  const selectedStatus = VALID_STATUSES.includes(requestedStatus)
    ? requestedStatus
    : 'all'

  const dateRangeInvalid = Boolean(
    fromDate && toDate && fromDate > toDate,
  )

  const sessionConditions = []

  if (groupId) {
    sessionConditions.push(eq(classGroups.id, groupId))
  }

  if (subjectCode) {
    sessionConditions.push(
      eq(timetableEntries.subjectCode, subjectCode),
    )
  }

  if (fromDate && !dateRangeInvalid) {
    sessionConditions.push(
      gte(lectureSessions.date, fromDate),
    )
  }

  if (toDate && !dateRangeInvalid) {
    sessionConditions.push(
      lte(lectureSessions.date, toDate),
    )
  }

  const [groups, subjects, sessions, attendanceRecords, roster] =
    await Promise.all([
      db
        .select({
          id: classGroups.id,
          name: classGroups.name,
          section: classGroups.section,
          academicYear: classGroups.academicYear,
        })
        .from(classGroups)
        .orderBy(
          asc(classGroups.name),
          asc(classGroups.section),
        ),

      db
        .selectDistinct({
          classGroupId: timetableEntries.classGroupId,
          code: timetableEntries.subjectCode,
          name: timetableEntries.subjectName,
        })
        .from(timetableEntries)
        .where(eq(timetableEntries.active, true))
        .orderBy(asc(timetableEntries.subjectName)),

      db
        .select({
          id: lectureSessions.id,
          date: lectureSessions.date,
          status: lectureSessions.status,
          entryId: timetableEntries.id,
          subjectName: timetableEntries.subjectName,
          subjectCode: timetableEntries.subjectCode,
          startTime: timetableEntries.startTime,
          endTime: timetableEntries.endTime,
          groupId: classGroups.id,
          groupName: classGroups.name,
          section: classGroups.section,
          academicYear: classGroups.academicYear,
        })
        .from(lectureSessions)
        .innerJoin(
          timetableEntries,
          eq(
            lectureSessions.timetableEntryId,
            timetableEntries.id,
          ),
        )
        .innerJoin(
          classGroups,
          eq(
            timetableEntries.classGroupId,
            classGroups.id,
          ),
        )
        .where(
          sessionConditions.length
            ? and(...sessionConditions)
            : undefined,
        )
        .orderBy(
          desc(lectureSessions.date),
          asc(timetableEntries.startTime),
        ),

      db
        .select({
          id: lectureAttendance.id,
          lectureId: lectureAttendance.lectureSessionId,
          status: lectureAttendance.status,
          studentId: groupStudents.id,
          studentName: groupStudents.studentName,
          rollNo: groupStudents.rollNo,
        })
        .from(lectureAttendance)
        .innerJoin(
          groupStudents,
          eq(
            lectureAttendance.groupStudentId,
            groupStudents.id,
          ),
        ),

      db
        .select({
          id: groupStudents.id,
          name: groupStudents.studentName,
          rollNo: groupStudents.rollNo,
          groupId: groupStudents.classGroupId,
        })
        .from(groupStudents),
    ])

  const recordsByLecture = new Map<
    number,
    typeof attendanceRecords
  >()

  for (const record of attendanceRecords) {
    const current =
      recordsByLecture.get(record.lectureId) ?? []

    current.push(record)
    recordsByLecture.set(record.lectureId, current)
  }

  const countableStatus = (status: string) =>
    ['present', 'absent', 'late'].includes(normalize(status))

  const completedSessions = sessions.filter(
    (session) => normalize(session.status) === 'completed',
  )

  const sessionSummaries = sessions.map((session) => {
    const allMarks = recordsByLecture.get(session.id) ?? []

    const recognizedMarks = allMarks.filter((record) =>
      ['present', 'absent', 'late', 'excused'].includes(
        normalize(record.status),
      ),
    )

    const countableMarks = recognizedMarks.filter((record) =>
      countableStatus(record.status),
    )

    const present = countableMarks.filter(
      (record) => normalize(record.status) === 'present',
    ).length

    const late = countableMarks.filter(
      (record) => normalize(record.status) === 'late',
    ).length

    const absent = countableMarks.filter(
      (record) => normalize(record.status) === 'absent',
    ).length

    const excused = recognizedMarks.filter(
      (record) => normalize(record.status) === 'excused',
    ).length

    const isCompleted =
      normalize(session.status) === 'completed'

    const attendanceRate =
      countableMarks.length > 0
        ? Math.round(
            ((present + late) / countableMarks.length) * 100,
          )
        : null

    return {
      ...session,
      records: recognizedMarks,
      present,
      late,
      absent,
      excused,
      totalMarked: recognizedMarks.length,
      countableTotal: countableMarks.length,
      attendanceRate,
      needsReview:
        !isCompleted || recognizedMarks.length === 0,
    }
  })

  const visibleSessions = sessionSummaries.filter((session) => {
    const searchableText = [
      session.subjectName,
      session.subjectCode,
      session.groupName,
      session.section ?? '',
    ]
      .join(' ')
      .toLowerCase()

    if (
      query &&
      !searchableText.includes(query.toLowerCase())
    ) {
      return false
    }

    if (
      selectedStatus !== 'all' &&
      !session.records.some(
        (record) =>
          normalize(record.status) === selectedStatus,
      )
    ) {
      return false
    }

    return true
  })

  const totalPresent = sessionSummaries.reduce(
    (sum, session) =>
      sum + session.present + session.late,
    0,
  )

  const totalCountable = sessionSummaries.reduce(
    (sum, session) => sum + session.countableTotal,
    0,
  )

  const totalAbsent = sessionSummaries.reduce(
    (sum, session) => sum + session.absent,
    0,
  )

  const overallRate =
    totalCountable > 0
      ? Math.round((totalPresent / totalCountable) * 100)
      : null

  const sessionsToReview = sessionSummaries.filter(
    (session) => session.needsReview,
  )

  const activeLecture = selectedLecture
    ? sessionSummaries.find(
        (session) => session.id === selectedLecture,
      )
    : undefined

  const activeStudentRows = activeLecture
    ? activeLecture.records
        .filter((record) => {
          if (
            selectedStatus !== 'all' &&
            normalize(record.status) !== selectedStatus
          ) {
            return false
          }

          if (!query) return true

          return (
            record.studentName
              .toLowerCase()
              .includes(query.toLowerCase()) ||
            record.rollNo
              .toLowerCase()
              .includes(query.toLowerCase())
          )
        })
        .sort((a, b) => a.rollNo.localeCompare(b.rollNo))
    : []

  const lowAttendance = new Map<
    number,
    {
      id: number
      name: string
      rollNo: string
      groupId: number
      attended: number
      total: number
    }
  >()

  const studentGroupMap = new Map(
    roster.map((student) => [
      student.id,
      student.groupId,
    ]),
  )

  for (const session of sessionSummaries) {
    if (normalize(session.status) !== 'completed') continue

    for (const record of session.records) {
      if (!countableStatus(record.status)) continue

      const current = lowAttendance.get(record.studentId) ?? {
        id: record.studentId,
        name: record.studentName,
        rollNo: record.rollNo,
        groupId:
          studentGroupMap.get(record.studentId) ??
          session.groupId,
        attended: 0,
        total: 0,
      }

      current.total += 1

      if (
        ['present', 'late'].includes(normalize(record.status))
      ) {
        current.attended += 1
      }

      lowAttendance.set(record.studentId, current)
    }
  }

  const lowStudents = Array.from(lowAttendance.values())
    .map((student) => ({
      ...student,
      percentage: Math.round(
        (student.attended / student.total) * 100,
      ),
      groupName:
        groups.find(
          (group) => group.id === student.groupId,
        )?.name ?? '—',
    }))
    .filter(
      (student) =>
        student.percentage < ATTENDANCE_THRESHOLD,
    )
    .sort((a, b) => a.percentage - b.percentage)

    const totalStudentPages = Math.max(
        1,
        Math.ceil(lowStudents.length / STUDENTS_PER_PAGE),
    )

    const currentStudentPage = Math.min(
        requestedStudentPage,
        totalStudentPages,
    )

    const paginatedLowStudents = lowStudents.slice(
        (currentStudentPage - 1) * STUDENTS_PER_PAGE,
        currentStudentPage * STUDENTS_PER_PAGE,
    )

  // The Apply button controls whether results are visible.
  // If the admin applies the form without choosing specific filters,
  // show all class groups, all subjects, and all recorded lectures.
  const filtered = filtersApplied && !dateRangeInvalid

  const detailUrl = (lectureId: number) => {
    const next = new URLSearchParams()

    if (query) next.set('q', query)
    if (groupId) next.set('group', String(groupId))
    if (subjectCode) next.set('subject', subjectCode)
    if (fromDate) next.set('from', fromDate)
    if (toDate) next.set('to', toDate)

    if (selectedStatus !== 'all') {
      next.set('status', selectedStatus)
    }

    next.set('apply', '1')
    next.set('lecture', String(lectureId))

    return `/admin/attendance?${next.toString()}`
  }

  const backToListUrl = (() => {
    const next = new URLSearchParams()

    if (query) next.set('q', query)
    if (groupId) next.set('group', String(groupId))
    if (subjectCode) next.set('subject', subjectCode)
    if (fromDate) next.set('from', fromDate)
    if (toDate) next.set('to', toDate)

    if (selectedStatus !== 'all') {
      next.set('status', selectedStatus)
    }

    if (filtersApplied) next.set('apply', '1')

    const search = next.toString()

    return search
      ? `/admin/attendance?${search}`
      : '/admin/attendance'
  })()

  return (
    
      <main className="mx-auto w-full max-w-7xl space-y-7 pb-10">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Administration / Monitoring
            </p>

            <h1 className="mt-4 font-display text-4xl tracking-tight text-neutral-950 sm:text-5xl">
              Attendance<span className="italic">.</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
              Review attendance by class and lecture. Open any
              lecture to see its student register instead of
              browsing hundreds of individual records at once.
            </p>
          </div>

          <Link
            href="/admin/timetable"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-neutral-300 px-4 text-sm text-neutral-900 transition hover:border-neutral-950 hover:bg-neutral-50"
          >
            <CalendarDays size={16} strokeWidth={1.5} />
            View timetable
            <ArrowUpRight size={15} strokeWidth={1.5} />
          </Link>
        </header>

        <section className="grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 xl:grid-cols-4">
          <Stat
            label="Attendance rate"
            value={
              overallRate === null ? '—' : `${overallRate}%`
            }
            detail="Present and late marks across the selected scope"
            icon={CheckCircle2}
          />

          <Stat
            label="Students marked absent"
            value={totalAbsent.toLocaleString('en-IN')}
            detail="Absent marks in the selected scope"
            icon={Users}
          />

          <Stat
            label="Completed sessions"
            value={completedSessions.length.toLocaleString('en-IN')}
            detail="Sessions in the selected scope"
            icon={GraduationCap}
          />

          <Stat
            label="Sessions to review"
            value={sessionsToReview.length.toLocaleString('en-IN')}
            detail="Sessions not completed or without saved marks"
            icon={ShieldAlert}
          />
        </section>

        <section className="space-y-4">
          {activeLecture ? (
            <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-end">
              <div>
                <Link
                  href={backToListUrl}
                  className="mb-4 inline-flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-950"
                >
                  <ArrowLeft size={14} />
                  Back to lecture list
                </Link>

                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  Lecture register
                </p>

                <h2 className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
                  {activeLecture.subjectName}
                </h2>

                <p className="mt-1 text-sm text-neutral-600">
                  {groupLabel(activeLecture)} ·{' '}
                  {formatDate(activeLecture.date)}
                  {' · '}
                  {formatTime(activeLecture.startTime)}–
                  {formatTime(activeLecture.endTime)}
                </p>
              </div>

              <StatusBadge status={activeLecture.status} />
            </div>
          ) : (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Attendance register
              </p>

              <h2 className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
                Lectures
              </h2>

              <p className="mt-1 text-sm leading-6 text-neutral-600">
                Each row represents one lecture. Select a row to
                view its student-by-student attendance.
              </p>
            </div>
          )}

          {!activeLecture && (
            <AttendanceFilters
              groups={groups}
              subjects={subjects}
              filtersApplied={filtersApplied}
              query={query}
              groupId={groupId}
              subjectCode={subjectCode}
              fromDate={fromDate}
              toDate={toDate}
              selectedStatus={selectedStatus}
            />
          )}

          {dateRangeInvalid && (
            <p className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              The start date must be earlier than or equal to
              the end date. Please adjust the date range.
            </p>
          )}

          {activeLecture ? (
            <>
              <div className="grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-4">
                {[
                  {
                    label: 'Present',
                    value: activeLecture.present,
                  },
                  {
                    label: 'Late',
                    value: activeLecture.late,
                  },
                  {
                    label: 'Absent',
                    value: activeLecture.absent,
                  },
                  {
                    label: 'Excused',
                    value: activeLecture.excused,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-white p-4 sm:p-5"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                      {item.label}
                    </p>

                    <p className="mt-3 font-display text-3xl text-neutral-950">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {activeStudentRows.length > 0 ? (
                <div className="overflow-hidden border border-neutral-200 bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                      Student register
                    </p>

                    <p className="text-xs text-neutral-500">
                      {activeStudentRows.length} records
                    </p>
                  </div>

                  <div className="divide-y divide-neutral-100">
                    {activeStudentRows.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between gap-3 px-4 py-4 transition hover:bg-neutral-50 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-950">
                            {record.studentName}
                          </p>

                          <p className="mt-1 font-mono text-[10px] text-neutral-500">
                            Roll no. {record.rollNo}
                          </p>
                        </div>

                        <StatusBadge status={record.status} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState message="No student attendance marks match this lecture and status filter." />
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                <p className="text-xs text-neutral-500">
                  {filtered && !dateRangeInvalid ? (
                    <>
                      <span className="font-display text-lg text-neutral-950">
                        {visibleSessions.length.toLocaleString('en-IN')}
                      </span>{' '}
                      matching lectures
                    </>
                  ) : (
                    'Click Apply filters to view lectures across all classes'
                  )}
                </p>

                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                  {filtered
                    ? fromDate || toDate
                      ? `${fromDate || 'Beginning'} — ${toDate || 'Latest'}`
                      : 'All available dates'
                    : 'No filters applied'}
                </p>
              </div>

              {filtered && visibleSessions.length > 0 && !dateRangeInvalid ? (
                <div className="overflow-hidden border border-neutral-200 bg-white">
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[800px] border-collapse text-left">
                      <thead className="border-b border-neutral-200 bg-neutral-50">
                        <tr>
                          {[
                            'Lecture',
                            'Class group',
                            'Date & time',
                            'Marked',
                            'Attendance',
                            '',
                          ].map((heading, index) => (
                            <th
                              key={`${heading}-${index}`}
                              className="px-4 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.13em] text-neutral-500"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-neutral-100">
                        {visibleSessions.map((session) => (
                          <tr
                            key={session.id}
                            className="transition-colors hover:bg-neutral-50/70"
                          >
                            <td className="px-4 py-4">
                              <p className="text-sm font-medium text-neutral-950">
                                {session.subjectName}
                              </p>

                              <p className="mt-1 font-mono text-[10px] text-neutral-500">
                                {session.subjectCode}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-xs text-neutral-800">
                                {groupLabel(session)}
                              </p>

                              <p className="mt-1 text-[11px] text-neutral-500">
                                {session.academicYear}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-xs text-neutral-800">
                                {formatDate(session.date)}
                              </p>

                              <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
                                <Clock3 size={11} />
                                {formatTime(session.startTime)}–
                                {formatTime(session.endTime)}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-xs text-neutral-700">
                              {session.totalMarked}

                              {session.excused > 0 && (
                                <span className="text-neutral-500">
                                  {' '}({session.excused} excused)
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {session.attendanceRate === null ? (
                                <span className="text-xs text-neutral-400">
                                  —
                                </span>
                              ) : (
                                <span
                                  className={`font-mono text-xs tabular-nums ${
                                    session.attendanceRate <
                                    ATTENDANCE_THRESHOLD
                                      ? 'text-rose-700'
                                      : 'text-neutral-800'
                                  }`}
                                >
                                  {session.attendanceRate}%
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <Link
                                href={detailUrl(session.id)}
                                className="inline-flex items-center gap-1.5 border border-neutral-200 px-3 py-2 text-xs text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
                              >
                                View register
                                <ChevronRight size={13} />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-neutral-100 md:hidden">
                    {visibleSessions.map((session) => (
                      <Link
                        key={session.id}
                        href={detailUrl(session.id)}
                        className="block space-y-3 p-4 transition hover:bg-neutral-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-950">
                              {session.subjectName}
                            </p>

                            <p className="mt-1 text-xs text-neutral-500">
                              {groupLabel(session)}
                            </p>
                          </div>

                          <ChevronRight
                            size={16}
                            className="shrink-0 text-neutral-400"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-neutral-500">
                            {formatDate(session.date)} ·{' '}
                            {formatTime(session.startTime)}
                          </p>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-neutral-600">
                              {session.totalMarked} marked
                            </span>

                            {session.attendanceRate !== null && (
                              <span className="font-mono text-xs">
                                {session.attendanceRate}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <StatusBadge status={session.status} />

                          <span className="text-xs text-neutral-700">
                            View student register
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                     message={
                        dateRangeInvalid
                         ? 'Correct the date range to view lectures.'
                      : !filtered
                        ? 'Click Apply filters to view lectures across all class groups and subjects, or choose a class or subject to narrow the list.'
                     : 'No lectures match these filters. Try a different class, subject, search or date range.'
                                          }
                />
              )}
            </>
          )}
        </section>

        {!activeLecture && filtered && (
          <section id="student-monitoring" className="space-y-4 scroll-mt-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  Student monitoring
                </p>

                <h2 className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
                  Below attendance threshold
                </h2>

                <p className="mt-1 text-sm leading-6 text-neutral-600">
                  Students below {ATTENDANCE_THRESHOLD}% for the
                  selected scope.
                </p>
              </div>

              <span className="font-display text-2xl text-neutral-950">
                {lowStudents.length}
                <span className="ml-2 font-sans text-xs text-neutral-500">
                  students
                </span>
              </span>
            </div>

            {lowStudents.length > 0 ? (
              <div className="overflow-hidden border border-neutral-200 bg-white">
                {paginatedLowStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-4 border-b border-neutral-100 px-4 py-4 last:border-b-0 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-950">
                        {student.name}
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        {student.rollNo} · {student.groupName}
                      </p>

                      <p className="mt-1 text-[11px] text-neutral-500">
                        Attended {student.attended} of {student.total}{' '}
                        countable marks
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="hidden h-1.5 w-20 overflow-hidden bg-neutral-100 sm:block">
                        <div
                          className="h-full bg-rose-600"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, student.percentage),
                            )}%`,
                          }}
                        />
                      </div>

                      <span className="font-mono text-sm tabular-nums text-rose-700">
                        {student.percentage}%
                      </span>
                    </div>
                  </div>
                ))}


              </div>
            ) : (
              <div className="border border-neutral-200 bg-white p-5">
                <p className="text-sm text-neutral-800">
                  No students are below the threshold in this selection.
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  This is calculated only from completed sessions
                  with recognized attendance marks.
                </p>
              </div>
            )}

            
                      {totalStudentPages > 1 && (
                          <div className="flex flex-col gap-3 border-t border-neutral-200 bg-neutral-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-xs text-neutral-500">
                                  Showing {(currentStudentPage - 1) * STUDENTS_PER_PAGE + 1}–
                                  {Math.min(
                                      currentStudentPage * STUDENTS_PER_PAGE,
                                      lowStudents.length,
                                  )}{' '}
                                  of {lowStudents.length} students
                              </p>

                              <div className="flex items-center gap-2">
                                  <Link
                                      href={`/admin/attendance?${new URLSearchParams({
                                          ...(query ? { q: query } : {}),
                                          ...(groupId ? { group: String(groupId) } : {}),
                                          ...(subjectCode ? { subject: subjectCode } : {}),
                                          ...(fromDate ? { from: fromDate } : {}),
                                          ...(toDate ? { to: toDate } : {}),
                                          ...(selectedStatus !== 'all'
                                              ? { status: selectedStatus }
                                              : {}),
                                          ...(filtersApplied ? { apply: '1' } : {}),
                                          page: String(Math.max(1, currentStudentPage - 1)),
                                      }).toString()}#student-monitoring`}
                                      aria-disabled={currentStudentPage <= 1}
                                      className={`inline-flex h-9 items-center gap-2 border px-3 text-xs ${currentStudentPage <= 1
                                              ? 'pointer-events-none border-neutral-200 text-neutral-300'
                                              : 'border-neutral-300 hover:bg-white'
                                          }`}
                                  >
                                      <ArrowLeft size={13} />
                                      Previous
                                  </Link>

                                  <span className="px-2 font-mono text-xs text-neutral-500">
                                      Page {currentStudentPage} of {totalStudentPages}
                                  </span>

                                  <Link
                                      href={`/admin/attendance?${new URLSearchParams({
                                          ...(query ? { q: query } : {}),
                                          ...(groupId ? { group: String(groupId) } : {}),
                                          ...(subjectCode ? { subject: subjectCode } : {}),
                                          ...(fromDate ? { from: fromDate } : {}),
                                          ...(toDate ? { to: toDate } : {}),
                                          ...(selectedStatus !== 'all'
                                              ? { status: selectedStatus }
                                              : {}),
                                          ...(filtersApplied ? { apply: '1' } : {}),
                                          page: String(
                                              Math.min(totalStudentPages, currentStudentPage + 1),
                                          ),
                                      }).toString()}#student-monitoring`}
                                      aria-disabled={currentStudentPage >= totalStudentPages}
                                      className={`inline-flex h-9 items-center gap-2 border px-3 text-xs ${currentStudentPage >= totalStudentPages
                                              ? 'pointer-events-none border-neutral-200 text-neutral-300'
                                              : 'border-neutral-300 hover:bg-white'
                                          }`}
                                  >
                                      Next
                                      <ArrowRight size={13} />
                                  </Link>
                              </div>
                          </div>
                      )}


          </section>
        )}

        <footer className="flex flex-col gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-neutral-500">
            Each lecture is shown once in the main list. Excused
            marks are excluded from attendance percentages; present
            and late count as attended. This page does not modify
            teacher attendance records.
          </p>

          <Link
            href="/admin/classes"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs text-neutral-600 transition hover:text-neutral-950"
          >
            Browse class groups
            <ArrowUpRight size={13} />
          </Link>
        </footer>
      </main>
    
  )
}