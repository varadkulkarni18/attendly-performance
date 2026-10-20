
import { and, asc, eq, inArray } from 'drizzle-orm'
import Link from 'next/link'
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Clock3,
  MapPin,
  Users,
} from 'lucide-react'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  groupStudents,
  lectureSessions,
  timetableEntries,
  timetableExceptions,
} from '@/lib/db/schema'

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

function todayInIndia() {
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

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}

function weekdayForDate(value: string) {
  return new Date(`${value}T12:00:00Z`).getUTCDay()
}

function formatTime(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  return `${hour % 12 || 12}:${minuteText} ${hour >= 12 ? 'PM' : 'AM'}`
}

export default async function TeacherClassesPage({ searchParams }: PageProps) {
  const session = await requireRole('teacher')
  const params = await searchParams
  const today = todayInIndia()
  const selectedDate =
    params.date && isValidDate(params.date) ? params.date : today
  const isFuture = selectedDate > today
  const selectedDay = weekdayForDate(selectedDate)

  const entries = await db
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
    .innerJoin(
      classGroups,
      eq(timetableEntries.classGroupId, classGroups.id),
    )
    .where(
      and(
        eq(timetableEntries.teacherId, session.user.id),
        eq(timetableEntries.active, true),
        eq(timetableEntries.dayOfWeek, selectedDay),
      ),
    )
    .orderBy(asc(timetableEntries.startTime))

  const exceptions = await db
    .select({
      timetableEntryId: timetableExceptions.timetableEntryId,
      type: timetableExceptions.type,
      note: timetableExceptions.note,
    })
    .from(timetableExceptions)
    .where(eq(timetableExceptions.date, selectedDate))

  const isHoliday = exceptions.some(
    (item) => item.type.toLowerCase() === 'holiday',
  )

  const cancelledIds = new Set(
    exceptions
      .filter(
        (item) =>
          item.timetableEntryId !== null &&
          ['cancelled', 'canceled'].includes(item.type.toLowerCase()),
      )
      .map((item) => item.timetableEntryId as number),
  )

  const visibleEntries = isHoliday
    ? []
    : entries.filter((entry) => !cancelledIds.has(entry.id))

  const groupIds = [...new Set(visibleEntries.map((entry) => entry.groupId))]
  const countsByGroup = new Map<number, number>()

  for (const groupId of groupIds) {
    const students = await db
      .select({ id: groupStudents.id })
      .from(groupStudents)
      .where(eq(groupStudents.classGroupId, groupId))

    countsByGroup.set(groupId, students.length)
  }

  const sessionRows = visibleEntries.length
    ? await db
        .select({
          timetableEntryId: lectureSessions.timetableEntryId,
          status: lectureSessions.status,
        })
        .from(lectureSessions)
        .where(
          and(
            eq(lectureSessions.date, selectedDate),
            inArray(
              lectureSessions.timetableEntryId,
              visibleEntries.map((entry) => entry.id),
            ),
          ),
        )
    : []

  const statusByEntry = new Map(
    sessionRows.map((row) => [row.timetableEntryId, row.status]),
  )

  const totalStudents = groupIds.reduce(
    (total, groupId) => total + (countsByGroup.get(groupId) ?? 0),
    0,
  )

  const completedCount = visibleEntries.filter(
    (entry) => statusByEntry.get(entry.id) === 'completed',
  ).length

  const pendingCount = visibleEntries.length - completedCount

  return (
    
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-neutral-200 pb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Teaching workspace / My classes
          </p>
          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
            My classes<span className="italic">.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
            View your scheduled lectures and check attendance for any date.
          </p>
        </header>

        <section className="mt-7 border border-neutral-200 p-5">
          <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="class-date"
                className="mb-2 block font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500"
              >
                Select lecture date
              </label>
              <input
                id="class-date"
                type="date"
                name="date"
                required
                defaultValue={selectedDate}
                className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-black"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 bg-black px-5 text-sm text-white hover:bg-neutral-800"
            >
              <CalendarDays size={16} />
              Show classes
            </button>
            <Link
              href="/teacher/classes"
              className="inline-flex h-11 items-center justify-center border border-neutral-300 px-4 text-sm hover:border-black"
            >
              Today
            </Link>
          </form>

          <p className="mt-4 text-sm text-neutral-600">
            Showing lectures for <strong>{formatDate(selectedDate)}</strong>
          </p>
          {isFuture && (
            <p className="mt-2 text-sm text-neutral-600">
              These are upcoming lectures. Attendance marking is disabled for future dates.
            </p>
          )}
        </section>

        <section className="mt-7 grid gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-3">
          <div className="bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
              Scheduled lectures
            </p>
            <p className="mt-3 font-display text-3xl">
              {visibleEntries.length.toString().padStart(2, '0')}
            </p>
          </div>
          <div className="bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
              Attendance saved
            </p>
            <p className="mt-3 font-display text-3xl">
              {completedCount.toString().padStart(2, '0')}
            </p>
          </div>
          <div className="bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
              Pending
            </p>
            <p className="mt-3 font-display text-3xl">
              {pendingCount.toString().padStart(2, '0')}
            </p>
            {isFuture && (
              <p className="mt-1 text-xs text-neutral-500">
                Upcoming lectures are not yet eligible for attendance.
              </p>
            )}
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                {isHoliday ? 'Academic calendar' : 'Selected date'}
              </p>
              <h2 className="mt-2 font-display text-2xl">
                {isHoliday ? 'College holiday' : 'Scheduled classes'}
              </h2>
            </div>
            <Link
              href="/teacher/timetable"
              className="text-sm underline underline-offset-4 hover:text-neutral-600"
            >
              View timetable
            </Link>
          </div>

          {isHoliday ? (
            <div className="border border-neutral-300 p-6">
              <p className="font-display text-xl">No lectures scheduled</p>
              <p className="mt-2 text-sm text-neutral-600">
                {exceptions.find((item) => item.type.toLowerCase() === 'holiday')?.note ||
                  'The selected date is marked as a college holiday.'}
              </p>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="border border-dashed border-neutral-300 px-5 py-12 text-center">
              <BookOpen
                size={25}
                strokeWidth={1.5}
                className="mx-auto text-neutral-500"
              />
              <h3 className="mt-4 font-display text-2xl">
                No classes on this date
              </h3>
              <p className="mt-2 text-sm text-neutral-600">
                There are no active lectures assigned to you for this weekday.
                Choose another date to review other classes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleEntries.map((entry) => {
                const status = statusByEntry.get(entry.id)
                const completed = status === 'completed'
                const lectureUrl =
                  `/teacher/classes/lectures/${entry.id}?date=${selectedDate}`

                return (
                  <article
                    key={entry.id}
                    className="border border-neutral-300 p-5 transition-colors hover:border-black sm:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                          {entry.subjectCode} · {entry.academicYear} · {entry.section}
                        </p>
                        <h3 className="mt-2 font-display text-2xl">
                          {entry.subjectName}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-600">
                          {entry.groupName}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
                          <span className="inline-flex items-center gap-2">
                            <Clock3 size={15} />
                            {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Users size={15} />
                            {countsByGroup.get(entry.groupId) ?? 0} students
                          </span>
                          {entry.room && (
                            <span className="inline-flex items-center gap-2">
                              <MapPin size={15} />
                              {entry.room}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                          {isFuture
                            ? 'Upcoming'
                            : completed
                              ? 'Attendance saved'
                              : 'Pending'}
                        </span>

                        {isFuture ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex h-10 cursor-not-allowed items-center gap-2 border border-neutral-200 px-3 text-sm text-neutral-400"
                          >
                            Mark attendance <ArrowUpRight size={15} />
                          </button>
                        ) : (
                          <Link
                            href={lectureUrl}
                            className="inline-flex h-10 items-center justify-center gap-2 border border-black px-3 text-sm hover:bg-black hover:text-white"
                          >
                            {completed ? 'View / edit attendance' : 'Mark attendance'}
                            <ArrowUpRight size={15} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    
  )
}
