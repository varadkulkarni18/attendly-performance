import 'server-only'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'

export type Role = 'admin' | 'teacher' | 'student'

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: Role
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  // Read the role from the database so admin role changes apply immediately.
  const [row] = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
  if (!row) return null
  return { ...row, role: (['admin', 'teacher', 'student'].includes(row.role) ? row.role : 'student') as Role }
})

export async function requireUser() {
  const current = await getCurrentUser()
  if (!current) redirect('/login')
  return current
}

export async function requireActionUser(roles?: Role[]) {
  const current = await getCurrentUser()
  if (!current) throw new Error('You are signed out. Log in again.')
  if (roles && !roles.includes(current.role)) throw new Error('You do not have access to do that.')
  return current
}
