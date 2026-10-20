
import { asc, eq } from 'drizzle-orm'

import { TimetableManager } from '@/components/admin/timetable-manager'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { classGroups, timetableEntries, user } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function AdminTimetablePage() {
  const admin = await requireRole('admin')

  const [groups, teachers, entries] = await Promise.all([
    db
      .select({
        id: classGroups.id,
        name: classGroups.name,
        academicYear: classGroups.academicYear,
        section: classGroups.section,
      })
      .from(classGroups)
      .orderBy(asc(classGroups.academicYear), asc(classGroups.name)),

    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.role, 'teacher'))
      .orderBy(asc(user.name)),

    db
      .select({
        id: timetableEntries.id,
        classGroupId: timetableEntries.classGroupId,
        groupName: classGroups.name,
        academicYear: classGroups.academicYear,
        section: classGroups.section,
        subjectName: timetableEntries.subjectName,
        subjectCode: timetableEntries.subjectCode,
        teacherId: timetableEntries.teacherId,
        teacherName: user.name,
        teacherEmail: user.email,
        dayOfWeek: timetableEntries.dayOfWeek,
        startTime: timetableEntries.startTime,
        endTime: timetableEntries.endTime,
        room: timetableEntries.room,
        active: timetableEntries.active,
      })
      .from(timetableEntries)
      .innerJoin(
        classGroups,
        eq(timetableEntries.classGroupId, classGroups.id),
      )
      .innerJoin(user, eq(timetableEntries.teacherId, user.id))
      .orderBy(
        asc(timetableEntries.dayOfWeek),
        asc(timetableEntries.startTime),
      ),
  ])

  const activeCount = entries.filter((entry) => entry.active).length

  return (
    
      <main className="mx-auto w-full max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Administration / Academics
            </p>

            <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
              Timetable<span className="italic">.</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
              Schedule recurring lectures, assign teachers and class groups,
              and manage weekly teaching slots from one place.
            </p>
          </div>
        </header>

        <section
          aria-label="Timetable overview"
          className="grid gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-3"
        >
          <div className="bg-white p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Class groups
            </p>
            <p className="mt-5 font-display text-4xl">
              {groups.length}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Available for scheduling
            </p>
          </div>

          <div className="bg-white p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Teachers
            </p>
            <p className="mt-5 font-display text-4xl">
              {teachers.length}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Available teacher accounts
            </p>
          </div>

          <div className="bg-white p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Active timetable slots
            </p>
            <p className="mt-5 font-display text-4xl">
              {activeCount}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Recurring weekly entries
            </p>
          </div>
        </section>

        <TimetableManager
          groups={groups}
          teachers={teachers}
          entries={entries}
        />
      </main>
    
  )
}
