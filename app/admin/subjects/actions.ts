'use server'

import { and, eq, ilike, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  lectureSessions,
  timetableEntries,
  user,
} from '@/lib/db/schema'

export type SubjectActionState = {
  success: boolean
  message: string
  requiresConfirmation?: boolean
  historyCount?: number
}

const fail = (message: string): SubjectActionState => ({
  success: false,
  message,
})

export async function createSubjectAssignment(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  await requireRole('admin')

  const subjectName = String(formData.get('subjectName') ?? '').trim()
  const subjectCode = String(formData.get('subjectCode') ?? '').trim()
  const classGroupId = Number(formData.get('classGroupId'))
  const teacherId = String(formData.get('teacherId') ?? '').trim()
  const dayOfWeek = Number(formData.get('dayOfWeek'))
  const startTime = String(formData.get('startTime') ?? '').trim()
  const endTime = String(formData.get('endTime') ?? '').trim()
  const room = String(formData.get('room') ?? '').trim()

  if (
    !subjectName ||
    !subjectCode ||
    !Number.isInteger(classGroupId) ||
    classGroupId < 1 ||
    !teacherId ||
    ![1, 2, 3, 4, 5, 6].includes(dayOfWeek) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
    startTime >= endTime
  ) {
    return fail(
      'Complete every required field and enter a valid time range.',
    )
  }

  const [group] = await db
    .select({ id: classGroups.id })
    .from(classGroups)
    .where(eq(classGroups.id, classGroupId))
    .limit(1)

  const [teacher] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.id, teacherId), eq(user.role, 'teacher')))
    .limit(1)

  if (!group || !teacher) {
    return fail('Select a valid class group and teacher.')
  }

  const [existing] = await db
    .select({ id: timetableEntries.id })
    .from(timetableEntries)
    .where(
      and(
        eq(timetableEntries.classGroupId, classGroupId),
        ilike(timetableEntries.subjectCode, subjectCode),
        ilike(timetableEntries.subjectName, subjectName),
        eq(timetableEntries.dayOfWeek, dayOfWeek),
        eq(timetableEntries.startTime, startTime),
      ),
    )
    .limit(1)

  if (existing) {
    return fail(
      'This subject already has an assignment at that day and start time for the selected class group.',
    )
  }

  await db.insert(timetableEntries).values({
    classGroupId,
    subjectName,
    subjectCode,
    teacherId,
    dayOfWeek,
    startTime,
    endTime,
    room: room || null,
    active: true,
  })

  revalidatePath('/admin/subjects')
  revalidatePath('/admin/timetable')
  revalidatePath('/admin/dashboard')

  return {
    success: true,
    message: 'Subject added to the catalogue and timetable.',
  }
}

export async function deleteSubject(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  await requireRole('admin')

  const subjectName = String(formData.get('subjectName') ?? '').trim()
  const subjectCode = String(formData.get('subjectCode') ?? '').trim()
  const confirmed =
    String(formData.get('confirmWithHistory') ?? '') === 'true'

  if (!subjectName || !subjectCode) {
    return fail('Missing subject details.')
  }

  const matching = await db
    .select({ id: timetableEntries.id })
    .from(timetableEntries)
    .where(
      and(
        ilike(timetableEntries.subjectName, subjectName),
        ilike(timetableEntries.subjectCode, subjectCode),
      ),
    )

  if (!matching.length) {
    return fail('This subject no longer exists.')
  }

  const ids = matching.map((entry) => entry.id)

  const history = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(lectureSessions)
    .where(
      sql`${lectureSessions.timetableEntryId} IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )

  const historyCount = history[0]?.count ?? 0

  if (historyCount > 0 && !confirmed) {
    return {
      success: false,
      message: `This subject has ${historyCount} recorded lecture session(s). Confirm to deactivate its timetable assignments while preserving attendance history.`,
      requiresConfirmation: true,
      historyCount,
    }
  }

  if (historyCount > 0) {
    await db
      .update(timetableEntries)
      .set({ active: false })
      .where(
        and(
          ilike(timetableEntries.subjectName, subjectName),
          ilike(timetableEntries.subjectCode, subjectCode),
        ),
      )
  } else {
    await db
      .delete(timetableEntries)
      .where(
        and(
          ilike(timetableEntries.subjectName, subjectName),
          ilike(timetableEntries.subjectCode, subjectCode),
        ),
      )
  }

  revalidatePath('/admin/subjects')
  revalidatePath('/admin/timetable')
  revalidatePath('/admin/dashboard')

  return {
    success: true,
    message:
      historyCount > 0
        ? 'Subject assignments deactivated. Attendance history was preserved.'
        : 'Subject deleted.',
  }
}