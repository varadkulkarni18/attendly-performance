
import dotenv from 'dotenv'
import path from 'node:path'

const envResult = dotenv.config({
  path: path.resolve(process.cwd(), '.env.local'),
})

if (envResult.error) {
  throw new Error(`Could not load .env.local: ${envResult.error.message}`)
}

async function main() {
  // Load database modules only after environment variables are available.
  const { db, pool } = await import('../lib/db')
  const { and, eq, isNull } = await import('drizzle-orm')
  const { classGroups, groupStudents } = await import('../lib/db/schema')

  const studentEmail = 'om123@gmail.com'
  const studentName = 'Om Bondarde'
  const rollNumber = 'TYA-007'

  try {
    // Find the correct class group.
    const [group] = await db
      .select({ id: classGroups.id })
      .from(classGroups)
      .where(
        and(
          eq(classGroups.name, 'TY CSE'),
          eq(classGroups.academicYear, 'Third Year'),
          eq(classGroups.section, 'A'),
        ),
      )
      .limit(1)

    if (!group) {
      throw new Error(
        'TY CSE, Third Year, Section A was not found. Run your timetable seed script first.',
      )
    }

    // Find Om Bondarde by roll number and name.
    const [student] = await db
      .select({
        id: groupStudents.id,
        name: groupStudents.studentName,
        email: groupStudents.studentEmail,
      })
      .from(groupStudents)
      .where(
        and(
          eq(groupStudents.classGroupId, group.id),
          eq(groupStudents.rollNo, rollNumber),
          eq(groupStudents.studentName, studentName),
        ),
      )
      .limit(1)

    if (!student) {
      throw new Error(
        'Om Bondarde (TYA-007) was not found. No changes were made.',
      )
    }

    // Stop if this student is already linked to the correct email.
    if (student.email?.toLowerCase() === studentEmail) {
      console.log('Student is already linked to this email.')
      return
    }

    // Never overwrite a different email.
    if (student.email) {
      throw new Error(
        `The roster record already has a different email (${student.email}). No changes were made.`,
      )
    }

    // Ensure this email isn't assigned to another roster record.
    const [existingLink] = await db
      .select({ id: groupStudents.id })
      .from(groupStudents)
      .where(eq(groupStudents.studentEmail, studentEmail))
      .limit(1)

    if (existingLink) {
      throw new Error(
        'This email is already linked to another roster record. No changes were made.',
      )
    }

    // Link only if the roster email is still NULL.
    const updated = await db
      .update(groupStudents)
      .set({ studentEmail })
      .where(
        and(
          eq(groupStudents.id, student.id),
          isNull(groupStudents.studentEmail),
        ),
      )
      .returning({ id: groupStudents.id })

    if (updated.length !== 1) {
      throw new Error(
        'The roster record changed before it could be linked. Please retry.',
      )
    }

    console.log(
      `Successfully linked ${studentName} (${rollNumber}) to ${studentEmail}.`,
    )
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Student linking failed:', error)
  process.exitCode = 1
})
