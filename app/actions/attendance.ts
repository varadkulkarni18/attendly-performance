
'use server'

import { and, eq, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  attendanceRecords,
  classes,
  classSessions,
  enrollments,
  user,
  classGroups,
  groupStudents,
  timetableEntries,
  timetableExceptions,
  lectureSessions,
  lectureAttendance,
} from '@/lib/db/schema'
import { type CurrentUser, requireActionUser } from '@/lib/session'
import type { AttendanceStatus } from '@/lib/attendance'

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

const STATUSES: AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'excused',
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function clean(value: FormDataEntryValue | null, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function isValidDate(date: string) {
  if (!DATE_PATTERN.test(date)) return false

  const parsed = new Date(`${date}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
}

function getIndiaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

async function assertClassAccess(
  classId: number,
  current: CurrentUser,
) {
  const [row] = await db
    .select({ teacherId: classes.teacherId })
    .from(classes)
    .where(eq(classes.id, classId))

  if (!row) throw new Error('That class no longer exists.')

  if (current.role !== 'admin' && row.teacherId !== current.id) {
    throw new Error('You do not have access to this class.')
  }
}

async function run(
  fn: () => Promise<ActionResult>,
): Promise<ActionResult> {
  try {
    return await fn()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Something went wrong.'

    const isUnique =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'

    return {
      ok: false,
      error: isUnique
        ? 'A conflicting record already exists. Refresh and try again.'
        : message,
    }
  }
}

// --------------------------------------------------
// LEGACY CLASS ACTIONS
// --------------------------------------------------

export async function createClass(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const current = await requireActionUser(['teacher', 'admin'])

    const name = clean(formData.get('name'))
    const code = clean(formData.get('code'), 20).toUpperCase()
    const section = clean(formData.get('section'), 40)
    const requestedTeacher = clean(formData.get('teacherId'), 64)

    if (!name || !code) {
      return {
        ok: false,
        error: 'Add a subject name and a class code.',
      }
    }

    let teacherId = current.id

    if (current.role === 'admin' && requestedTeacher) {
      const [teacher] = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.id, requestedTeacher),
            eq(user.role, 'teacher'),
          ),
        )

      if (!teacher) {
        return { ok: false, error: 'Pick a valid teacher.' }
      }

      teacherId = teacher.id
    }

    await db.insert(classes).values({
      name,
      code,
      section: section || null,
      teacherId,
    })

    revalidatePath('/dashboard')

    return { ok: true, message: `${code} created.` }
  })
}

export async function deleteClass(
  classId: number,
): Promise<ActionResult> {
  return run(async () => {
    const current = await requireActionUser(['teacher', 'admin'])

    await assertClassAccess(classId, current)

    await db.transaction(async (tx) => {
      const sessionIds = tx
        .select({ id: classSessions.id })
        .from(classSessions)
        .where(eq(classSessions.classId, classId))

      await tx
        .delete(attendanceRecords)
        .where(inArray(attendanceRecords.sessionId, sessionIds))

      await tx
        .delete(classSessions)
        .where(eq(classSessions.classId, classId))

      await tx
        .delete(enrollments)
        .where(eq(enrollments.classId, classId))

      await tx
        .delete(classes)
        .where(eq(classes.id, classId))
    })

    revalidatePath('/dashboard')

    return { ok: true }
  })
}

export async function addStudent(
  classId: number,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const current = await requireActionUser(['teacher', 'admin'])

    await assertClassAccess(classId, current)

    const studentName = clean(formData.get('studentName'))
    const rollNo = clean(formData.get('rollNo'), 30).toUpperCase()
    const studentEmail = clean(
      formData.get('studentEmail'),
      160,
    ).toLowerCase()

    if (!studentName || !rollNo) {
      return {
        ok: false,
        error: 'Add the student’s name and roll number.',
      }
    }

    if (studentEmail && !EMAIL_PATTERN.test(studentEmail)) {
      return {
        ok: false,
        error: 'That email doesn’t look right.',
      }
    }

    await db.insert(enrollments).values({
      classId,
      studentName,
      rollNo,
      studentEmail: studentEmail || null,
    })

    revalidatePath(`/dashboard/classes/${classId}`)

    return {
      ok: true,
      message: `${studentName} added.`,
    }
  })
}

export async function removeStudent(
  classId: number,
  enrollmentId: number,
): Promise<ActionResult> {
  return run(async () => {
    const current = await requireActionUser(['teacher', 'admin'])

    await assertClassAccess(classId, current)

    await db.transaction(async (tx) => {
      await tx
        .delete(attendanceRecords)
        .where(eq(attendanceRecords.enrollmentId, enrollmentId))

      await tx
        .delete(enrollments)
        .where(
          and(
            eq(enrollments.id, enrollmentId),
            eq(enrollments.classId, classId),
          ),
        )
    })

    revalidatePath(`/dashboard/classes/${classId}`)

    return { ok: true }
  })
}

export async function saveAttendance(
  classId: number,
  date: string,
  marks: { enrollmentId: number; status: AttendanceStatus }[],
): Promise<ActionResult> {
  return run(async () => {
    const current = await requireActionUser(['teacher', 'admin'])

    await assertClassAccess(classId, current)

    if (!isValidDate(date)) {
      return { ok: false, error: 'Pick a valid date.' }
    }

    if (date > getIndiaToday()) {
      return {
        ok: false,
        error: 'You can’t mark a future date.',
      }
    }

    if (marks.length === 0) {
      return {
        ok: false,
        error: 'Mark at least one student.',
      }
    }

    if (
      marks.some(
        (mark) =>
          !STATUSES.includes(mark.status) ||
          !Number.isInteger(mark.enrollmentId),
      )
    ) {
      return {
        ok: false,
        error: 'Some marks were invalid. Refresh and try again.',
      }
    }

    const validIds = new Set(
      (
        await db
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(eq(enrollments.classId, classId))
      ).map((row) => row.id),
    )

    const rows = marks.filter((mark) =>
      validIds.has(mark.enrollmentId),
    )

    if (rows.length !== marks.length) {
      return {
        ok: false,
        error: 'Some students do not belong to this class.',
      }
    }

    if (
      new Set(rows.map((mark) => mark.enrollmentId)).size !==
      rows.length
    ) {
      return {
        ok: false,
        error: 'Duplicate student marks were submitted.',
      }
    }

    await db.transaction(async (tx) => {
      const [session] = await tx
        .insert(classSessions)
        .values({
          classId,
          date,
          createdBy: current.id,
        })
        .onConflictDoUpdate({
          target: [classSessions.classId, classSessions.date],
          set: { createdBy: current.id },
        })
        .returning({ id: classSessions.id })

      await tx
        .insert(attendanceRecords)
        .values(
          rows.map((mark) => ({
            sessionId: session.id,
            enrollmentId: mark.enrollmentId,
            status: mark.status,
          })),
        )
        .onConflictDoUpdate({
          target: [
            attendanceRecords.sessionId,
            attendanceRecords.enrollmentId,
          ],
          set: {
            status: sql`excluded.status`,
            updatedAt: sql`now()`,
          },
        })
    })

    revalidatePath(`/dashboard/classes/${classId}`)
    revalidatePath('/dashboard')
    revalidatePath('/teacher/dashboard')
    revalidatePath('/teacher/classes')

    return {
      ok: true,
      message: `Saved ${rows.length} marks for ${date}.`,
    }
  })
}

// --------------------------------------------------
// TIMETABLE-BASED LECTURE ATTENDANCE
// --------------------------------------------------

export async function saveLectureAttendance(
  timetableEntryId: number,
  date: string,
  marks: {
    groupStudentId: number
    status: AttendanceStatus
  }[],
): Promise<ActionResult> {
  return run(async () => {
    const current = await requireActionUser(['teacher', 'admin'])

    if (
      !Number.isInteger(timetableEntryId) ||
      timetableEntryId <= 0
    ) {
      return {
        ok: false,
        error: 'Invalid timetable entry.',
      }
    }

    if (!isValidDate(date)) {
      return { ok: false, error: 'Pick a valid date.' }
    }

    if (date > getIndiaToday()) {
      return {
        ok: false,
        error: 'You can’t mark attendance for a future date.',
      }
    }

    const [entry] = await db
      .select({
        id: timetableEntries.id,
        teacherId: timetableEntries.teacherId,
        classGroupId: timetableEntries.classGroupId,
        active: timetableEntries.active,
        subjectName: timetableEntries.subjectName,
      })
      .from(timetableEntries)
      .where(eq(timetableEntries.id, timetableEntryId))

    if (!entry) {
      return {
        ok: false,
        error: 'This timetable entry does not exist.',
      }
    }

    if (
      current.role !== 'admin' &&
      entry.teacherId !== current.id
    ) {
      return {
        ok: false,
        error: 'You do not have access to this lecture.',
      }
    }

    if (!entry.active) {
      return {
        ok: false,
        error: 'This timetable entry is inactive.',
      }
    }

    const [exception] = await db
      .select({
        type: timetableExceptions.type,
        note: timetableExceptions.note,
      })
      .from(timetableExceptions)
      .where(
        and(
          eq(timetableExceptions.date, date),
          eq(timetableExceptions.timetableEntryId, timetableEntryId),
        ),
      )

    const [holiday] = await db
      .select({
        type: timetableExceptions.type,
        note: timetableExceptions.note,
      })
      .from(timetableExceptions)
      .where(
        and(
          eq(timetableExceptions.date, date),
          sql`${timetableExceptions.timetableEntryId} IS NULL`,
        ),
      )

    const blockedException = [exception, holiday].find(
      (item) =>
        item &&
        ['holiday', 'cancelled', 'canceled'].includes(
          item.type.toLowerCase(),
        ),
    )

    if (blockedException) {
      return {
        ok: false,
        error:
          blockedException.note ||
          'Attendance cannot be marked because this lecture is cancelled or the date is a holiday.',
      }
    }

    if (marks.length === 0) {
      return {
        ok: false,
        error: 'Mark attendance for the students before saving.',
      }
    }

    if (
      marks.some(
        (mark) =>
          !Number.isInteger(mark.groupStudentId) ||
          mark.groupStudentId <= 0 ||
          !STATUSES.includes(mark.status),
      )
    ) {
      return {
        ok: false,
        error: 'Some attendance marks are invalid.',
      }
    }

    const submittedIds = marks.map((mark) => mark.groupStudentId)

    if (new Set(submittedIds).size !== submittedIds.length) {
      return {
        ok: false,
        error: 'Duplicate student marks were submitted.',
      }
    }

    const roster = await db
      .select({ id: groupStudents.id })
      .from(groupStudents)
      .where(eq(groupStudents.classGroupId, entry.classGroupId))

    const rosterIds = new Set(roster.map((student) => student.id))

    if (roster.length === 0) {
      return {
        ok: false,
        error: 'No students are assigned to this class group.',
      }
    }

    if (
      marks.length !== roster.length ||
      submittedIds.some((id) => !rosterIds.has(id))
    ) {
      return {
        ok: false,
        error:
          'Mark every student in this class exactly once before saving.',
      }
    }

    await db.transaction(async (tx) => {
      const [session] = await tx
        .insert(lectureSessions)
        .values({
          timetableEntryId,
          date,
          status: 'completed',
          createdBy: current.id,
        })
        .onConflictDoUpdate({
          target: [
            lectureSessions.timetableEntryId,
            lectureSessions.date,
          ],
          set: {
            status: 'completed',
            createdBy: current.id,
          },
        })
        .returning({ id: lectureSessions.id })

      await tx
        .insert(lectureAttendance)
        .values(
          marks.map((mark) => ({
            lectureSessionId: session.id,
            groupStudentId: mark.groupStudentId,
            status: mark.status,
          })),
        )
        .onConflictDoUpdate({
          target: [
            lectureAttendance.lectureSessionId,
            lectureAttendance.groupStudentId,
          ],
          set: {
            status: sql`excluded.status`,
            updatedAt: sql`now()`,
          },
        })
    })

    revalidatePath('/teacher/dashboard')
    revalidatePath('/teacher/classes')
    revalidatePath(`/teacher/timetable/${timetableEntryId}`)
    revalidatePath('/dashboard')

    return {
      ok: true,
      message: `Attendance saved for ${entry.subjectName} on ${date}.`,
    }
  })
}

// --------------------------------------------------
// USER ROLE MANAGEMENT
// --------------------------------------------------

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<ActionResult> {
  return run(async () => {
    const current = await requireActionUser(['admin'])

    if (!['admin', 'teacher', 'student'].includes(role)) {
      return { ok: false, error: 'Unknown role.' }
    }

    if (userId === current.id) {
      return {
        ok: false,
        error: 'You can’t change your own role.',
      }
    }

    await db
      .update(user)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))

    revalidatePath('/dashboard/users')

    return {
      ok: true,
      message: 'Role updated.',
    }
  })
}
