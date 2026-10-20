import 'server-only'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { attendanceRecords, classes, classSessions, enrollments, user } from '@/lib/db/schema'
import type { AttendanceStatus } from '@/lib/attendance'
import type { CurrentUser } from '@/lib/session'

const countStatus = (status: AttendanceStatus) =>
  sql<number>`count(${attendanceRecords.id}) filter (where ${attendanceRecords.status} = ${status})`.mapWith(Number)

const statusCounts = {
  present: countStatus('present'),
  absent: countStatus('absent'),
  late: countStatus('late'),
  excused: countStatus('excused'),
}

export type Counts = { present: number; absent: number; late: number; excused: number }

export async function getClassesWithStats(teacherId?: string) {
  const base = db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
      section: classes.section,
      teacherId: classes.teacherId,
      teacherName: user.name,
      students: sql<number>`(select count(*) from ${enrollments} where ${enrollments.classId} = ${classes.id})`.mapWith(
        Number,
      ),
      sessions: sql<number>`(select count(*) from ${classSessions} where ${classSessions.classId} = ${classes.id})`.mapWith(
        Number,
      ),
      lastSession: sql<
        string | null
      >`(select max(${classSessions.date})::text from ${classSessions} where ${classSessions.classId} = ${classes.id})`,
      ...statusCounts,
    })
    .from(classes)
    .leftJoin(user, eq(user.id, classes.teacherId))
    .leftJoin(classSessions, eq(classSessions.classId, classes.id))
    .leftJoin(attendanceRecords, eq(attendanceRecords.sessionId, classSessions.id))
    .groupBy(classes.id, user.name)
    .orderBy(desc(classes.createdAt))

  return teacherId ? base.where(eq(classes.teacherId, teacherId)) : base
}

export async function getAccessibleClass(classId: number, current: CurrentUser) {
  if (!Number.isInteger(classId)) return null
  const [row] = await db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
      section: classes.section,
      teacherId: classes.teacherId,
      teacherName: user.name,
    })
    .from(classes)
    .leftJoin(user, eq(user.id, classes.teacherId))
    .where(eq(classes.id, classId))
  if (!row) return null
  if (current.role !== 'admin' && row.teacherId !== current.id) return null
  return row
}

export async function getRosterWithStats(classId: number) {
  return db
    .select({
      id: enrollments.id,
      studentName: enrollments.studentName,
      rollNo: enrollments.rollNo,
      studentEmail: enrollments.studentEmail,
      ...statusCounts,
    })
    .from(enrollments)
    .leftJoin(attendanceRecords, eq(attendanceRecords.enrollmentId, enrollments.id))
    .where(eq(enrollments.classId, classId))
    .groupBy(enrollments.id)
    .orderBy(asc(enrollments.rollNo))
}

export async function getMarksForDate(classId: number, date: string) {
  const rows = await db
    .select({ enrollmentId: attendanceRecords.enrollmentId, status: attendanceRecords.status })
    .from(attendanceRecords)
    .innerJoin(classSessions, eq(classSessions.id, attendanceRecords.sessionId))
    .where(and(eq(classSessions.classId, classId), eq(classSessions.date, date)))
  return Object.fromEntries(rows.map((r) => [r.enrollmentId, r.status as AttendanceStatus])) as Record<
    number,
    AttendanceStatus
  >
}

export async function getRecentSessions(classId: number, limit = 8) {
  return db
    .select({
      id: classSessions.id,
      date: sql<string>`${classSessions.date}::text`,
      ...statusCounts,
    })
    .from(classSessions)
    .leftJoin(attendanceRecords, eq(attendanceRecords.sessionId, classSessions.id))
    .where(eq(classSessions.classId, classId))
    .groupBy(classSessions.id)
    .orderBy(desc(classSessions.date))
    .limit(limit)
}

export async function getStudentClasses(email: string) {
  return db
    .select({
      enrollmentId: enrollments.id,
      rollNo: enrollments.rollNo,
      classId: classes.id,
      name: classes.name,
      code: classes.code,
      section: classes.section,
      teacherName: user.name,
      ...statusCounts,
    })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .leftJoin(user, eq(user.id, classes.teacherId))
    .leftJoin(attendanceRecords, eq(attendanceRecords.enrollmentId, enrollments.id))
    .where(sql`lower(${enrollments.studentEmail}) = lower(${email})`)
    .groupBy(enrollments.id, classes.id, user.name)
    .orderBy(asc(classes.code))
}

export async function getStudentHistory(email: string, limit = 12) {
  return db
    .select({
      id: attendanceRecords.id,
      status: attendanceRecords.status,
      date: sql<string>`${classSessions.date}::text`,
      code: classes.code,
      name: classes.name,
    })
    .from(attendanceRecords)
    .innerJoin(enrollments, eq(enrollments.id, attendanceRecords.enrollmentId))
    .innerJoin(classSessions, eq(classSessions.id, attendanceRecords.sessionId))
    .innerJoin(classes, eq(classes.id, classSessions.classId))
    .where(sql`lower(${enrollments.studentEmail}) = lower(${email})`)
    .orderBy(desc(classSessions.date), asc(classes.code))
    .limit(limit)
}

export async function getAllUsers() {
  return db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
    .from(user)
    .orderBy(asc(user.role), asc(user.name))
}

export async function getTeachers() {
  return db.select({ id: user.id, name: user.name }).from(user).where(eq(user.role, 'teacher')).orderBy(asc(user.name))
}

export async function getInstitutionTotals() {
  const [totals] = await db
    .select({
      users: sql<number>`(select count(*) from ${user})`.mapWith(Number),
      students: sql<number>`(select count(*) from ${user} where ${user.role} = 'student')`.mapWith(Number),
      teachers: sql<number>`(select count(*) from ${user} where ${user.role} = 'teacher')`.mapWith(Number),
      classes: sql<number>`(select count(*) from ${classes})`.mapWith(Number),
      sessions: sql<number>`(select count(*) from ${classSessions})`.mapWith(Number),
      ...statusCounts,
    })
    .from(attendanceRecords)
  return totals
}
