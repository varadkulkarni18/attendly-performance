
import { headers } from 'next/headers'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export type AppRole = 'admin' | 'teacher' | 'student'

const ROLE_ROUTES: Record<AppRole, string> = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
}

// React cache deduplicates session lookups during one server render.
// This matters because the persistent role layout and the page both enforce access.
const getRequestSession = cache(async () => {
  const requestHeaders = await headers()
  const start = performance.now()

  const session = await auth.api.getSession({
    headers: requestHeaders,
  })

  const duration = Math.round(performance.now() - start)
  console.info(`[PERF] auth.getSession: ${duration}ms`)

  return session
})

export async function requireRole(requiredRole: AppRole) {
  const session = await getRequestSession()

  if (!session) {
    redirect('/login')
  }

  const role = (
    session.user as typeof session.user & { role?: string }
  ).role

  if (!role || !(role in ROLE_ROUTES)) {
    redirect('/login')
  }

  const actualRole = role as AppRole

  if (actualRole !== requiredRole) {
    redirect(ROLE_ROUTES[actualRole])
  }

  return session
}
