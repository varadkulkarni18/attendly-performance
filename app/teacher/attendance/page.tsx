import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm'
import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Users,
} from 'lucide-react'
import { AttendanceFilters } from '@/components/teacher/attendance-filters'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  groupStudents,
  lectureAttendance,
  lectureSessions,
  timetableEntries,
} from '@/lib/db/schema'
import {
  DEFAULT_LOW_ATTENDANCE_THRESHOLD,
  formatPercentage,
  isBelowThreshold,
} from '@/lib/attendance'

type SearchParams = Promise<{
  view?: string
  entry?: string
  group?: string
  className?: string
  date?: string
  from?: string
  to?: string
  page?: string
}>

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

function displayDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    },
  )
}

function percentage(numerator: number, denominator: number) {
  return denominator > 0
    ? Math.round((numerator / denominator) * 100)
    : 0
}

function isAttendanceStatus(value: string): value is AttendanceStatus {
  return ['present', 'absent', 'late', 'excused'].includes(
    value.toLowerCase(),
  )
}

function pageHref(
  page: number,
  params: {
    entry?: string
    group?: string
    className?: string
    date?: string
    view?: string
    from?: string
    to?: string
  },
) {
  const query = new URLSearchParams()

  if (params.entry) query.set('entry', params.entry)
  if (params.group) query.set('group', params.group)
  if (params.className) query.set('className', params.className)
  if (params.date) query.set('date', params.date)
  if (params.view) query.set('view', params.view)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)

  query.set('page', String(page))

  return `/teacher/attendance?${query.toString()}`
}

function emptyCounts() {
  return {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  }
}

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await requireRole('teacher')
  const params = await searchParams

  const view = params.view === 'lecture' ? 'lecture' : 'overview'
  const selectedEntryId =
    params.entry && /^\d+$/.test(params.entry)
      ? Number(params.entry)
      : undefined
  const requestedGroupId =
    params.group && /^\d+$/.test(params.group)
      ? Number(params.group)
      : undefined
  const selectedDate = validDate(params.date) ? params.date : ''
  const defaultTo = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  })
  const defaultFrom = `${defaultTo.slice(0, 7)}-01`
  const fromDate = validDate(params.from) ? params.from! : defaultFrom
  const toDate = validDate(params.to) ? params.to! : defaultTo
  const invalidRange = fromDate > toDate

  const requestedPage =
    params.page && /^\d+$/.test(params.page)
      ? Number(params.page)
      : 1

  const entries = await db
    .select({
      id: timetableEntries.id,
      classGroupId: classGroups.id,
      subjectName: timetableEntries.subjectName,
      subjectCode: timetableEntries.subjectCode,
      groupName: classGroups.name,
      academicYear: classGroups.academicYear,
      section: classGroups.section,
      dayOfWeek: timetableEntries.dayOfWeek,
      active: timetableEntries.active,
    })
    .from(timetableEntries)
    .innerJoin(
      classGroups,
      eq(timetableEntries.classGroupId, classGroups.id),
    )
    .where(
      and(
        eq(timetableEntries.teacherId, session.user.id),
        eq(timetableEntries.active, true),
      ),
    )
    .orderBy(
      asc(classGroups.name),
      asc(classGroups.section),
      asc(timetableEntries.subjectName),
    )

  const groups = [
    ...new Map(
      entries.map((entry) => [
        entry.classGroupId,
        {
          id: entry.classGroupId,
          name: entry.groupName,
          section: entry.section,
          academicYear: entry.academicYear,
        },
      ]),
    ).values(),
  ]

  const selectedGroupId = requestedGroupId
  const selectedGroup = groups.find((group) => group.id === selectedGroupId)
  const selectedClassName = selectedGroup?.name ?? params.className ?? undefined

  const selectedDayOfWeek = selectedDate
    ? new Date(`${selectedDate}T00:00:00.000Z`).getUTCDay()
    : undefined

  const selectedEntry = entries.find(
    (entry) =>
      entry.id === selectedEntryId &&
      Boolean(selectedDate) &&
      selectedDayOfWeek !== undefined &&
      entry.dayOfWeek === selectedDayOfWeek &&
      (!selectedGroupId ||
        entry.classGroupId === selectedGroupId) &&
      (!selectedClassName ||
        entry.groupName === selectedClassName),
  )

  const conditions = [
    eq(timetableEntries.teacherId, session.user.id),
  ]

  if (selectedEntry) {
    conditions.push(eq(timetableEntries.id, selectedEntry.id))
  }

  if (selectedGroupId) {
    conditions.push(
      eq(timetableEntries.classGroupId, selectedGroupId),
    )
  }

  if (view === 'lecture' && selectedDate) {
    conditions.push(eq(lectureSessions.date, selectedDate))
  }

  const lecturesQuery = db
    .select({
      id: lectureSessions.id,
      date: lectureSessions.date,
      status: lectureSessions.status,
      entryId: timetableEntries.id,
      subjectName: timetableEntries.subjectName,
      subjectCode: timetableEntries.subjectCode,
      groupId: classGroups.id,
      groupName: classGroups.name,
      section: classGroups.section,
    })
    .from(lectureSessions)
    .innerJoin(
      timetableEntries,
      eq(lectureSessions.timetableEntryId, timetableEntries.id),
    )
    .innerJoin(
      classGroups,
      eq(timetableEntries.classGroupId, classGroups.id),
    )
    .where(and(...conditions))
    .orderBy(desc(lectureSessions.date), desc(lectureSessions.id))

  const lectureRows = !selectedEntry
    ? []
    : await lecturesQuery

  const recordConditions = [
    eq(timetableEntries.teacherId, session.user.id),
  ]

  if (selectedGroupId) {
    recordConditions.push(eq(timetableEntries.classGroupId, selectedGroupId))
  }

  if (view === 'overview' && !invalidRange) {
    recordConditions.push(gte(lectureSessions.date, fromDate))
    recordConditions.push(lte(lectureSessions.date, toDate))
  }

  const recordsQuery = db
    .select({
      sessionId: lectureSessions.id,
      studentId: groupStudents.id,
      studentName: groupStudents.studentName,
      rollNo: groupStudents.rollNo,
      groupId: classGroups.id,
      groupName: classGroups.name,
      section: classGroups.section,
      subjectName: timetableEntries.subjectName,
      subjectCode: timetableEntries.subjectCode,
      status: lectureAttendance.status,
    })
    .from(lectureAttendance)
    .innerJoin(
      lectureSessions,
      eq(lectureAttendance.lectureSessionId, lectureSessions.id),
    )
    .innerJoin(
      timetableEntries,
      eq(lectureSessions.timetableEntryId, timetableEntries.id),
    )
    .innerJoin(
      classGroups,
      eq(timetableEntries.classGroupId, classGroups.id),
    )
    .innerJoin(
      groupStudents,
      eq(lectureAttendance.groupStudentId, groupStudents.id),
    )
    .where(and(...recordConditions))

  const records =
    !selectedGroupId ||
    (view === 'overview' && invalidRange) ||
    (view === 'lecture' && !selectedEntry)
      ? []
      : await recordsQuery

  const relevantEntries = selectedGroupId
    ? entries.filter((entry) => entry.classGroupId === selectedGroupId)
    : []

  const groupIds = [
    ...new Set(relevantEntries.map((entry) => entry.classGroupId)),
  ]

  const roster =
    selectedGroupId && groupIds.length > 0
      ? await db
          .select({
            id: groupStudents.id,
            name: groupStudents.studentName,
            rollNo: groupStudents.rollNo,
            groupId: classGroups.id,
            groupName: classGroups.name,
            section: classGroups.section,
          })
          .from(groupStudents)
          .innerJoin(
            classGroups,
            eq(groupStudents.classGroupId, classGroups.id),
          )
          .where(inArray(classGroups.id, groupIds))
          .orderBy(
            asc(classGroups.section),
            asc(groupStudents.rollNo),
          )
      : []

  const lectureMap = new Map<
    number,
    (typeof lectureRows)[number] & {
      present: number
      absent: number
      late: number
      excused: number
      total: number
    }
  >()

  for (const lecture of lectureRows) {
    lectureMap.set(lecture.id, {
      ...lecture,
      ...emptyCounts(),
      total: 0,
    })
  }

  const studentMap = new Map<
    number,
    {
      id: number
      name: string
      rollNo: string
      groupId: number
      groupName: string
      section: string
      present: number
      absent: number
      late: number
      excused: number
    }
  >()

  for (const student of roster) {
    studentMap.set(student.id, {
      ...student,
      ...emptyCounts(),
    })
  }

  const subjectStudentMap = new Map<
    string,
    {
      studentId: number
      name: string
      rollNo: string
      groupName: string
      section: string
      subjectName: string
      subjectCode: string
      present: number
      absent: number
      late: number
      excused: number
    }
  >()

  for (const record of records) {
    const status = record.status.toLowerCase()

    if (!isAttendanceStatus(status)) continue

    const lecture = lectureMap.get(record.sessionId)

    if (lecture) {
      lecture[status] += 1

      if (status !== 'excused') {
        lecture.total += 1
      }
    }

    const student = studentMap.get(record.studentId)

    if (student) {
      student[status] += 1
    }

    const subjectKey = `${record.studentId}:${record.subjectCode}`

    let subjectStudent = subjectStudentMap.get(subjectKey)

    if (!subjectStudent) {
      subjectStudent = {
        studentId: record.studentId,
        name: record.studentName,
        rollNo: record.rollNo,
        groupName: record.groupName,
        section: record.section,
        subjectName: record.subjectName,
        subjectCode: record.subjectCode,
        ...emptyCounts(),
      }

      subjectStudentMap.set(subjectKey, subjectStudent)
    }

    subjectStudent[status] += 1
  }

  const lectures = [...lectureMap.values()]
  const selectedLectureSessionId = selectedEntry
    ? lectureRows.find((lecture) => lecture.date === selectedDate)?.id
    : undefined

  const selectedLectureStudentStatus = new Map<number, string>()

  if (selectedLectureSessionId !== undefined) {
    for (const record of records) {
      if (record.sessionId === selectedLectureSessionId) {
        selectedLectureStudentStatus.set(
          record.studentId,
          record.status.toLowerCase(),
        )
      }
    }
  }

  const students = [...studentMap.values()].map((student) => {
    const total = student.present + student.absent + student.late
    const attended = student.present + student.late

    return {
      ...student,
      total,
      attended,
      percentage: percentage(attended, total),
    }
  })

  const subjectReports = [...subjectStudentMap.values()]
    .map((student) => {
      const total = student.present + student.absent + student.late
      const attended = student.present + student.late
      const attendancePercentage =
        total > 0 ? percentage(attended, total) : null

      return {
        ...student,
        total,
        attended,
        percentage: attendancePercentage,
        atRisk: isBelowThreshold(attendancePercentage),
      }
    })
    .sort(
      (a, b) =>
        a.subjectName.localeCompare(b.subjectName) ||
        (a.percentage ?? -1) - (b.percentage ?? -1) ||
        a.rollNo.localeCompare(b.rollNo),
    )

  const totalLectures = lectures.length
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(lectures.length / pageSize))
  const currentPage = Math.min(
    Math.max(1, requestedPage),
    totalPages,
  )

  const visibleLectures = lectures.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  const presentCount = lectures.reduce(
    (sum, lecture) => sum + lecture.present,
    0,
  )
  const absentCount = lectures.reduce(
    (sum, lecture) => sum + lecture.absent,
    0,
  )
  const lateCount = lectures.reduce(
    (sum, lecture) => sum + lecture.late,
    0,
  )
  const excusedCount = lectures.reduce(
    (sum, lecture) => sum + lecture.excused,
    0,
  )

  const markedCount = presentCount + absentCount + lateCount

  const atRiskStudents = students.filter(
    (student) =>
      student.total > 0 &&
      student.percentage < DEFAULT_LOW_ATTENDANCE_THRESHOLD,
  )

  return (
    
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-neutral-200 pb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Teaching workspace / Attendance
          </p>

          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
            Attendance<span className="italic">.</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
            Review saved lecture records, follow student attendance,
            and identify students who may need support.
          </p>
        </header>

        <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className="border border-neutral-300 p-4 sm:p-5">
            <p className="text-sm text-neutral-600">
              {view === 'overview' ? 'Students in class' : 'Recorded lectures'}
            </p>

            <p className="mt-3 font-display text-3xl">
              {view === 'lecture' && selectedEntry
                ? totalLectures
                : view === 'overview'
                  ? students.length
                  : '—'}
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {view === 'lecture'
                ? 'For selected lecture filters'
                : `Students in ${
                    selectedGroup
                      ? `${selectedGroup.name} · Section ${selectedGroup.section}`
                      : 'selected class'
                  }`}
            </p>
          </article>

          <article className="border border-neutral-300 p-4 sm:p-5">
            <p className="text-sm text-neutral-600">
              {view === 'overview' ? 'Class attendance' : 'Present marks'}
            </p>

            <p className="mt-3 font-display text-3xl">
              {view === 'lecture' && selectedEntry
                ? presentCount
                : view === 'overview'
                  ? `${percentage(
                      students.reduce((sum, student) => sum + student.attended, 0),
                      students.reduce((sum, student) => sum + student.total, 0),
                    )}%`
                  : '—'}
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {view === 'lecture' && selectedEntry
                ? `${percentage(presentCount, markedCount)}% of non-excused marks`
                : `Across ${fromDate} to ${toDate}`}
            </p>
          </article>

          <article className="border border-neutral-300 p-4 sm:p-5">
            <p className="text-sm text-neutral-600">
              {view === 'overview' ? 'Students at risk' : 'Absent marks'}
            </p>

            <p className="mt-3 font-display text-3xl">
              {view === 'lecture' && selectedEntry
                ? absentCount
                : view === 'overview'
                  ? atRiskStudents.length
                  : '—'}
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {view === 'lecture' && selectedEntry
                ? `${percentage(absentCount, markedCount)}% of non-excused marks`
                : `Below ${DEFAULT_LOW_ATTENDANCE_THRESHOLD}% attendance`}
            </p>
          </article>

          <article className="border border-neutral-300 p-4 sm:p-5">
            <p className="text-sm text-neutral-600">
              {view === 'overview' ? 'Subjects monitored' : 'Students at risk'}
            </p>

            <p className="mt-3 font-display text-3xl">
              {view === 'overview'
                ? new Set(subjectReports.map((report) => report.subjectCode)).size
                : selectedEntry
                  ? atRiskStudents.length
                  : '—'}
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {view === 'overview'
                ? 'In the selected class and period'
                : selectedEntry
                  ? `Below ${DEFAULT_LOW_ATTENDANCE_THRESHOLD}% attendance`
                  : 'Select a subject to view'}
            </p>
          </article>
        </section>

        <section className="mt-9">
          <div className="border-b border-neutral-200 pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
              Refine records
            </p>

            <h2 className="mt-2 font-display text-2xl">Filters</h2>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-b border-neutral-200 pb-4">
            <Link
              href="/teacher/attendance?view=overview"
              className={`inline-flex h-10 items-center border px-4 text-sm ${
                view === 'overview'
                  ? 'border-black bg-black text-white'
                  : 'border-neutral-300 hover:border-black'
              }`}
            >
              Class overview
            </Link>

            <Link
              href="/teacher/attendance?view=lecture"
              className={`inline-flex h-10 items-center border px-4 text-sm ${
                view === 'lecture'
                  ? 'border-black bg-black text-white'
                  : 'border-neutral-300 hover:border-black'
              }`}
            >
              Lecture attendance
            </Link>
          </div>

          <AttendanceFilters
            key={view}
            mode={view}
            entries={entries.map((entry) => ({
              id: entry.id,
              classGroupId: entry.classGroupId,
              subjectName: entry.subjectName,
              subjectCode: entry.subjectCode,
              groupName: entry.groupName,
              section: entry.section,
              dayOfWeek: entry.dayOfWeek,
            }))}
            selectedGroupId={selectedGroupId ? String(selectedGroupId) : ''}
            selectedEntryId={selectedEntry ? String(selectedEntry.id) : ''}
            selectedDate={selectedDate ?? ''}
            selectedFrom={fromDate}
            selectedTo={toDate}
          />

          {view === 'overview' && invalidRange && (
            <p className="mt-3 text-sm text-red-700">
              The start date is after the end date. Correct the date range
              to view attendance records.
            </p>
          )}
        </section>

        {view === 'lecture' && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
                  Saved records
                </p>

                <h2 className="mt-2 font-display text-2xl">
                  Lecture history
                </h2>
              </div>

              <span className="font-mono text-xs text-neutral-500">
                {lectures.length} RECORDS
              </span>
            </div>

            {lectures.length === 0 ? (
              <div className="mt-5 border border-dashed border-neutral-300 px-5 py-12 text-center">
                <CalendarDays
                  size={25}
                  className="mx-auto text-neutral-500"
                  strokeWidth={1.4}
                />

                <h3 className="mt-4 font-display text-2xl">
                  {!selectedEntry
                    ? 'Select a class, section, and subject'
                    : 'No saved attendance yet'}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
                  {!selectedEntry
                    ? 'Select a class, section, and subject above, then apply filters to view saved attendance records.'
                    : 'No saved attendance records match this subject and date.'}
                </p>

                <Link
                  href="/teacher/classes"
                  className="mt-5 inline-flex h-10 items-center gap-2 border border-black px-4 text-sm hover:bg-black hover:text-white"
                >
                  Open my classes <ArrowUpRight size={15} />
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200">
                  {visibleLectures.map((lecture) => {
                    const total = lecture.total
                    const attended = lecture.present + lecture.late

                    return (
                      <article
                        key={lecture.id}
                        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono uppercase tracking-wider text-neutral-500">
                              {lecture.subjectCode}
                            </span>

                            <span className="border border-neutral-200 px-2 py-0.5 font-mono text-[10px]">
                              Section {lecture.section}
                            </span>

                            <span className="text-neutral-500">
                              {lecture.groupName}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h3 className="font-medium">
                              {displayDate(lecture.date)}
                            </h3>

                            <span className="text-xs text-neutral-500">
                              {lecture.subjectName}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
                            <span>
                              <strong className="font-medium text-neutral-900">
                                {lecture.present}
                              </strong>{' '}
                              present
                            </span>

                            <span>
                              <strong className="font-medium text-neutral-900">
                                {lecture.absent}
                              </strong>{' '}
                              absent
                            </span>

                            <span>
                              <strong className="font-medium text-neutral-900">
                                {lecture.late}
                              </strong>{' '}
                              late
                            </span>

                            <span>
                              <strong className="font-medium text-neutral-900">
                                {lecture.excused}
                              </strong>{' '}
                              excused
                            </span>

                            <span className="text-neutral-500">
                              Rate:{' '}
                              {total > 0
                                ? formatPercentage(percentage(attended, total))
                                : 'No marks'}
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/teacher/classes/lectures/${lecture.entryId}?date=${lecture.date}`}
                          className="inline-flex h-9 items-center justify-center gap-2 border border-neutral-300 px-3 text-sm hover:border-black hover:bg-black hover:text-white"
                        >
                          Open register <ArrowUpRight size={15} />
                        </Link>
                      </article>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <nav
                    aria-label="Lecture history pagination"
                    className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-xs text-neutral-500">
                      Showing {(currentPage - 1) * pageSize + 1}–
                      {Math.min(currentPage * pageSize, lectures.length)} of{' '}
                      {lectures.length} lectures
                    </p>

                    <div className="flex items-center gap-2">
                      {currentPage > 1 ? (
                        <Link
                          href={pageHref(currentPage - 1, {
                            ...params,
                            view,
                            from: fromDate,
                            to: toDate,
                          })}
                          className="inline-flex h-9 items-center border border-neutral-300 px-3 text-sm hover:border-black"
                        >
                          Previous
                        </Link>
                      ) : (
                        <span className="inline-flex h-9 items-center border border-neutral-200 px-3 text-sm text-neutral-400">
                          Previous
                        </span>
                      )}

                      <span className="px-2 font-mono text-xs text-neutral-600">
                        {currentPage} / {totalPages}
                      </span>

                      {currentPage < totalPages ? (
                        <Link
                          href={pageHref(currentPage + 1, {
                            ...params,
                            view,
                            from: fromDate,
                            to: toDate,
                          })}
                          className="inline-flex h-9 items-center border border-neutral-300 px-3 text-sm hover:border-black"
                        >
                          Next
                        </Link>
                      ) : (
                        <span className="inline-flex h-9 items-center border border-neutral-200 px-3 text-sm text-neutral-400">
                          Next
                        </span>
                      )}
                    </div>
                  </nav>
                )}
              </>
            )}
          </section>
        )}

        {(view === 'overview' || view === 'lecture') && (
          <section className="mt-10">
            <div className="border-b border-neutral-200 pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
                Student monitoring
              </p>

              <h2 className="mt-2 font-display text-2xl">
                {view === 'lecture'
                  ? 'Attendance for this lecture'
                  : 'Student attendance'}
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                {view === 'lecture'
                  ? 'Attendance status for each student in the selected lecture.'
                  : 'Overall attendance combines all subjects for this class in the selected date period. Expand a student to see their subject-by-subject breakdown.'}{' '}
                {view === 'overview' &&
                  'Present and late count as attended; excused marks are excluded. Students without records remain visible.'}
              </p>
            </div>

            {students.length === 0 ? (
              <p className="mt-5 border border-neutral-200 p-5 text-sm text-neutral-600">
                {!selectedGroupId
                  ? 'Select a class and section above to view its students.'
                  : 'No students are assigned to this class or section.'}
              </p>
            ) : (
              <div className="mt-4 border-y border-neutral-200">
                <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(110px,0.8fr)_minmax(100px,0.7fr)_minmax(180px,1fr)_minmax(110px,auto)] items-center gap-5 border-b border-neutral-200 bg-neutral-50 py-3 text-xs font-medium text-neutral-600 sm:grid">
                  <span>Student</span>
                  <span>Present</span>
                  <span>Absent</span>
                  <span>Attendance</span>
                  <span>Status</span>
                </div>

                <div className="divide-y divide-neutral-200">
                  {[...students]
                    .sort(
                      (a, b) =>
                        a.percentage - b.percentage ||
                        a.rollNo.localeCompare(b.rollNo),
                    )
                    .map((student) => {
                      const atRisk =
                        student.total > 0 &&
                        student.percentage < DEFAULT_LOW_ATTENDANCE_THRESHOLD

                      const lectureDaySubjectCodes = new Set(
                        selectedGroupId && selectedDayOfWeek !== undefined
                          ? entries
                              .filter(
                                (entry) =>
                                  entry.classGroupId === selectedGroupId &&
                                  entry.dayOfWeek === selectedDayOfWeek,
                              )
                              .map((entry) => entry.subjectCode)
                          : [],
                      )

                      const subjectsForStudent = subjectReports
                        .filter((report) => report.studentId === student.id)
                        .filter(
                          (report) =>
                            view !== 'lecture' ||
                            (Boolean(selectedDate) &&
                              Boolean(selectedEntry) &&
                              lectureDaySubjectCodes.has(report.subjectCode)),
                        )
                        .sort((a, b) =>
                          a.subjectName.localeCompare(b.subjectName),
                        )

                      if (view === 'lecture') {
                        const lectureStatus = selectedEntry
                          ? selectedLectureStudentStatus.get(student.id)
                          : undefined

                        const subjectReport = subjectReports.find(
                          (report) =>
                            report.studentId === student.id &&
                            Boolean(selectedEntry) &&
                            report.subjectCode === selectedEntry?.subjectCode,
                        )

                        const reportPercentage = subjectReport?.percentage ?? null
                        const reportAtRisk = subjectReport?.atRisk ?? false

                        return (
                          <div
                            key={student.id}
                            className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(110px,0.8fr)_minmax(100px,0.7fr)_minmax(180px,1fr)_minmax(110px,auto)] sm:items-center sm:gap-5"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {student.name}
                                </p>
                                <p className="mt-1 font-mono text-xs text-neutral-500">
                                  {student.rollNo} · {student.groupName}, Section{' '}
                                  {student.section}
                                </p>
                                <p className="mt-1 text-xs text-neutral-600">
                                  This lecture:{' '}
                                  <span
                                    className={`capitalize ${
                                      lectureStatus === 'absent'
                                        ? 'text-red-700'
                                        : lectureStatus === 'present' ||
                                            lectureStatus === 'late'
                                          ? 'text-neutral-900'
                                          : 'text-neutral-500'
                                    }`}
                                  >
                                    {lectureStatus ?? 'Not marked'}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs text-neutral-500 sm:hidden">
                                Present
                              </p>
                              <p className="font-medium">
                                {subjectReport && subjectReport.total > 0
                                  ? `${subjectReport.attended} / ${subjectReport.total}`
                                  : 'No records'}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-neutral-500 sm:hidden">
                                Absent
                              </p>
                              <p>{subjectReport?.absent ?? 0}</p>
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs text-neutral-500 sm:hidden">
                                Attendance
                              </p>
                              <div className="grid w-full grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-3">
                                <span className="w-[3.25rem] text-sm font-medium tabular-nums">
                                  {reportPercentage === null
                                    ? '—'
                                    : `${reportPercentage}%`}
                                </span>

                                {reportPercentage !== null ? (
                                  <div className="h-1.5 w-full overflow-hidden bg-neutral-200">
                                    <div
                                      className={`h-full ${
                                        reportAtRisk
                                          ? 'bg-red-700'
                                          : 'bg-neutral-800'
                                      }`}
                                      style={{
                                        width: `${reportPercentage}%`,
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div
                                    className="h-1.5 w-full bg-neutral-100"
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs text-neutral-500 sm:hidden">
                                Status
                              </p>
                              <span
                                className={`inline-flex w-fit items-center gap-1.5 border px-2 py-1 text-xs ${
                                  !subjectReport || subjectReport.total === 0
                                    ? 'border-neutral-300 text-neutral-600'
                                    : reportAtRisk
                                      ? 'border-red-200 text-red-800'
                                      : 'border-neutral-200 text-neutral-700'
                                }`}
                              >
                                {subjectReport?.total
                                  ? reportAtRisk
                                    ? 'At risk'
                                    : 'On track'
                                  : 'Not recorded'}
                              </span>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <details key={student.id} className="group">
                          <summary className="grid cursor-pointer list-none gap-3 py-4 marker:content-none sm:grid-cols-[minmax(0,1.5fr)_minmax(110px,0.8fr)_minmax(100px,0.7fr)_minmax(180px,1fr)_minmax(110px,auto)] sm:items-center sm:gap-5 [&::-webkit-details-marker]:hidden">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex size-8 shrink-0 items-center justify-center border border-neutral-300 text-neutral-600 transition-transform group-open:rotate-90">
                                <ArrowUpRight size={14} />
                              </span>

                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {student.name}
                                </p>
                                <p className="mt-1 font-mono text-xs text-neutral-500">
                                  {student.rollNo} · {student.groupName}, Section{' '}
                                  {student.section}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs text-neutral-500 sm:hidden">
                                Present
                              </p>
                              <p className="font-medium">
                                {student.total > 0
                                  ? `${student.attended} / ${student.total}`
                                  : 'No records'}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-neutral-500 sm:hidden">
                                Absent
                              </p>
                              <p>{student.absent}</p>
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs text-neutral-500 sm:hidden">
                                Attendance
                              </p>
                              <div className="grid w-full grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-3">
                                <span className="w-[3.25rem] text-sm font-medium tabular-nums">
                                  {student.total > 0
                                    ? `${student.percentage}%`
                                    : '—'}
                                </span>

                                <div className="h-1.5 w-full overflow-hidden bg-neutral-200">
                                  {student.total > 0 && (
                                    <div
                                      className={`h-full ${
                                        atRisk ? 'bg-red-700' : 'bg-neutral-800'
                                      }`}
                                      style={{
                                        width: `${student.percentage}%`,
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>

                            <span
                              className={`inline-flex w-fit items-center gap-1.5 border px-2 py-1 text-xs ${
                                student.total === 0
                                  ? 'border-neutral-300 text-neutral-600'
                                  : atRisk
                                    ? 'border-red-200 text-red-800'
                                    : 'border-neutral-200 text-neutral-700'
                              }`}
                            >
                              {student.total === 0 ? (
                                <Clock3 size={13} />
                              ) : atRisk ? (
                                <Clock3 size={13} />
                              ) : (
                                <CheckCircle2 size={13} />
                              )}

                              {student.total === 0
                                ? 'Not recorded'
                                : atRisk
                                  ? 'At risk'
                                  : 'On track'}
                            </span>
                          </summary>

                          <div className="mb-4 ml-0 border border-neutral-200 bg-neutral-50 p-3 sm:ml-11 sm:p-4">
                            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                              <h3 className="font-medium">Subject breakdown</h3>
                              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                {subjectsForStudent.length} subjects with records
                              </span>
                            </div>

                            {subjectsForStudent.length === 0 ? (
                              <p className="text-sm text-neutral-600">
                                No subject attendance records exist for this
                                student in the selected period.
                              </p>
                            ) : (
                              <div>
                                <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(100px,0.7fr)_minmax(80px,0.5fr)_minmax(90px,0.7fr)] items-center gap-4 border-b border-neutral-200 pb-2 text-xs font-medium text-neutral-600 sm:grid">
                                  <span>Subject</span>
                                  <span>Present</span>
                                  <span>Absent</span>
                                  <span>Attendance / status</span>
                                </div>

                                <div className="divide-y divide-neutral-200">
                                  {subjectsForStudent.map((subject) => (
                                    <div
                                      key={`${subject.studentId}-${subject.subjectCode}`}
                                      className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1.5fr)_minmax(100px,0.7fr)_minmax(80px,0.5fr)_minmax(90px,0.7fr)] sm:items-center sm:gap-4"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-medium">
                                          {subject.subjectName}
                                        </p>
                                        <p className="mt-1 font-mono text-xs text-neutral-500">
                                          {subject.subjectCode}
                                        </p>
                                      </div>

                                      <p className="text-sm">
                                        <span className="text-neutral-500 sm:hidden">
                                          Present:{' '}
                                        </span>
                                        {subject.total > 0
                                          ? `${subject.attended} / ${subject.total}`
                                          : 'No records'}
                                      </p>

                                      <p className="text-sm">
                                        <span className="text-neutral-500 sm:hidden">
                                          Absent:{' '}
                                        </span>
                                        {subject.absent}
                                      </p>

                                      <div className="flex items-center gap-3">
                                        <span className="w-10 text-sm font-medium">
                                          {subject.percentage === null
                                            ? '—'
                                            : `${subject.percentage}%`}
                                        </span>

                                        {subject.percentage !== null && (
                                          <div className="h-1.5 flex-1 bg-neutral-200">
                                            <div
                                              className={`h-1.5 ${
                                                subject.atRisk
                                                  ? 'bg-red-700'
                                                  : 'bg-neutral-800'
                                              }`}
                                              style={{
                                                width: `${subject.percentage}%`,
                                              }}
                                            />
                                          </div>
                                        )}

                                        {subject.total === 0 ? (
                                          <span className="text-xs text-neutral-500">
                                            No data
                                          </span>
                                        ) : subject.atRisk ? (
                                          <span className="text-xs text-red-800">
                                            At risk
                                          </span>
                                        ) : (
                                          <span className="text-xs text-neutral-600">
                                            On track
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      )
                    })}
                </div>
              </div>
            )}
          </section>
        )}

        <footer className="mt-10 flex items-start gap-3 border-t border-neutral-200 py-5 text-xs leading-relaxed text-neutral-500">
          <Users size={16} className="mt-0.5 shrink-0" />

          <p>
            {view === 'lecture'
              ? 'Student totals use saved attendance records for the selected class across all available dates. The expanded subject breakdown is limited to subjects scheduled for the selected weekday. Lecture history above reflects the selected date and scheduled subject. '
              : 'Reports use saved timetable-driven attendance records for the selected class and period. '}
            Missing marks are not assumed to be absences. Excused marks are excluded
            from attendance percentage calculations.
            {` ${excusedCount} excused marks are excluded from the overall denominator.`}
          </p>
        </footer>
      </div>
    
  )
}