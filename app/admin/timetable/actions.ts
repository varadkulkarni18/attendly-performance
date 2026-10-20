
'use server'

import { and, eq, ne, lt, gt, type SQL } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  lectureSessions,
  timetableEntries,
  user,
} from '@/lib/db/schema'

export type TimetableActionState = {
  success: boolean
  message: string
}

type ParsedTimetableFields = {
  id?: number
  classGroupId: number
  teacherId: string
  subjectName: string
  subjectCode: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
}

type ParsedTimetableResult =
  | ParsedTimetableFields
  | { error: string }

function readFields(formData: FormData): ParsedTimetableResult {
  const idValue = String(formData.get('id') ?? '').trim()
  const classGroupId = Number(formData.get('classGroupId'))
  const teacherId = String(formData.get('teacherId') ?? '').trim()
  const subjectName = String(formData.get('subjectName') ?? '').trim()
  const subjectCode = String(formData.get('subjectCode') ?? '').trim()
  const dayOfWeek = Number(formData.get('dayOfWeek'))
  const startTime = String(formData.get('startTime') ?? '').trim()
  const endTime = String(formData.get('endTime') ?? '').trim()
  const room = String(formData.get('room') ?? '').trim()

  if (
    !subjectName ||
    !subjectCode ||
    !teacherId ||
    !Number.isSafeInteger(classGroupId) ||
    classGroupId <= 0 ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 1 ||
    dayOfWeek > 6 ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)
  ) {
    return { error: 'Please complete all fields with valid values.' }
  }

  if (startTime >= endTime) {
    return { error: 'End time must be later than start time.' }
  }

  if (
    subjectName.length > 100 ||
    subjectCode.length > 30 ||
    room.length > 50
  ) {
    return { error: 'A field exceeds its allowed length.' }
  }

  let id: number | undefined

  if (idValue) {
    id = Number(idValue)

    if (!Number.isSafeInteger(id) || id <= 0) {
      return { error: 'Invalid timetable entry.' }
    }
  }

  return {
    ...(id !== undefined ? { id } : {}),
    classGroupId,
    teacherId,
    subjectName,
    subjectCode,
    dayOfWeek,
    startTime,
    endTime,
    room: room || null,
  }
}

async function validateReferences(
  classGroupId: number,
  teacherId: string,
): Promise<string | null> {
  const [group] = await db
    .select({ id: classGroups.id })
    .from(classGroups)
    .where(eq(classGroups.id, classGroupId))
    .limit(1)

  if (!group) {
    return 'The selected class group does not exist.'
  }

  const [teacher] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.id, teacherId), eq(user.role, 'teacher')))
    .limit(1)

  if (!teacher) {
    return 'Please select a valid teacher account.'
  }

  return null
}

async function findConflict(fields: {
  id?: number
  classGroupId: number
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}): Promise<string | null> {
  const conditions: SQL[] = [
    eq(timetableEntries.active, true),
    eq(timetableEntries.dayOfWeek, fields.dayOfWeek),
    lt(timetableEntries.startTime, fields.endTime),
    gt(timetableEntries.endTime, fields.startTime),
  ]

  if (fields.id !== undefined) {
    conditions.push(ne(timetableEntries.id, fields.id))
  }

  const overlapping = await db
    .select({
      classGroupId: timetableEntries.classGroupId,
      teacherId: timetableEntries.teacherId,
    })
    .from(timetableEntries)
    .where(and(...conditions))

  if (overlapping.some((entry) => entry.teacherId === fields.teacherId)) {
    return 'This teacher already has a timetable entry during that time.'
  }

  if (overlapping.some((entry) => entry.classGroupId === fields.classGroupId)) {
    return 'This class group already has a timetable entry during that time.'
  }

  return null
}

export async function createTimetableEntry(
  _previousState: TimetableActionState,
  formData: FormData,
): Promise<TimetableActionState> {
  try {
    await requireRole('admin')

    const fields = readFields(formData)

    if ('error' in fields) {
      return { success: false, message: fields.error }
    }

    const referenceError = await validateReferences(
      fields.classGroupId,
      fields.teacherId,
    )

    if (referenceError) {
      return { success: false, message: referenceError }
    }

    const conflict = await findConflict(fields)

    if (conflict) {
      return { success: false, message: conflict }
    }

    await db.insert(timetableEntries).values({
      classGroupId: fields.classGroupId,
      teacherId: fields.teacherId,
      subjectName: fields.subjectName,
      subjectCode: fields.subjectCode,
      dayOfWeek: fields.dayOfWeek,
      startTime: fields.startTime,
      endTime: fields.endTime,
      room: fields.room,
      active: true,
    })

    revalidatePath('/admin/timetable')
    revalidatePath('/admin/dashboard')

    return {
      success: true,
      message: 'Timetable entry created successfully.',
    }
  } catch (error: unknown) {
    console.error('Failed to create timetable entry:', error)

    return {
      success: false,
      message: 'Unable to create the entry. Please try again.',
    }
  }
}

export async function updateTimetableEntry(
  _previousState: TimetableActionState,
  formData: FormData,
): Promise<TimetableActionState> {
  try {
    await requireRole('admin')

    const fields = readFields(formData)

    if ('error' in fields) {
      return { success: false, message: fields.error }
    }

    if (fields.id === undefined) {
      return { success: false, message: 'Invalid timetable entry.' }
    }

    const [existing] = await db
      .select({ id: timetableEntries.id })
      .from(timetableEntries)
      .where(eq(timetableEntries.id, fields.id))
      .limit(1)

    if (!existing) {
      return { success: false, message: 'Timetable entry not found.' }
    }

    const referenceError = await validateReferences(
      fields.classGroupId,
      fields.teacherId,
    )

    if (referenceError) {
      return { success: false, message: referenceError }
    }

    const conflict = await findConflict(fields)

    if (conflict) {
      return { success: false, message: conflict }
    }

    await db
      .update(timetableEntries)
      .set({
        classGroupId: fields.classGroupId,
        teacherId: fields.teacherId,
        subjectName: fields.subjectName,
        subjectCode: fields.subjectCode,
        dayOfWeek: fields.dayOfWeek,
        startTime: fields.startTime,
        endTime: fields.endTime,
        room: fields.room,
      })
      .where(eq(timetableEntries.id, fields.id))

    revalidatePath('/admin/timetable')
    revalidatePath('/admin/dashboard')

    return {
      success: true,
      message: 'Timetable entry updated successfully.',
    }
  } catch (error: unknown) {
    console.error('Failed to update timetable entry:', error)

    return {
      success: false,
      message: 'Unable to update the entry. Please try again.',
    }
  }
}

export async function deleteTimetableEntry(
  _previousState: TimetableActionState,
  formData: FormData,
): Promise<TimetableActionState> {
  try {
    await requireRole('admin')

    const id = Number(formData.get('id'))

    if (!Number.isSafeInteger(id) || id <= 0) {
      return { success: false, message: 'Invalid timetable entry.' }
    }

    const [entry] = await db
      .select({ id: timetableEntries.id })
      .from(timetableEntries)
      .where(eq(timetableEntries.id, id))
      .limit(1)

    if (!entry) {
      return { success: false, message: 'Timetable entry not found.' }
    }

    const [session] = await db
      .select({ id: lectureSessions.id })
      .from(lectureSessions)
      .where(eq(lectureSessions.timetableEntryId, id))
      .limit(1)

    if (session) {
      return {
        success: false,
        message:
          'This entry has lecture history. Deactivate it instead to protect attendance records.',
      }
    }

    await db
      .update(timetableEntries)
      .set({ active: false })
      .where(eq(timetableEntries.id, id))

    revalidatePath('/admin/timetable')
    revalidatePath('/admin/dashboard')

    return {
      success: true,
      message: 'Timetable entry deactivated.',
    }
  } catch (error: unknown) {
    console.error('Failed to deactivate timetable entry:', error)

    return {
      success: false,
      message: 'Unable to deactivate the entry. Please try again.',
    }
  }
}
