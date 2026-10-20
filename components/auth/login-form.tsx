
'use client'

import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { TransitionLink } from '@/components/ui/transition-link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import type { ReactNode } from 'react'
import { authClient } from '@/lib/auth-client'

type Errors = {
  email?: string
  password?: string
  form?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ROLE_ROUTES: Record<string, string> = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
}

export function LoginForm() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const nextErrors: Errors = {}

    if (!normalizedEmail) {
      nextErrors.email = 'Enter your email address.'
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Enter your password.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: normalizedEmail,
        password,
      })

      if (signInError) {
        setErrors({
          form: signInError.message || 'Sign-in failed. Check your email and password.',
        })
        return
      }

      const { data: session, error: sessionError } =
        await authClient.getSession()

      if (sessionError || !session) {
        setErrors({
          form: 'Your session could not be verified. Please try signing in again.',
        })
        return
      }

      const role = (
        session.user as typeof session.user & { role?: string }
      ).role

      const destination = role ? ROLE_ROUTES[role] : undefined

      if (!destination) {
        await authClient.signOut()
        setErrors({
          form: 'Your account does not have a valid role. Please contact your administrator.',
        })
        return
      }

      router.replace(destination)
      router.refresh()
    } catch (error) {
      console.error('Attendly sign-in error:', error)
      setErrors({
        form: 'Unable to connect to the authentication service. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrors({})
    setGoogleLoading(true)

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/student/dashboard',
        errorCallbackURL: '/login',
      })
    } catch (error) {
      console.error('Attendly Google sign-in error:', error)
      setGoogleLoading(false)
      setErrors({
        form: 'Unable to start Google sign-in. Please try again.',
      })
    }
  }

  return (
    <div className="mx-auto w-full max-w-[590px]">
      <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-[42px] lg:leading-[1.05] xl:text-[50px]">
        Sign in to Attendly
      </h1>

      <p className="mt-3 text-lg leading-snug text-muted-foreground sm:text-xl lg:text-2xl">
        Mark in class, review it anywhere.
      </p>

      <div className="mt-12 space-y-5">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="focus-ring flex h-14 w-full items-center justify-center gap-3 border-2 border-black bg-white font-mono text-sm uppercase tracking-widest text-black transition-none hover:bg-neutral-100 disabled:cursor-wait disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.01 13.22l7.98 6.19C11.88 13.72 17.45 9.5 24 9.5Z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.93 46.98 31.8 46.98 24.55Z" />
              <path fill="#FBBC05" d="M9.99 28.59A14.4 14.4 0 0 1 9.2 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.58 10.78l7.41-6.19Z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.18 2.3-6.55 0-12.12-4.22-14.01-10.06l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
            </svg>
          )}
          {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-4" aria-hidden="true">
          <div className="h-px flex-1 bg-neutral-300" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Or use email
          </span>
          <div className="h-px flex-1 bg-neutral-300" />
        </div>

        <form onSubmit={handleSignIn} noValidate className="space-y-5">
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
          />

          <Field
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="focus-ring grid size-9 place-items-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={18} strokeWidth={1.5} />
                ) : (
                  <Eye size={18} strokeWidth={1.5} />
                )}
              </button>
            }
          />

          {errors.form && (
            <p
              role="alert"
              className="border-l-4 border-black bg-muted px-4 py-3 text-sm leading-relaxed"
            >
              {errors.form}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="focus-ring mt-4 flex h-14 w-full items-center justify-center gap-3 border-2 border-black bg-black font-mono text-sm uppercase tracking-widest text-white transition-none hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
              </>
            )}
          </button>

          <p className="pt-2 text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <TransitionLink
              href="/signup"
              className="font-medium text-black underline underline-offset-4 hover:decoration-2"
            >
              Sign up
            </TransitionLink>
          </p>
        </form>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  error,
  trailing,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  error?: string
  trailing?: ReactNode
}) {
  const errorId = `${id}-error`

  return (
    <div>
      <div
        className={`flex h-14 items-center gap-3 border-2 border-black bg-white pl-5 pr-3 focus-within:border-b-4 ${
          error ? 'border-b-4' : ''
        }`}
      >
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={label === 'Email' ? 'name@gmail.com' : '••••••••'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:italic placeholder:text-muted-foreground/70"
        />

        {trailing}

        <label htmlFor={id} className="shrink-0 pr-2 font-display text-lg">
          {label}
        </label>
      </div>

      {error && (
        <p id={errorId} className="mt-2 font-mono text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
