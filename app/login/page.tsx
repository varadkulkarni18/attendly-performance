
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthPanel } from '@/components/auth/auth-panel'
import { LoginForm } from '@/components/auth/login-form'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Login — Attendly',
  description: 'Log in to Attendly as an admin, teacher, or student.',
}

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session) {
    const role = (
      session.user as typeof session.user & { role?: string }
    ).role

    if (role === 'admin') redirect('/admin/dashboard')
    if (role === 'teacher') redirect('/teacher/dashboard')
    if (role === 'student') redirect('/student/dashboard')
  }

  return (
    <main className="min-h-screen bg-white p-3 text-black">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-3 lg:grid-cols-[0.94fr_1.06fr]">
        <div className="flex items-start border-2 border-black bg-white px-6 py-10 sm:px-10 lg:px-14 lg:py-20 xl:px-20">
          <LoginForm />
        </div>
        <AuthPanel />
      </div>
    </main>
  )
}
