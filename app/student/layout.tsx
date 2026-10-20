import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth-guard'

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const session = await requireRole('student')

  return (
    <DashboardShell
      role="student"
      name={session.user.name || 'Student'}
      email={session.user.email}
    >
      {children}
    </DashboardShell>
  )
}
