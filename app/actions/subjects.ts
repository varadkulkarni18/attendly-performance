'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  classGroups,
  lectureSessions,
  timetableEntries,
  user,
} from '@/lib/db/schema'
import { requireActionUser } from '@/lib/session'

export type SubjectActionState = {
  ok: boolean
  message: string
  requiresConfirmation?: boolean
}

export async function createSubject(
  _previousState: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  try {
    const current = await requireActionUser()

    if (current.role !== 'admin') {
      return { ok: false, message: 'Only administrators can add subjects.' }
    }

    const subjectName = String(formData.get('subjectName') ?? '').trim()
    const subjectCode = String(formData.get('subjectCode') ?? '')
      .trim()
      .toUpperCase()
    const teacherId = String(formData.get('teacherId') ?? '').trim()
    const classGroupId = Number(formData.get('classGroupId'))
    const dayOfWeek = Number(formData.get('dayOfWeek'))
    const startTime = String(formData.get('startTime') ?? '')
    const endTime = String(formData.get('endTime') ?? '')
    const room = String(formData.get('room') ?? '').trim()

    if (
      !subjectName ||
      !subjectCode ||
      !teacherId ||
      !Number.isInteger(classGroupId) ||
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 1 ||
      dayOfWeek > 6 ||
      !/^\d{2}:\d{2}$/.test(startTime) ||
      !/^\d{2}:\d{2}$/.test(endTime) ||
      startTime >= endTime
    ) {
      return {
        ok: false,
        message: 'Enter valid subject, teacher, class and timetable details.',
      }
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
      return {
        ok: false,
        message: 'The selected class group or teacher was not found.',
      }
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
    revalidatePath('/admin/classes')

    return { ok: true, message: 'Subject assignment added successfully.' }
  } catch (error) {
    console.error('Create subject failed:', error)
    return { ok: false, message: 'Could not add the subject. Please try again.' }
  }
}

export async function deleteSubject(
  _previousState: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  try {
    const current = await requireActionUser()

    if (current.role !== 'admin') {
      return { ok: false, message: 'Only administrators can delete subjects.' }
    }

    const subjectName = String(formData.get('subjectName') ?? '').trim()
    const subjectCode = String(formData.get('subjectCode') ?? '').trim()
    const confirmWithHistory = formData.get('confirmWithHistory') === 'true'

    if (!subjectName || !subjectCode) {
      return { ok: false, message: 'Subject details are missing.' }
    }

    const matchingEntries = await db
      .select({ id: timetableEntries.id })
      .from(timetableEntries)
      .where(
        and(
          eq(timetableEntries.subjectName, subjectName),
          eq(timetableEntries.subjectCode, subjectCode),
        ),
      )

    if (matchingEntries.length === 0) {
      return { ok: false, message: 'This subject no longer exists.' }
    }

    const entryIds = matchingEntries.map((entry) => entry.id)

    const history = await db
      .select({ id: lectureSessions.id })
      .from(lectureSessions)
      .where(inArray(lectureSessions.timetableEntryId, entryIds))
      .limit(1)

    if (history.length > 0 && !confirmWithHistory) {
      return {
        ok: false,
        requiresConfirmation: true,
        message:
          'Attendance sessions exist for this subject. Confirm to deactivate its timetable assignments while preserving attendance history.',
      }
    }

    if (history.length > 0) {
      await db
        .update(timetableEntries)
        .set({ active: false })
        .where(inArray(timetableEntries.id, entryIds))
    } else {
      await db
        .delete(timetableEntries)
        .where(inArray(timetableEntries.id, entryIds))
    }

    revalidatePath('/admin/subjects')
    revalidatePath('/admin/timetable')
    revalidatePath('/admin/classes')
    revalidatePath('/teacher/attendance')
    revalidatePath('/student/attendance')

    return {
      ok: true,
      message:
        history.length > 0
          ? 'Assignments deactivated. Attendance history has been preserved.'
          : 'Subject assignments deleted successfully.',
    }
  } catch (error) {
    console.error('Delete subject failed:', error)
    return {
      ok: false,
      message: 'Could not delete the subject. Please try again.',
    }
  }
}