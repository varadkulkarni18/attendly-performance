
import { desc } from 'drizzle-orm'
import {
  ArrowUpRight,
  GraduationCap,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { requireRole } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { UsersTable } from '@/components/admin/users-table'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const session = await requireRole('admin')

  const accounts = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))

  const teacherCount = accounts.filter(
    (account) => account.role === 'teacher',
  ).length

  const studentCount = accounts.filter(
    (account) => account.role === 'student',
  ).length

  const adminCount = accounts.filter(
    (account) => account.role === 'admin',
  ).length

  return (
    
      <main className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Administration / Directory
            </p>

            <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
              Users<span className="italic">.</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
              View and search the accounts registered in Attendly.
              Manage your academic community from one place.
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 border border-neutral-300 px-4 text-sm transition-colors hover:border-black"
          >
            Overview
            <ArrowUpRight size={15} />
          </Link>
        </header>

        <section
          aria-label="Account totals"
          className="grid gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-3"
        >
          <div className="bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Teachers
              </p>
              <GraduationCap size={18} className="text-neutral-500" />
            </div>
            <p className="mt-5 font-display text-4xl">
              {teacherCount}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Teacher accounts
            </p>
          </div>

          <div className="bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Students
              </p>
              <Users size={18} className="text-neutral-500" />
            </div>
            <p className="mt-5 font-display text-4xl">
              {studentCount}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Student accounts
            </p>
          </div>

          <div className="bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Administrators
              </p>
              <ShieldCheck size={18} className="text-neutral-500" />
            </div>
            <p className="mt-5 font-display text-4xl">
              {adminCount}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Administrator accounts
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl">
                Account directory
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {accounts.length} total{' '}
                {accounts.length === 1 ? 'account' : 'accounts'}
              </p>
            </div>

            <p className="text-xs text-neutral-500">
              Data from your Attendly database
            </p>
          </div>

          <UsersTable accounts={accounts} />
        </section>
      </main>
    
  )
}
