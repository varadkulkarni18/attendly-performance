
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MapPin,
} from 'lucide-react'
import Link from 'next/link'
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

function getIndiaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )

  return `${values.year}-${values.month}-${values.day}`
}

function getIndiaWeekday() {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  }).format(new Date())

  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  return weekdays[weekday] ?? 0
}

function getIndiaMinutesNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)

  return hour * 60 + minute
}

function toMinutes(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return hour * 60 + minute
}

function isHoliday(type: string) {
  return type.toLowerCase() === 'holiday'
}

function formatDate(value: string) {
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

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Student'
}

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date()),
  )

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDemoDate(daysAgo: number) {
  const date = new Date(`${getIndiaDate()}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

type AttendanceRow = {
  date: string
  status: string
  subjectName: string
  subjectCode: string
}

type TimetableRow = {
  id: string | number
  subjectName: string
  subjectCode: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
}

const SAMPLE_SUBJECTS = [
  { name: 'Data Structures', code: 'DS' },
  { name: 'Computer Networks', code: 'CN' },
  { name: 'Operating Systems', code: 'OS' },
  { name: 'Software Engineering', code: 'SE' },
  { name: 'Database Management Systems', code: 'DBMS' },
]

const SAMPLE_SLOTS = [
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '12:00', end: '13:00' },
  { start: '14:00', end: '16:00' },
]

// Match the timetable page's display-only sample slots so Overview and
// Timetable show the same day's schedule. These samples are never saved.
function buildDisplayTimetable(entries: TimetableRow[]): TimetableRow[] {
  const result = [...entries]

  for (const dayOfWeek of [1, 2, 3, 4, 5, 6]) {
    let dayEntries = result.filter((entry) => entry.dayOfWeek === dayOfWeek)
    if (dayEntries.length >= 5) continue

    const usedTimes = dayEntries
      .map((entry) => ({
        start: toMinutes(entry.startTime),
        end: toMinutes(entry.endTime),
      }))
      .filter(
        (time): time is { start: number; end: number } =>
          time.start !== null && time.end !== null && time.end > time.start,
      )

    let sampleIndex = 0

    for (const slot of SAMPLE_SLOTS) {
      dayEntries = result.filter((entry) => entry.dayOfWeek === dayOfWeek)
      if (dayEntries.length >= 5) break

      const start = toMinutes(slot.start)!
      const end = toMinutes(slot.end)!
      const overlaps = usedTimes.some(
        (time) => start < time.end && end > time.start,
      )
      if (overlaps) continue

      const subject =
        sampleIndex === 4
          ? { name: 'Programming Lab', code: 'LAB' }
          : SAMPLE_SUBJECTS[(dayOfWeek + sampleIndex) % SAMPLE_SUBJECTS.length]

      result.push({
        id: `sample-${dayOfWeek}-${sampleIndex}`,
        subjectName: subject.name,
        subjectCode: subject.code,
        dayOfWeek,
        startTime: slot.start,
        endTime: slot.end,
        room: sampleIndex === 4 ? 'Computer Lab' : 'Room 203',
      })

      usedTimes.push({ start, end })
      sampleIndex += 1
    }
  }

  return result.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
    return (toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0)
  })
}

// These records are display-only demo data.
// They are not inserted into the database and do not affect teacher records.
const demoAttendance: AttendanceRow[] = [
  { date: getDemoDate(0), status: 'present', subjectName: 'Data Structures', subjectCode: 'CS201' },
  { date: getDemoDate(1), status: 'present', subjectName: 'Database Management Systems', subjectCode: 'CS202' },
  { date: getDemoDate(2), status: 'absent', subjectName: 'Operating Systems', subjectCode: 'CS203' },
  { date: getDemoDate(3), status: 'late', subjectName: 'Data Structures', subjectCode: 'CS201' },
  { date: getDemoDate(4), status: 'present', subjectName: 'Computer Networks', subjectCode: 'CS204' },
  { date: getDemoDate(5), status: 'present', subjectName: 'Database Management Systems', subjectCode: 'CS202' },
  { date: getDemoDate(6), status: 'present', subjectName: 'Operating Systems', subjectCode: 'CS203' },
  { date: getDemoDate(7), status: 'absent', subjectName: 'Computer Networks', subjectCode: 'CS204' },
  { date: getDemoDate(8), status: 'present', subjectName: 'Data Structures', subjectCode: 'CS201' },
  { date: getDemoDate(9), status: 'present', subjectName: 'Database Management Systems', subjectCode: 'CS202' },
]

const demoTimetable: TimetableRow[] = [
  { id: 'demo-1', subjectName: 'Data Structures', subjectCode: 'CS201', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'Lab 02' },
  { id: 'demo-2', subjectName: 'Database Management Systems', subjectCode: 'CS202', dayOfWeek: 1, startTime: '10:15', endTime: '11:15', room: 'Room 204' },
  { id: 'demo-3', subjectName: 'Operating Systems', subjectCode: 'CS203', dayOfWeek: 2, startTime: '09:00', endTime: '10:00', room: 'Room 105' },
  { id: 'demo-4', subjectName: 'Computer Networks', subjectCode: 'CS204', dayOfWeek: 2, startTime: '11:15', endTime: '12:15', room: 'Lab 01' },
  { id: 'demo-5', subjectName: 'Data Structures', subjectCode: 'CS201', dayOfWeek: 3, startTime: '10:00', endTime: '11:00', room: 'Lab 02' },
  { id: 'demo-6', subjectName: 'Database Management Systems', subjectCode: 'CS202', dayOfWeek: 3, startTime: '11:15', endTime: '12:15', room: 'Room 204' },
  { id: 'demo-7', subjectName: 'Operating Systems', subjectCode: 'CS203', dayOfWeek: 4, startTime: '09:00', endTime: '10:00', room: 'Room 105' },
  { id: 'demo-8', subjectName: 'Computer Networks', subjectCode: 'CS204', dayOfWeek: 5, startTime: '10:15', endTime: '11:15', room: 'Lab 01' },
  { id: 'demo-9', subjectName: 'Data Structures', subjectCode: 'CS201', dayOfWeek: 5, startTime: '12:00', endTime: '13:00', room: 'Lab 02' },
  { id: 'demo-10', subjectName: 'Database Management Systems', subjectCode: 'CS202', dayOfWeek: 6, startTime: '09:30', endTime: '10:30', room: 'Room 204' },
  { id: 'demo-11', subjectName: 'Data Structures', subjectCode: 'CS201', dayOfWeek: 6, startTime: '10:45', endTime: '11:45', room: 'Lab 02' },
]

export default async function StudentDashboardPage() {
  const session = await requireRole('student')
  const email = session.user.email.trim().toLowerCase()
  const accountName = session.user.name?.trim() || 'Student'
  const today = getIndiaDate()
  const todayWeekday = getIndiaWeekday()
  const nowMinutes = getIndiaMinutesNow()

  // If the logged-in student has a teacher-created roster record,
  // show only that student's real data.
  const [student] = await db
    .select({
      id: groupStudents.id,
      name: groupStudents.studentName,
      rollNo: groupStudents.rollNo,
      groupId: classGroups.id,
      groupName: classGroups.name,
      academicYear: classGroups.academicYear,
      section: classGroups.section,
    })
    .from(groupStudents)
    .innerJoin(
      classGroups,
      eq(groupStudents.classGroupId, classGroups.id),
    )
    .where(sql`lower(${groupStudents.studentEmail}) = ${email}`)
    .limit(1)

  const [realAttendanceRows, realTimetable] = student
    ? await Promise.all([
        db
          .select({
            date: lectureSessions.date,
            status: lectureAttendance.status,
            subjectName: timetableEntries.subjectName,
            subjectCode: timetableEntries.subjectCode,
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
          .where(eq(lectureAttendance.groupStudentId, student.id))
          .orderBy(desc(lectureSessions.date))
          .limit(1000),

        db
          .select({
            id: timetableEntries.id,
            subjectName: timetableEntries.subjectName,
            subjectCode: timetableEntries.subjectCode,
            dayOfWeek: timetableEntries.dayOfWeek,
            startTime: timetableEntries.startTime,
            endTime: timetableEntries.endTime,
            room: timetableEntries.room,
          })
          .from(timetableEntries)
          .where(
            and(
              eq(timetableEntries.classGroupId, student.groupId),
              eq(timetableEntries.active, true),
            ),
          )
          .orderBy(
            asc(timetableEntries.dayOfWeek),
            asc(timetableEntries.startTime),
          ),
      ])
    : [[], []]

  // Linked accounts use real records. Unlinked student accounts use demo data.
  const attendanceRows: AttendanceRow[] = student
    ? realAttendanceRows
    : demoAttendance

  const timetable: TimetableRow[] = student
    ? realTimetable
    : demoTimetable

  // Read global holiday exceptions so Overview follows the same holiday
  // behavior as the Timetable page without changing attendance records.
  const exceptions = await db
    .select({
      date: timetableExceptions.date,
      timetableEntryId: timetableExceptions.timetableEntryId,
      type: timetableExceptions.type,
      note: timetableExceptions.note,
    })
    .from(timetableExceptions)
    .where(
      and(
        eq(timetableExceptions.date, today),
        isNull(timetableExceptions.timetableEntryId),
      ),
    )

  const todayHoliday = exceptions.find(
    (event) =>
      String(event.date).slice(0, 10) === today &&
      event.timetableEntryId === null &&
      isHoliday(event.type),
  )

  const displayStudent = student ?? {
    name: accountName,
    rollNo: 'CS-2407',
    groupName: 'B.Tech Computer Science',
    academicYear: '2026–27',
    section: 'A',
  }

  const recordedAttendance = attendanceRows.filter((row) =>
    ['present', 'absent', 'late'].includes(row.status.toLowerCase()),
  )

  const presentCount = recordedAttendance.filter((row) =>
    ['present', 'late'].includes(row.status.toLowerCase()),
  ).length

  const totalCount = recordedAttendance.length
  const attendancePercentage =
    totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : null

  // Use the same display schedule as the Timetable page, including its
  // display-only sample slots, then show every lecture that has not finished.
  const displayTimetable = buildDisplayTimetable(timetable)
  const todayClasses = todayHoliday
    ? []
    : displayTimetable
        .filter((entry) => entry.dayOfWeek === todayWeekday)
        .filter((entry) => {
          const end = toMinutes(entry.endTime)
          return end !== null && end > nowMinutes
        })
        .sort((a, b) => {
          const aStart = toMinutes(a.startTime) ?? 0
          const bStart = toMinutes(b.startTime) ?? 0
          return aStart - bStart
        })

  const recentAttendance = attendanceRows.slice(0, 5)
  const displayName = displayStudent.name || accountName

  return (
    
      <main className="mx-auto max-w-6xl">
        <header className="border-b border-neutral-200 pb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Student workspace / Overview
          </p>

          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
            {getGreeting()}, {getFirstName(displayName)}
            <span className="italic">.</span>
          </h1>

          
          <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
            <GraduationCap size={16} />
            <span>TY – CSE A</span>
          </div>

        </header>

        <section
          aria-label="Attendance overview"
          className="mt-7 grid gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-3"
        >
          <article className="bg-white p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
              Attendance rate
            </p>
            <p className="mt-3 font-display text-4xl">
              {attendancePercentage === null
                ? '—'
                : `${attendancePercentage}%`}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              {attendancePercentage === null
                ? 'No attendance records yet'
                : 'Based on recorded lectures'}
            </p>
          </article>

          <article className="bg-white p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
              Present or late
            </p>
            <p className="mt-3 font-display text-4xl">{presentCount}</p>
            <p className="mt-2 text-xs text-neutral-500">
              Recorded attended lectures
            </p>
          </article>

          <article className="bg-white p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
              Recorded lectures
            </p>
            <p className="mt-3 font-display text-4xl">{totalCount}</p>
            <p className="mt-2 text-xs text-neutral-500">
              Present, absent and late records
            </p>
          </article>
        </section>

        <section className="mt-9 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
                  {formatDate(today)}
                </p>
                <h2 className="mt-2 font-display text-2xl">
                  Today&apos;s timetable
                </h2>
              </div>

              <Link
                href="/student/timetable"
                className="inline-flex items-center gap-1 text-sm underline underline-offset-4 hover:text-neutral-500"
              >
                Full timetable <ArrowRight size={14} />
              </Link>
            </div>

            {todayHoliday ? (
              <div className="border-b border-neutral-200 py-8">
                <CalendarDays
                  size={22}
                  strokeWidth={1.5}
                  className="text-neutral-500"
                />
                <p className="mt-3 text-sm font-medium">Today is a holiday</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {todayHoliday.note
                    ? `${todayHoliday.note} No lectures are scheduled for today.`
                    : 'No lectures are scheduled for today.'}
                </p>
              </div>
            ) : todayClasses.length === 0 ? (
              <div className="border-b border-neutral-200 py-8">
                <CalendarDays
                  size={22}
                  strokeWidth={1.5}
                  className="text-neutral-500"
                />
                <p className="mt-3 text-sm font-medium">
                  No upcoming lectures today
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {student
                    ? 'All of today’s lectures have finished, or no active timetable entries are scheduled for your group.'
                    : 'All of today’s demo lectures have finished, or no demo classes are scheduled today.'}
                </p>
              </div>
            ) : (
              <div>
                {todayClasses.map((entry) => {
                  const start = toMinutes(entry.startTime)
                  const end = toMinutes(entry.endTime)
                  const status =
                    start !== null && end !== null && start <= nowMinutes && end > nowMinutes
                      ? 'In progress'
                      : 'Upcoming'

                  return (
                    <article
                      key={entry.id}
                      className="flex gap-4 border-b border-neutral-200 py-5"
                    >
                      <div className="w-24 shrink-0">
                        <p className="text-sm font-medium">
                          {formatTime(entry.startTime)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {formatTime(entry.endTime)}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                          {entry.subjectCode}
                        </p>
                        <h3 className="mt-1 text-sm font-medium">
                          {entry.subjectName}
                        </h3>
                        {entry.room && (
                          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-500">
                            <MapPin size={13} />
                            {entry.room}
                          </p>
                        )}
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                          {status}
                        </p>
                      </div>

                      <Clock3
                        size={16}
                        strokeWidth={1.5}
                        className="mt-1 shrink-0 text-neutral-400"
                        aria-hidden="true"
                      />
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
                  Your records
                </p>
                <h2 className="mt-2 font-display text-2xl">
                  Recent attendance
                </h2>
              </div>

              <Link
                href="/student/attendance"
                className="inline-flex items-center gap-1 text-sm underline underline-offset-4 hover:text-neutral-500"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {recentAttendance.length === 0 ? (
              <div className="py-8">
                <CheckCircle2
                  size={22}
                  strokeWidth={1.5}
                  className="text-neutral-500"
                />
                <p className="mt-3 text-sm font-medium">
                  No attendance records yet
                </p>
                <p className="mt-1 text-sm leading-5 text-neutral-500">
                  Attendance will appear here after your teacher records a
                  lecture.
                </p>
              </div>
            ) : (
              <div>
                {recentAttendance.map((record, index) => {
                  const status = record.status.toLowerCase()
                  const label =
                    status.charAt(0).toUpperCase() + status.slice(1)

                  return (
                    <article
                      key={`${record.date}-${record.subjectCode}-${index}`}
                      className="border-b border-neutral-200 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {record.subjectName}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {formatDate(record.date)}
                          </p>
                        </div>
                        <span className="shrink-0 border border-neutral-200 px-2 py-1 font-mono text-[10px] uppercase tracking-wider">
                          {label}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-10 border-t border-neutral-200 pt-5">
          <p className="text-xs leading-5 text-neutral-500">
            Attendance figures are calculated from your recorded lecture
            entries. Unrecorded lectures are not included.
          </p>
        </footer>
      </main>
    
  )
}
