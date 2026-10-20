
import Link from 'next/link'
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import CreateClassGroupForm from '@/components/admin/create-class-group-form'
import { ClassGroupActions } from '@/components/admin/class-group-actions'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Search,
  Users,
} from 'lucide-react'

import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  groupStudents,
  timetableEntries,
} from '@/lib/db/schema'

type SearchParams = Promise<{
  q?: string
  year?: string
}>

function Stat({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string
  value: number
  description: string
  icon: typeof Users
}) {
  return (
    <div className="bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </p>
        <Icon size={18} strokeWidth={1.5} className="text-neutral-500" />
      </div>

      <p className="mt-5 font-display text-4xl">
        {value.toLocaleString('en-IN')}
      </p>

      <p className="mt-2 text-xs text-neutral-500">{description}</p>
    </div>
  )
}

export default async function AdminClassesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const admin = await requireRole('admin')
  const params = await searchParams

  const query = params.q?.trim() ?? ''
  const selectedYear = params.year?.trim() ?? ''

  const groupConditions: SQL[] = []

  if (query) {
    const searchPattern = `%${query}%`
    const searchCondition = or(
      ilike(classGroups.name, searchPattern),
      ilike(classGroups.section, searchPattern),
      ilike(classGroups.academicYear, searchPattern),
    )

    if (searchCondition) {
      groupConditions.push(searchCondition)
    }
  }

  if (selectedYear) {
    groupConditions.push(eq(classGroups.academicYear, selectedYear))
  }

  const [
    groups,
    totalGroupsResult,
    totalStudentsResult,
    timetableResult,
    yearsResult,
  ] = await Promise.all([
    db
      .select({
        id: classGroups.id,
        name: classGroups.name,
        academicYear: classGroups.academicYear,
        section: classGroups.section,
        studentCount:
          sql<number>`count(distinct ${groupStudents.id})`.mapWith(Number),
        scheduledSubjects:
          sql<number>`count(distinct case when ${timetableEntries.active} = true then ${timetableEntries.id} end)`.mapWith(Number),
      })
      .from(classGroups)
      .leftJoin(
        groupStudents,
        eq(groupStudents.classGroupId, classGroups.id),
      )
      .leftJoin(
        timetableEntries,
        eq(timetableEntries.classGroupId, classGroups.id),
      )
      .where(
        groupConditions.length > 0
          ? and(...groupConditions)
          : undefined,
      )
      .groupBy(
        classGroups.id,
        classGroups.name,
        classGroups.academicYear,
        classGroups.section,
      )
      .orderBy(
        desc(classGroups.academicYear),
        classGroups.name,
        classGroups.section,
      ),

    db.select({ value: count() }).from(classGroups),

    db.select({ value: count() }).from(groupStudents),

    db
      .select({ value: count() })
      .from(timetableEntries)
      .where(eq(timetableEntries.active, true)),

    db
      .selectDistinct({
        academicYear: classGroups.academicYear,
      })
      .from(classGroups)
      .orderBy(desc(classGroups.academicYear)),
  ])

  const totalGroups = totalGroupsResult[0]?.value ?? 0
  const totalStudents = totalStudentsResult[0]?.value ?? 0
  const activeSlots = timetableResult[0]?.value ?? 0

  return (
    
      <main className="mx-auto w-full max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Administration / Academics
            </p>

            <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
              Classes &amp; Groups<span className="italic">.</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
              Manage class groups, understand student strength, and see which
              groups have subjects scheduled in the timetable.
            </p>
          </div>

          <Link
            href="/admin/timetable"
            className="inline-flex h-10 items-center justify-center gap-2 border border-neutral-300 px-4 text-sm transition-colors hover:border-black"
          >
            <CalendarDays size={16} strokeWidth={1.5} />
            View timetable
            <ArrowRight size={15} strokeWidth={1.5} />
          </Link>
        </header>

        <CreateClassGroupForm />

        <section
          aria-label="Class overview"
          className="grid grid-cols-1 gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-2 xl:grid-cols-3"
        >
          <Stat
            label="Class groups"
            value={totalGroups}
            description="Groups registered in Attendly"
            icon={BookOpen}
          />

          <Stat
            label="Students in groups"
            value={totalStudents}
            description="Student records assigned to class groups"
            icon={GraduationCap}
          />

          <Stat
            label="Scheduled subject slots"
            value={activeSlots}
            description="Active timetable entries across all groups"
            icon={CalendarDays}
          />
        </section>

        <section className="overflow-hidden border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="font-display text-2xl">
                  All class groups
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {groups.length} {groups.length === 1 ? 'group' : 'groups'}
                  {query || selectedYear
                    ? ' match your filters'
                    : ' available'}
                </p>
              </div>

              <form
                action="/admin/classes"
                method="get"
                className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl"
              >
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Search class groups</span>

                  <Search
                    size={16}
                    strokeWidth={1.5}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />

                  <input
                    type="search"
                    name="q"
                    defaultValue={query}
                    placeholder="Search name, section or year"
                    className="h-10 w-full rounded-none border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-neutral-200"
                  />
                </label>

                <label>
                  <span className="sr-only">Filter by academic year</span>

                  <select
                    name="year"
                    defaultValue={selectedYear}
                    className="h-10 w-full rounded-none border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-black sm:w-40"
                  >
                    <option value="">All academic years</option>
                    {yearsResult.map(({ academicYear }) => (
                      <option key={academicYear} value={academicYear}>
                        {academicYear}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="h-10 border border-neutral-300 px-4 text-sm transition-colors hover:border-black"
                >
                  Search
                </button>

                {(query || selectedYear) && (
                  <Link
                    href="/admin/classes"
                    className="inline-flex h-10 items-center justify-center px-3 text-sm text-neutral-500 transition-colors hover:text-black"
                  >
                    Clear
                  </Link>
                )}
              </form>
            </div>
          </div>

          {groups.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50">
                      <th className="px-6 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-neutral-500">
                        Class group
                      </th>
                      <th className="px-6 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-neutral-500">
                        Academic year
                      </th>
                      <th className="px-6 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-neutral-500">
                        Students
                      </th>
                      <th className="px-6 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-neutral-500">
                        Scheduled subjects
                      </th>
                      <th className="px-6 py-3 text-right font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-neutral-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-100">
                    {groups.map((group) => (
                      <tr
                        key={group.id}
                        className="transition-colors hover:bg-neutral-50/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200 bg-white text-sm text-neutral-700">
                              {group.name.trim().charAt(0).toUpperCase() || 'C'}
                            </div>

                            <div>
                              <p>{group.name}</p>
                              <p className="mt-1 text-sm text-neutral-500">
                                Section {group.section}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {group.academicYear}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 text-sm text-neutral-700">
                            <Users
                              size={15}
                              strokeWidth={1.5}
                              className="text-neutral-400"
                            />
                            {group.studentCount}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {group.scheduledSubjects}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Link
                              href={`/admin/classes/${group.id}`}
                              className="inline-flex h-9 items-center gap-1 px-3 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-black"
                            >
                              View
                              <ArrowRight size={14} strokeWidth={1.5} />
                            </Link>

                            <ClassGroupActions group={group} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-neutral-100 md:hidden">
                {groups.map((group) => (
                  <article key={group.id} className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200 text-sm text-neutral-700">
                          {group.name.trim().charAt(0).toUpperCase() || 'C'}
                        </div>

                        <div>
                          <h3>{group.name}</h3>
                          <p className="mt-1 text-sm text-neutral-500">
                            Section {group.section}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/admin/classes/${group.id}`}
                        aria-label={`View ${group.name}`}
                        className="border border-neutral-200 p-2 text-neutral-600 transition-colors hover:bg-neutral-50"
                      >
                        <ArrowRight size={16} strokeWidth={1.5} />
                      </Link>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-t border-neutral-100 pt-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                          Year
                        </p>
                        <p className="mt-1 text-sm text-neutral-800">
                          {group.academicYear}
                        </p>
                      </div>

                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                          Students
                        </p>
                        <p className="mt-1 text-sm text-neutral-800">
                          {group.studentCount}
                        </p>
                      </div>

                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                          Subjects
                        </p>
                        <p className="mt-1 text-sm text-neutral-800">
                          {group.scheduledSubjects}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-neutral-100 pt-3">
                      <ClassGroupActions group={group} />
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center border border-neutral-200 text-neutral-500">
                <BookOpen size={21} strokeWidth={1.4} />
              </div>

              <h3 className="mt-4 font-display text-xl">
                {query || selectedYear
                  ? 'No matching class groups'
                  : 'No class groups yet'}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                {query || selectedYear
                  ? 'Try another search term or clear the filters to see all groups.'
                  : 'Class groups will appear here once they have been added to Attendly.'}
              </p>

              {(query || selectedYear) && (
                <Link
                  href="/admin/classes"
                  className="mt-4 inline-flex h-9 items-center border border-neutral-200 px-3 text-sm text-neutral-700 transition-colors hover:border-black"
                >
                  Clear filters
                </Link>
              )}
            </div>
          )}

          <footer className="flex flex-col gap-2 border-t border-neutral-200 bg-neutral-50/30 px-5 py-4 font-mono text-[10px] leading-5 text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              Showing {groups.length} of {totalGroups} class groups
            </span>
            <span>Student totals reflect class-group records.</span>
          </footer>
        </section>
      </main>
    
  )
}
