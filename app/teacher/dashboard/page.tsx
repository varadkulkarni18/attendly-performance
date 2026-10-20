
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
} from 'lucide-react'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  groupStudents,
  lectureAttendance,
  lectureSessions,
  timetableEntries,
  timetableExceptions,
} from '@/lib/db/schema'
import { DEFAULT_LOW_ATTENDANCE_THRESHOLD } from '@/lib/attendance'

const DAYS: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

const LOW_THRESHOLD = DEFAULT_LOW_ATTENDANCE_THRESHOLD

async function measureQuery<T>(
  name: string,
  query: PromiseLike<T>,
): Promise<T> {
  const start = performance.now()

  try {
    const result = await query
    const duration = Math.round(performance.now() - start)
    const rows = Array.isArray(result) ? result.length : 'n/a'

    console.info(
      `[PERF] dashboard.${name}: ${duration}ms (${rows} rows)`,
    )

    return result
  } catch (error) {
    console.error(
      `[PERF] dashboard.${name} failed after ${Math.round(
        performance.now() - start,
      )}ms`,
    )
    throw error
  }
}

function indiaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function indiaTime() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
}

function indiaDay() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  }).format(new Date())
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}

function formatTime(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  return `${hour % 12 || 12}:${minuteText} ${hour >= 12 ? 'PM' : 'AM'}`
}

function isHoliday(type: string) {
  return type.toLowerCase() === 'holiday'
}

function isCancelled(type: string) {
  return ['cancelled', 'canceled'].includes(type.toLowerCase())
}

function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null
}

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`
}

function dateDaysAgo(date: string, daysAgo: number) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() - daysAgo)
  return value.toISOString().slice(0, 10)
}

function displayDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

function Metric({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: string
}) {
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{note}</p>
    </div>
  )
}

export default async function TeacherDashboardPage() {
  const session = await requireRole('teacher')
  const teacherId = session.user.id
  const today = indiaDate()
  const timeNow = indiaTime()
  const todayName = indiaDay()
  const dayOfWeek = DAYS[todayName]
  const startOfMonth = monthStart(today)
  const sevenDaysAgo = dateDaysAgo(today, 6)
  const currentHour = Number(timeNow.slice(0, 2))

  const [
    timetable,
    exceptions,
    futureEvents,
    attendanceRows,
    recentSessions,
    roster,
  ] = await Promise.all([
    db
      .select({
        id: timetableEntries.id,
        subjectName: timetableEntries.subjectName,
        subjectCode: timetableEntries.subjectCode,
        dayOfWeek: timetableEntries.dayOfWeek,
        startTime: timetableEntries.startTime,
        endTime: timetableEntries.endTime,
        room: timetableEntries.room,
        groupId: classGroups.id,
        groupName: classGroups.name,
        academicYear: classGroups.academicYear,
        section: classGroups.section,
      })
      .from(timetableEntries)
      .innerJoin(classGroups, eq(timetableEntries.classGroupId, classGroups.id))
      .where(
        and(
          eq(timetableEntries.teacherId, teacherId),
          eq(timetableEntries.active, true),
        ),
      )
      .orderBy(asc(timetableEntries.dayOfWeek), asc(timetableEntries.startTime)),

    db
      .select({
        id: timetableExceptions.id,
        date: timetableExceptions.date,
        timetableEntryId: timetableExceptions.timetableEntryId,
        type: timetableExceptions.type,
        note: timetableExceptions.note,
      })
      .from(timetableExceptions)
      .where(
        and(
          gte(timetableExceptions.date, startOfMonth),
          lte(timetableExceptions.date, today),
        ),
      ),

    db
      .select({
        id: timetableExceptions.id,
        date: timetableExceptions.date,
        timetableEntryId: timetableExceptions.timetableEntryId,
        type: timetableExceptions.type,
        note: timetableExceptions.note,
      })
      .from(timetableExceptions)
      .where(gte(timetableExceptions.date, today))
      .orderBy(asc(timetableExceptions.date))
      .limit(12),

    measureQuery(
      'attendanceRows',
      db
        .select({
          sessionId: lectureSessions.id,
          date: lectureSessions.date,
          timetableEntryId: lectureSessions.timetableEntryId,
          sessionStatus: lectureSessions.status,
          attendanceStatus: lectureAttendance.status,
          studentId: groupStudents.id,
          studentName: groupStudents.studentName,
          rollNo: groupStudents.rollNo,
          groupId: classGroups.id,
          groupName: classGroups.name,
          section: classGroups.section,
          subjectName: timetableEntries.subjectName,
          subjectCode: timetableEntries.subjectCode,
        })
        .from(lectureAttendance)
        .innerJoin(
          lectureSessions,
          eq(lectureAttendance.lectureSessionId, lectureSessions.id),
        )
        .innerJoin(
          groupStudents,
          eq(lectureAttendance.groupStudentId, groupStudents.id),
        )
        .innerJoin(
          timetableEntries,
          eq(lectureSessions.timetableEntryId, timetableEntries.id),
        )
        .innerJoin(
          classGroups,
          eq(timetableEntries.classGroupId, classGroups.id),
        )
        .where(eq(timetableEntries.teacherId, teacherId)),
    ),

    db
      .select({
        id: lectureSessions.id,
        date: lectureSessions.date,
        status: lectureSessions.status,
        subjectName: timetableEntries.subjectName,
        subjectCode: timetableEntries.subjectCode,
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
      .where(
        and(
          eq(timetableEntries.teacherId, teacherId),
          eq(lectureSessions.status, 'completed'),
        ),
      )
      .orderBy(desc(lectureSessions.date), desc(lectureSessions.createdAt))
      .limit(6),

    db
      .select({
        id: groupStudents.id,
        studentName: groupStudents.studentName,
        rollNo: groupStudents.rollNo,
        groupId: classGroups.id,
        groupName: classGroups.name,
        section: classGroups.section,
      })
      .from(groupStudents)
      .innerJoin(classGroups, eq(groupStudents.classGroupId, classGroups.id))
      .innerJoin(
        timetableEntries,
        eq(timetableEntries.classGroupId, classGroups.id),
      )
      .where(eq(timetableEntries.teacherId, teacherId)),
  ])

  const todayExceptions = futureEvents.filter((event) => event.date === today)
  const globalHoliday = todayExceptions.some(
    (event) => event.timetableEntryId === null && isHoliday(event.type),
  )

  const todayCancelledIds = new Set(
    todayExceptions
      .filter((event) => event.timetableEntryId !== null && isCancelled(event.type))
      .map((event) => event.timetableEntryId),
  )

  const todayEntries = globalHoliday
    ? []
    : timetable.filter(
        (entry) =>
          entry.dayOfWeek === dayOfWeek && !todayCancelledIds.has(entry.id),
      )

  // Load today's session states separately, including lectures with no attendance marks yet.
  const todaySessions = todayEntries.length
    ? await db
        .select({
          id: lectureSessions.id,
          timetableEntryId: lectureSessions.timetableEntryId,
          status: lectureSessions.status,
        })
        .from(lectureSessions)
        .where(
          and(
            eq(lectureSessions.date, today),
            eq(lectureSessions.status, 'completed'),
          ),
        )
    : []

  const completedEntryIds = new Set(todaySessions.map((item) => item.timetableEntryId))
  const pendingToday = todayEntries.filter((entry) => !completedEntryIds.has(entry.id))
  const nextLecture = todayEntries.find(
    (entry) =>
      entry.startTime > timeNow && !completedEntryIds.has(entry.id),
  )

  const allCountable = attendanceRows.filter(
    (row) =>
      row.sessionStatus === 'completed' &&
      ['present', 'absent', 'late'].includes(row.attendanceStatus),
  )

  const monthlyCountable = allCountable.filter(
    (row) => row.date >= startOfMonth && row.date <= today,
  )

  const attended = allCountable.filter(
    (row) => ['present', 'late'].includes(row.attendanceStatus),
  ).length

  const monthlyAttended = monthlyCountable.filter(
    (row) => ['present', 'late'].includes(row.attendanceStatus),
  ).length

  const overallRate = percentage(attended, allCountable.length)
  const monthlyRate = percentage(monthlyAttended, monthlyCountable.length)

  const uniqueStudentMap = new Map<
    number,
    {
      id: number
      name: string
      rollNo: string
      groupName: string
      section: string
      present: number
      denominator: number
    }
  >()

  for (const row of attendanceRows) {
    if (row.sessionStatus !== 'completed') continue
    if (row.attendanceStatus === 'excused') continue
    if (!['present', 'absent', 'late'].includes(row.attendanceStatus)) continue

    const existing = uniqueStudentMap.get(row.studentId) ?? {
      id: row.studentId,
      name: row.studentName,
      rollNo: row.rollNo,
      groupName: row.groupName,
      section: row.section,
      present: 0,
      denominator: 0,
    }

    existing.denominator += 1
    if (row.attendanceStatus === 'present' || row.attendanceStatus === 'late') {
      existing.present += 1
    }
    uniqueStudentMap.set(row.studentId, existing)
  }

  const atRiskStudents = [...uniqueStudentMap.values()]
    .map((student) => ({
      ...student,
      rate: percentage(student.present, student.denominator),
    }))
    .filter(
      (student) =>
        student.rate !== null &&
        student.rate < LOW_THRESHOLD &&
        student.denominator >= 3,
    )
    .sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100))
    .slice(0, 6)

  const uniqueStudentCount = new Set(roster.map((student) => student.id)).size

  const monthSessions = recentSessions.filter(
    (item) => item.date >= startOfMonth && item.date <= today,
  )

  // Count timetable occurrences through today; exclude recorded holidays/cancellations.
  let scheduledThisMonth = 0
  const cursor = new Date(`${startOfMonth}T12:00:00Z`)
  const lastDay = new Date(`${today}T12:00:00Z`)

  while (cursor <= lastDay) {
    const date = cursor.toISOString().slice(0, 10)
    const weekday = cursor.getUTCDay()
    const dateExceptions = exceptions.filter((item) => item.date === date)
    const isGlobalHoliday = dateExceptions.some(
      (item) => item.timetableEntryId === null && isHoliday(item.type),
    )
    const cancelledIds = new Set(
      dateExceptions
        .filter(
          (item) =>
            item.timetableEntryId !== null && isCancelled(item.type),
        )
        .map((item) => item.timetableEntryId),
    )

    if (!isGlobalHoliday) {
      scheduledThisMonth += timetable.filter(
        (entry) =>
          entry.dayOfWeek === weekday && !cancelledIds.has(entry.id),
      ).length
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  const conductedThisMonth = monthSessions.length
  const teachingProgress =
    scheduledThisMonth > 0
      ? Math.min(100, Math.round((conductedThisMonth / scheduledThisMonth) * 100))
      : null

  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = dateDaysAgo(today, 6 - index)
    const records = allCountable.filter((row) => row.date === date)
    const present = records.filter(
      (row) => row.attendanceStatus === 'present' || row.attendanceStatus === 'late',
    ).length

    return {
      date,
      label: new Intl.DateTimeFormat('en-IN', {
        weekday: 'short',
        timeZone: 'UTC',
      }).format(new Date(`${date}T12:00:00Z`)),
      rate: percentage(present, records.length),
      total: records.length,
    }
  })

  const calendarEvents = futureEvents
    .filter(
      (event) =>
        isHoliday(event.type) ||
        isCancelled(event.type) ||
        Boolean(event.note),
    )
    .slice(0, 5)

  const greeting =
    currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening'

  return (
    
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Teaching workspace / Overview
            </p>
            <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
              Good {greeting}, Professor {session.user.name?.trim().split(/\s+/)[0] || 'there'}.
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {displayDate(today)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/teacher/timetable"
              className="inline-flex h-10 items-center gap-2 border border-neutral-300 px-3 text-sm hover:border-black"
            >
              <CalendarDays size={15} /> Timetable
            </Link>
            <Link
              href="/teacher/classes"
              className="inline-flex h-10 items-center gap-2 bg-black px-3 text-sm text-white hover:bg-neutral-800"
            >
              My classes <ArrowUpRight size={15} />
            </Link>
            <Link
              href="/teacher/attendance"
              className="inline-flex h-10 items-center gap-2 border border-neutral-300 px-3 text-sm hover:border-black"
            >
              Reports
            </Link>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 divide-x divide-y divide-neutral-200 border border-neutral-200 sm:grid-cols-4 sm:divide-y-0">
          <Metric
            label="Overall attendance"
            value={overallRate === null ? '—' : `${overallRate}%`}
            note="Present and late marks across completed registers"
          />
          <Metric
            label="Below threshold"
            value={String(atRiskStudents.length).padStart(2, '0')}
            note={`Recorded students below ${LOW_THRESHOLD}%`}
          />
          <Metric
            label="This month"
            value={monthlyRate === null ? '—' : `${monthlyRate}%`}
            note="Attendance across completed registers"
          />
          <Metric
            label="Teaching progress"
            value={
              teachingProgress === null
                ? '—'
                : `${conductedThisMonth}/${scheduledThisMonth}`
            }
            note="Completed vs scheduled lecture occurrences this month"
          />
        </section>

        {globalHoliday && (
          <div className="mt-4 flex items-start gap-3 border border-neutral-300 px-4 py-3">
            <CalendarDays size={17} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">College holiday</p>
              <p className="mt-1 text-sm text-neutral-600">
                Today's lectures are excluded from the agenda.
              </p>
            </div>
          </div>
        )}

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(290px,1fr)]">
          <div className="min-w-0 space-y-8">
            <section>
              <div className="flex items-end justify-between border-b border-neutral-200 pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Performance
                  </p>
                  <h2 className="mt-1 font-display text-2xl">Attendance trend</h2>
                </div>
                <span className="text-xs text-neutral-500">Last 7 days</span>
              </div>

              {trend.every((item) => item.total === 0) ? (
                <p className="py-5 text-sm text-neutral-600">
                  Attendance trends will appear after completed lecture registers have been recorded.
                </p>
              ) : (
                <div className="pt-4">
                  <div className="flex h-32 items-end gap-2 border-b border-neutral-200 pb-2">
                    {trend.map((item) => (
                      <div key={item.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <span className="font-mono text-[10px] text-neutral-600">
                          {item.rate === null ? '—' : `${item.rate}%`}
                        </span>
                        <div className="flex h-20 w-full items-end">
                          <div
                            className="w-full bg-neutral-900"
                            style={{ height: `${item.rate ?? 0}%`, minHeight: item.total ? '3px' : '0px' }}
                            title={`${item.date}: ${item.rate === null ? 'No data' : `${item.rate}% attendance`}`}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-500">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">
                    Each bar represents the recorded attendance rate for that day. A dash means no records were saved.
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-end justify-between gap-3 border-b border-neutral-200 pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Academic follow-up
                  </p>
                  <h2 className="mt-1 font-display text-2xl">Students to review</h2>
                </div>
                <span className="font-mono text-[10px] text-neutral-500">
                  {LOW_THRESHOLD}% THRESHOLD
                </span>
              </div>

              {atRiskStudents.length === 0 ? (
                <p className="py-4 text-sm text-neutral-600">
                  {allCountable.length === 0
                    ? 'Student attendance insights will appear after registers have been saved.'
                    : 'No students with at least three recorded marks are below the current threshold.'}
                </p>
              ) : (
                <div>
                  {atRiskStudents.map((student) => (
                    <div key={student.id} className="flex items-center gap-3 border-b border-neutral-200 py-3">
                      <div className="flex size-9 shrink-0 items-center justify-center border border-neutral-200 font-mono text-xs">
                        {student.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{student.name}</p>
                        <p className="mt-1 truncate text-xs text-neutral-500">
                          {student.rollNo} · {student.groupName} · Section {student.section}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm tabular-nums">{student.rate}%</p>
                        <p className="mt-1 text-[10px] text-neutral-500">
                          {student.present}/{student.denominator} attended
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link
                    href="/teacher/attendance"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black"
                  >
                    Review attendance records <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-end justify-between gap-3 border-b border-neutral-200 pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Teaching schedule
                  </p>
                  <h2 className="mt-1 font-display text-2xl">Today’s agenda</h2>
                </div>
                <Link href="/teacher/classes" className="text-xs text-neutral-600 hover:text-black">
                  All classes <ArrowRight size={13} className="ml-1 inline" />
                </Link>
              </div>

              {todayEntries.length === 0 ? (
                <p className="py-4 text-sm text-neutral-600">
                  {globalHoliday
                    ? 'No lectures are shown because today is marked as a holiday.'
                    : 'No lectures are scheduled for your account today.'}
                </p>
              ) : (
                <div>
                  {nextLecture && (
                    <div className="border-l-2 border-black py-2 pl-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                        Next lecture · {formatTime(nextLecture.startTime)}
                      </p>
                      <h3 className="mt-2 font-display text-xl">{nextLecture.subjectName}</h3>
                      <p className="mt-1 text-sm text-neutral-600">
                        {nextLecture.subjectCode} · {nextLecture.groupName} · Section {nextLecture.section}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={13} /> {formatTime(nextLecture.startTime)} – {formatTime(nextLecture.endTime)}
                        </span>
                        {nextLecture.room && <span>{nextLecture.room}</span>}
                      </div>
                    </div>
                  )}

                  {todayEntries.map((entry) => {
                    const completed = completedEntryIds.has(entry.id)
                    return (
                      <div key={entry.id} className="flex items-center gap-3 border-b border-neutral-200 py-3">
                        <div className="w-[76px] shrink-0">
                          <p className="font-mono text-xs tabular-nums">{formatTime(entry.startTime)}</p>
                          <p className="mt-1 text-[10px] text-neutral-500">{formatTime(entry.endTime)}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{entry.subjectName}</p>
                          <p className="mt-1 truncate text-xs text-neutral-500">
                            {entry.groupName} · Section {entry.section}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-neutral-500">
                          {completed ? 'Saved' : 'Pending'}
                        </span>
                        <Link
                          href={`/teacher/classes/lectures/${entry.id}`}
                          aria-label={`Open ${entry.subjectName} attendance`}
                          className="flex size-8 shrink-0 items-center justify-center border border-neutral-200 hover:border-black"
                        >
                          <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}

              {pendingToday.length > 0 && (
                <p className="mt-3 text-xs text-neutral-500">
                  {pendingToday.length} lecture{pendingToday.length === 1 ? '' : 's'} still need attendance.
                </p>
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-8">
            <section>
              <div className="border-b border-neutral-200 pb-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  Academic calendar
                </p>
                <h2 className="mt-1 font-display text-2xl">Upcoming dates</h2>
              </div>

              {calendarEvents.length === 0 ? (
                <div className="py-4">
                  <p className="text-sm text-neutral-600">
                    No upcoming holidays or calendar events are recorded yet.
                  </p>
                  <Link href="/teacher/timetable" className="mt-3 inline-flex items-center gap-1.5 text-xs hover:underline">
                    Open timetable <ArrowRight size={13} />
                  </Link>
                </div>
              ) : (
                <div>
                  {calendarEvents.map((event) => (
                    <div key={event.id} className="flex gap-3 border-b border-neutral-200 py-3">
                      <div className="w-12 shrink-0 border-r border-neutral-200 pr-3">
                        <p className="font-display text-xl leading-none">
                          {new Date(`${event.date}T12:00:00Z`).getUTCDate()}
                        </p>
                        <p className="mt-1 font-mono text-[9px] uppercase text-neutral-500">
                          {new Intl.DateTimeFormat('en-IN', {
                            month: 'short',
                            timeZone: 'UTC',
                          }).format(new Date(`${event.date}T12:00:00Z`))}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {event.note ||
                            (isHoliday(event.type)
                              ? 'College holiday'
                              : isCancelled(event.type)
                                ? 'Lecture cancelled'
                                : event.type)}
                        </p>
                        <p className="mt-1 text-xs capitalize text-neutral-500">
                          {event.type} · {dateLabel(event.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link href="/teacher/timetable" className="mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black">
                    View academic calendar <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-end justify-between gap-3 border-b border-neutral-200 pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Recent activity
                  </p>
                  <h2 className="mt-1 font-display text-2xl">Saved registers</h2>
                </div>
              </div>

              {recentSessions.length === 0 ? (
                <p className="py-4 text-sm text-neutral-600">
                  Completed lecture registers will appear here.
                </p>
              ) : (
                <div>
                  {recentSessions.map((item) => (
                    <div key={item.id} className="flex gap-3 border-b border-neutral-200 py-3">
                      <span className="flex size-8 shrink-0 items-center justify-center border border-neutral-200">
                        <CheckCircle2 size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.subjectName}</p>
                        <p className="mt-1 truncate text-xs text-neutral-500">
                          {item.groupName} · Section {item.section}
                        </p>
                        <p className="mt-1 text-[10px] text-neutral-500">{dateLabel(item.date)}</p>
                      </div>
                    </div>
                  ))}
                  <Link href="/teacher/attendance" className="mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black">
                    All attendance records <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </section>

            <section className="border-t border-neutral-200 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Your workspace
              </p>
              <div className="mt-3 space-y-1">
                <Link href="/teacher/classes" className="flex items-center justify-between py-2 text-sm hover:text-neutral-500">
                  Manage classes <ArrowRight size={14} />
                </Link>
                <Link href="/teacher/timetable" className="flex items-center justify-between py-2 text-sm hover:text-neutral-500">
                  Weekly and annual calendar <ArrowRight size={14} />
                </Link>
                <Link href="/teacher/attendance" className="flex items-center justify-between py-2 text-sm hover:text-neutral-500">
                  Attendance reports <ArrowRight size={14} />
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    
  )
}
