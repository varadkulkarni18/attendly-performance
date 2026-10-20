
import { and, eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ClassDetails } from '@/components/teacher/class-details'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  attendanceRecords,
  classes,
  classSessions,
  enrollments,
} from '@/lib/db/schema'

interface PageProps {
  params: Promise<{ classId: string }>
}

export default async function TeacherClassDetailsPage({
  params,
}: PageProps) {
  const session = await requireRole('teacher')
  const { classId: rawClassId } = await params
  const classId = Number(rawClassId)

  if (!Number.isInteger(classId) || classId <= 0) {
    notFound()
  }

  const [classRow] = await db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
      section: classes.section,
      teacherId: classes.teacherId,
    })
    .from(classes)
    .where(
      and(
        eq(classes.id, classId),
        eq(classes.teacherId, session.user.id),
      ),
    )

  if (!classRow) {
    notFound()
  }

  const students = await db
    .select({
      id: enrollments.id,
      studentName: enrollments.studentName,
      rollNo: enrollments.rollNo,
      studentEmail: enrollments.studentEmail,
    })
    .from(enrollments)
    .where(eq(enrollments.classId, classId))
    .orderBy(enrollments.rollNo)

  const initialDate = new Date().toISOString().slice(0, 10)

  const [todaySession] = await db
    .select({ id: classSessions.id })
    .from(classSessions)
    .where(
      and(
        eq(classSessions.classId, classId),
        eq(classSessions.date, initialDate),
      ),
    )

  const initialMarks = todaySession
    ? await db
        .select({
          enrollmentId: attendanceRecords.enrollmentId,
          status: attendanceRecords.status,
        })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.sessionId, todaySession.id))
        .then((rows) =>
          rows.filter(
            (
              row,
            ): row is {
              enrollmentId: number
              status: 'present' | 'absent' | 'late' | 'excused'
            } =>
              ['present', 'absent', 'late', 'excused'].includes(row.status),
          ),
        )
    : []

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
            Teaching workspace / Class details
          </p>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
                {classRow.name}<span className="italic">.</span>
              </h1>

              <p className="mt-3 text-sm text-neutral-600">
                {classRow.code}
                {classRow.section ? ` · ${classRow.section}` : ''}
              </p>
            </div>

            <span className="border border-neutral-300 px-3 py-2 font-mono text-[10px] uppercase tracking-widest">
              {students.length} students
            </span>
          </div>
        </header>

        <div className="mt-8">
          <ClassDetails
            classId={classRow.id}
            students={students}
            initialDate={initialDate}
            initialMarks={initialMarks}
          />
        </div>
      </div>
    
  )
}
