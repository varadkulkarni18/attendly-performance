
import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { ArrowLeft, Users } from 'lucide-react'

import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  groupStudents,
} from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function ClassGroupDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await requireRole('admin')
  const { id: rawId } = await params
  const id = Number(rawId)

  if (!Number.isSafeInteger(id) || id <= 0) {
    return <p className="p-8">Invalid class group.</p>
  }

  const [group] = await db
    .select()
    .from(classGroups)
    .where(eq(classGroups.id, id))
    .limit(1)

  if (!group) {
    return (
      
        <main className="mx-auto max-w-5xl p-8">
          <h1 className="text-2xl font-semibold">
            Class group not found
          </h1>
          <Link
            href="/admin/classes"
            className="mt-4 inline-flex items-center gap-2 text-sm underline"
          >
            <ArrowLeft size={16} />
            Back to class groups
          </Link>
        </main>
      
    )
  }

  const students = await db
    .select({
      id: groupStudents.id,
      studentName: groupStudents.studentName,
      rollNo: groupStudents.rollNo,
      studentEmail: groupStudents.studentEmail,
    })
    .from(groupStudents)
    .where(eq(groupStudents.classGroupId, id))
    .orderBy(asc(groupStudents.rollNo))

  return (
    
      <main className="mx-auto w-full max-w-7xl space-y-7">
        <Link
          href="/admin/classes"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black"
        >
          <ArrowLeft size={16} />
          Back to class groups
        </Link>

        <header className="border-b border-neutral-200 pb-7">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
            Administration / Class groups
          </p>

          <h1 className="mt-4 font-display text-4xl sm:text-5xl">
            {group.name}<span className="italic">.</span>
          </h1>

          <p className="mt-3 text-sm text-neutral-600">
            {group.academicYear} · Section {group.section}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Users size={20} />
            <span className="text-sm">
              {students.length} enrolled students
            </span>
          </div>
        </header>

        <section className="overflow-hidden border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 p-5">
            <h2 className="font-display text-2xl">Students</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Student records assigned to this class group.
            </p>
          </div>

          {students.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Users
                size={28}
                className="mx-auto text-neutral-400"
              />
              <h3 className="mt-4 font-medium">
                No students added yet
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Import a student CSV when creating a class group.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead className="bg-neutral-50">
                  <tr className="font-mono text-xs uppercase tracking-wider text-neutral-500">
                    <th className="px-5 py-4 font-normal">Roll number</th>
                    <th className="px-5 py-4 font-normal">Student name</th>
                    <th className="px-5 py-4 font-normal">Email</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="px-5 py-4 text-sm font-medium">
                        {student.rollNo}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {student.studentName}
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {student.studentEmail || 'Not provided'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    
  )
}
