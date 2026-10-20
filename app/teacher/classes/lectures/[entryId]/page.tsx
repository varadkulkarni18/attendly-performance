import { and, eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { LectureAttendance } from '@/components/teacher/lecture-attendance'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  groupStudents,
  lectureAttendance,
  lectureSessions,
  timetableEntries,
} from '@/lib/db/schema'
import type { AttendanceStatus } from '@/lib/attendance'

interface PageProps {
  params: Promise<{ entryId: string }>
  searchParams: Promise<{ date?: string }>
}

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
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

function formatTime(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  return `${hour % 12 || 12}:${minuteText} ${hour >= 12 ? 'PM' : 'AM'}`
}

export default async function LectureAttendancePage({ params, searchParams }: PageProps) {
  const session = await requireRole('teacher')
  const { entryId: rawId } = await params
  const query = await searchParams
  const entryId = Number(rawId)
  if (!Number.isInteger(entryId) || entryId <= 0) notFound()

  const today = todayInIndia()
  const requestedDate = query.date
  const date = requestedDate && isValidDate(requestedDate) ? requestedDate : today
  const isFuture = date > today

  const [entry] = await db
    .select({
      id: timetableEntries.id,
      teacherId: timetableEntries.teacherId,
      subjectName: timetableEntries.subjectName,
      subjectCode: timetableEntries.subjectCode,
      startTime: timetableEntries.startTime,
      endTime: timetableEntries.endTime,
      room: timetableEntries.room,
      active: timetableEntries.active,
      groupId: classGroups.id,
      groupName: classGroups.name,
      academicYear: classGroups.academicYear,
      section: classGroups.section,
    })
    .from(timetableEntries)
    .innerJoin(classGroups, eq(timetableEntries.classGroupId, classGroups.id))
    .where(eq(timetableEntries.id, entryId))

  if (!entry || entry.teacherId !== session.user.id || !entry.active) notFound()

  const students = await db
    .select({ id: groupStudents.id, studentName: groupStudents.studentName, rollNo: groupStudents.rollNo })
    .from(groupStudents)
    .where(eq(groupStudents.classGroupId, entry.groupId))
    .orderBy(groupStudents.rollNo)

  const [lecture] = await db
    .select({ id: lectureSessions.id, status: lectureSessions.status })
    .from(lectureSessions)
    .where(and(eq(lectureSessions.timetableEntryId, entryId), eq(lectureSessions.date, date)))

  const savedRows = lecture && !isFuture
    ? await db
        .select({ groupStudentId: lectureAttendance.groupStudentId, status: lectureAttendance.status })
        .from(lectureAttendance)
        .where(eq(lectureAttendance.lectureSessionId, lecture.id))
    : []

  const initialMarks: { groupStudentId: number; status: AttendanceStatus }[] = savedRows.filter(
    (mark): mark is { groupStudentId: number; status: AttendanceStatus } =>
      ['present', 'absent', 'late', 'excused'].includes(mark.status),
  )

  return (
    
      <div className="mx-auto max-w-6xl">
        <Link href={`/teacher/classes?date=${date}`} className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft size={16} /> Back to my classes
        </Link>

        <header className="mt-6 border-b border-neutral-200 pb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">My classes / Attendance register</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">{entry.subjectName}<span className="italic">.</span></h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
            <span>{entry.subjectCode}</span>
            <span>{entry.groupName} · {entry.academicYear} · Section {entry.section}</span>
            <span>{formatTime(entry.startTime)} – {formatTime(entry.endTime)}</span>
            {entry.room && <span>{entry.room}</span>}
            <span>{students.length} students</span>
          </div>
          <p className="mt-4 text-sm text-neutral-600">Lecture date: <strong>{formatDate(date)}</strong></p>
        </header>

        {isFuture ? (
          <section className="mt-8 border border-neutral-200 p-6">
            <h2 className="font-display text-2xl">Upcoming lecture</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">Attendance cannot be marked for a future date. Return on or after the lecture date to record attendance.</p>
          </section>
        ) : (
          <LectureAttendance
            key={`${entry.id}-${date}`}
            entryId={entry.id}
            students={students}
            initialDate={date}
            maxDate={today}
            initialMarks={initialMarks}
          />
        )}
      </div>
    
  )
}
