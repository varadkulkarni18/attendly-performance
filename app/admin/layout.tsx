import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth-guard'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireRole('admin')

  return (
    <DashboardShell
      role="admin"
      name={session.user.name || 'Administrator'}
      email={session.user.email}
    >
      {children}
    </DashboardShell>
  )
}
