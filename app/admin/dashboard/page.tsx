
import Link from 'next/link'
import { count, eq } from 'drizzle-orm'
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Users,
} from 'lucide-react'

import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import {
  classGroups,
  timetableEntries,
  user,
} from '@/lib/db/schema'

async function getAdminStats() {
  const [
    teachers,
    studentAccounts,
    classGroupCount,
    timetableCount,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(user)
      .where(eq(user.role, 'teacher')),

    db
      .select({ value: count() })
      .from(user)
      .where(eq(user.role, 'student')),

    db
      .select({ value: count() })
      .from(classGroups),

    db
      .select({ value: count() })
      .from(timetableEntries)
      .where(eq(timetableEntries.active, true)),
  ])

  return {
    teachers: teachers[0]?.value ?? 0,
    studentAccounts: studentAccounts[0]?.value ?? 0,
    classGroups: classGroupCount[0]?.value ?? 0,
    activeTimetableEntries: timetableCount[0]?.value ?? 0,
  }
}

const quickLinks = [
  {
    number: '01',
    title: 'Users',
    description: 'View teacher and student accounts.',
    href: '/admin/users',
    icon: Users,
  },
  {
    number: '02',
    title: 'Classes & Groups',
    description: 'Organize class groups and their students.',
    href: '/admin/classes',
    icon: GraduationCap,
  },
  {
    number: '03',
    title: 'Subjects',
    description: 'Review subjects and their assigned teachers.',
    href: '/admin/subjects',
    icon: BookOpen,
  },
  {
    number: '04',
    title: 'Timetable',
    description: 'Review and manage the teaching schedule.',
    href: '/admin/timetable',
    icon: CalendarDays,
  },
  {
    number: '05',
    title: 'Attendance',
    description: 'Review attendance records and reports.',
    href: '/admin/attendance',
    icon: ClipboardCheck,
  },
]

function Stat({
  label,
  value,
  detail,
  icon: Icon,
  href,
}: {
  label: string
  value: number
  detail: string
  icon: typeof Users
  href: string
}) {
  return (
    <Link
      href={href}
      className="group block border border-neutral-300 p-5 transition-colors hover:border-black sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
          {label}
        </p>

        <Icon
          size={18}
          strokeWidth={1.5}
          className="text-neutral-500 transition-colors group-hover:text-black"
        />
      </div>

      <p className="mt-6 font-display text-4xl tracking-tight tabular-nums">
        {value.toLocaleString('en-IN')}
      </p>

      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        {detail}
      </p>

      <span className="mt-5 inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors group-hover:text-black">
        View details
        <ArrowUpRight size={13} />
      </span>
    </Link>
  )
}

export default async function AdminDashboardPage() {
  const session = await requireRole('admin')
  const stats = await getAdminStats()

  return (
    
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-neutral-200 pb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Administration / Overview
          </p>

          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
            Good to have you back<span className="italic">.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
            Manage your institution, organize classes, coordinate
            teaching schedules, and oversee attendance from one place.
          </p>
        </header>

        <section className="mt-8 border-2 border-black p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Signed-in administrator
              </p>

              <h2 className="mt-3 font-display text-2xl">
                {session.user.name || 'Administrator'}
              </h2>

              <p className="mt-1 text-sm text-neutral-600">
                {session.user.email}
              </p>
            </div>

            <Link
              href="/admin/profile"
              className="inline-flex w-fit items-center gap-2 border border-black px-4 py-3 text-sm transition-colors hover:bg-black hover:text-white"
            >
              View profile
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 border border-neutral-300 px-3 py-2 font-mono text-[10px] uppercase tracking-widest">
            <span className="size-1.5 bg-black" />
            Administrator access
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Institution overview
              </p>

              <h2 className="mt-2 font-display text-2xl">
                Your workspace, at a glance
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600">
                A quick overview of the people, classes, and teaching
                schedules currently configured in Attendly.
              </p>
            </div>

            <p className="text-xs text-neutral-500">
              Updated when this page loads
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Teachers"
              value={stats.teachers}
              detail="Registered teacher accounts."
              icon={Users}
              href="/admin/users"
            />

            <Stat
              label="Student accounts"
              value={stats.studentAccounts}
              detail="Students with an Attendly login."
              icon={GraduationCap}
              href="/admin/users"
            />

            <Stat
              label="Class groups"
              value={stats.classGroups}
              detail="Groups configured for the timetable."
              icon={BookOpen}
              href="/admin/classes"
            />

            <Stat
              label="Scheduled subjects"
              value={stats.activeTimetableEntries}
              detail="Active subject slots in the timetable."
              icon={CalendarDays}
              href="/admin/timetable"
            />
          </div>
        </section>

        <section className="mt-12">
          <div className="border-b border-neutral-200 pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Workspace
            </p>

            <h2 className="mt-2 font-display text-2xl">
              Administration shortcuts
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Jump directly to the area you want to manage.
            </p>
          </div>

          <div className="mt-2">
            {quickLinks.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group grid grid-cols-[36px_minmax(0,1fr)_24px] items-center gap-3 border-b border-neutral-200 py-5 transition-colors hover:bg-neutral-50 sm:grid-cols-[44px_minmax(0,1fr)_24px] sm:gap-4"
                >
                  <span className="font-mono text-xs text-neutral-400">
                    {item.number}
                  </span>

                  <span className="flex min-w-0 items-start gap-3">
                    <Icon
                      size={20}
                      strokeWidth={1.5}
                      className="mt-1 shrink-0 text-neutral-500"
                    />

                    <span className="min-w-0">
                      <span className="block font-display text-xl">
                        {item.title}
                      </span>

                      <span className="mt-1 block text-sm leading-relaxed text-neutral-600">
                        {item.description}
                      </span>
                    </span>
                  </span>

                  <ArrowDownRight
                    size={19}
                    strokeWidth={1.5}
                    className="justify-self-end transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5"
                  />
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    
  )
}
