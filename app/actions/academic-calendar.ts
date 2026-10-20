
'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { timetableExceptions } from '@/lib/db/schema'
import { requireActionUser } from '@/lib/session'

export type CalendarActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

function clean(value: FormDataEntryValue | null, max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const parsed = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}

function refreshCalendar() {
  revalidatePath('/teacher/timetable')
  revalidatePath('/teacher/dashboard')
  revalidatePath('/teacher/classes')
}

export async function createAcademicEvent(
  _previousState: CalendarActionResult | null,
  formData: FormData,
): Promise<CalendarActionResult> {
  try {
    const current = await requireActionUser(['teacher', 'admin'])

    const date = clean(formData.get('date'), 10)
    const type = clean(formData.get('type'), 20).toLowerCase()
    const note = clean(formData.get('note'), 160)

    if (!isValidDate(date)) {
      return { ok: false, error: 'Choose a valid event date.' }
    }

    if (!['event', 'holiday'].includes(type)) {
      return {
        ok: false,
        error: 'Choose either an academic event or a holiday.',
      }
    }

    if (note.length < 3) {
      return {
        ok: false,
        error: 'Enter a description of at least 3 characters.',
      }
    }

    await db.insert(timetableExceptions).values({
      date,
      timetableEntryId: null,
      type,
      note,
      createdBy: current.id,
    })

    refreshCalendar()

    return {
      ok: true,
      message: type === 'holiday'
        ? 'Holiday added to the academic calendar.'
        : 'Academic event added to the calendar.',
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'Could not save the calendar entry.',
    }
  }
}

export async function deleteAcademicEvent(
  eventId: number,
  _formData: FormData,
): Promise<void> {
  const current = await requireActionUser(['teacher', 'admin'])

  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new Error('Invalid calendar entry.')
  }

  // Teachers can delete only their own college-wide calendar entries.
  // Admins can delete any college-wide calendar entry.
  const conditions = [
    eq(timetableExceptions.id, eventId),
    isNull(timetableExceptions.timetableEntryId),
  ]

  if (current.role !== 'admin') {
    conditions.push(eq(timetableExceptions.createdBy, current.id))
  }

  await db
    .delete(timetableExceptions)
    .where(and(...conditions))

  refreshCalendar()
}
