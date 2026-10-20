
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
} from 'lucide-react'
import { AcademicEventForm } from '@/components/teacher/academic-event-form'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  timetableEntries,
  timetableExceptions,
} from '@/lib/db/schema'
import { deleteAcademicEvent } from '@/app/actions/academic-calendar'

const DAYS = [
  { id: 1, name: 'Monday', short: 'MON' },
  { id: 2, name: 'Tuesday', short: 'TUE' },
  { id: 3, name: 'Wednesday', short: 'WED' },
  { id: 4, name: 'Thursday', short: 'THU' },
  { id: 5, name: 'Friday', short: 'FRI' },
  { id: 6, name: 'Saturday', short: 'SAT' },
  { id: 0, name: 'Sunday', short: 'SUN' },
]

function getIndiaDate(offset = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )

  const date = new Date(
    `${values.year}-${values.month}-${values.day}T00:00:00.000Z`,
  )
  date.setUTCDate(date.getUTCDate() + offset)

  return date.toISOString().slice(0, 10)
}

function formatTime(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  return `${hour % 12 || 12}:${minuteText} ${hour >= 12 ? 'PM' : 'AM'}`
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function TeacherTimetablePage() {
  const session = await requireRole('teacher')
  const today = getIndiaDate()
  const endDate = getIndiaDate(30)

  const entries = await db
    .select({
      id: timetableEntries.id,
      subjectName: timetableEntries.subjectName,
      subjectCode: timetableEntries.subjectCode,
      dayOfWeek: timetableEntries.dayOfWeek,
      startTime: timetableEntries.startTime,
      endTime: timetableEntries.endTime,
      room: timetableEntries.room,
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
      ),
    )
    .orderBy(
      asc(timetableEntries.dayOfWeek),
      asc(timetableEntries.startTime),
    )

  const events = await db
    .select({
      id: timetableExceptions.id,
      date: timetableExceptions.date,
      timetableEntryId: timetableExceptions.timetableEntryId,
      type: timetableExceptions.type,
      note: timetableExceptions.note,
      createdBy: timetableExceptions.createdBy,
    })
    .from(timetableExceptions)
    .where(
      and(
        gte(timetableExceptions.date, today),
        lte(timetableExceptions.date, endDate),
      ),
    )
    .orderBy(asc(timetableExceptions.date))

  const eventsByDay = new Map<number, typeof entries>()

  for (const day of DAYS) {
    eventsByDay.set(
      day.id,
      entries.filter((entry) => entry.dayOfWeek === day.id),
    )
  }

  const calendarEvents = events.filter(
    (event) => event.timetableEntryId === null,
  )

  return (
    
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-neutral-200 pb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Teaching workspace / Timetable
          </p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
                Timetable<span className="italic">.</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
                Your recurring weekly schedule and the college academic
                calendar, in one place.
              </p>
            </div>

            <Link
              href="/teacher/classes"
              className="inline-flex h-11 items-center justify-center gap-2 border border-neutral-300 px-4 text-sm hover:border-black"
            >
              My classes <ArrowUpRight size={16} />
            </Link>
          </div>
        </header>

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Weekly schedule
              </p>

              <h2 className="mt-2 font-display text-2xl">
                Monday — Sunday
              </h2>
            </div>

            <p className="text-sm text-neutral-500">
              {entries.length} recurring lectures
            </p>
          </div>

          <div className="space-y-3">
            {DAYS.map((day) => {
              const dayEntries = eventsByDay.get(day.id) ?? []

              return (
                <section
                  key={day.id}
                  className="grid border border-neutral-200 md:grid-cols-[175px_minmax(0,1fr)]"
                >
                  <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 p-4 md:block md:border-b-0 md:border-r">
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.16em] text-neutral-500">
                        {day.short}
                      </p>

                      <h3 className="mt-1 font-display text-xl">
                        {day.name}
                      </h3>
                    </div>

                    <span className="font-mono text-xs text-neutral-500 md:mt-3 md:block">
                      {dayEntries.length.toString().padStart(2, '0')} classes
                    </span>
                  </div>

                  <div className="divide-y divide-neutral-200">
                    {dayEntries.length === 0 ? (
                      <p className="p-5 text-sm text-neutral-500">
                        No recurring classes scheduled.
                      </p>
                    ) : (
                      dayEntries.map((entry) => (
                        <article
                          key={entry.id}
                          className="p-4 sm:p-5"
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                            {entry.subjectCode} · {entry.academicYear} ·{' '}
                            {entry.section}
                          </p>

                          <h4 className="mt-1 font-medium">
                            {entry.subjectName}
                          </h4>

                          <p className="mt-1 text-sm text-neutral-600">
                            {entry.groupName}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 size={14} />
                              {formatTime(entry.startTime)} –{' '}
                              {formatTime(entry.endTime)}
                            </span>

                            {entry.room && (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin size={14} />
                                {entry.room}
                              </span>
                            )}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 border-b border-neutral-200 pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              College dates
            </p>

            <h2 className="mt-2 font-display text-2xl">
              Academic calendar
            </h2>

            <p className="mt-2 text-sm text-neutral-600">
              Upcoming events and holidays through {formatDate(endDate)}.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]">
            <div className="border border-neutral-200">
              <div className="border-b border-neutral-200 bg-neutral-50 p-4">
                <h3 className="font-medium">Upcoming dates</h3>
              </div>

              {calendarEvents.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <CalendarDays
                    size={24}
                    strokeWidth={1.5}
                    className="mx-auto text-neutral-500"
                  />

                  <p className="mt-3 text-sm text-neutral-600">
                    No upcoming academic events or holidays have been added.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200">
                  {calendarEvents.map((event) => {
                    const isHoliday = event.type.toLowerCase() === 'holiday'

                    return (
                      <article
                        key={event.id}
                        className="flex gap-4 p-4 sm:p-5"
                      >
                        <div className="w-[76px] shrink-0 border-r border-neutral-200 pr-3">
                          <p className="font-mono text-[10px] uppercase text-neutral-500">
                            {new Date(
                              `${event.date}T00:00:00.000Z`,
                            ).toLocaleDateString('en-IN', {
                              month: 'short',
                              timeZone: 'UTC',
                            })}
                          </p>

                          <p className="mt-1 font-display text-2xl">
                            {new Date(
                              `${event.date}T00:00:00.000Z`,
                            ).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              timeZone: 'UTC',
                            })}
                          </p>
                        </div>

                        <div className="min-w-0 flex-1">
                          <span
                            className={`inline-block border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${
                              isHoliday
                                ? 'border-neutral-400'
                                : 'border-neutral-200'
                            }`}
                          >
                            {isHoliday ? 'Holiday' : 'Academic event'}
                          </span>

                          <h4 className="mt-2 font-medium">
                            {event.note || 'Untitled entry'}
                          </h4>

                          <p className="mt-1 text-xs text-neutral-500">
                            {formatDate(event.date)}
                          </p>
                        </div>

                        <form
                          action={deleteAcademicEvent.bind(null, event.id)}
                          className="shrink-0"
                        >
                          <button
                            type="submit"
                            className="text-xs text-neutral-500 underline underline-offset-4 hover:text-black"
                            title="Delete this calendar entry"
                          >
                            Delete
                          </button>
                        </form>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            <AcademicEventForm />
          </div>
        </section>
      </div>
    
  )
}
