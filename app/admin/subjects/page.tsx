import Link from 'next/link'
import { asc, eq, sql } from 'drizzle-orm'
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  Search,
  UserRound,
  Layers3,
  MapPin,
} from 'lucide-react'

import { AddSubjectButton, DeleteSubjectButton } from '@/components/admin/subject-catalogue-controls'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  groupStudents,
  timetableEntries,
  user,
} from '@/lib/db/schema'

type SearchParams = Promise<{
  q?: string
  status?: string
  group?: string
  teacher?: string
  weekday?: string
}>

const DAYS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

function formatTime(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)

  if (!Number.isFinite(hour) || !minuteText || !Number.isFinite(Number(minuteText))) {
    return value
  }

  return `${hour % 12 || 12}:${minuteText} ${hour >= 12 ? 'PM' : 'AM'}`
}

function getDemoTeacherIndex(
  subjectCode: string,
  subjectName: string,
  classGroupId: number,
  teacherCount: number,
) {
  if (teacherCount === 0) return -1

  const key =
    `${subjectCode.trim().toLowerCase()}::` +
    `${subjectName.trim().toLowerCase()}::${classGroupId}`

  let hash = 0

  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }

  return hash % teacherCount
}

function Stat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: number
  detail: string
  icon: typeof BookOpen
}) {
  return (
    <div className="flex min-h-[148px] flex-col bg-white p-4 sm:p-5">
      <div className="flex min-h-8 items-start justify-between gap-3">
        <p className="max-w-[85%] font-mono text-[10px] uppercase leading-5 tracking-[0.16em] text-neutral-500">
          {label}
        </p>
        <Icon size={16} strokeWidth={1.5} className="shrink-0 text-neutral-400" />
      </div>
      <p className="mt-3 font-display text-4xl leading-none tabular-nums tracking-tight text-neutral-950">
        {value.toLocaleString('en-IN')}
      </p>
      <p className="mt-3 text-xs leading-5 text-neutral-500">{detail}</p>
    </div>
  )
}

export default async function AdminSubjectsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const admin = await requireRole('admin')
  const params = await searchParams

  const query = params.q?.trim() ?? ''
  const requestedStatus = params.status ?? 'all'
  const selectedStatus = ['all', 'active', 'inactive'].includes(requestedStatus)
    ? requestedStatus
    : 'all'
  const selectedGroup = params.group?.trim() || 'all'
  const selectedTeacher = params.teacher?.trim() || 'all'
  const requestedWeekday = params.weekday?.trim() || 'all'
  const selectedWeekday = ['0', '1', '2', '3', '4', '5', '6'].includes(requestedWeekday)
    ? requestedWeekday
    : 'all'

  const [
    entries,
    allTeachers,
    allGroups,
    totalAssignmentsResult,
    activeAssignmentsResult,
  ] = await Promise.all([
    db
      .select({
        id: timetableEntries.id,
        subjectName: timetableEntries.subjectName,
        subjectCode: timetableEntries.subjectCode,
        active: timetableEntries.active,
        dayOfWeek: timetableEntries.dayOfWeek,
        startTime: timetableEntries.startTime,
        endTime: timetableEntries.endTime,
        room: timetableEntries.room,
        teacherId: user.id,
        teacherName: user.name,
        teacherEmail: user.email,
        groupId: classGroups.id,
        groupName: classGroups.name,
        academicYear: classGroups.academicYear,
        section: classGroups.section,
        studentCount: sql<number>`(
          select count(*)
          from ${groupStudents}
          where ${groupStudents.classGroupId} = ${classGroups.id}
        )`.mapWith(Number),
      })
      .from(timetableEntries)
      .innerJoin(classGroups, eq(timetableEntries.classGroupId, classGroups.id))
      .innerJoin(user, eq(timetableEntries.teacherId, user.id))
      .orderBy(
        asc(timetableEntries.subjectName),
        asc(timetableEntries.dayOfWeek),
        asc(timetableEntries.startTime),
      ),

    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.role, 'teacher'))
      .orderBy(asc(user.name)),

    db
      .select({
        id: classGroups.id,
        name: classGroups.name,
        academicYear: classGroups.academicYear,
        section: classGroups.section,
      })
      .from(classGroups)
      .orderBy(asc(classGroups.name)),

    db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(timetableEntries),

    db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(timetableEntries)
      .where(eq(timetableEntries.active, true)),
  ])

  type Entry = (typeof entries)[number]

  // Demo teacher display is limited to this admin-facing catalogue.
  const displayEntries = entries.map((entry) => {
    const index = getDemoTeacherIndex(
      entry.subjectCode,
      entry.subjectName,
      entry.groupId,
      allTeachers.length,
    )
    const demoTeacher = index >= 0 ? allTeachers[index] : undefined

    return {
      ...entry,
      displayTeacherId: demoTeacher?.id || entry.teacherId,
      displayTeacherName: demoTeacher?.name || entry.teacherName,
      displayTeacherEmail: demoTeacher?.email || entry.teacherEmail,
    }
  })

  // Apply every catalogue filter to the same displayed assignment dataset.
  // This is important because the catalogue deliberately displays demo-mapped
  // teachers; filtering the SQL join by the original teacherId made the
  // visible teacher and the filter disagree.
  const normalizedQuery = query.toLocaleLowerCase().trim()
  const filteredEntries = displayEntries.filter((entry) => {
    if (selectedGroup !== 'all' && String(entry.groupId) !== selectedGroup) return false
    if (selectedTeacher !== 'all' && entry.displayTeacherId !== selectedTeacher) return false
    if (selectedWeekday !== 'all' && entry.dayOfWeek !== Number(selectedWeekday)) return false
    if (selectedStatus === 'active' && !entry.active) return false
    if (selectedStatus === 'inactive' && entry.active) return false

    if (normalizedQuery) {
      const searchable = [
        entry.subjectName,
        entry.subjectCode,
        entry.displayTeacherName,
        entry.displayTeacherEmail,
        entry.room,
        entry.groupName,
        entry.section,
        entry.academicYear,
        `${entry.groupName} ${entry.section}`,
        `${entry.academicYear} ${entry.groupName} ${entry.section}`,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()

      if (!searchable.includes(normalizedQuery)) return false
    }

    return true
  })

  const subjectMap = new Map<
    string,
    {
      subjectName: string
      subjectCode: string
      assignments: (Entry & {
        displayTeacherName: string
        displayTeacherEmail: string
      })[]
    }
  >()

  for (const entry of filteredEntries) {
    const key =
      `${entry.subjectCode.trim().toLowerCase()}::` +
      entry.subjectName.trim().toLowerCase()

    const existing = subjectMap.get(key)

    if (existing) {
      existing.assignments.push(entry)
    } else {
      subjectMap.set(key, {
        subjectName: entry.subjectName,
        subjectCode: entry.subjectCode,
        assignments: [entry],
      })
    }
  }

  const subjects = Array.from(subjectMap.values()).map((subject) => {
    const activeAssignments = subject.assignments.filter((entry) => entry.active)
    const uniqueGroups = new Map<number, (typeof subject.assignments)[number]>()
    const uniqueTeachers = new Map<string, (typeof subject.assignments)[number]>()

    for (const assignment of subject.assignments) {
      uniqueGroups.set(assignment.groupId, assignment)
      uniqueTeachers.set(
        `${assignment.displayTeacherName}::${assignment.displayTeacherEmail}`,
        assignment,
      )
    }

    return {
      ...subject,
      activeAssignments,
      active: activeAssignments.length > 0,
      groups: Array.from(uniqueGroups.values()),
      teachers: Array.from(uniqueTeachers.values()),
    }
  })

  const totalAssignments = totalAssignmentsResult[0]?.value ?? 0
  const activeAssignmentsCount = activeAssignmentsResult[0]?.value ?? 0
  const activeSubjectCount = new Set(
    displayEntries.filter((entry) => entry.active).map((entry) => `${entry.subjectCode.trim().toLowerCase()}::${entry.subjectName.trim().toLowerCase()}`),
  ).size

  const teacherCount = new Set(
    displayEntries
      .filter((entry) => entry.active)
      .map((entry) => `${entry.displayTeacherName}::${entry.displayTeacherEmail}`),
  ).size

  const groupCount = new Set(
    displayEntries.filter((entry) => entry.active).map((entry) => entry.groupId),
  ).size

  const filteredAssignmentCount = filteredEntries.length

  const teacherOptions = allTeachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.name || teacher.email,
    email: teacher.email,
  }))

  const groupOptions = allGroups.map((group) => ({
    id: group.id,
    name: group.name,
    academicYear: group.academicYear,
    section: group.section,
  }))

  return (
    
      <main className="mx-auto w-full max-w-7xl space-y-7 pb-10">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Administration / Academics
            </p>
            <h1 className="mt-4 font-display text-4xl tracking-tight text-neutral-950 sm:text-5xl">
              Subjects<span className="italic">.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
              Explore subjects, assigned teachers, class groups and weekly timetable slots.
            </p>
          </div>

          <Link
            href="/admin/timetable"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-neutral-300 px-4 text-sm text-neutral-900 transition hover:border-neutral-950 hover:bg-neutral-50"
          >
            <CalendarDays size={16} strokeWidth={1.5} />
            Open timetable
            <ArrowUpRight size={15} strokeWidth={1.5} />
          </Link>
        </header>

        <section
          aria-label="Subject overview"
          className="grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 xl:grid-cols-4"
        >
          <Stat
            label="Active subjects"
            value={activeSubjectCount}
            detail="Subjects with at least one active slot"
            icon={BookOpen}
          />
          <Stat
            label="Scheduled assignments"
            value={activeAssignmentsCount}
            detail="Active subject and class-group slots"
            icon={CalendarDays}
          />
          <Stat
            label="Teachers involved"
            value={teacherCount}
            detail="Teachers shown across active assignments"
            icon={UserRound}
          />
          <Stat
            label="Class groups covered"
            value={groupCount}
            detail="Groups with active timetable slots"
            icon={GraduationCap}
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Academic directory
              </p>
              <h2 className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
                Subject catalogue
              </h2>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                Search across subjects, teachers, classes and weekly schedules.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
              <p className="text-sm text-neutral-500">
                <span className="font-display text-xl text-neutral-950">
                  {subjects.length}
                </span>{' '}
                {subjects.length === 1 ? 'subject' : 'subjects'} shown
              </p>
              <AddSubjectButton teachers={teacherOptions} groups={groupOptions} />
            </div>
          </div>

          <form
            action="/admin/subjects"
            method="GET"
            className="grid grid-cols-1 gap-3 border border-neutral-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(240px,1.6fr)_minmax(160px,1fr)_minmax(190px,1.15fr)_minmax(155px,0.9fr)_minmax(155px,0.9fr)_minmax(190px,auto)] 2xl:items-center"
          >
            <label className="relative block">
              <span className="sr-only">Search subjects, codes, teachers, or class groups</span>
              <Search
                size={16}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search subject, code, teacher, room or group..."
                className="h-10 w-full border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500"
              />
            </label>

            <label>
              <span className="sr-only">Assignment status</span>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-500"
              >
                <option value="all">All assignments</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>

            <label>
              <span className="sr-only">Class group</span>
              <select
                name="group"
                defaultValue={selectedGroup}
                className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-500"
              >
                <option value="all">All class groups</option>
                {allGroups.map((group) => (
                  <option key={group.id} value={String(group.id)}>
                    {group.name} · {group.section} ({group.academicYear})
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Teacher</span>
              <select
                name="teacher"
                defaultValue={selectedTeacher}
                className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-500"
              >
                <option value="all">All teachers</option>
                {allTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name || teacher.email}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Weekday</span>
              <select
                name="weekday"
                defaultValue={selectedWeekday}
                className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-500"
              >
                <option value="all">All weekdays</option>
                {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                  <option key={day} value={String(day)}>{DAYS[day]}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-3 2xl:col-span-1">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 bg-neutral-950 px-4 text-sm text-white transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
              >
                <Search size={15} strokeWidth={1.7} />
                Search
              </button>

              <a
                href="/admin/subjects"
                className="inline-flex h-10 w-full items-center justify-center border border-neutral-300 bg-white px-4 text-sm text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
              >
                Reset
              </a>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Layers3 size={14} strokeWidth={1.5} />
              <span>
                {filteredAssignmentCount.toLocaleString('en-IN')} matching{' '}
                {filteredAssignmentCount === 1 ? 'assignment' : 'assignments'}
              </span>
              <span className="hidden sm:inline">
                · {totalAssignments.toLocaleString('en-IN')} total slots
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  selectedStatus === 'inactive' ? 'bg-neutral-400' : 'bg-emerald-600'
                }`}
              />
              {selectedStatus === 'all'
                ? 'All statuses'
                : selectedStatus === 'active'
                  ? 'Active assignments'
                  : 'Inactive assignments'}
            </div>
          </div>

          {subjects.length > 0 ? (
            <div className="overflow-hidden border border-neutral-200 bg-white">
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead className="border-b border-neutral-200 bg-neutral-50">
                    <tr>
                      {[
                        'Subject',
                        'Assigned teachers',
                        'Class groups',
                        'Weekly schedule',
                        'Status',
                        'Slots',
                        'Actions',
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-neutral-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-100">
                    {subjects.map((subject) => (
                      <tr
                        key={`${subject.subjectCode}-${subject.subjectName}`}
                        className="align-top transition-colors hover:bg-neutral-50/70"
                      >
                        <td className="max-w-[230px] px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50">
                              <BookOpen size={16} strokeWidth={1.5} className="text-neutral-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="break-words text-sm font-medium text-neutral-950">
                                {subject.subjectName}
                              </p>
                              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                                {subject.subjectCode}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="max-w-[220px] px-4 py-4">
                          <div className="space-y-2">
                            {subject.teachers.map((teacher) => (
                              <div
                                key={`${teacher.displayTeacherName}-${teacher.displayTeacherEmail}`}
                                className="flex min-w-0 items-center gap-2"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-[10px] text-neutral-700">
                                  {(teacher.displayTeacherName || teacher.displayTeacherEmail)
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-xs text-neutral-800">
                                    {teacher.displayTeacherName || 'Unnamed teacher'}
                                  </p>
                                  <p className="truncate text-[11px] text-neutral-500">
                                    {teacher.displayTeacherEmail}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="max-w-[180px] px-4 py-4">
                          <div className="space-y-2">
                            {subject.groups.map((group) => (
                              <div key={group.groupId}>
                                <p className="text-xs text-neutral-800">
                                  {group.groupName}
                                  {group.section ? ` · ${group.section}` : ''}
                                </p>
                                <p className="mt-0.5 text-[11px] text-neutral-500">
                                  {group.academicYear} · {group.studentCount}{' '}
                                  {group.studentCount === 1 ? 'student' : 'students'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="max-w-[230px] px-4 py-4">
                          <div className="space-y-2">
                            {subject.assignments.map((assignment) => (
                              <div key={assignment.id} className="flex items-start gap-2">
                                <CalendarDays
                                  size={13}
                                  strokeWidth={1.5}
                                  className="mt-0.5 shrink-0 text-neutral-400"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs text-neutral-800">
                                    {DAYS[assignment.dayOfWeek] ?? `Day ${assignment.dayOfWeek}`}
                                    <span className="text-neutral-400"> · </span>
                                    <span className="tabular-nums">
                                      {formatTime(assignment.startTime)}–{formatTime(assignment.endTime)}
                                    </span>
                                  </p>
                                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
                                    <MapPin size={11} strokeWidth={1.5} />
                                    {assignment.room || 'Room not set'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${
                              subject.active
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                subject.active ? 'bg-emerald-600' : 'bg-neutral-400'
                              }`}
                            />
                            {subject.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <p className="font-display text-xl tabular-nums text-neutral-950">
                            {subject.assignments.length}
                          </p>
                          <p className="mt-1 text-[11px] text-neutral-500">
                            {subject.activeAssignments.length} active
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <DeleteSubjectButton
                            subject={{
                              subjectName: subject.subjectName,
                              subjectCode: subject.subjectCode,
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-neutral-100 lg:hidden">
                {subjects.map((subject) => (
                  <article
                    key={`${subject.subjectCode}-${subject.subjectName}`}
                    className="space-y-4 p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50">
                          <BookOpen size={16} strokeWidth={1.5} className="text-neutral-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="break-words font-display text-lg leading-snug text-neutral-950">
                            {subject.subjectName}
                          </h3>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                            {subject.subjectCode}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${
                          subject.active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            subject.active ? 'bg-emerald-600' : 'bg-neutral-400'
                          }`}
                        />
                        {subject.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-y border-neutral-100 py-3">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-500">
                          Groups
                        </p>
                        <p className="mt-1 font-display text-xl tabular-nums text-neutral-950">
                          {subject.groups.length}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-500">
                          Teachers
                        </p>
                        <p className="mt-1 font-display text-xl tabular-nums text-neutral-950">
                          {subject.teachers.length}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-500">
                          Active slots
                        </p>
                        <p className="mt-1 font-display text-xl tabular-nums text-neutral-950">
                          {subject.activeAssignments.length}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="min-w-0">
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                          Teachers
                        </p>
                        <div className="space-y-2">
                          {subject.teachers.map((teacher) => (
                            <div
                              key={`${teacher.displayTeacherName}-${teacher.displayTeacherEmail}`}
                              className="flex min-w-0 items-center gap-2"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-[10px] text-neutral-700">
                                {(teacher.displayTeacherName || teacher.displayTeacherEmail)
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-xs text-neutral-800">
                                  {teacher.displayTeacherName || 'Unnamed teacher'}
                                </p>
                                <p className="truncate text-[11px] text-neutral-500">
                                  {teacher.displayTeacherEmail}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                          Class groups
                        </p>
                        <div className="space-y-2">
                          {subject.groups.map((group) => (
                            <div key={group.groupId}>
                              <p className="text-xs text-neutral-800">
                                {group.groupName}
                                {group.section ? ` · ${group.section}` : ''}
                              </p>
                              <p className="mt-0.5 text-[11px] text-neutral-500">
                                {group.academicYear} · {group.studentCount}{' '}
                                {group.studentCount === 1 ? 'student' : 'students'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-neutral-100 pt-3">
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                        Weekly schedule
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {subject.assignments.map((assignment) => (
                          <div key={assignment.id} className="flex items-start gap-2">
                            <Clock3
                              size={13}
                              strokeWidth={1.5}
                              className="mt-0.5 shrink-0 text-neutral-400"
                            />
                            <div>
                              <p className="text-xs text-neutral-800">
                                {DAYS[assignment.dayOfWeek] ?? `Day ${assignment.dayOfWeek}`}
                                {' · '}
                                {formatTime(assignment.startTime)}–{formatTime(assignment.endTime)}
                              </p>
                              <p className="mt-0.5 text-[11px] text-neutral-500">
                                {assignment.groupName}
                                {assignment.room ? ` · ${assignment.room}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                      <p className="text-xs text-neutral-500">
                        {subject.assignments.length}{' '}
                        {subject.assignments.length === 1 ? 'slot' : 'slots'} ·{' '}
                        {subject.activeAssignments.length} active
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href="/admin/timetable"
                          className="inline-flex items-center gap-1.5 text-xs text-neutral-800 transition hover:text-neutral-500"
                        >
                          View timetable
                          <ArrowUpRight size={13} strokeWidth={1.5} />
                        </Link>
                        <DeleteSubjectButton
                          subject={{
                            subjectName: subject.subjectName,
                            subjectCode: subject.subjectCode,
                          }}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-neutral-200 bg-white px-5 py-14 text-center sm:px-8">
              <div className="mx-auto flex h-11 w-11 items-center justify-center border border-neutral-200 bg-neutral-50">
                <BookOpen size={19} strokeWidth={1.5} className="text-neutral-500" />
              </div>

              <h3 className="mt-4 font-display text-xl text-neutral-950">
                {query || selectedStatus !== 'all' || selectedGroup !== 'all' || selectedTeacher !== 'all' || selectedWeekday !== 'all'
                  ? 'No matching subjects'
                  : 'No subjects in the timetable yet'}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">
                {query || selectedStatus !== 'all' || selectedGroup !== 'all' || selectedTeacher !== 'all' || selectedWeekday !== 'all'
                  ? 'Try changing your search or one of the assignment filters.'
                  : 'Use Add subject to assign a subject to a class group and timetable slot.'}
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {(query || selectedStatus !== 'all' || selectedGroup !== 'all' || selectedTeacher !== 'all' || selectedWeekday !== 'all') && (
                  <Link
                    href="/admin/subjects"
                    className="inline-flex h-10 items-center justify-center border border-neutral-300 px-4 text-sm text-neutral-800 transition hover:bg-neutral-50"
                  >
                    Clear filters
                  </Link>
                )}
                <Link
                  href="/admin/timetable"
                  className="inline-flex h-10 items-center justify-center gap-2 bg-neutral-950 px-4 text-sm text-white transition hover:bg-neutral-800"
                >
                  <CalendarDays size={15} strokeWidth={1.5} />
                  Go to timetable
                </Link>
              </div>
            </div>
          )}
        </section>

        <footer className="flex flex-col gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-neutral-500">
            Subject information comes from timetable assignments. Deleting a subject
            with attendance history deactivates its assignments to preserve records.
          </p>
          <Link
            href="/admin/classes"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs text-neutral-600 transition hover:text-neutral-950"
          >
            Browse classes &amp; groups
            <ArrowUpRight size={13} strokeWidth={1.5} />
          </Link>
        </footer>
      </main>
    
  )
}