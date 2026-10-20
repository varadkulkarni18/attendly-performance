type DemoTeacher = {
  id: string
  name: string
  email: string
}

type DemoAssignment = {
  subjectCode: string
  subjectName: string
  classGroupId: number
}

/**
 * Display-only demo assignment.
 * This never changes the teacher stored in the database.
 */
export function getAdminDemoTeacher<T extends DemoTeacher>(
  assignment: DemoAssignment,
  teachers: T[],
): T | undefined {
  if (teachers.length === 0) return undefined

  const key =
    `${assignment.subjectCode.trim().toLowerCase()}::` +
    `${assignment.subjectName.trim().toLowerCase()}::` +
    `${assignment.classGroupId}`

  let hash = 0

  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }

  return teachers[hash % teachers.length]
}