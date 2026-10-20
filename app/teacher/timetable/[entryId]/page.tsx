
import { and, eq, isNull, or } from 'drizzle-orm'
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
  timetableExceptions,
} from '@/lib/db/schema'
import type { AttendanceStatus } from '@/lib/attendance'

interface PageProps {
  params: Promise<{ entryId: string }>
}

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatTime(value: string) {
  const [h, m] = value.split(':')
  const hour = Number(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export default async function TimetableLecturePage({
  params,
}: PageProps) {
  const session = await requireRole('teacher')
  const { entryId: rawId } = await params
  const entryId = Number(rawId)

  if (!Number.isInteger(entryId) || entryId <= 0) notFound()

  const [entry] = await db
    .select({
      id: timetableEntries.id,
      subjectName: timetableEntries.subjectName,
      subjectCode: timetableEntries.subjectCode,
      teacherId: timetableEntries.teacherId,
      classGroupId: classGroups.id,
      groupName: classGroups.name,
      academicYear: classGroups.academicYear,
      section: classGroups.section,
      startTime: timetableEntries.startTime,
      endTime: timetableEntries.endTime,
      room: timetableEntries.room,
      active: timetableEntries.active,
    })
    .from(timetableEntries)
    .innerJoin(
      classGroups,
      eq(timetableEntries.classGroupId, classGroups.id),
    )
    .where(eq(timetableEntries.id, entryId))

  if (
    !entry ||
    entry.teacherId !== session.user.id ||
    !entry.active
  ) {
    notFound()
  }

  const today = todayInIndia()

  const students = await db
    .select({
      id: groupStudents.id,
      studentName: groupStudents.studentName,
      rollNo: groupStudents.rollNo,
    })
    .from(groupStudents)
    .where(eq(groupStudents.classGroupId, entry.classGroupId))
    .orderBy(groupStudents.rollNo)

  const [lecture] = await db
    .select({ id: lectureSessions.id })
    .from(lectureSessions)
    .where(
      and(
        eq(lectureSessions.timetableEntryId, entryId),
        eq(lectureSessions.date, today),
      ),
    )

  const initialMarks: {
    groupStudentId: number
    status: AttendanceStatus
  }[] = lecture
    ? (
        await db
          .select({
            groupStudentId: lectureAttendance.groupStudentId,
            status: lectureAttendance.status,
          })
          .from(lectureAttendance)
          .where(
            eq(lectureAttendance.lectureSessionId, lecture.id),
          )
      ).filter(
        (
          mark,
        ): mark is {
          groupStudentId: number
          status: AttendanceStatus
        } =>
          ['present', 'absent', 'late', 'excused'].includes(
            mark.status,
          ),
      )
    : []

  const exceptions = await db
    .select({
      timetableEntryId: timetableExceptions.timetableEntryId,
      type: timetableExceptions.type,
      note: timetableExceptions.note,
    })
    .from(timetableExceptions)
    .where(
      and(
        eq(timetableExceptions.date, today),
        or(
          eq(timetableExceptions.timetableEntryId, entryId),
          isNull(timetableExceptions.timetableEntryId),
        ),
      ),
    )

  const blocked = exceptions.find((item) =>
    ['holiday', 'cancelled', 'canceled'].includes(
      item.type.toLowerCase(),
    ),
  )

  const blockedReason = blocked
    ? blocked.note ||
      'This date is marked as a holiday or this lecture is cancelled. Attendance is disabled.'
    : null

  return (
    
      <div className="mx-auto max-w-6xl">
        <Link
          href="/teacher/classes"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black"
        >
          <ArrowLeft size={16} />
          Back to my classes
        </Link>

        <header className="mt-6 border-b border-neutral-200 pb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Teaching workspace / Lecture details
          </p>

          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
            {entry.subjectName}
            <span className="italic">.</span>
          </h1>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
            <span>{entry.subjectCode}</span>
            <span>
              {entry.groupName} · {entry.academicYear} · Section{' '}
              {entry.section}
            </span>
            <span>
              {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
            </span>
            {entry.room && <span>{entry.room}</span>}
            <span>{students.length} students</span>
          </div>
        </header>

        <LectureAttendance
          entryId={entry.id}
          students={students}
          initialDate={today}
          maxDate={today}
          initialMarks={initialMarks}
          blockedReason={blockedReason}
        />
      </div>
    
  )
}
