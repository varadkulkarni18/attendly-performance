
'use server'

import { and, eq, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  groupStudents,
  lectureAttendance,
  lectureSessions,
  timetableEntries,
} from '@/lib/db/schema'

export type CreateClassGroupState = {
  success: boolean
  message: string
}

type GroupFields = {
  name: string
  academicYear: string
  section: string
}

type CsvStudent = {
  studentName: string
  rollNo: string
  studentEmail: string | null
}

const MAX_CSV_SIZE = 2 * 1024 * 1024
const MAX_STUDENTS = 500

function readGroupFields(
  formData: FormData,
):
  | GroupFields
  | { error: string } {
  const name = String(formData.get('name') ?? '').trim()
  const academicYear = String(
    formData.get('academicYear') ?? '',
  ).trim()
  const section = String(formData.get('section') ?? '').trim()

  if (!name || !academicYear || !section) {
    return { error: 'Please complete all three fields.' }
  }

  if (
    name.length > 100 ||
    academicYear.length > 50 ||
    section.length > 30
  ) {
    return {
      error: 'One or more fields exceed the allowed length.',
    }
  }

  return { name, academicYear, section }
}

/**
 * Parses CSV rows while supporting quoted values, commas inside
 * quoted fields, escaped double quotes, and Windows line endings.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"' && cell.length === 0) {
      inQuotes = true
    } else if (char === ',') {
      row.push(cell.trim())
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') {
        i++
      }

      row.push(cell.trim())
      cell = ''

      if (row.some((value) => value !== '')) {
        rows.push(row)
      }

      row = []
    } else {
      cell += char
    }
  }

  if (inQuotes) {
    throw new Error(
      'The CSV contains an unclosed quoted field. Please check the file.',
    )
  }

  row.push(cell.trim())

  if (row.some((value) => value !== '')) {
    rows.push(row)
  }

  return rows
}

function parseStudentCsv(text: string): CsvStudent[] {
  const normalized = text.replace(/^\uFEFF/, '')
  const rows = parseCsv(normalized)

  if (rows.length < 2) {
    throw new Error(
      'The CSV must contain a header and at least one student.',
    )
  }

  const headers = rows[0].map((header) =>
    header.trim().toLowerCase(),
  )

  const nameIndex = headers.indexOf('studentname')
  const rollIndex = headers.indexOf('rollno')
  const emailIndex = headers.indexOf('studentemail')

  if (nameIndex === -1 || rollIndex === -1) {
    throw new Error(
      'Missing required CSV columns. Use studentName,rollNo,studentEmail.',
    )
  }

  const studentRows = rows.slice(1)

  if (studentRows.length > MAX_STUDENTS) {
    throw new Error(
      `You can import a maximum of ${MAX_STUDENTS} students at a time.`,
    )
  }

  const seenRollNumbers = new Set<string>()
  const students: CsvStudent[] = []

  for (let i = 0; i < studentRows.length; i++) {
    const values = studentRows[i]
    const lineNumber = i + 2

    const studentName = (values[nameIndex] ?? '').trim()
    const rollNo = (values[rollIndex] ?? '').trim()
    const studentEmail =
      emailIndex === -1
        ? ''
        : (values[emailIndex] ?? '').trim()

    if (!studentName || !rollNo) {
      throw new Error(
        `CSV row ${lineNumber}: studentName and rollNo are required.`,
      )
    }

    if (studentName.length > 150 || rollNo.length > 50) {
      throw new Error(
        `CSV row ${lineNumber}: the student name or roll number is too long.`,
      )
    }

    if (
      studentEmail &&
      (studentEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail))
    ) {
      throw new Error(
        `CSV row ${lineNumber}: please enter a valid email address.`,
      )
    }

    const normalizedRoll = rollNo.toLowerCase()

    if (seenRollNumbers.has(normalizedRoll)) {
      throw new Error(
        `CSV row ${lineNumber}: duplicate roll number "${rollNo}".`,
      )
    }

    seenRollNumbers.add(normalizedRoll)

    students.push({
      studentName,
      rollNo,
      studentEmail: studentEmail || null,
    })
  }

  return students
}

async function readStudentsCsv(
  formData: FormData,
): Promise<CsvStudent[]> {
  const file = formData.get('studentsCsv')

  // CSV import is optional.
  if (!(file instanceof File) || file.size === 0) {
    return []
  }

  if (file.size > MAX_CSV_SIZE) {
    throw new Error('The CSV file must be smaller than 2 MB.')
  }

  if (
    file.type &&
    file.type !== 'text/csv' &&
    file.type !== 'application/vnd.ms-excel' &&
    !file.name.toLowerCase().endsWith('.csv')
  ) {
    throw new Error('Please upload a CSV file.')
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Please select a file with the .csv extension.')
  }

  const text = await file.text()

  return parseStudentCsv(text)
}

async function duplicateGroup(
  name: string,
  academicYear: string,
  section: string,
  excludeId?: number,
) {
  const conditions = and(
    eq(classGroups.name, name),
    eq(classGroups.academicYear, academicYear),
    eq(classGroups.section, section),
    excludeId === undefined
      ? undefined
      : ne(classGroups.id, excludeId),
  )

  const existing = await db
    .select({ id: classGroups.id })
    .from(classGroups)
    .where(conditions)
    .limit(1)

  return existing.length > 0
}

export async function createClassGroup(
  _previousState: CreateClassGroupState,
  formData: FormData,
): Promise<CreateClassGroupState> {
  let createdGroupId: number | undefined

  try {
    await requireRole('admin')

    const fields = readGroupFields(formData)

    if ('error' in fields) {
      return { success: false, message: fields.error }
    }

    // Validate the entire CSV before creating anything.
    let students: CsvStudent[]

    try {
      students = await readStudentsCsv(formData)
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to read the CSV file.',
      }
    }

    const { name, academicYear, section } = fields

    if (await duplicateGroup(name, academicYear, section)) {
      return {
        success: false,
        message:
          'This class group already exists for that year and section.',
      }
    }

    const [createdGroup] = await db
      .insert(classGroups)
      .values({ name, academicYear, section })
      .returning({ id: classGroups.id })

    if (!createdGroup) {
      throw new Error('The class group could not be created.')
    }

    createdGroupId = createdGroup.id

    // If importing fails, the catch block removes the newly
    // created group. Its related students are schema-cascaded.
    if (students.length > 0) {
      await db.insert(groupStudents).values(
        students.map((student) => ({
          classGroupId: createdGroup.id,
          studentName: student.studentName,
          rollNo: student.rollNo,
          studentEmail: student.studentEmail,
        })),
      )
    }

    revalidatePath('/admin/classes')
    revalidatePath(`/admin/classes/${createdGroup.id}`)
    revalidatePath('/admin/dashboard')

    return {
      success: true,
      message:
        students.length > 0
          ? `${name}, Section ${section}, created with ${students.length} students.`
          : `${name}, Section ${section}, created successfully.`,
    }
  } catch (error) {
    console.error('Failed to create class group:', error)

    // Compensating cleanup in case the student insert failed.
    if (createdGroupId !== undefined) {
      try {
        await db
          .delete(classGroups)
          .where(eq(classGroups.id, createdGroupId))
      } catch (cleanupError) {
        console.error(
          'Could not clean up the partially created class group:',
          cleanupError,
        )
      }
    }

    return {
      success: false,
      message:
        'Unable to create the class group. Please check the CSV and try again.',
    }
  }
}

export async function updateClassGroup(
  _previousState: CreateClassGroupState,
  formData: FormData,
): Promise<CreateClassGroupState> {
  try {
    await requireRole('admin')

    const id = Number(formData.get('id'))

    if (!Number.isSafeInteger(id) || id <= 0) {
      return { success: false, message: 'Invalid class group.' }
    }

    const fields = readGroupFields(formData)

    if ('error' in fields) {
      return { success: false, message: fields.error }
    }

    const { name, academicYear, section } = fields

    const existingGroup = await db
      .select({ id: classGroups.id })
      .from(classGroups)
      .where(eq(classGroups.id, id))
      .limit(1)

    if (existingGroup.length === 0) {
      return {
        success: false,
        message: 'Class group not found.',
      }
    }

    if (await duplicateGroup(name, academicYear, section, id)) {
      return {
        success: false,
        message:
          'Another class group already uses that name, year and section.',
      }
    }

    await db
      .update(classGroups)
      .set({ name, academicYear, section })
      .where(eq(classGroups.id, id))

    revalidatePath('/admin/classes')
    revalidatePath(`/admin/classes/${id}`)
    revalidatePath('/admin/dashboard')

    return {
      success: true,
      message: 'Class group updated successfully.',
    }
  } catch (error) {
    console.error('Failed to update class group:', error)

    return {
      success: false,
      message: 'Unable to update the class group. Please try again.',
    }
  }
}

export async function deleteClassGroup(
  _previousState: CreateClassGroupState,
  formData: FormData,
): Promise<CreateClassGroupState> {
  try {
    await requireRole('admin')

    const id = Number(formData.get('id'))

    if (!Number.isSafeInteger(id) || id <= 0) {
      return { success: false, message: 'Invalid class group.' }
    }

    const [group] = await db
      .select({ id: classGroups.id })
      .from(classGroups)
      .where(eq(classGroups.id, id))
      .limit(1)

    if (!group) {
      return {
        success: false,
        message: 'Class group not found.',
      }
    }

    const sessions = await db
      .select({ id: lectureSessions.id })
      .from(lectureSessions)
      .innerJoin(
        timetableEntries,
        eq(lectureSessions.timetableEntryId, timetableEntries.id),
      )
      .where(eq(timetableEntries.classGroupId, id))
      .limit(1)

    if (sessions.length > 0) {
      return {
        success: false,
        message:
          'This group has lecture history. Deletion is blocked to protect attendance records.',
      }
    }

    const attendanceHistory = await db
      .select({ id: lectureAttendance.id })
      .from(lectureAttendance)
      .innerJoin(
        groupStudents,
        eq(lectureAttendance.groupStudentId, groupStudents.id),
      )
      .where(eq(groupStudents.classGroupId, id))
      .limit(1)

    if (attendanceHistory.length > 0) {
      return {
        success: false,
        message:
          'This group has attendance records. Deletion is blocked to protect student history.',
      }
    }

    await db.delete(classGroups).where(eq(classGroups.id, id))

    revalidatePath('/admin/classes')
    revalidatePath(`/admin/classes/${id}`)
    revalidatePath('/admin/dashboard')

    return {
      success: true,
      message: 'Class group deleted successfully.',
    }
  } catch (error) {
    console.error('Failed to delete class group:', error)

    return {
      success: false,
      message: 'Unable to delete the class group. Please try again.',
    }
  }
}
