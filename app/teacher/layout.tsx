import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth-guard'

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const session = await requireRole('teacher')

  return (
    <DashboardShell
      role="teacher"
      name={session.user.name || 'Teacher'}
      email={session.user.email}
    >
      {children}
    </DashboardShell>
  )
}
